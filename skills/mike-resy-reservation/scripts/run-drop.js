// Injected once via Runtime.evaluate. Lives in the page until drop, then books.
// Inject at T-10 min or earlier — never at drop. Do not drive from an agent loop.
async function runResyDrop(job) {
  if (window.__resyDropRunning) {
    return window.__resyDrop || { ok: false, status: "already_running" };
  }
  window.__resyDropRunning = true;

  const API = "https://api.resy.com";
  const headers = {
    authorization: 'ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"',
    "x-origin": location.origin.includes("widgets") ? "https://widgets.resy.com" : "https://resy.com"
  };
  const jsonHeaders = { ...headers, "content-type": "application/json" };
  const times = job.times;
  const log = [];
  const tStart = Date.now();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hhmm = (start) => {
    const m = String(start || "").match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "";
  };
  const slotTimes = (slots) => {
    const out = [];
    for (const s of slots || []) {
      const t = hhmm(s.date && s.date.start);
      if (t) out.push(t);
    }
    return out;
  };

  async function req(url, opt, tries = 3) {
    let last;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(url, { credentials: "include", ...opt });
        const text = await r.text();
        let body;
        try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 400) }; }
        if (r.status === 429) {
          const retryAfter = Number(r.headers.get("retry-after"));
          const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000;
          last = { status: 429, body, retry_after_ms: wait };
          await sleep(wait);
          continue;
        }
        if (r.status >= 500) { last = { status: r.status, body }; await sleep(50); continue; }
        return { status: r.status, body };
      } catch (e) {
        last = { status: 0, body: { error: String(e) } };
        await sleep(50);
      }
    }
    return last;
  }

  function leftovers(slots) {
    const byTime = {};
    for (const s of slots || []) {
      const t = hhmm(s.date && s.date.start);
      const token = s.config && s.config.token;
      if (t && token) byTime[t] = { time: t, token };
    }
    return times.map((t) => byTime[t]).filter(Boolean);
  }

  async function find() {
    return req(`${API}/4/find`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        venue_id: job.venue_id,
        day: job.day,
        party_size: job.party_size,
        lat: job.lat != null ? job.lat : 0,
        long: job.long != null ? job.long : 0
      })
    });
  }

  async function details(token) {
    const qs = new URLSearchParams({
      commit: "1",
      config_id: token,
      day: job.day,
      party_size: String(job.party_size)
    });
    return req(`${API}/3/details?${qs}`, { method: "GET", headers });
  }

  async function book(bookToken, paymentId) {
    const body = new URLSearchParams();
    body.set("book_token", bookToken);
    body.set("venue_marketing_opt_in", "0");
    if (paymentId) body.set("struct_payment_method[id]", String(paymentId));
    return req(`${API}/3/book`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
      body
    });
  }

  function paymentIdFrom(detail) {
    const pm = detail && detail.user && detail.user.payment_methods;
    if (!pm) return null;
    if (Array.isArray(pm)) return (pm[0] && pm[0].id) || null;
    const first = Object.values(pm)[0];
    return (first && first.id) || null;
  }

  function domSignedIn() {
    return !!document.querySelector('[data-test-id="menu_container-button-profile_photo"]');
  }

  async function keepalive() {
    try {
      await fetch("https://api.resy.com/3/venue?url_slug=carbone&location=new-york-ny", {
        credentials: "include",
        headers
      });
    } catch (_) { /* tab stay-awake only */ }
  }

  const dropAt = Date.parse(job.drop_at);
  const poll = job.poll || {};
  const fastInterval = poll.interval_ms != null ? poll.interval_ms : 400;
  const warmInterval = poll.interval_before_ms != null ? poll.interval_before_ms : 1500;
  const keepEvery = poll.keepalive_ms != null ? poll.keepalive_ms : 20000;
  const warmFor = poll.warm_for_ms != null ? poll.warm_for_ms : 120000;
  const lead = poll.lead_ms != null ? poll.lead_ms : 500;
  const timeout = poll.timeout_ms != null ? poll.timeout_ms : 45000;
  const lateBurst = poll.late_burst_ms != null ? poll.late_burst_ms : 20000;
  const untilDrop = dropAt - Date.now();
  const late = untilDrop < 0;
  const warmStart = dropAt - warmFor;
  const fastStart = dropAt - lead;
  const pollEnd = Math.max(dropAt + timeout, Date.now() + (late ? lateBurst : 0));

  const signedIn = domSignedIn();
  log.push({
    event: "start",
    signed_in: signedIn,
    drop_at: job.drop_at,
    now_ms: Date.now() - tStart,
    until_drop_ms: untilDrop,
    late
  });

  const seen = {
    first_slots_ms: null,
    first_slots_times: [],
    first_ranked_ms: null,
    first_ranked: [],
    unique_times: [],
    statuses: {},
    rate_limits: 0
  };
  const unique = new Set();
  let finds = 0;

  function finish(result) {
    window.__resyDropRunning = false;
    window.__resyDrop = result;
    return result;
  }

  // Far from drop: chunked sleep + keepalive so background timers do not die.
  // Do not /4/find yet (hours of finds are useless and noisy).
  while (Date.now() < warmStart && Date.now() < pollEnd) {
    await keepalive();
    log.push({ event: "keepalive", ms: Date.now() - tStart, until_drop_ms: dropAt - Date.now() });
    const wait = Math.min(keepEvery, warmStart - Date.now(), pollEnd - Date.now());
    if (wait > 0) await sleep(wait);
  }

  while (Date.now() < pollEnd) {
    const now = Date.now();
    const phase = now < fastStart ? "warm" : (now < dropAt ? "lead" : "drop");
    const f = await find();
    finds += 1;
    const status = f && f.status;
    seen.statuses[status] = (seen.statuses[status] || 0) + 1;
    const rawSlots = (((f.body || {}).results || {}).venues || [])[0];
    const slots = (rawSlots && rawSlots.slots) || [];
    const allTimes = slotTimes(slots);
    const list = leftovers(slots);
    const ranked = list.map((x) => x.time);

    if (status === 429) {
      seen.rate_limits += 1;
      log.push({ event: "rate_limited", finds, ms: Date.now() - tStart, retry_after_ms: f && f.retry_after_ms });
    }

    if (allTimes.length && seen.first_slots_ms == null) {
      seen.first_slots_ms = Date.now() - tStart;
      seen.first_slots_times = allTimes.slice();
    }
    for (const t of allTimes) unique.add(t);
    seen.unique_times = Array.from(unique).sort();

    log.push({
      event: "find",
      finds,
      status,
      ms: Date.now() - tStart,
      phase,
      slot_n: slots.length,
      times: allTimes,
      ranked
    });

    if (!list.length) {
      const gap = now < fastStart ? warmInterval : fastInterval;
      await sleep(gap);
      continue;
    }

    if (seen.first_ranked_ms == null) {
      seen.first_ranked_ms = Date.now() - tStart;
      seen.first_ranked = ranked.slice();
    }
    log.push({ event: "inventory", finds, times: ranked, all: allTimes, ms: Date.now() - tStart });

    for (const slot of list) {
      const d = await details(slot.token);
      const token = d.body && d.body.book_token && d.body.book_token.value;
      if (!token) {
        log.push({ event: "details_miss", time: slot.time, status: d.status, ms: Date.now() - tStart });
        continue;
      }
      if (!job.confirm) {
        return finish({ ok: true, status: "held", time: slot.time, finds, ms: Date.now() - tStart, signed_in: signedIn, seen, log });
      }
      const payId = paymentIdFrom(d.body);
      const b = await book(token, payId);
      const ok = b.status >= 200 && b.status < 300 && !(b.body && (b.body.status >= 400 || b.body.message === "error"));
      if (ok) {
        log.push({ event: "booked", time: slot.time, status: b.status, ms: Date.now() - tStart });
        return finish({ ok: true, status: "booked", time: slot.time, finds, ms: Date.now() - tStart, signed_in: signedIn, seen, log });
      }
      log.push({ event: "book_miss", time: slot.time, status: b.status, msg: (b.body && (b.body.message || b.body.title)) || null, ms: Date.now() - tStart });
    }
  }

  return finish({ ok: false, status: "failed", finds, ms: Date.now() - tStart, signed_in: signedIn, seen, log });
}
