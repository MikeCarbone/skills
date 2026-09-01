# Resy API / DOM (agent reference)

Read this only when executing or adding a venue.

Base: `https://api.resy.com`  
Public web key (in page JS): `Authorization: ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"`  
Also send `x-origin: https://resy.com` or `https://widgets.resy.com` and the signed-in cookies.

## Calls

| Step | Request | Notes |
|---|---|---|
| Venue | `GET /3/venue?url_slug=&location=` | id, flags, recaptcha |
| Calendar | `GET /4/venue/calendar?venue_id=&num_seats=&start_date=&end_date=` | Slow (500ms+). Do not poll. |
| Slots | `POST /4/find` JSON `{ venue_id, day, party_size }` | ~80–180ms. `slots[].config.token` |
| Hold | `GET /3/details?commit=1&config_id=&day=&party_size=` | ~110–170ms. `book_token` expires ~5 min. POST form-urlencoded gets 415. |
| Book | `POST /3/book` form-encoded | Only if `confirm: true` |
| Auth | `GET /3/auth/refresh` | Warm the session |

`/4/find` slot token:

`rgs://resy/{venueId}/{templateId}/{serviceTypeId}/{day}/{day}/{HH:MM:SS}/{party}/{tableType}`

Service types seen: `2` dinner, `3` lunch, `5` breakfast.

## Book payload fields

Required: `book_token`.

Optional / conditional:

- `struct_payment_method` `{ id }` when paid
- `venue_marketing_opt_in` `0` or `1`
- `struct_guest` only for book-on-behalf
- captcha if `feature_recaptcha` is true

## UI (fallback only)

Venue URL: `https://resy.com/cities/{city}/venues/{slug}?date=YYYY-MM-DD&seats=N`

Slot button: `button.ReservationButton[data-testid="reservation-button-{token}"]`

Click opens iframe `widgets.resy.com#/reservation-details?...`. Snapshot cannot see inside it. Use CDP `Page.getFrameTree` + isolated world.

Widget: `[data-test-id="order_summary_page-button-book"]` = Reserve Now. Optional `#venue_marketing_opt_in`. Paid venues add `select[name=payment_method]`.

Cold page load to slots visible ≈ 1.2s. Click → widget details done ≈ 0.6s. Slower than find+details (~200–270ms).

## Timed (2026-09-01, signed-in, Carbone)

- find: 72–178ms
- details: 114–173ms
- find+details: 200–271ms
- calendar: 484–974ms
