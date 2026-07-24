// Seeds a demo event so the dashboard has something to show.
// Usage: npm run seed
// Uses DATABASE_URL (Postgres) when set, otherwise the local PGlite dev database.
// Keep the DDL in sync with src/db/index.ts.
import crypto from "node:crypto";
import path from "node:path";

const DDL = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  date TEXT NOT NULL, location TEXT, primer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live', created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
  role TEXT, linkedin TEXT, checked_in_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS attendee_event_email ON attendees(event_id, email);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL, attendee_id TEXT NOT NULL,
  body TEXT NOT NULL, answered INTEGER NOT NULL DEFAULT 0, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS question_votes (
  question_id TEXT NOT NULL, attendee_id TEXT NOT NULL,
  PRIMARY KEY (question_id, attendee_id)
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL, attendee_id TEXT NOT NULL,
  interest INTEGER, would_join TEXT, body TEXT, updated_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS feedback_event_attendee ON feedback(event_id, attendee_id);
`;

async function connect() {
  if (process.env.DATABASE_URL) {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    return {
      query: (sql, params) => client.query(sql, params),
      exec: (sql) => client.query(sql),
      end: () => client.end(),
      kind: "postgres (DATABASE_URL)",
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const fs = await import("node:fs");
  const dataDir = path.join(process.env.DATA_DIR ?? process.cwd(), "data", "pg");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return {
    query: (sql, params) => client.query(sql, params),
    exec: (sql) => client.exec(sql),
    end: () => client.close(),
    kind: "PGlite (local dev)",
  };
}

const db = await connect();
console.log(`Seeding via ${db.kind}`);
await db.exec(DDL);

const id = () => crypto.randomUUID();
const now = Date.now();
const CODE = "DEMO42";

const existing = await db.query("SELECT id FROM events WHERE code = $1", [CODE]);
if (existing.rows.length > 0) {
  console.log(`Demo event ${CODE} already exists — nothing to do.`);
  await db.end();
  process.exit(0);
}

const eventId = id();
const primer = `# AI Sales Coach

**One-liner:** An AI copilot that listens to sales calls and coaches reps in real time — like having your best sales manager on every call.

## The problem

Ramping a new sales rep takes 6–9 months, and most coaching happens on <5% of calls. Managers can't scale themselves, and recorded-call tools only tell you what went wrong *after* the deal is lost.

## Why now

- Real-time speech models are finally fast and cheap enough for live coaching
- Sales teams already record everything — the data exists
- Post-COVID sales orgs are remote-first: coaching moved from the sales floor to nowhere

## What we'd build first

1. Live call companion: objection detection + suggested responses
2. Post-call scorecards tied to the team's actual playbook
3. Manager dashboard: who needs coaching on what, this week

## Open questions for you

- Would reps trust (or resent) a live copilot?
- What's the wedge: the rep, the manager, or enablement?
- What would make you leave your job to build this?`;

await db.query(
  "INSERT INTO events (id, code, title, date, location, primer, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
  [
    eventId,
    CODE,
    "EIR Dinner — Idea: AI Sales Coach",
    new Date().toISOString().slice(0, 10),
    "AI Fund office, Palo Alto",
    primer,
    "live",
    now,
  ],
);

const people = [
  ["Maya Chen", "maya@example.com", "Staff Engineer @ Stripe", 5, "yes", "Love the wedge via managers. I'd want to see latency numbers for real-time coaching before committing to an approach."],
  ["Diego Ramos", "diego@example.com", "Founding Engineer @ (prev) Rippling", 4, "maybe", "Strong idea but crowded space — Gong will move here. The playbook-specific scorecards feel like the real moat."],
  ["Priya Natarajan", "priya@example.com", "Senior SWE @ Google", 3, "maybe", null],
  ["Sam Okafor", "sam@example.com", "EM @ Series B startup", 4, "yes", "Reps will resent it unless it's framed as their tool, not surveillance. Ship the rep-facing value first."],
  ["Lena Fischer", "lena@example.com", "ML Engineer @ Meta", 2, "no", "Real-time ASR + suggestion quality is harder than it looks. I'd pick a narrower vertical."],
];

const attendeeIds = [];
for (const [i, [name, email, role, interest, wouldJoin, body]] of people.entries()) {
  const aid = id();
  attendeeIds.push(aid);
  await db.query(
    "INSERT INTO attendees (id, event_id, name, email, role, linkedin, checked_in_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [aid, eventId, name, email, role, null, now - (60 - i * 7) * 60000],
  );
  await db.query(
    "INSERT INTO feedback (id, event_id, attendee_id, interest, would_join, body, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id(), eventId, aid, interest, wouldJoin, body, now - i * 60000],
  );
}

const questionData = [
  ["What's the go-to-market — sell to the rep, the manager, or the CRO?", 0, 4, 1],
  ["How do you handle call recording consent across states/countries?", 1, 3, 1],
  ["Why won't Gong or Chorus just add this?", 0, 4, 0],
  ["What model latency have you validated for live suggestions?", 2, 2, 0],
  ["Is there a services-heavy onboarding risk with playbook ingestion?", 3, 1, 0],
];

for (const [i, [body, askerIdx, votes, answered]] of questionData.entries()) {
  const qid = id();
  await db.query(
    "INSERT INTO questions (id, event_id, attendee_id, body, answered, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [qid, eventId, attendeeIds[askerIdx], body, answered, now - (40 - i * 5) * 60000],
  );
  for (let v = 0; v < votes; v++) {
    await db.query(
      "INSERT INTO question_votes (question_id, attendee_id) VALUES ($1,$2)",
      [qid, attendeeIds[v]],
    );
  }
}

await db.end();
console.log(`Seeded demo event: code ${CODE}`);
console.log(`  Attendee view: http://localhost:3000/e/${CODE}`);
console.log("  Admin view:    http://localhost:3000/admin (password: eir-admin unless ADMIN_PASSWORD is set)");
