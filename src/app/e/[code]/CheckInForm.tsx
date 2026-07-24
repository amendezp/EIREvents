"use client";

import { useActionState } from "react";
import { checkIn, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export default function CheckInForm({
  code,
  title,
  date,
  location,
  closed,
}: {
  code: string;
  title: string;
  date: string;
  location: string | null;
  closed: boolean;
}) {
  const [state, formAction, pending] = useActionState(checkIn, initialState);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-brand">
        AI Fund · EIR Event
      </p>
      <h1 className="mt-1 text-2xl font-serif font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {date}
        {location ? ` · ${location}` : ""}
      </p>

      {closed ? (
        <div className="mt-8 rounded-3xl border border-line bg-white p-5 shadow-soft">
          <h2 className="font-medium">This event has ended</h2>
          <p className="mt-1 text-sm text-muted">
            Check-in is closed. Thanks for your interest — the AI Fund team
            will follow up with attendees soon.
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="code" value={code} />
          <h2 className="text-lg font-medium">Check in</h2>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Name</span>
            <input
              name="name"
              required
              autoComplete="name"
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
              placeholder="Ada Lovelace"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
              placeholder="ada@example.com"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Role <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                name="role"
                autoComplete="organization-title"
                className="rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
                placeholder="Staff Engineer"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Company{" "}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                name="company"
                autoComplete="organization"
                className="rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
                placeholder="Acme"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              LinkedIn <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="linkedin"
              type="url"
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
              placeholder="https://linkedin.com/in/…"
            />
          </label>

          {state.error && (
            <p className="text-sm font-medium text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-brand px-4 py-3 text-base font-medium text-white transition-opacity disabled:opacity-60"
          >
            {pending ? "Checking in…" : "Check in"}
          </button>
          <p className="text-xs text-muted">
            Your details are only used by the AI Fund team for event follow-up.
          </p>
        </form>
      )}
    </main>
  );
}
