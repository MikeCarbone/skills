# Drop-time execute

The miss is never the poller. It is starting the poller via a chat turn at 10:00.

**Inject the runner at T−10 min (or sooner). It must already be in the page at drop.**

Do not `find` → wait → `find` with agent tools. Do not reread the skill at wake. Do not use a 50ms sleep spin.

## Cadence (inside the page)

| When | What |
|---|---|
| Until T−2 min | Keepalive fetch every 20s. No `/4/find`. |
| T−2 min → T−500ms | Warm `/4/find` every 1.5s |
| T−500ms → +45s | `/4/find` every **400ms** until a ranked time |
| Injected late | Still run a **20s** fast burst. Do not exit immediately. |

429 → `Retry-After` or 5s. Off-window slots are logged and ignored. 8:00 gone → next time in the same snapshot.

If `window.__resyDropRunning` is already true, do **not** inject a second runner. Read `window.__resyDrop` when it finishes.

## Agent steps

### Arm / T−10 min wake (this is the real execute)

One tool call after lock. Job payload is already in the wake prompt.

1. Locked Resy tab on `resy.com` (not the venue page). Profile photo `[data-test-id="menu_container-button-profile_photo"]` present. If missing, stop.
2. If `__resyDropRunning`, stop. Otherwise `Runtime.evaluate` `scripts/run-drop.js` + `await runResyDrop(job)` with `awaitPromise: true`.
3. After it returns: write `seen` onto the job. Tell Mike the time or why it failed. No tokens or card ids.

Do not read `SKILL.md` or `queue.json` before step 2. Write the queue after.

### T−2 min wake

No-op if the runner is already going. Only inject if `__resyDropRunning` is false (tab reloaded).

Wake at **T−10 min**, not T−2 min. T−2 is a safety net only.

## Job payload

```js
{
  venue_id: 6194,
  lat: 0,
  long: 0,
  day: "2026-10-04",
  party_size: 4,
  times: ["20:00", "20:15", "19:45", "20:30", "19:30", "20:45", "19:15", "19:00", "21:00", "18:45", "18:30"],
  confirm: true,
  drop_at: "2026-09-04T10:00:00-04:00",
  poll: { interval_ms: 400, interval_before_ms: 1500, keepalive_ms: 20000, warm_for_ms: 120000, lead_ms: 500, timeout_ms: 45000, late_burst_ms: 20000 }
}
```

## Logs

Every find: `{ event: "find", status, ms, phase, slot_n, times, ranked }`.
`phase` is `warm` | `lead` | `drop`. Copy `seen` onto the job. `signed_in` is the profile-photo DOM check, not `/3/user`.

## Why this exists (2026-09-02 / 09-03)

- 4 Charles: 0 finds. 50ms wait loop + background throttle + agent inject after 9:00.
- Carbone 9/2: 53 finds on time, no ranked 6:30–9:00. Leftovers lunch + 11:15pm.
- Carbone 9/3: wake 9:57:59, inject 10:00:44 (`until_drop_ms: -44162`). One find, same leftovers. Agent tool loop ate the T−2 min buffer.
