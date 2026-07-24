import EventForm from "@/components/EventForm";
import { requireAdmin } from "@/lib/session";

export default async function NewEventPage() {
  await requireAdmin();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main>
      <h1 className="text-2xl font-serif font-semibold tracking-tight">New event</h1>
      <p className="mt-1 text-sm text-muted">
        Set up the event and write the idea primer candidates will read.
      </p>
      <div className="mt-6">
        <EventForm defaultDate={today} />
      </div>
    </main>
  );
}
