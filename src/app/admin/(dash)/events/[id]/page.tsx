import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import AutoRefresh from "@/components/AutoRefresh";
import CopyButton from "@/components/CopyButton";
import { getDb } from "@/db";
import {
  attendees,
  events,
  feedback,
  questions,
  questionVotes,
} from "@/db/schema";
import { markAnswered, setEventStatus } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";

const WOULD_JOIN_COLORS: Record<string, string> = {
  yes: "var(--series-1)",
  maybe: "var(--series-1-mid)",
  no: "var(--series-1-light)",
};

const WOULD_JOIN_LABELS: Record<string, string> = {
  yes: "Yes",
  maybe: "Maybe",
  no: "Not now",
};

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export default async function EventDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const db = await getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event) notFound();

  const attendeeRows = (
    await db.select().from(attendees).where(eq(attendees.eventId, id))
  ).sort((a, b) => a.checkedInAt - b.checkedInAt);

  const questionRows = (
    await db
      .select({
        id: questions.id,
        body: questions.body,
        answered: questions.answered,
        createdAt: questions.createdAt,
        askerName: attendees.name,
        votes: count(questionVotes.attendeeId),
      })
      .from(questions)
      .leftJoin(attendees, eq(questions.attendeeId, attendees.id))
      .leftJoin(questionVotes, eq(questionVotes.questionId, questions.id))
      .where(eq(questions.eventId, id))
      .groupBy(questions.id, attendees.id)
  ).sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt);

  const feedbackRows = (
    await db
      .select({
        id: feedback.id,
        interest: feedback.interest,
        wouldJoin: feedback.wouldJoin,
        vision: feedback.vision,
        challenges: feedback.challenges,
        assumptions: feedback.assumptions,
        body: feedback.body,
        updatedAt: feedback.updatedAt,
        name: attendees.name,
        email: attendees.email,
      })
      .from(feedback)
      .leftJoin(attendees, eq(feedback.attendeeId, attendees.id))
      .where(eq(feedback.eventId, id))
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const openQuestions = questionRows.filter((q) => q.answered === 0).length;
  const interestValues = feedbackRows
    .map((f) => f.interest)
    .filter((n): n is number => n !== null);
  const avgInterest =
    interestValues.length > 0
      ? interestValues.reduce((a, b) => a + b, 0) / interestValues.length
      : null;

  const interestDist = [1, 2, 3, 4, 5].map((level) => ({
    level,
    n: interestValues.filter((v) => v === level).length,
  }));
  const maxInterestCount = Math.max(1, ...interestDist.map((d) => d.n));

  const wouldJoinCounts = { yes: 0, maybe: 0, no: 0 };
  for (const f of feedbackRows) {
    if (f.wouldJoin && f.wouldJoin in wouldJoinCounts) {
      wouldJoinCounts[f.wouldJoin as keyof typeof wouldJoinCounts]++;
    }
  }
  const wouldJoinTotal =
    wouldJoinCounts.yes + wouldJoinCounts.maybe + wouldJoinCounts.no;

  const feedbackByAttendee = new Map(
    feedbackRows.map((f) => [f.email, f]),
  );

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const joinUrl = `${proto}://${host}/e/${event.code}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 480, margin: 1 });

  return (
    <main>
      <AutoRefresh intervalMs={8000} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            <Link
              href={`/admin/events/${id}/edit`}
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Edit
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            {event.date}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-300 bg-white p-0.5">
          {(["draft", "live", "closed"] as const).map((status) => (
            <form key={status} action={setEventStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  event.status === status
                    ? "bg-brand text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Join info */}
      <section className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {/* QR rendered at 2x for crisp projection */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code linking to ${joinUrl}`}
          className="h-28 w-28 rounded-md border border-zinc-200"
        />
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Attendee check-in
          </h2>
          <p className="mt-1 font-mono text-lg">{joinUrl}</p>
          <p className="mt-1 text-sm text-muted">
            Event code: <span className="font-mono font-medium">{event.code}</span>
          </p>
          <div className="mt-2 flex gap-2">
            <CopyButton text={joinUrl} />
            <a
              href={qrDataUrl}
              download={`eir-event-${event.code}-qr.png`}
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Download QR
            </a>
          </div>
        </div>
        <div className="ml-auto flex flex-col gap-2">
          <a
            href={`/admin/events/${id}/export?type=attendees`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export attendees CSV
          </a>
          <a
            href={`/admin/events/${id}/export?type=questions`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export questions CSV
          </a>
        </div>
      </section>

      {/* KPI tiles */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Checked in" value={String(attendeeRows.length)} />
        <StatTile
          label="Questions"
          value={String(questionRows.length)}
          detail={openQuestions > 0 ? `${openQuestions} open` : "all answered"}
        />
        <StatTile
          label="Avg excitement"
          value={avgInterest !== null ? avgInterest.toFixed(1) : "—"}
          detail={
            avgInterest !== null
              ? `of 5 · ${interestValues.length} rating${interestValues.length === 1 ? "" : "s"}`
              : "no ratings yet"
          }
        />
        <StatTile
          label="Would join as EIR"
          value={String(wouldJoinCounts.yes)}
          detail={
            wouldJoinTotal > 0
              ? `yes · ${wouldJoinCounts.maybe} maybe`
              : "no responses yet"
          }
        />
      </section>

      {/* Charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium">Excitement about the idea</h2>
          <p className="text-xs text-muted">
            Self-reported, 1 (not for me) to 5 (very excited)
          </p>
          <div className="mt-4 flex flex-col gap-0.5">
            {[...interestDist].reverse().map(({ level, n }) => (
              <div
                key={level}
                className="flex items-center gap-2"
                title={`${n} attendee${n === 1 ? "" : "s"} rated ${level}`}
              >
                <span className="w-4 text-right text-xs tabular-nums text-muted">
                  {level}
                </span>
                <div className="h-5 flex-1">
                  <div
                    className="h-full rounded-r"
                    style={{
                      width: `${(n / maxInterestCount) * 100}%`,
                      background: "var(--series-1)",
                      minWidth: n > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="w-6 text-xs tabular-nums text-muted">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium">
            “Could you see yourself building this?”
          </h2>
          <p className="text-xs text-muted">
            {wouldJoinTotal} of {attendeeRows.length} attendees responded
          </p>
          {wouldJoinTotal === 0 ? (
            <p className="mt-6 text-sm text-muted">No responses yet.</p>
          ) : (
            <>
              <div className="mt-5 flex h-6 w-full gap-0.5 overflow-hidden rounded">
                {(["yes", "maybe", "no"] as const)
                  .filter((k) => wouldJoinCounts[k] > 0)
                  .map((k) => (
                    <div
                      key={k}
                      title={`${WOULD_JOIN_LABELS[k]}: ${wouldJoinCounts[k]}`}
                      style={{
                        width: `${(wouldJoinCounts[k] / wouldJoinTotal) * 100}%`,
                        background: WOULD_JOIN_COLORS[k],
                      }}
                    />
                  ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {(["yes", "maybe", "no"] as const).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-3 w-3 rounded-sm border border-zinc-300"
                      style={{ background: WOULD_JOIN_COLORS[k] }}
                    />
                    <span className="text-muted">
                      {WOULD_JOIN_LABELS[k]}{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {wouldJoinCounts[k]}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Questions */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          Questions{" "}
          <span className="text-sm font-normal text-muted">
            sorted by upvotes — mark answered as you go
          </span>
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {questionRows.length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-muted">
              No questions yet.
            </li>
          )}
          {questionRows.map((q) => (
            <li
              key={q.id}
              className={`flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                q.answered ? "border-zinc-200 opacity-70" : "border-zinc-200"
              }`}
            >
              <div>
                <p className="text-[15px]">{q.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {q.askerName ?? "Anonymous"} · {formatTime(q.createdAt)} ·{" "}
                  {q.votes} upvote{q.votes === 1 ? "" : "s"}
                </p>
              </div>
              <form action={markAnswered}>
                <input type="hidden" name="questionId" value={q.id} />
                <input type="hidden" name="eventId" value={id} />
                <input
                  type="hidden"
                  name="answered"
                  value={q.answered ? "0" : "1"}
                />
                <button
                  type="submit"
                  className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    q.answered
                      ? "border-zinc-300 text-muted hover:text-foreground"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {q.answered ? "↩ Reopen" : "✓ Mark answered"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Feedback */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Feedback</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {feedbackRows.length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-muted">
              No feedback yet.
            </li>
          )}
          {feedbackRows.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{f.name ?? "Unknown"}</span>
                {f.interest !== null && (
                  <span className="rounded bg-brand-light px-1.5 py-0.5 text-xs font-medium text-brand">
                    Excitement {f.interest}/5
                  </span>
                )}
                {f.wouldJoin && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
                    Would join: {WOULD_JOIN_LABELS[f.wouldJoin] ?? f.wouldJoin}
                  </span>
                )}
              </div>
              {f.vision && (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  <span className="font-medium text-muted">Vision: </span>
                  {f.vision}
                </p>
              )}
              {f.challenges && (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  <span className="font-medium text-muted">Challenges: </span>
                  {f.challenges}
                </p>
              )}
              {f.assumptions && (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  <span className="font-medium text-muted">
                    Assumptions to validate:{" "}
                  </span>
                  {f.assumptions}
                </p>
              )}
              {f.body && (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {f.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Attendees */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          Attendees{" "}
          <span className="text-sm font-normal text-muted">
            {attendeeRows.length} checked in
          </span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">LinkedIn</th>
                <th className="px-4 py-3 font-medium">Checked in</th>
                <th className="px-4 py-3 text-right font-medium">Excitement</th>
                <th className="px-4 py-3 font-medium">Would join</th>
              </tr>
            </thead>
            <tbody>
              {attendeeRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No one has checked in yet — share the QR code above.
                  </td>
                </tr>
              )}
              {attendeeRows.map((a) => {
                const f = feedbackByAttendee.get(a.email);
                return (
                  <tr
                    key={a.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted">{a.email}</td>
                    <td className="px-4 py-3 text-muted">{a.role ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{a.company ?? "—"}</td>
                    <td className="px-4 py-3">
                      {a.linkedin ? (
                        <a
                          href={a.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand underline underline-offset-2"
                        >
                          Profile
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {formatTime(a.checkedInAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {f?.interest != null ? `${f.interest}/5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f?.wouldJoin
                        ? (WOULD_JOIN_LABELS[f.wouldJoin] ?? f.wouldJoin)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}
