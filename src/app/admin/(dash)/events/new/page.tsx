import EventForm from "@/components/EventForm";
import { todayInEventTz } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export default async function NewEventPage() {
  await requireAdmin();
  const today = todayInEventTz();
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
