# EIR Events

A companion app for AI Fund's EIR (Engineer in Residence) recruiting events.
Candidates check in from their phones, read the idea primer, ask and upvote
questions, and share structured feedback. Organizers get a desktop dashboard
with live attendance, engagement metrics, and CSV exports for follow-up.

## How it works

**Candidate flow (mobile-first)** — each event gets a short code and a QR code.
Attendees scan it, land on `/e/<CODE>`, and:

1. **Check in** — name, email, current role, LinkedIn (30 seconds, no account)
2. **The Idea** — read the primer for the idea being presented (Markdown)
3. **Q&A** — ask questions and upvote others' questions; answered questions get
   marked live, and unanswered ones are captured for follow-up
4. **Your Take** — excitement rating (1–5), "could you see yourself building
   this?" (yes / maybe / not now), and free-form feedback — editable any time

**Admin dashboard (desktop, at `/admin`)** — password-protected:

- Create/edit events with a Markdown primer; status controls what attendees see
  (`draft` hidden → `live` open → `closed` read-only)
- Projectable QR code + join link per event
- Live metrics: check-ins, open questions, average excitement, would-join
  breakdown, excitement distribution (auto-refreshes every few seconds)
- Question triage sorted by upvotes with mark-answered workflow
- Full feedback and attendee tables, plus attendees/questions CSV exports

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router, TypeScript) | one deployable serves the mobile web app + admin; server actions handle all writes without separate API plumbing |
| UI | Tailwind CSS v4 | fast to iterate, mobile-first |
| Data | SQLite via better-sqlite3 + Drizzle ORM | zero-setup for event-scale data (tens of attendees); swap the Drizzle driver for Postgres when needed |
| Auth | signed HTTP-only cookies | admin: shared password; attendees: per-event signed cookie set at check-in — no accounts to slow people down |
| Live-ish updates | lightweight polling (`router.refresh()`) | plenty for a room of ~30 people; upgradeable to SSE/websockets later |

## Getting started

```bash
npm install
npm run seed     # optional: creates demo event DEMO42 with sample data
npm run dev
```

- Attendee view: http://localhost:3000/e/DEMO42
- Admin: http://localhost:3000/admin — password `eir-admin` (dev default)

## Configuration

Copy `.env.example` to `.env.local`:

- `ADMIN_PASSWORD` — admin dashboard password (**required in production**)
- `SESSION_SECRET` — cookie-signing secret (falls back to `ADMIN_PASSWORD`)
- `DATA_DIR` — where `eirevents.db` lives (default `./data`); point it at a
  persistent volume in production

## Testing

With the server running and demo data seeded:

```bash
node scripts/smoke-e2e.mjs
```

Drives the full flow in a headless browser: check-in → primer → ask/upvote a
question → submit feedback → admin login → verify the dashboard shows it all →
mark answered → CSV export.

## Deployment notes

SQLite means the app needs a host with a persistent disk (Fly.io, Railway,
Render, a VM) rather than serverless. Set `ADMIN_PASSWORD` and
`SESSION_SECRET`, mount a volume, and point `DATA_DIR` at it.

## Roadmap ideas

- AI summary of questions + feedback per event (themes, objections, standouts)
- Per-organizer accounts instead of a shared password
- SSE for instant question updates on the projected screen
- Follow-up email drafts from the attendee + feedback data
- Cross-event candidate history (saw idea X and Y, engagement over time)

## Data model

`events` → `attendees` (unique per event by email) → `questions` (+
`question_votes`, one per attendee per question) and `feedback` (one editable
row per attendee per event: excitement 1–5, would-join, free text).
