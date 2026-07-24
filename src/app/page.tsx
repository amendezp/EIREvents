import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import JoinByCode from "@/components/JoinByCode";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { todayInEventTz } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  // Only list events that are live AND happening today — titles stay off
  // the public page outside the event itself. Joining by code still works
  // for any live event.
  const liveEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "live"),
        eq(events.date, todayInEventTz()),
        isNull(events.archivedAt),
      ),
    );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          AI Fund
        </p>
        <h1 className="mt-2 text-3xl font-serif font-semibold tracking-tight">
          EIR Events
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          Check in to an event, read the idea primer, ask questions and share
          your feedback.
        </p>
      </div>

      {liveEvents.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Happening now
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {liveEvents.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/e/${event.code}`}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-white p-4 shadow-soft transition-colors hover:border-brand"
                >
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full bg-emerald-500"
                      />
                      {event.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {event.date}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </span>
                  <span className="text-brand" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-soft">
        <h2 className="font-medium">
          {liveEvents.length > 0 ? "Have an event code?" : "Joining an event?"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {liveEvents.length > 0
            ? "Scan the QR code in the room, or enter the code from the screen."
            : "Scan the QR code in the room, open your event link, or enter the event code below."}
        </p>
        <div className="mt-3">
          <JoinByCode />
        </div>
      </section>

      <div className="mt-6 text-center">
        <Link
          href="/admin"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          Organizer? Go to the admin dashboard →
        </Link>
      </div>
    </main>
  );
}
