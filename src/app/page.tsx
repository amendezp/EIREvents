import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          AI Fund
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          EIR Events
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          Check in to an event, read the idea primer, ask questions and share
          your feedback.
        </p>
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm">
          <h2 className="font-medium">Joining an event?</h2>
          <p className="mt-1 text-sm text-muted">
            Scan the QR code in the room or open the event link you were given
            (it looks like <span className="font-mono">/e/ABC123</span>).
          </p>
        </div>
        <div className="mt-4">
          <Link
            href="/admin"
            className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            Organizer? Go to the admin dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
