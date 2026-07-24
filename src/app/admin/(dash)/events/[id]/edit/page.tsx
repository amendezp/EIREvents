import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EventForm from "@/components/EventForm";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function EditEventPage({
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

  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
      <div className="mt-6">
        <EventForm event={event} />
      </div>
    </main>
  );
}
