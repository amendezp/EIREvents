import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  attendees,
  events,
  feedback,
  questions,
  questionVotes,
} from "@/db/schema";
import { isAdmin } from "@/lib/session";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event) return new Response("Not found", { status: 404 });

  const type = new URL(request.url).searchParams.get("type") ?? "attendees";

  let csv: string;
  let filename: string;

  if (type === "questions") {
    const rows = (
      await db
        .select({
          body: questions.body,
          answered: questions.answered,
          createdAt: questions.createdAt,
          askerName: attendees.name,
          askerEmail: attendees.email,
          votes: count(questionVotes.attendeeId),
        })
        .from(questions)
        .leftJoin(attendees, eq(questions.attendeeId, attendees.id))
        .leftJoin(questionVotes, eq(questionVotes.questionId, questions.id))
        .where(eq(questions.eventId, id))
        .groupBy(questions.id, attendees.id)
    ).sort((a, b) => b.votes - a.votes);

    csv = toCsv(
      ["question", "asked_by", "email", "upvotes", "answered", "asked_at"],
      rows.map((q) => [
        q.body,
        q.askerName,
        q.askerEmail,
        q.votes,
        q.answered ? "yes" : "no",
        new Date(q.createdAt).toISOString(),
      ]),
    );
    filename = `eir-${event.code}-questions.csv`;
  } else {
    const attendeeRows = await db
      .select()
      .from(attendees)
      .where(eq(attendees.eventId, id));
    const feedbackRows = await db
      .select()
      .from(feedback)
      .where(eq(feedback.eventId, id));
    const feedbackByAttendee = new Map(
      feedbackRows.map((f) => [f.attendeeId, f]),
    );

    csv = toCsv(
      [
        "name",
        "email",
        "role",
        "company",
        "linkedin",
        "checked_in_at",
        "nda_accepted_at",
        "excitement_1_5",
        "would_join",
        "vision",
        "challenges",
        "assumptions_to_validate",
        "feedback",
      ],
      attendeeRows.map((a) => {
        const f = feedbackByAttendee.get(a.id);
        return [
          a.name,
          a.email,
          a.role,
          a.company,
          a.linkedin,
          new Date(a.checkedInAt).toISOString(),
          a.ndaAcceptedAt ? new Date(a.ndaAcceptedAt).toISOString() : null,
          f?.interest,
          f?.wouldJoin,
          f?.vision,
          f?.challenges,
          f?.assumptions,
          f?.body,
        ];
      }),
    );
    filename = `eir-${event.code}-attendees.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
