import { count } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import { attendees, events, questions } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  live: "bg-emerald-50 text-emerald-700",
  closed: "bg-amber-50 text-amber-700",
};

export default async function AdminHome() {
  await requireAdmin();

  const db = await getDb();
  const allEvents = await db.select().from(events);
  const attendeeCounts = new Map(
    (
      await db
        .select({ eventId: attendees.eventId, n: count() })
        .from(attendees)
        .groupBy(attendees.eventId)
    ).map((r) => [r.eventId, r.n]),
  );
  const questionCounts = new Map(
    (
      await db
        .select({ eventId: questions.eventId, n: count() })
        .from(questions)
        .groupBy(questions.eventId)
    ).map((r) => [r.eventId, r.n]),
  );

  const sorted = [...allEvents].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          + New event
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-300 p-10 text-center text-muted">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-1 text-sm">
            Create your first EIR event to get a check-in link and QR code.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 text-right font-medium">Attendees</th>
                <th className="px-4 py-3 text-right font-medium">Questions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{event.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[event.status] ?? ""}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{event.code}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {attendeeCounts.get(event.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {questionCounts.get(event.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
