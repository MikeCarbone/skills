# Drop-time execute

**One agent turn. One in-page script. No poll loop in chat.**

The find retry and the taken-time cascade run inside the browser. Do not `find` → wait → `find` with tools.

Resy publishes **no consumer rate limit**. Partner API is contractual only. `/4/find` responses do not expose `X-RateLimit-*` to the page. Do not probe until 429. After `drop_at`, stay at **400ms until a ranked time appears** or `timeout_ms` (45s). Before drop, poll at **1.5s** so the tab stays awake. Honor 429 + `Retry-After` (default 5s). Do not use a 50ms sleep spin — that gets throttled in a background tab and can skip the window (4 Charles, 2026-09-02).

## Agent steps (3 max)

Wake is **T−2 min**. First action is inject, not research.

1. Locked Resy tab on `resy.com` (not the venue page). Profile icon present. If missing, stop and ask Mike to sign in.
2. `Runtime.evaluate` the file `scripts/run-drop.js` plus `await runResyDrop(job)` with `awaitPromise: true`. Do this immediately — do not reread the whole skill first. Wait for that one call.
3. Write the result onto the job (`booked` / `held` / `failed`) including `seen` (first slots, first ranked, unique times, status counts, rate limits). Tell Mike the time or why it failed, plus a one-line slot summary. Do not dump tokens or card ids.

If the evaluate returns before the script finishes, read `window.__resyDrop` once. Do not start a second runner.

## Job payload to pass in

```js
{
  venue_id: 6194,
  lat: 0,
  long: 0,
  day: "2026-10-03",
  party_size: 2,
  times: ["20:00", "20:15", "19:45", "20:30", "19:30", "20:45", "19:15", "19:00", "21:00", "18:45", "18:30"],
  confirm: true,
  drop_at: "2026-09-03T10:00:00-04:00",
  poll: { interval_ms: 400, interval_before_ms: 1500, timeout_ms: 45000 }
}
```

The script starts polling as soon as it is injected. Pre-drop finds are 1.5s. From `drop_at` it stays at 400ms until a ranked time shows or +45s. 8:00 gone → next time in the same snapshot. Off-window slots (lunch, 11:15pm) are logged and ignored.

## Logs (`result.seen` + `result.log`)

Every find appends `{ event: "find", status, ms, phase, slot_n, times, ranked }`. `times` is every slot on that response, not just ranked hits. Copy `seen` onto the job:

- `first_slots_ms` / `first_slots_times` — when any inventory appeared
- `first_ranked_ms` / `first_ranked` — when a time from `job.times` appeared
- `unique_times` — all times seen across the run
- `statuses` — count of HTTP codes
- `rate_limits` — 429 count
- `signed_in` — auth preflight (no names or emails)

`GET /3/auth/refresh` is 405 from the page. The runner tries POST first, then GET, then `/3/user`. Log status only.
