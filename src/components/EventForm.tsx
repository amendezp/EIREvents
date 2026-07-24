"use client";

import { useActionState } from "react";
import {
  createEvent,
  updateEvent,
  type ActionState,
} from "@/lib/actions";

const initialState: ActionState = {};

export default function EventForm({
  event,
}: {
  event?: {
    id: string;
    title: string;
    date: string;
    location: string | null;
    primer: string;
    status: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    event ? updateEvent : createEvent,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Event title</span>
          <input
            name="title"
            required
            defaultValue={event?.title ?? ""}
            placeholder="EIR Dinner — Idea: AI Sales Coach"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Date</span>
          <input
            name="date"
            type="date"
            required
            defaultValue={event?.date ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Location <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="location"
            defaultValue={event?.location ?? ""}
            placeholder="AI Fund office, Palo Alto"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status</span>
        <select
          name="status"
          defaultValue={event?.status ?? "draft"}
          className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand"
        >
          <option value="draft">Draft (hidden from attendees)</option>
          <option value="live">Live (check-in open)</option>
          <option value="closed">Closed (read-only)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Idea primer (Markdown)</span>
        <textarea
          name="primer"
          rows={16}
          defaultValue={event?.primer ?? ""}
          placeholder={
            "# The Idea\n\nOne-paragraph pitch…\n\n## The problem\n\n## Why now\n\n## What we'd build first\n\n## Open questions for you"
          }
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand"
        />
        <span className="text-xs text-muted">
          This is what candidates read on their phones after checking in.
          Markdown headings, lists and links are supported.
        </span>
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : event ? "Save changes" : "Create event"}
        </button>
      </div>
    </form>
  );
}
