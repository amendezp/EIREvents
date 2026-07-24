import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  location: text("location"),
  primer: text("primer").notNull().default(""),
  status: text("status").notNull().default("live"),
  createdAt: integer("created_at").notNull(),
});

export const attendees = sqliteTable(
  "attendees",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role"),
    linkedin: text("linkedin"),
    checkedInAt: integer("checked_in_at").notNull(),
  },
  (t) => [uniqueIndex("attendee_event_email").on(t.eventId, t.email)],
);

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  attendeeId: text("attendee_id").notNull(),
  body: text("body").notNull(),
  answered: integer("answered").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const questionVotes = sqliteTable(
  "question_votes",
  {
    questionId: text("question_id").notNull(),
    attendeeId: text("attendee_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.attendeeId] })],
);

export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    attendeeId: text("attendee_id").notNull(),
    interest: integer("interest"),
    wouldJoin: text("would_join"),
    body: text("body"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("feedback_event_attendee").on(t.eventId, t.attendeeId)],
);

export type Event = typeof events.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;

export type EventStatus = "draft" | "live" | "closed";
export type WouldJoin = "yes" | "maybe" | "no";
