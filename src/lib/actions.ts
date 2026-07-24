"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  attendees,
  events,
  feedback,
  questions,
  questionVotes,
} from "@/db/schema";
import { newId, shortCode } from "@/lib/id";
import {
  adminPassword,
  clearAdminCookie,
  getAttendeeId,
  isAdmin,
  requireAdmin,
  setAdminCookie,
  setAttendeeCookie,
} from "@/lib/session";

export type ActionState = { error?: string; ok?: boolean };

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

// ---------- Admin auth ----------

export async function adminLogin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password !== adminPassword()) {
    return { error: "Incorrect password." };
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}

// ---------- Admin: events ----------

function eventFields(formData: FormData) {
  return {
    title: str(formData, "title"),
    date: str(formData, "date"),
    location: str(formData, "location") || null,
    primer: String(formData.get("primer") ?? "").trim(),
    status: str(formData, "status") || "draft",
  };
}

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const fields = eventFields(formData);
  if (!fields.title || !fields.date) {
    return { error: "Title and date are required." };
  }
  const db = await getDb();
  const id = newId();
  await db
    .insert(events)
    .values({ id, code: shortCode(), createdAt: Date.now(), ...fields });
  redirect(`/admin/events/${id}`);
}

export async function updateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = str(formData, "id");
  const fields = eventFields(formData);
  if (!fields.title || !fields.date) {
    return { error: "Title and date are required." };
  }
  const db = await getDb();
  await db.update(events).set(fields).where(eq(events.id, id));
  redirect(`/admin/events/${id}`);
}

export async function setEventStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["draft", "live", "closed"].includes(status)) return;
  const db = await getDb();
  await db.update(events).set({ status }).where(eq(events.id, id));
  revalidatePath(`/admin/events/${id}`);
}

export async function markAnswered(formData: FormData): Promise<void> {
  await requireAdmin();
  const questionId = str(formData, "questionId");
  const eventId = str(formData, "eventId");
  const answered = str(formData, "answered") === "1" ? 1 : 0;
  const db = await getDb();
  await db.update(questions).set({ answered }).where(eq(questions.id, questionId));
  revalidatePath(`/admin/events/${eventId}`);
}

// ---------- Candidate flow ----------

async function liveEventByCode(code: string) {
  const db = await getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.code, code))
    .limit(1);
  if (!event || event.status !== "live") return null;
  return event;
}

export async function checkIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = str(formData, "code").toUpperCase();
  const event = await liveEventByCode(code);
  if (!event) return { error: "This event is not open for check-in." };

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  if (!name || !email || !email.includes("@")) {
    return { error: "Please enter your name and a valid email." };
  }
  const role = str(formData, "role") || null;
  const linkedin = str(formData, "linkedin") || null;

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.eventId, event.id), eq(attendees.email, email)))
    .limit(1);

  let attendeeId: string;
  if (existing) {
    attendeeId = existing.id;
    await db
      .update(attendees)
      .set({
        name,
        role: role ?? existing.role,
        linkedin: linkedin ?? existing.linkedin,
      })
      .where(eq(attendees.id, attendeeId));
  } else {
    attendeeId = newId();
    await db.insert(attendees).values({
      id: attendeeId,
      eventId: event.id,
      name,
      email,
      role,
      linkedin,
      checkedInAt: Date.now(),
    });
  }

  await setAttendeeCookie(event.id, attendeeId);
  revalidatePath(`/e/${code}`);
  return { ok: true };
}

async function requireAttendee(code: string) {
  const event = await liveEventByCode(code);
  if (!event) return null;
  const attendeeId = await getAttendeeId(event.id);
  if (!attendeeId) return null;
  const db = await getDb();
  const [attendee] = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.id, attendeeId), eq(attendees.eventId, event.id)))
    .limit(1);
  if (!attendee) return null;
  return { event, attendee };
}

export async function askQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = str(formData, "code").toUpperCase();
  const ctx = await requireAttendee(code);
  if (!ctx) return { error: "Please check in first." };

  const body = str(formData, "body").slice(0, 1000);
  if (!body) return { error: "Question cannot be empty." };

  const db = await getDb();
  await db.insert(questions).values({
    id: newId(),
    eventId: ctx.event.id,
    attendeeId: ctx.attendee.id,
    body,
    answered: 0,
    createdAt: Date.now(),
  });
  revalidatePath(`/e/${code}`);
  return { ok: true };
}

export async function toggleVote(formData: FormData): Promise<void> {
  const code = str(formData, "code").toUpperCase();
  const questionId = str(formData, "questionId");
  const ctx = await requireAttendee(code);
  if (!ctx) return;

  const db = await getDb();
  const [question] = await db
    .select()
    .from(questions)
    .where(
      and(eq(questions.id, questionId), eq(questions.eventId, ctx.event.id)),
    )
    .limit(1);
  if (!question) return;

  const inserted = await db
    .insert(questionVotes)
    .values({ questionId, attendeeId: ctx.attendee.id })
    .onConflictDoNothing()
    .returning({ questionId: questionVotes.questionId });
  if (inserted.length === 0) {
    await db
      .delete(questionVotes)
      .where(
        and(
          eq(questionVotes.questionId, questionId),
          eq(questionVotes.attendeeId, ctx.attendee.id),
        ),
      );
  }
  revalidatePath(`/e/${code}`);
}

export async function submitFeedback(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = str(formData, "code").toUpperCase();
  const ctx = await requireAttendee(code);
  if (!ctx) return { error: "Please check in first." };

  const interestRaw = Number(str(formData, "interest"));
  const interest = interestRaw >= 1 && interestRaw <= 5 ? interestRaw : null;
  const wouldJoinRaw = str(formData, "wouldJoin");
  const wouldJoin = ["yes", "maybe", "no"].includes(wouldJoinRaw)
    ? wouldJoinRaw
    : null;
  const body = str(formData, "body").slice(0, 4000) || null;

  if (interest === null && wouldJoin === null && !body) {
    return { error: "Add a rating or some thoughts before saving." };
  }

  const db = await getDb();
  await db
    .insert(feedback)
    .values({
      id: newId(),
      eventId: ctx.event.id,
      attendeeId: ctx.attendee.id,
      interest,
      wouldJoin,
      body,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [feedback.eventId, feedback.attendeeId],
      set: { interest, wouldJoin, body, updatedAt: Date.now() },
    });
  revalidatePath(`/e/${code}`);
  return { ok: true };
}

// ---------- Shared ----------

export async function checkIsAdmin(): Promise<boolean> {
  return isAdmin();
}
