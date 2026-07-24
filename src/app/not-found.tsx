import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          AI Fund · EIR Events
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          If you&apos;re joining an event, double-check the event code — codes
          look like <span className="font-mono">ABC123</span> and only work
          while the event is live.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
