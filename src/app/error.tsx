"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          AI Fund · EIR Events
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sorry about that — it&apos;s us, not you. Try again, and if it keeps
          happening let the event organizer know.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
