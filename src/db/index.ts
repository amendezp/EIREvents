import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

// Keep this DDL in sync with schema.ts (and scripts/seed.mjs).
const DDL = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  primer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live',
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  company TEXT,
  linkedin TEXT,
  checked_in_at BIGINT NOT NULL
);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS company TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS attendee_event_email ON attendees(event_id, email);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  attendee_id TEXT NOT NULL,
  body TEXT NOT NULL,
  answered INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS question_votes (
  question_id TEXT NOT NULL,
  attendee_id TEXT NOT NULL,
  PRIMARY KEY (question_id, attendee_id)
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  attendee_id TEXT NOT NULL,
  interest INTEGER,
  would_join TEXT,
  vision TEXT,
  challenges TEXT,
  assumptions TEXT,
  body TEXT,
  updated_at BIGINT NOT NULL
);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS challenges TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS assumptions TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_event_attendee ON feedback(event_id, attendee_id);
`;

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const pool = new Pool({ connectionString: url, max: 5 });
    const db = drizzleNodePg(pool, { schema });
    await pool.query(DDL);
    return db;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres database to the Vercel project " +
        "(Storage → Create Database → Neon, or any Postgres provider) and expose " +
        "its connection string as DATABASE_URL.",
    );
  }

  // Local development fallback: embedded Postgres (PGlite), persisted to ./data/pg.
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const dataDir = path.join(process.env.DATA_DIR ?? process.cwd(), "data", "pg");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.exec(DDL);
  // PGlite's drizzle instance shares the pg-dialect query API used here.
  return drizzlePglite(client, { schema }) as unknown as Db;
}

// Reuse a single connection (pool) across dev hot reloads and serverless warm starts.
const globalForDb = globalThis as unknown as { __eirDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  return (globalForDb.__eirDb ??= createDb());
}
