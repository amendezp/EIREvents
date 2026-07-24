import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

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
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  linkedin TEXT,
  checked_in_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS attendee_event_email ON attendees(event_id, email);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  attendee_id TEXT NOT NULL,
  body TEXT NOT NULL,
  answered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
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
  body TEXT,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS feedback_event_attendee ON feedback(event_id, attendee_id);
`;

function createDb() {
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(path.join(dataDir, "eirevents.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  return drizzle(sqlite, { schema });
}

// Reuse a single connection across dev hot reloads.
const globalForDb = globalThis as unknown as {
  __eirDb?: BetterSQLite3Database<typeof schema>;
};

export const db = (globalForDb.__eirDb ??= createDb());
