import EventForm from "@/components/EventForm";
import { requireAdmin } from "@/lib/session";

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <p className="mt-1 text-sm text-muted">
        Set up the event and write the idea primer candidates will read.
      </p>
      <div className="mt-6">
        <EventForm />
      </div>
    </main>
  );
}
