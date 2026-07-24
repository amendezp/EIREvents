# EIR Events

A companion app for AI Fund's EIR (Engineer in Residence) recruiting events.
Candidates check in from their phones, read the idea primer, ask and upvote
questions, and share structured feedback. Organizers get a desktop dashboard
with live attendance, engagement metrics, and CSV exports for follow-up.

## How it works

**Candidate flow (mobile-first)** — each event gets a short code and a QR code.
Attendees scan it, land on `/e/<CODE>`, and:

1. **Check in** — name, email, role, company, LinkedIn (30 seconds, no account)
2. **NDA** (if the event has one) — read and accept before anything else is
   shown; acceptance is recorded with a timestamp
3. **The Idea** — read the primer for the idea being presented (Markdown)
4. **Q&A** — ask questions and upvote others' questions; answered questions get
   marked live, and unanswered ones are captured for follow-up
5. **Your Take** — excitement rating (1–5), "could you see yourself building
   this?" (yes / maybe / not now), plus vision, main challenges, assumptions to
   validate, and free-form feedback — editable any time

**Admin dashboard (desktop, at `/admin`)** — password-protected:

- Create/edit events with a Markdown primer; status controls what attendees see
  (`draft` hidden → `live` open → `closed` read-only)
- AI primer generator: upload a deck/memo (PDF, DOCX, TXT, MD) or record a
  voice note (transcribed in the browser) and Claude drafts a high-level,
  discussion-ready primer you review before saving
- Optional per-event NDA (Markdown, with a one-click standard template);
  attendees must accept it after check-in, and acceptance timestamps appear
  in the attendee table and CSV export
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
| Data | Postgres + Drizzle ORM | `DATABASE_URL` in production (Neon on Vercel, or any Postgres); zero-setup embedded Postgres (PGlite) for local dev — same dialect everywhere |
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

- `DATABASE_URL` — Postgres connection string (**required in production**);
  when unset locally, an embedded Postgres (PGlite) in `./data/pg` is used
- `ADMIN_PASSWORD` — admin dashboard password (**required in production**)
- `SESSION_SECRET` — cookie-signing secret (falls back to `ADMIN_PASSWORD`)
- `ANTHROPIC_API_KEY` — enables the AI primer generator (optional; the rest
  of the app works without it)
- `DATA_DIR` — where the local PGlite dev database lives (default `./data`)

## Testing

With the server running and demo data seeded:

```bash
node scripts/smoke-e2e.mjs
```

Drives the full flow in a headless browser: check-in → primer → ask/upvote a
question → submit feedback → admin login → verify the dashboard shows it all →
mark answered → CSV export. Set `CHROMIUM_PATH` to use a pre-installed
Chromium instead of Playwright's managed download.

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new) — Next.js is
   auto-detected, no build settings needed.
2. Add a database: in the Vercel project, **Storage → Create Database → Neon**
   (free tier is fine). This injects `DATABASE_URL` automatically. Any other
   Postgres provider works too — just set `DATABASE_URL` yourself, using the
   provider's *pooled* connection string if it offers one.
3. Set env vars (Project → Settings → Environment Variables):
   `ADMIN_PASSWORD` (strong value), `SESSION_SECRET` (long random string),
   and optionally `ANTHROPIC_API_KEY` for the AI primer generator.
4. Deploy. Tables are created automatically on first request; run
   `DATABASE_URL=<prod-url> npm run seed` locally if you want the demo event
   in production.

The QR code and join links are derived from the request host, so they work on
any domain you attach with no extra config.

## Roadmap ideas

- Server-side voice transcription (current voice notes use the browser's
  Web Speech API, which works in Chrome/Safari but not Firefox)
- AI summary of questions + feedback per event (themes, objections, standouts)
- Per-organizer accounts instead of a shared password
- SSE for instant question updates on the projected screen
- Follow-up email drafts from the attendee + feedback data
- Cross-event candidate history (saw idea X and Y, engagement over time)

## Data model

`events` → `attendees` (unique per event by email) → `questions` (+
`question_votes`, one per attendee per question) and `feedback` (one editable
row per attendee per event: excitement 1–5, would-join, free text).
