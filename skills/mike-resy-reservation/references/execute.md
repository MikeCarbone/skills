# Drop-time execute

**One agent turn. One in-page script. No poll loop in chat.**

The find retry and the taken-time cascade run inside the browser. Do not `find` → wait → `find` with tools.

Resy publishes **no consumer rate limit**. Partner API is contractual only. `/4/find` responses do not expose `X-RateLimit-*` to the page. Do not probe until 429. Cap find at **400ms** for the first 8s after drop (~2.5/s), then **1.5s**. Honor 429 + `Retry-After` (default 5s). The live site fires one find per date change, not a tight loop.

## Agent steps (3 max)

1. Locked Resy tab, signed in. Do not open the venue page.
2. `Runtime.evaluate` the file `scripts/run-drop.js` plus `await runResyDrop(job)` with `awaitPromise: true`. Wait for that one call.
3. Write the result onto the job (`booked` / `held` / `failed`) and tell Mike the time. Do not dump tokens or card ids.

If the evaluate returns before the script finishes, read `window.__resyDrop` once. Do not start a second runner.

## Job payload to pass in

```js
{
  venue_id: 6194,
  day: "2026-10-02",
  party_size: 4,
  times: ["20:00", "20:15", "19:45", "20:30", "19:30", "20:45", "19:15", "19:00", "21:00", "18:45", "18:30"],
  confirm: true,
  drop_at: "2026-09-02T10:00:00-04:00",
  poll: { lead_ms: 500, interval_ms: 400, fast_for_ms: 8000, interval_after_ms: 1500, timeout_ms: 45000 }
}
```

The script sleeps until `drop_at - lead`, then polls `/4/find` at 400ms / 1.5s, walks `times`, and books. 8:00 gone → next time in the same snapshot. Late drop → keeps polling until +45s. 429 backs off.
