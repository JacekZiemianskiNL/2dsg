# Backlogs

## .ai/specs/product-brief.md
Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-18

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #10 | Mentor onboarding | — | — | no |
| E02 | #11 | Finding a mentor | — | — | no |
| E03 | #12 | Booking | — | — | no |
| E04 | #13 | Payments on Stripe test mode | — | — | no |
| E05 | #14 | Text session | — | — | no |
| E06 | #15 | Later (parked) | — | — | no |
| E01-S01 | #16 | A mentor signs in with GitHub | #10 | — | no |
| E01-S02 | #17 | A mentor creates a profile with public work, price and bank details, and gets a share link | #10 | E01-S01 (#16) | no |
| E01-S03 | #18 | A mentor publishes the times they can take sessions | #10 | E01-S02 (#17) | no |
| E02-S01 | #19 | A developer searches mentors by technology and profile data and opens a mentor page | #11 | E01-S02 (#17) | no |
| E03-S01 | #20 | A developer signs in with GitHub when they choose to book | #12 | — | no |
| E03-S02 | #21 | A developer sees the price, writes a question and books an open slot ahead | #12 | E01-S03 (#18), E03-S01 (#20) | no |
| E03-S03 | #22 | A mentor reads the question and accepts or declines | #12 | E03-S02 (#21) | no |
| E03-S04 | #23 | A developer cancels free until 12 hours before the start and is charged after | #12 | E04-S01 (#25) | no |
| E03-S05 | #24 | When a mentor cancels, the developer is refunded and the cancellation is counted | #12 | E04-S01 (#25) | no |
| E04-S01 | #25 | A developer prepays; the booking holds only after payment, with the 80/20 split computed on the server | #13 | E03-S03 (#22), E04-S01-T01 (#26) | no |
| E04-S01-T01 | #26 | Stripe test-mode integration and webhooks | #25 (story) | — | no |
| E04-S02 | #27 | No-shows settle automatically: same-day refund, mentor payout and the both-absent case | #13 | E04-S01 (#25), E05-S01 (#28) | no |
| E05-S01 | #28 | A developer and a mentor exchange text inside DevMentor from the booked start, with agreed overtime | #14 | E04-S01 (#25) | no |

Blocked on open questions: E03-S05 (#24) waits for Q24; E05-S01 (#28) waits for Q23. E04 waits for founder B's Stripe check (A07).
