import { and, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  attendees,
  events,
  feedback,
  questions,
  questionVotes,
} from "@/db/schema";
import { getAttendeeId } from "@/lib/session";
import AutoRefresh from "@/components/AutoRefresh";
import CheckInForm from "./CheckInForm";
import EventHub from "./EventHub";

export default async function EventPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const event = db.select().from(events).where(eq(events.code, code)).get();
  if (!event || event.status === "draft") notFound();

  const attendeeId = await getAttendeeId(event.id);
  const attendee = attendeeId
    ? db
        .select()
        .from(attendees)
        .where(
          and(eq(attendees.id, attendeeId), eq(attendees.eventId, event.id)),
        )
        .get()
    : undefined;

  if (!attendee) {
    return (
      <CheckInForm
        code={code}
        title={event.title}
        date={event.date}
        location={event.location}
        closed={event.status === "closed"}
      />
    );
  }

  const questionRows = db
    .select({
      id: questions.id,
      body: questions.body,
      answered: questions.answered,
      createdAt: questions.createdAt,
      attendeeId: questions.attendeeId,
      askerName: attendees.name,
      votes: count(questionVotes.attendeeId),
    })
    .from(questions)
    .leftJoin(attendees, eq(questions.attendeeId, attendees.id))
    .leftJoin(questionVotes, eq(questionVotes.questionId, questions.id))
    .where(eq(questions.eventId, event.id))
    .groupBy(questions.id)
    .all();

  const myVotes = new Set(
    db
      .select({ questionId: questionVotes.questionId })
      .from(questionVotes)
      .where(eq(questionVotes.attendeeId, attendee.id))
      .all()
      .map((v) => v.questionId),
  );

  const myFeedback = db
    .select()
    .from(feedback)
    .where(
      and(
        eq(feedback.eventId, event.id),
        eq(feedback.attendeeId, attendee.id),
      ),
    )
    .get();

  const sorted = [...questionRows].sort(
    (a, b) => b.votes - a.votes || a.createdAt - b.createdAt,
  );

  return (
    <>
      <AutoRefresh intervalMs={10000} />
      <EventHub
        code={code}
        event={{
          title: event.title,
          date: event.date,
          location: event.location,
          primer: event.primer,
          closed: event.status === "closed",
        }}
        attendeeName={attendee.name}
        questions={sorted.map((q) => ({
          id: q.id,
          body: q.body,
          answered: q.answered === 1,
          votes: q.votes,
          voted: myVotes.has(q.id),
          mine: q.attendeeId === attendee.id,
          askerName: q.askerName ?? "Anonymous",
        }))}
        myFeedback={
          myFeedback
            ? {
                interest: myFeedback.interest,
                wouldJoin: myFeedback.wouldJoin,
                body: myFeedback.body,
              }
            : null
        }
      />
    </>
  );
}
