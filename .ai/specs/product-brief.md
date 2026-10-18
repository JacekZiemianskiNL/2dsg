# DevMentor — product brief

- Date: 2026-10-18; refreshed three times on 2026-10-18 with the founders' answers (D04 confirmed, D05–D31 added)
- Mode: own; Owner: session run by a developer on the team; scope decider is founder A (Oliwia); decisions D04–D31 relayed by that developer as agreed by the founders "for now"; Pass: full
- Evidence basis: seven interviews held 2026-08-20 to 2026-09-03 (four developers who look for help, three senior engineers who give it), a 14-day export of 109 help threads from one ~4,000-member developers' Discord (2026-08-18 to 2026-08-31), a 54-response survey in the same community, five benchmark checks dated 2026-09-04, the 2026-08-26 workshop decisions plus N01/N02, and the founders' decisions D04–D31 of 2026-10-18. Both quantitative sources come from the same single community. The vault, subscription and MCP ideas on the founders' board have no supporting account from a developer. The most consequential untested belief: senior engineers will be available fast enough, and developers will actually pay, for a one-off text session.
- Coverage: 97 claims — 88 sourced (interview 13, data 8, document 62, product 0, benchmark 5), 0 synthetic, 9 assumed; 3 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: not yet signed by a named owner — every decision Now relies on is active (D04–D31); ready for: implementation planning of the Now scope on Stripe test payments, except the session close (Q23) and mentor cancellations (Q24); the payment stories should wait for founder B's Stripe check (A07); running the first test waits for a way to recruit developers (Q21); real payments wait for a terms-of-service owner (Q06)
- Sources: `.ai/specs/research/` — interviews `2026-08-20-interview-working-dev.md`, `2026-08-22-interview-mentor.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`, `2026-09-02-interview-platform-dev-solves-alone.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`; data `2026-09-04-discord-help-requests.csv` (+ `2026-09-04-data-request-discord-help.md`), `2026-09-04-survey-discord-willingness-to-pay.md`, `2026-09-04-mentor-list.csv` (+ note); workshop `2026-08-26-workshop-export.md`; decisions `decisions/N01-no-video.md`, `decisions/N02-no-ratings.md`, `decisions/D04…D31-*.md`; benchmarks `2026-09-04-benchmark-*.md`; founders' board exports `2026-09-0{2,4,5}-miro-board-*.md`

## Decision summary

The founders agreed, for now, what DevMentor builds first within the 25-hour budget (D04): a one-off, text-only session of 25 or 50 minutes with a senior engineer, booked ahead (D05), held inside DevMentor (D09) and paid through Stripe. Developers find mentors through a searchable list or a mentor's own link (D06, D20). The mentor reads the question before accepting (D17). The first test runs on Stripe test payments with placeholder terms, so no real money moves (D23). The founders decide one month after the test starts (D24, D29). Sign-in, pricing, cancellation, no-show, overtime and bank-detail rules are in Scope and Business rules. The vault, subscription and MCP come later. Founder B judges that this fits 25 hours (D13).

The problem with the strongest support is a developer stuck on one specific thing against a deadline with nobody to ask. They search, ask a community, and then ship a workaround, roll back or underquote. In the Discord export, a fifth of help threads never got a reply, and posters said the problem was solved in only 8 of the 31 urgent threads. On the other side, senior engineers already answer the same questions unpaid from a private notes doc. See Problems and Target group.

Three of the founders' choices go against parts of the evidence, and the brief keeps those risks visible. Two developers wanted an answer within twenty minutes or the hour, and sessions are booked ahead (D05, A04). One mentor refused to be listed beside strangers, and mentors are listed (D06, A03). One mentor would not give bank details before anyone booked him, and bank details come at profile creation (D19, A08).

Because the first test moves no real money, it cannot show whether developers pay (A02) or whether mentors stay for session income (A05), and because mentors enter test bank data (D30), it cannot show whether they give real bank details either (A08). Only 3 of 54 survey respondents paid someone the last time they were stuck.

Still open: which developers book during the test and how they are reached (Q21), whether a session closes automatically (Q23), the details of mentor cancellations (Q24) and their penalty (Q22), whether mentors are paid during the test (Q25), and who owns terms of service before real payments (Q06). No stopping result is set in advance.

Next: build the decided scope and run the first test on test payments (D12, D23), once the founders know how to recruit developers for it (Q21). It can show the time from booking to session (A04), whether mentors publish and answer (A01, A03), and whether developers complete bookings. Before the payment stories, founder B checks Stripe (A07). The founders ask warm-contact mentors about availability, rates, being listed and bank details (collection plan).

## Vision

The team's intended direction: developers get a real expert's answer when they are stuck, and senior engineers earn from knowledge they already give away for free; the board's longer vision is that "mentors earn twice", once for the session and again from a knowledge vault. `[DOCUMENT]` `2026-09-02-miro-board-vision-target-needs.md`

## Target group and stakeholders

- Customer (pays): the developer, out of their own pocket in the accounts collected so far; employer payment is wanted by one interviewee and unresolved for another (see Problems). `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`
- Survey respondents stated who would pay: own pocket 24, employer if asked 13, employer without asking 6, client 2, nobody 9 (stated intention, n=54). `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`
- User (asks): an employed developer whose senior is unavailable, or a freelancer with no senior at all, facing a concrete blocker before a deadline. `[INTERVIEW]` `2026-08-20-interview-working-dev.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`
- Posters in the Discord export who stated their context: employed 37, freelance 21, student 10, unknown 41. `[DATA]` `2026-09-04-discord-help-requests.csv`
- Not a user today: a developer at a ~200-person company with an internal channel, who solves things alone and would pay only for a rare, expensed, one-off task. `[INTERVIEW]` `2026-09-02-interview-platform-dev-solves-alone.md`
- User (answers): a senior engineer who already answers questions informally in DMs, Slack or Discord. `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`, `2026-09-03-interview-staff-engineer-declined-before.md`
- Candidate mentors: 50 listed, none contacted; 29 reachable with one message by a founder; public work found for 33. `[DATA]` `2026-09-04-mentor-list.csv`, `2026-09-04-mentor-list-note.md`
- Stakeholders: founder A holds sponsor, product owner and UX roles; founder B holds project manager, tech lead and developer roles; QA and legal have nobody; Stripe is an external dependency. `[DOCUMENT]` `2026-09-05-miro-board-raci-matrix.md`
- Decider for scope decisions: founder A (Oliwia) — workshop decider and accountable for "Approve MVP scope" and the payment model on the RACI board. `[DOCUMENT]` `2026-08-26-workshop-export.md`, `2026-09-05-miro-board-raci-matrix.md`

## Problems, with evidence

- A developer stuck on a TypeScript generics error the day before a release, with the team's only senior on leave, spent 40 minutes searching, got two contradictory Discord answers and shipped a workaround: "half a day, and I still don't trust that code." `[INTERVIEW]` `2026-08-20-interview-working-dev.md`
- A backend developer whose Helm upgrade broke staging on a Friday evening found nobody on Slack, got a wrong Discord answer on Saturday, rolled back and slipped the release to Tuesday; the interviewer notes frequency is unknown ("one Friday told as if it were the norm"). `[INTERVIEW]` `2026-09-01-interview-backend-dev-fintech.md`
- A freelancer who had to estimate a server-components migration read for two evenings, got "it depends" on a React Discord and underquoted by about a week of unpaid time. `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`
- In 14 days one Discord's help channels got 109 threads; 23 (21%) never got a human reply, and the median first reply among the 86 answered was 67 minutes. `[DATA]` `2026-09-04-discord-help-requests.csv`
- 31 threads carried an urgency signal ("release tomorrow", "prod is down", …); 9 got no reply and 8 ended with the poster saying it was solved. `[DATA]` `2026-09-04-discord-help-requests.csv`
- In the survey, 30 of 54 respondents were last stuck with nobody to ask this week or this month; 20 shipped a workaround and 3 paid someone (self-reported, one community). `[DATA]` `2026-09-04-survey-discord-willingness-to-pay.md`
- Senior engineers answer the same questions repeatedly, unpaid, by pasting from a private notes doc ("two evenings a month, for free, and the notes rot"; "co tydzień … te same trzy pytania"). `[INTERVIEW]` `2026-08-22-interview-mentor.md`, `2026-09-03-interview-senior-python-meetups.md`
- One mentor has never charged because asking feels odd and invoicing is a barrier ("dziwnie by było prosić … no i faktury. nie"). `[INTERVIEW]` `2026-09-03-interview-senior-python-meetups.md`
- How often a single developer hits such a blocker is unknown: the freelancer said "ciągle" without quantifying, and the fintech account is one occasion. `[INTERVIEW]` `2026-09-02-interview-freelancer-react.md`

## Product and how it stands out

- What it is: a paid, one-off, text-only session with a senior engineer, booked ahead and held inside DevMentor (see Scope). `[DOCUMENT]` `decisions/D04-paid-one-off-first.md`, `decisions/D05-booked-ahead.md`, `decisions/D09-session-in-devmentor.md`
- What makes it different: hypothesis only — Codementor sells the same job by the minute with uninformative ratings, and Topmate sells one expert's link across all professions; DevMentor would combine a developer-specific, ratings-free, text-first session with a list of mentors searchable by technology (A02, A03). No comparison shows users prefer it.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | request-to-live-session is the whole product; rates $15–$80 per 15 min on 10 React cards, four with first 15 min free | every card rated 5.0, so ratings carry no information; nothing kept after a session; live session by default | 2026-09-04 `[BENCHMARK]` | https://www.codementor.io/react-experts |
| Topmate | expert owns page, price and audience through one link; 10% commission on own-link sales, 20% via its marketplace | any profession; a developer with a blocker cannot find an expert they don't already follow | 2026-09-04 `[BENCHMARK]` | https://topmate.io/pricing |
| MentorCruise | free intro call before any payment; monthly plans from $100 | monthly relationship model is what the staff engineer refused | 2026-09-04 `[BENCHMARK]` | https://mentorcruise.com/ |
| ADPList | booking in minutes; session count shown as a trust signal next to star ratings | free for mentees; no stated mentor earnings; career rather than code help | 2026-09-04 `[BENCHMARK]` | https://adplist.org/ |
| Preply | 25/50-min lessons; free cancellation up to 12 h before; refund or free switch after a disappointing trial | language tutoring on recurring lessons; ratings on every card | 2026-09-04 `[BENCHMARK]` | https://preply.com/en/how-it-works |

Sources: the matching `2026-09-04-benchmark-*.md`. The founders' scored tables on the board carry no links or dates and are not used here.

## Goals and success criteria

- Business goal: not set for the first build. The board's goals (100 mentors with published vaults, 30% of mentees on a vault subscription, subscription revenue overtaking commission) describe the deferred vault model. `[DOCUMENT]` `2026-09-02-miro-board-product-goals.md`
- User outcome: a developer with a specific blocker gets a usable text answer from someone who has done it, the same day. `[INTERVIEW]` `2026-08-20-interview-working-dev.md`, `2026-09-02-interview-freelancer-react.md`
- Baseline today in the one community measured: 21% of help threads unanswered, median first reply 67 minutes, 32% resolved by the poster's word. `[DATA]` `2026-09-04-discord-help-requests.csv`
- Review point: results are measured one month after the first test starts (D29) and the founders decide then; no metric or threshold was named. `[DOCUMENT]` `decisions/D24-decide-after-one-month.md`
- What must not get worse: nothing from a session is published without the mentee's approval (R02); no ratings (N02).

## Scope

- **Now:** mentors and developers sign in with GitHub (R10, R11). A mentor creates a profile with public work (N02), a price they set (R09) and bank details (R14), and publishes times; they can share their own link (D20). Developers search the list by technology and profile data (R15) or open a share link, see the fee-inclusive price before writing (R05, R16), send a question and book a 25- or 50-minute slot ahead (R01, D05). The mentor reads the question before accepting (R04). The developer prepays through Stripe (R03); the session runs in text inside DevMentor (N01, D09) and starts at the booked time (R12). No-shows follow R06, R07 and R21; cancellations follow R13 and R19; up to 5 minutes of agreed overtime are allowed (R20). The first test runs on Stripe test payments with placeholder terms and test bank data (R18, D30, D31). Open: whether a session closes automatically (Q23), mentor-cancellation details (Q24) and their penalty (Q22). Founder B judges this fits 25 hours (D13).
- **Later:** the knowledge vault and its subscription, with vault answers citing the mentor and note (R17); MCP access from a coding agent; async 24-hour questions; AI answers from notes; publishing session notes; real payments once terms of service have an owner (Q06); memberships and team plans (D04).
- **Not in Now, timing undecided:** on-demand answers (D05).
- **Not doing:** see Non-goals.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Session | one paid text exchange of 25 or 50 minutes (test payments in the first test), booked ahead and held inside DevMentor | founder A (D04, D05, D09) | developer, mentor |
| Mentor | senior engineer who answers paid questions; not a long-term mentoring relationship | founder A | public |
| Developer (mentee) | the person who signs in with GitHub, books and pays | founder A (D10) | mentor |
| No-show | a party who has not sent a first message within 5 minutes of the booked start; if both are silent, the developer counts as the no-show | founder A (D15, D28) | developer, mentor |
| Overtime | up to 5 extra minutes both sides agree to, at no extra cost | founder A (D27) | developer, mentor |
| Mentor list | the list of mentors developers book from, searchable by technology and profile data | founder A (D06, D21) | public |
| Share link | a mentor's own link to their page | mentor (D20) | public |
| Public work | link to what the mentor has built or written, shown instead of ratings (N02) | mentor | public |
| Platform fee | the 20% the platform keeps, included in the price the developer sees | founder A (D07, D22) | developer, mentor |
| Test payments | Stripe payments in test mode; no real money moves | founder A (D23) | — |
| Vault | mentor-owned notes sold by subscription; Later | founder A | — |

## Key flows

- Current state, observed: the developer searches and reads docs, asks a community, gets no answer or a wrong one, then ships a workaround, rolls back or underquotes. `[INTERVIEW]` `2026-08-20-interview-working-dev.md`, `2026-09-01-interview-backend-dev-fintech.md`, `2026-09-02-interview-freelancer-react.md`
- The later stages on the founders' current-state map (judging an expert, scheduling, paying, a session) are their reconstruction, not something an interviewee described. `[DOCUMENT]` `2026-09-02-miro-board-journey-current-state.md`
- In the export, the community step fails outright for about a fifth of threads (see Problems). `[DATA]` `2026-09-04-discord-help-requests.csv`
- Future state for Now, decided steps: the mentor signs in with GitHub, creates a profile with public work, a price and bank details, publishes times and may share their link → the developer searches the list by technology or opens the link and sees the fee-inclusive price → signs in with GitHub to book → writes the question and picks a 25/50-minute slot ahead → the mentor reads the question and accepts → the developer prepays through Stripe (test payments in the first test) → the session starts at the booked time inside DevMentor → no-show, cancellation, overtime, refund or payout per R06, R07, R12, R13, R19–R21. `[DOCUMENT]` `decisions/D14-mentor-github-sign-in.md`, `decisions/D19-bank-details-on-creation.md`, `decisions/D20-share-links-stay.md`, `decisions/D21-search-fields.md`, `decisions/D18-price-before-writing.md`, `decisions/D10-github-sign-in.md`, `decisions/D17-question-before-accepting.md`, `decisions/D23-test-payments.md`, `decisions/D15-session-start-and-no-show.md`, `decisions/D16-cancellation-window.md`
- Future state, not decided: the penalty after a mentor's second cancellation in a month (Q22). `[ASSUMPTION]` no material

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sessions are 25 or 50 minutes. | booking | `[DOCUMENT]` `2026-08-26-workshop-export.md` (D01) | active | unknown | superseding row by founder A | founder A | none |
| R02 | Nothing from a session is published without the mentee's approval. | sessions, any later notes | `[DOCUMENT]` `2026-08-26-workshop-export.md` (D02) | active | unknown | superseding row by both founders | both founders | none |
| R03 | Payments go through Stripe only; no other payment provider integration. | payments | `[DOCUMENT]` `2026-08-26-workshop-export.md` (D03) | active | unknown | superseding row by founder A | founder A | none |
| R04 | The mentor sees the developer's question before accepting a booking. | booking | `[DOCUMENT]` `decisions/D17-question-before-accepting.md` (from the 2026-09-03 mentor interviews) | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R05 | The price is visible before the developer writes anything. | booking | `[DOCUMENT]` `decisions/D18-price-before-writing.md` (from `2026-09-02-interview-freelancer-react.md`) | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R06 | If the mentor does not show up, the developer is refunded the same day without a support ticket. | payments | `[DOCUMENT]` `decisions/D08-no-show-rules.md` (from `2026-09-02-interview-freelancer-react.md`) | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R07 | If the developer does not show up, the mentor is still paid. | payments | `[DOCUMENT]` `decisions/D08-no-show-rules.md` (from `2026-09-03-interview-senior-python-meetups.md`) | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R08 | A mentor is not asked for bank details before their first booking. | mentor setup | `[INTERVIEW]` `2026-09-03-interview-senior-python-meetups.md` | rejected (D19) | — | — | founder A | none |
| R09 | The mentor sets the session price; the platform keeps 20%. | pricing, payments | `[DOCUMENT]` `decisions/D07-pricing-and-fee.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R10 | A developer signs in with GitHub before booking. | booking, accounts | `[DOCUMENT]` `decisions/D10-github-sign-in.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R11 | Mentors sign in with GitHub. | mentor accounts | `[DOCUMENT]` `decisions/D14-mentor-github-sign-in.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R12 | A session starts at the booked time; a party who has not sent a first message within 5 minutes of the start is a no-show, and R06 or R07 applies. | sessions, payments | `[DOCUMENT]` `decisions/D15-session-start-and-no-show.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R13 | A developer can cancel free of charge until 12 hours before the start; a later cancellation is charged the full price. | bookings, payments | `[DOCUMENT]` `decisions/D16-cancellation-window.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R14 | A mentor enters bank details when creating their profile. | mentor setup | `[DOCUMENT]` `decisions/D19-bank-details-on-creation.md` | active | agreed for now; no date | superseding row by founder A | founder A | R08 (proposal) |
| R15 | The mentor list is searchable by technology and profile data. | mentor list | `[DOCUMENT]` `decisions/D21-search-fields.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R16 | The price a developer sees includes the 20% platform fee. | pricing | `[DOCUMENT]` `decisions/D22-price-includes-fee.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R17 | A vault answer cites the mentor and the note it came from. | vault (Later) | `[DOCUMENT]` `decisions/D25-vault-answers-cite.md` | active | agreed for now; no date | superseding row by founder B | founder B | none |
| R18 | For now, payments run in Stripe test mode with placeholder terms and test bank data; no real money moves. Switching to real payments also needs a terms owner (Q06). | payments | `[DOCUMENT]` `decisions/D23-test-payments.md`, `decisions/D30-test-bank-data.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R19 | When a mentor cancels, the developer is refunded; a mentor may cancel up to 2 sessions a month without consequence, and beyond that penalties may apply (Q22). | bookings, payments | `[DOCUMENT]` `decisions/D26-mentor-cancellation.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R20 | Both sides may agree to run up to 5 minutes over the booked length, at no extra cost; that the session otherwise closes at its booked length is the agent's reading, not confirmed (Q23). | sessions | `[DOCUMENT]` `decisions/D27-session-end-and-overtime.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |
| R21 | If neither side writes within 5 minutes of the start, the developer counts as the no-show and R07 applies. | sessions, payments | `[DOCUMENT]` `decisions/D28-both-absent.md` | active | agreed for now; no date | superseding row by founder A | founder A | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls; sessions are text and every session screen says so | workshop constraint; developers asked for text ("text is fine, faster") | founder A (Oliwia) | active | unknown; see A06 | superseding record by founder A | `[DOCUMENT]` `decisions/N01-no-video.md` | none |
| N02 | Ratings or reviews; each mentor page links to public work and says plainly what they have done | mentors refuse ratings; developers find them uninformative | founder A (Oliwia) | active | unknown | superseding record by founder A | `[DOCUMENT]` `decisions/N02-no-ratings.md` | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-08-26 | Adopt R01 (25/50-minute sessions) | "bookable in a lunch break" | founder A | active | unknown | superseding row by founder A | `[DOCUMENT]` `2026-08-26-workshop-export.md` | none |
| D02 | 2026-08-26 | Adopt R02 (mentee approval before publishing) | "trust is the product" | both founders | active | unknown | superseding row by both founders | `[DOCUMENT]` `2026-08-26-workshop-export.md` | none |
| D03 | 2026-08-26 | MVP constraints: 25 hours of build time, Stripe only (R03), no video (N01) | workshop constraints | founder A (workshop decider) | active | unknown | superseding row by founder A | `[DOCUMENT]` `2026-08-26-workshop-export.md` | none |
| D04 | 2026-10-18 | First build is the paid one-off text session in Scope → Now; vault, subscription and MCP move to Later | founders gave no reason; the agent's original rationale: developer interviews and the Discord data support the one-off blocker; two developers reject subscriptions and saved answers; considered the full board vision and a vault-first test. Began as the agent's recommendation; confirmed by founder A on 2026-10-18 (Q01), agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D04-paid-one-off-first.md` | none |
| D05 | 2026-10-18 | Sessions are booked ahead as 25/50-minute slots, not answered on demand | chosen over an on-demand request any available mentor picks up, despite two developers asking for an answer within twenty minutes or the hour (A04); answers Q09; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D05-booked-ahead.md` | none |
| D06 | 2026-10-18 | Developers find mentors through a list with search | chosen over share links only and a curated list, despite one mentor refusing to be listed beside strangers (A03); answers Q02; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D06-list-with-search.md` | none |
| D07 | 2026-10-18 | Adopt R09: the mentor sets the price, the platform keeps 20% | chosen over a platform-set price; answers Q03; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D07-pricing-and-fee.md` | none |
| D08 | 2026-10-18 | Adopt R06 and R07 as the no-show rules | as proposed from the interviews; answers Q05; cancellation in D16; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D08-no-show-rules.md` | none |
| D09 | 2026-10-18 | The text session takes place inside DevMentor | chosen over an outside channel; answers where the session happens (Q04); start and no-show in D15; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D09-session-in-devmentor.md` | none |
| D10 | 2026-10-18 | Adopt R10: developers sign in with GitHub before booking | chosen over guest booking; mentor sign-in in D14; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D10-github-sign-in.md` | none |
| D11 | 2026-10-18 | A live text session counts as earning "without a call" in the workshop's sense | answers Q11; mentors who want their notes to earn without their time stay unserved until the vault (A05); agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D11-live-text-counts.md` | none |
| D12 | 2026-10-18 | The first test runs after the build, not by hand before it | chosen over a manual test with warm-contact mentors; answers Q10; D23 makes the first test use test payments; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D12-test-after-build.md` | none |
| D13 | 2026-10-18 | The Now scope fits the 25 hours of build time | founder B's judgement as tech lead; answers Q12; agreed for now | founder B | active | agreed for now; no date | superseding row by founder B | `[DOCUMENT]` `decisions/D13-fits-25-hours.md` | none |
| D14 | 2026-10-18 | Adopt R11: mentors sign in with GitHub | answers Q14; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D14-mentor-github-sign-in.md` | none |
| D15 | 2026-10-18 | Adopt R12: session start and no-show definition | answers Q04's start; the end is in D27; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D15-session-start-and-no-show.md` | none |
| D16 | 2026-10-18 | Adopt R13: free cancellation until 12 hours before | answers Q13; no reason given, same window as the Preply benchmark; mentor cancellations in D26; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D16-cancellation-window.md` | none |
| D17 | 2026-10-18 | Adopt R04: the mentor reads the question before accepting | confirms the proposal from the mentor interviews; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D17-question-before-accepting.md` | none |
| D18 | 2026-10-18 | Adopt R05: the price shows before the developer writes | confirms the proposal from the freelancer interview; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D18-price-before-writing.md` | none |
| D19 | 2026-10-18 | Adopt R14: bank details at profile creation; R08 rejected | against the 2026-09-03 mentor's condition (A08); agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D19-bank-details-on-creation.md` | none |
| D20 | 2026-10-18 | Mentors' own share links stay alongside the list | answers Q15; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D20-share-links-stay.md` | none |
| D21 | 2026-10-18 | Adopt R15: search by technology and profile data | which fields search covers was undecided; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D21-search-fields.md` | none |
| D22 | 2026-10-18 | Adopt R16: the shown price includes the 20% fee | settles how D07's fee is shown; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D22-price-includes-fee.md` | none |
| D23 | 2026-10-18 | Adopt R18: the first test runs on Stripe test payments with placeholder terms | answers Q06 for the test; real payments still need a terms owner (Q06); the test cannot show whether developers pay (A02); agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D23-test-payments.md` | none |
| D24 | 2026-10-18 | Decide one month after the first test | answers Q08 with a review point; start point settled by D29; no stopping result set in advance; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D24-decide-after-one-month.md` | none |
| D25 | 2026-10-18 | Adopt R17: vault answers cite the mentor and note | answers Q07; applies when the vault is built; agreed for now | founder B | active | agreed for now; no date | superseding row by founder B | `[DOCUMENT]` `decisions/D25-vault-answers-cite.md` | none |
| D26 | 2026-10-18 | Adopt R19: mentor cancellations | answers Q16; refund timing, the meaning of "a month", whether a mentor no-show counts and any cut-off were not stated (Q24); the penalty is undecided (Q22); agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D26-mentor-cancellation.md` | none |
| D27 | 2026-10-18 | Adopt R20: agreed overtime | answers Q17 in part; whether the session closes automatically is in Q23; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D27-session-end-and-overtime.md` | none |
| D28 | 2026-10-18 | Adopt R21: both absent counts as a developer no-show | answers Q18; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D28-both-absent.md` | none |
| D29 | 2026-10-18 | The one-month review counts from the start of the first test | answers Q19; settles D24's start point; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D29-review-from-test-start.md` | none |
| D30 | 2026-10-18 | Mentors enter test bank data during the first test | answers Q20; payment outside Stripe moved to Q25; the test cannot show A08; agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D30-test-bank-data.md` | none |
| D31 | 2026-10-18 | Placeholder terms of service until the switch to real payments | restates D23 for the terms; the answer "may change later" does not say whether the terms or the owner may change; no terms owner named (Q06); agreed for now | founder A | active | agreed for now; no date | superseding row by founder A | `[DOCUMENT]` `decisions/D31-placeholder-terms.md` | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Mentors with the right experience will accept and answer a question within the time a developer needs. `[ASSUMPTION]` session proposal | high | developers want "within the hour", "w dwadzieścia minut", "tego samego dnia"; no mentor was asked about availability; one answers "jak mam humor", one "między spotkaniami" | the product cannot meet the deadline-driven need it is built for | ask the warm-contact mentors (collection plan), then record how long bookings take to happen in the first test (D12, D23) | founder A | unknown | untested |
| A02 | Developers will pay in advance for a one-off session, not only say they would. `[ASSUMPTION]` session proposal | high | survey: 37 of 54 state they would pay something, 3 paid someone the last time they were stuck; the fintech developer paid Codementor once two years ago and did not go back; fintech developer "sam bym zapłacił. chyba"; freelancer "poniżej 200 zł … z własnego" | no revenue; the job may stay with free communities | count completed real prepayments once real payments are switched on; the first test runs on test payments and cannot answer this (D23) | founder A | after a terms owner exists (Q06) | untested |
| A03 | Enough mentors with the right experience will accept being listed in a searchable list beside others. `[ASSUMPTION]` follows from D06 | high | staff engineer: "nie wsadzajcie mnie na listę obok ludzi, których nie znam"; she would join if people she knows join; the Python mentor would join "jak ludzie, których znam" | too few mentors publish, or reluctant ones offer only their share link | invitation replies from the first batch of mentors, asking specifically about being listed (collection plan) | founder A | unknown | untested; D06 built through it |
| A04 | A prebooked 25/50-minute text session satisfies a "now" need. `[ASSUMPTION]` follows from D05 | high | staff engineer: "25 minut to uczciwie, większość pytań to 10"; developers ask for same-day, within-the-hour or twenty-minute answers; "jak booking trwa więcej niż pięć minut to robię rollback" | on-demand answers, not in Now (D05) and with no later timing decided, would need a founder decision | measure booking-to-session time in the first test | founder A | unknown | untested; D05 built through it |
| A05 | Mentors will join and stay for session income before the vault exists. `[ASSUMPTION]` session proposal; D11 treats a live text session as meeting the workshop's aim | medium | two mentors say the notes doc is the value; staff engineer: a month without bookings → "zapomnę, że to istnieje"; one would join if people they know join | mentors decline or lapse; the deferred vault becomes a precondition | invitation replies from the first batch of mentors; staying for income needs real payments, which the first test does not have (D23) | founder A | unknown | untested |
| A06 | Text-only fits the main uses. `[ASSUMPTION]` N01 | medium | survey: text 33, call 9, depends 12; the freelancer, one of three developer problem accounts, wants a call for estimates ("do wyceny rozmowa") and text for bugs | estimate-type questions are outside what Now serves | watch declined or abandoned estimate-type questions | founder A | unknown | untested |
| A07 | Stripe supports collecting a mentor's payout details at profile creation, a fee-inclusive price with a 20% platform share, and same-day refunds. `[ASSUMPTION]` no material | medium | none | the payment stories need a different design | founder B checks Stripe documentation (collection plan) | founder B | before the payment stories | untested |
| A08 | Mentors will give bank details when creating a profile, before any booking. `[ASSUMPTION]` follows from D19 | high | the Python mentor: "jak chcecie mój numer konta, zanim ktokolwiek mnie zabookował, to nie"; the same mentor tolerates twenty minutes of setup at most | invited mentors abandon profile creation | ask warm-contact mentors (collection plan); the first test cannot show it because mentors enter test bank data (D30); count drop-off at profile creation once real payments start | founder A | after real payments start | untested; D19 built through it |

## Kill criteria

No stopping result is set in advance. The founders measure the first test's results one month after it starts (D29) and decide then whether to continue, revise or stop (D24). `[DOCUMENT]` `decisions/D24-decide-after-one-month.md`

## Hypotheses to test

None. No synthetic walkthrough has been run.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Is the first build the paid one-off text session, with vault, subscription and MCP deferred? | was yes | founder A | closed by D04 |
| Q02 | How does a developer who knows no mentor find one? | was yes | founder A | closed by D06 |
| Q03 | Who sets the session price, and what commission does the platform take? | was yes | founder A | closed by D07 |
| Q04 | Where does the text session take place, and what marks its start? | was yes | founder A with founder B | closed by D09 and D15; the end moved to Q17 |
| Q05 | Are R06 and R07 the no-show rules? | was yes | founder A | closed by D08 |
| Q06 | Who owns terms of service and data processing for both roles? | yes — switching to real payments; not the build or the first test (D23, D31) | founder A | open; placeholder terms until the switch (D31) |
| Q07 | Does a vault answer cite the mentor and the note? | was no | founder B | closed by D25 |
| Q08 | What result of the first test would make the founders continue, revise or stop, and by when? | was yes | founder A | closed by D24 and D29: decide one month after the test starts, no result set in advance |
| Q09 | Is Now a prebooked slot or an on-demand request? | was yes | founder A | closed by D05 |
| Q10 | Does the first test run before or after the build? | was yes | founder A | closed by D12 |
| Q11 | Does a live text session meet the workshop's goal of earning "without a call"? | was yes | founder A | closed by D11 |
| Q12 | Does Now fit the 25 hours of build time? | was yes | founder B | closed by D13 |
| Q13 | Until when can a developer cancel for free? | was yes | founder A | closed by D16 |
| Q14 | How do mentors sign in? | was yes | founder A | closed by D14 |
| Q15 | Do mentors' own share links stay alongside the searchable list? | was no | founder A | closed by D20 |
| Q16 | What happens when a mentor cancels a booked session: refund timing, any limit or consequence for the mentor? | was yes — the mentor side of the cancellation story only | founder A | closed by D26; refund timing in Q24, penalty in Q22 |
| Q17 | Does a session end automatically 25 or 50 minutes after the booked start? | was yes — the session story | founder A | overtime closed by D27; automatic close moved to Q23 |
| Q18 | If neither side writes within 5 minutes of the start, is the developer refunded, the mentor paid, or something else? | was yes — the no-show handling in the payment stories | founder A | closed by D28 |
| Q19 | One month after what: the start of the first test, or the first booking? | was no — only the date of the review (D24) | founder A | closed by D29 |
| Q20 | During the first test, are mentors paid at all outside Stripe, and do they enter real bank details or test data? | was no for the build; yes for reading A05 and A08 | founder A | closed by D30; payment outside Stripe moved to Q25 |
| Q21 | Which developers will book during the first test, and through what channel? | yes — running the first test | founder A | open; the founders do not know yet |
| Q22 | What penalty applies after a mentor's second cancellation in a month? | no, in the agent's judgement — the first build can count cancellations without enforcing a penalty, once Q24 settles what is counted | founder A | open |
| Q23 | Does a session close automatically at 25 or 50 minutes, or at the end of agreed overtime? | yes — the session story | founder A | open |
| Q24 | For mentor cancellations (R19): is the developer refunded the same day; is "a month" a calendar month or 30 days; does a mentor no-show count toward the 2; is there a cut-off before the start? | yes — the mentor-cancellation story | founder A | open |
| Q25 | During the first test, are mentors paid at all outside Stripe? | no — reading A05 only | founder A | open |

## Definition of Ready addendum (own)

Problems and Target group have direct support. For developers it comes from three interviews and the Discord export and survey; for mentors, from three interviews. All quantitative data comes from one community, and payment is stated intent only. The founders agreed the Now scope for now (D04–D31), relayed by the developer running the session. Three of those choices were made against parts of the evidence (D05 against A04, D06 against A03, D19 against A08). The founders chose to build through those risks and measure them; that is a decision, not evidence that the assumptions hold. No assumption has been tested. The first test runs on test payments (D23), so it cannot test whether developers pay (A02) or whether mentors stay for income (A05), and because mentors enter test bank data (D30) it cannot test real bank-detail entry (A08). Ready for implementation planning of the Now scope on test payments, except the session's close, which waits for Q23, and mentor cancellations, which wait for Q24. The payment stories should wait for founder B's Stripe check (A07). Running the first test needs developers to book, and how they are recruited is open (Q21). Switching to real payments waits for a terms-of-service owner (Q06). No named owner has signed this readiness, and the repository has no ticket-level Definition of Ready configured.

## Collection plan

### How quickly can mentors answer, how many hours would they give, at what price, and will they accept being listed and giving bank details up front?

- What decision or work needs it: A01, A03, A05, A08
- Who can answer it: the candidate mentors with a warm contact (29 on the list)
- How: short interviews or messages when the first invitations go out; ask about the last time they answered someone's question, how long it took, what they would charge, how they feel about appearing in a searchable list, and whether they would enter bank details before any booking
- Owner and by when: founder A; unknown
- Template: `.ai/specs/research/templates/interview-note.md`

### How often does a developer hit such a blocker, and how long can they wait for an answer?

- What decision or work needs it: A04, the frequency gap under Problems
- Who can answer it: employed developers and freelancers with a recent blocker; the survey is anonymous and the export is de-identified, so a channel to reach them is still unknown
- How: interviews about the last real case, recruited through a channel the founders choose (for example a new opt-in post in the same Discord)
- Owner and by when: unknown
- Template: `.ai/specs/research/templates/interview-note.md`

### Can Stripe collect mentor payout details at profile creation, charge a fee-inclusive price with a 20% platform share, and refund the same day?

- What decision or work needs it: R06, R14, R16, A07
- Who can answer it: founder B (tech lead)
- How: documentation check of Stripe's marketplace payouts and refunds
- Owner and by when: founder B; before the payment stories
- Template: `.ai/specs/research/templates/data-request.md`
