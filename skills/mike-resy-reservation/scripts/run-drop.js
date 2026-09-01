// Injected once via Runtime.evaluate. Polls and books in-page.
// Do not drive this from an agent loop.
async function runResyDrop(job) {
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
          last = { status: 429, body };
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
        party_size: job.party_size
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

  await req(`${API}/3/auth/refresh`, { method: "GET", headers });

  const dropAt = Date.parse(job.drop_at);
  const poll = job.poll || {};
  const lead = poll.lead_ms != null ? poll.lead_ms : 500;
  const fastFor = poll.fast_for_ms != null ? poll.fast_for_ms : 8000;
  const fastInterval = poll.interval_ms != null ? poll.interval_ms : 400;
  const slowInterval = poll.interval_after_ms != null ? poll.interval_after_ms : 1500;
  const timeout = poll.timeout_ms != null ? poll.timeout_ms : 45000;
  const pollStart = dropAt - lead;
  const pollEnd = dropAt + timeout;

  while (Date.now() < pollStart) await sleep(Math.min(50, pollStart - Date.now()));

  let finds = 0;
  while (Date.now() < pollEnd) {
    const f = await find();
    finds += 1;
    if (f && f.status === 429) {
      log.push({ event: "rate_limited", finds, ms: Date.now() - tStart });
    }
    const slots = (((f.body || {}).results || {}).venues || [])[0];
    const list = leftovers((slots && slots.slots) || []);
    if (!list.length) {
      const gap = Date.now() < dropAt + fastFor ? fastInterval : slowInterval;
      await sleep(gap);
      continue;
    }
    log.push({ event: "inventory", finds, times: list.map((x) => x.time), ms: Date.now() - tStart });

    for (const slot of list) {
      const d = await details(slot.token);
      const token = d.body && d.body.book_token && d.body.book_token.value;
      if (!token) {
        log.push({ event: "details_miss", time: slot.time, status: d.status });
        continue;
      }
      if (!job.confirm) {
        return { ok: true, status: "held", time: slot.time, finds, ms: Date.now() - tStart, log };
      }
      const payId = paymentIdFrom(d.body);
      const b = await book(token, payId);
      const ok = b.status >= 200 && b.status < 300 && !(b.body && (b.body.status >= 400 || b.body.message === "error"));
      if (ok) {
        log.push({ event: "booked", time: slot.time, status: b.status });
        return { ok: true, status: "booked", time: slot.time, finds, ms: Date.now() - tStart, log };
      }
      log.push({ event: "book_miss", time: slot.time, status: b.status, msg: (b.body && (b.body.message || b.body.title)) || null });
    }
  }

  return { ok: false, status: "failed", finds, ms: Date.now() - tStart, log };
}
