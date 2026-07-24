import {
  bigint,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  location: text("location"),
  primer: text("primer").notNull().default(""),
  nda: text("nda").notNull().default(""),
  status: text("status").notNull().default("live"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const attendees = pgTable(
  "attendees",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role"),
    company: text("company"),
    linkedin: text("linkedin"),
    ndaAcceptedAt: bigint("nda_accepted_at", { mode: "number" }),
    checkedInAt: bigint("checked_in_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("attendee_event_email").on(t.eventId, t.email)],
);

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  attendeeId: text("attendee_id").notNull(),
  body: text("body").notNull(),
  answered: integer("answered").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const questionVotes = pgTable(
  "question_votes",
  {
    questionId: text("question_id").notNull(),
    attendeeId: text("attendee_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.attendeeId] })],
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    attendeeId: text("attendee_id").notNull(),
    interest: integer("interest"),
    wouldJoin: text("would_join"),
    vision: text("vision"),
    challenges: text("challenges"),
    assumptions: text("assumptions"),
    body: text("body"),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("feedback_event_attendee").on(t.eventId, t.attendeeId)],
);

export type Event = typeof events.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;

export type EventStatus = "draft" | "live" | "closed";
export type WouldJoin = "yes" | "maybe" | "no";
