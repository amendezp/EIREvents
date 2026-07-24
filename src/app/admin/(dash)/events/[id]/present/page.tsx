import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import AutoRefresh from "@/components/AutoRefresh";
import { getDb } from "@/db";
import { attendees, events } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function PresentPage({
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

  const [{ n: checkedIn }] = await db
    .select({ n: count() })
    .from(attendees)
    .where(eq(attendees.eventId, id));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const joinUrl = `${proto}://${host}/e/${event.code}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 900, margin: 1 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-8 text-center">
      <AutoRefresh intervalMs={5000} />
      <div>
        <p className="text-lg font-medium uppercase tracking-widest text-brand">
          AI Fund · EIR Event
        </p>
        <h1 className="mt-2 font-serif text-5xl font-semibold tracking-tight">
          {event.title}
        </h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt={`QR code linking to ${joinUrl}`}
        className="h-[46vh] w-[46vh] rounded-3xl border border-line bg-white p-4 shadow-soft"
      />

      <div>
        <p className="font-serif text-3xl">Scan to check in</p>
        <p className="mt-2 font-mono text-xl text-muted">{joinUrl}</p>
        <p className="mt-4 text-sm uppercase tracking-widest text-muted">
          or enter code
        </p>
        <p className="font-mono text-5xl font-semibold tracking-[0.3em]">
          {event.code}
        </p>
      </div>

      <p className="absolute bottom-8 text-lg text-muted">
        <span className="font-serif text-2xl font-semibold text-foreground">
          {checkedIn}
        </span>{" "}
        checked in
      </p>
    </div>
  );
}
