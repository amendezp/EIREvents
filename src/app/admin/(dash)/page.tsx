import { count } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import { attendees, events, questions } from "@/db/schema";
import { setEventArchived } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#efeeea] text-muted",
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
  const active = sorted.filter((e) => !e.archivedAt);
  const archived = sorted.filter((e) => e.archivedAt);

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold tracking-tight">Events</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          + New event
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[#ddd9d0] p-10 text-center text-muted">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-1 text-sm">
            Create your first EIR event to get a check-in link and QR code.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 text-right font-medium">Attendees</th>
                <th className="px-4 py-3 text-right font-medium">Questions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-[#f2f1ee] last:border-0 hover:bg-[#fafaf8]"
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

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Archived
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {archived.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-white/60 px-4 py-3"
              >
                <span>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-medium text-muted hover:text-foreground"
                  >
                    {event.title}
                  </Link>
                  <span className="ml-2 text-sm text-faint">{event.date}</span>
                </span>
                <form action={setEventArchived}>
                  <input type="hidden" name="id" value={event.id} />
                  <input type="hidden" name="archived" value="0" />
                  <button
                    type="submit"
                    className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted hover:bg-[#fafaf8]"
                  >
                    Unarchive
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
