---
name: mike-resy-reservation
description: >-
  Queue and grab Resy reservations for Mike. Use when he says grab a
  reservation, queue a table, book on Resy, snipe a drop, check the Resy
  queue, cancel a queued reservation, or names a restaurant plus a date or
  drop time (Carbone, Temple Court, etc.).
---

# Resy reservation queue

Personal playbook. Data lives in `~/.cursor/resy/` (not this skill folder).

If those files are missing, create them from [references/defaults.example.json](references/defaults.example.json):

- `~/.cursor/resy/defaults.json` — copy the example
- `~/.cursor/resy/venues.json` — `{ }`
- `~/.cursor/resy/queue.json` — `{ "jobs": [] }`

| File | Role |
|---|---|
| `~/.cursor/resy/defaults.json` | Global party size, window, and ranked times for **every** restaurant |
| `~/.cursor/resy/venues.json` | Per-restaurant id, slug, drop, payment only |
| `~/.cursor/resy/queue.json` | Jobs: queued → armed → running → held/booked/failed/cancelled |

Read all three before doing anything. Write them back after every change.

**Times are global.** Always copy `defaults.json` `times` onto the job. A venue or a single job may override only if Mike says so for that restaurant or that ask. Do not store a copy of the list on each venue.

API and DOM details: [references/api.md](references/api.md). Drop-time edges: [references/execute.md](references/execute.md).

## What Mike means

| He says | You do |
|---|---|
| "grab / queue / get me [restaurant]" | Enqueue. Do not book. |
| "list / what's queued" | Print the queue. |
| "cancel [restaurant or id]" | Mark that job `cancelled`. |
| "run / it's drop time / go" | Execute due jobs. |
| "actually book" / `confirm: true` | Allow the final `POST /3/book`. |
| anything else | **Stop before Reserve Now / `/3/book`.** |

If restaurant, party size, or date is missing, use `defaults.json`, then venue overrides, then say what you assumed.

## Enqueue

1. Resolve the venue (see below).
2. Compute `date`: explicit date, or **today in `America/New_York` + `drop.days_ahead`**. If that date is already past today's drop, use the next drop's date.
3. Build a job and append it to `queue.json`. `id` = `{slug}-{date}-{party_size}` — replace if the same id already exists.
4. Reply with one block: restaurant, date, party, window, ranked times, drop time, **dry-run vs book**, job id.

Do not start a wait-loop unless he asks. Tell him to ping at drop time, or to say "arm a loop" if he wants this session to sit on it.

### Job shape

```json
{
  "id": "carbone-2026-10-02-2",
  "status": "queued",
  "venue": "carbone",
  "date": "2026-10-02",
  "party_size": 2,
  "window": { "start": "18:30", "end": "21:00" },
  "times": ["20:00", "20:15", "19:45", "20:30", "19:30", "20:45", "19:15", "19:00", "21:00", "18:45", "18:30"],
  "confirm": false,
  "drop_at": "2026-09-02T10:00:00-04:00",
  "notes": "",
  "created_at": "2026-09-01T16:47:00Z"
}
```

`drop_at` is the next release for that `date` in the venue timezone.

## Resolve venue

1. Look up `venues.json` by slug, name, or alias (case-insensitive).
2. If missing: open Resy, find the venue, save a new profile, then enqueue.
   - `GET https://api.resy.com/3/venue?url_slug={slug}&location={city}`
   - Need-to-know text for drop time / days ahead / deposit
   - One `/4/find` on a day with slots to learn interval (15 vs 30)
3. Required profile fields: `name`, `slug`, `city`, `venue_id`, `drop`. Do not copy the global times list onto the venue.

Unknown drop → assume `10:00` America/New_York and `days_ahead: 30`, and say so.

## Execute (drop time)

Need a logged-in Resy tab. If the profile icon is missing, stop and ask Mike to sign in.

Follow [references/execute.md](references/execute.md).

**Do not poll with agent tool calls.** Inject `scripts/run-drop.js` once and `await runResyDrop(job)`. Find polling is **400ms for 8s, then 1.5s**, not 100ms. 429 backs off `Retry-After` or 5s. Chat stays out of the hot path.

Headers: `Authorization: ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"`, `x-origin: https://resy.com`, cookies from the signed-in browser.

## Pick a time

Applies to every restaurant. Source of truth is `~/.cursor/resy/defaults.json` → `times`:

`8:00, 8:15, 7:45, 8:30, 7:30, 8:45, 7:15, 7:00, 9:00, 6:45, 6:30`

`job.times` → `venue.defaults.times` → `defaults.json` `times`. First **currently available** match wins. A missing or just-taken time is a skip, not a fail.

## Rules

- One job per venue+date+party. Updating replaces it.
- Never book when `confirm` is false.
- Never invent a venue id. Resolve it.
- Never dump `book_token`, auth cookies, or full card numbers into chat.
- Paid venues: card must already be on file. If `/3/details` has no payment method, stop.
