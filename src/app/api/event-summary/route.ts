import Anthropic from "@anthropic-ai/sdk";
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

export const maxDuration = 60;

const SYSTEM_PROMPT = `You write post-event debriefs for the AI Fund team after EIR (Engineer in Residence) recruiting events. At these events an idea is presented to senior engineers who ask questions and leave structured feedback. You will receive the event's primer plus all attendee, question, and feedback data.

Write a Markdown debrief with exactly these sections:

## TL;DR
2-3 bullets: overall reception and the single most important takeaway.

## How it landed
Grounded in the numbers provided (excitement, would-join, participation). Brief.

## Question themes
Cluster the questions into 2-4 themes. Call out unanswered questions the team owes answers on.

## Feedback themes
Synthesize the vision / challenges / assumptions-to-validate responses. Highlight recurring concerns and the assumptions candidates most want tested.

## Standout candidates
2-4 attendees showing the strongest signals (high excitement, would-join yes, substantive feedback or questions). Name them and cite the specific evidence. Only use people in the data.

## Suggested follow-ups
Concrete next actions: who to contact first and why, which unanswered questions to address, what to validate before the next event.

Rules: stay strictly faithful to the data — never invent attendees, quotes, or numbers. Be direct and specific; quote short fragments where useful. Keep it under 500 words total. Output only the Markdown.`;

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "AI summary is not configured. Set the ANTHROPIC_API_KEY environment variable to enable it.",
      },
      { status: 503 },
    );
  }

  const { eventId } = (await request.json().catch(() => ({}))) as {
    eventId?: string;
  };
  if (!eventId) {
    return Response.json({ error: "Missing eventId." }, { status: 400 });
  }

  const db = await getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

  const attendeeRows = await db
    .select()
    .from(attendees)
    .where(eq(attendees.eventId, eventId));
  const questionRows = await db
    .select({
      body: questions.body,
      answered: questions.answered,
      askerName: attendees.name,
      votes: count(questionVotes.attendeeId),
    })
    .from(questions)
    .leftJoin(attendees, eq(questions.attendeeId, attendees.id))
    .leftJoin(questionVotes, eq(questionVotes.questionId, questions.id))
    .where(eq(questions.eventId, eventId))
    .groupBy(questions.id, attendees.id);
  const feedbackRows = await db
    .select({
      interest: feedback.interest,
      wouldJoin: feedback.wouldJoin,
      vision: feedback.vision,
      challenges: feedback.challenges,
      assumptions: feedback.assumptions,
      body: feedback.body,
      name: attendees.name,
    })
    .from(feedback)
    .leftJoin(attendees, eq(feedback.attendeeId, attendees.id))
    .where(eq(feedback.eventId, eventId));

  if (attendeeRows.length === 0) {
    return Response.json(
      { error: "No attendees yet — there is nothing to summarize." },
      { status: 400 },
    );
  }

  const feedbackByName = new Map(feedbackRows.map((f) => [f.name, f]));
  const lines: string[] = [
    `Event: ${event.title} (${event.date})`,
    `Primer shown to candidates:\n${event.primer || "(none)"}`,
    ``,
    `Attendees (${attendeeRows.length}):`,
    ...attendeeRows.map((a) => {
      const f = feedbackByName.get(a.name);
      const bits = [
        a.role && a.company
          ? `${a.role} @ ${a.company}`
          : (a.role ?? a.company ?? "role unknown"),
        f?.interest != null ? `excitement ${f.interest}/5` : "no rating",
        f?.wouldJoin ? `would join: ${f.wouldJoin}` : "would join: no answer",
      ];
      return `- ${a.name} (${bits.join("; ")})`;
    }),
    ``,
    `Questions (${questionRows.length}):`,
    ...questionRows
      .sort((a, b) => b.votes - a.votes)
      .map(
        (q) =>
          `- "${q.body}" — ${q.votes} upvotes, ${q.answered ? "answered" : "UNANSWERED"}, asked by ${q.askerName ?? "unknown"}`,
      ),
    ``,
    `Written feedback:`,
    ...feedbackRows.flatMap((f) => {
      const parts: string[] = [];
      if (f.vision) parts.push(`  vision: ${f.vision}`);
      if (f.challenges) parts.push(`  challenges: ${f.challenges}`);
      if (f.assumptions) parts.push(`  assumptions to validate: ${f.assumptions}`);
      if (f.body) parts.push(`  other: ${f.body}`);
      return parts.length > 0 ? [`- ${f.name ?? "unknown"}:`, ...parts] : [];
    }),
  ];

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: lines.join("\n") }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "The AI declined to process this content." },
        { status: 422 },
      );
    }

    const summary = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!summary) {
      return Response.json(
        { error: "Generation returned no text — please try again." },
        { status: 502 },
      );
    }

    await db
      .update(events)
      .set({ aiSummary: summary, aiSummaryAt: Date.now() })
      .where(eq(events.id, eventId));

    return Response.json({ summary });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "The configured ANTHROPIC_API_KEY is invalid." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "AI service is rate-limited right now — try again in a minute." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `AI summary failed (${error.status}). Please try again.` },
        { status: 502 },
      );
    }
    throw error;
  }
}
