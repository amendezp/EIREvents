"use client";

import { useActionState, useRef, useState } from "react";
import PrimerGenerator from "@/components/PrimerGenerator";
import {
  createEvent,
  updateEvent,
  type ActionState,
} from "@/lib/actions";

const initialState: ActionState = {};

const NDA_TEMPLATE = `# Non-Disclosure Agreement

By continuing, you ("Recipient") agree to the following with AI Fund ("Discloser"):

1. **Confidential Information.** Any non-public information shared at this event — including the business idea, market analyses, strategies, and the contents of the discussion — is Confidential Information.
2. **Use.** Recipient will use Confidential Information solely to participate in this event and evaluate a potential role, and for no other purpose.
3. **Non-disclosure.** Recipient will not disclose Confidential Information to any third party and will protect it with at least reasonable care.
4. **Exclusions.** Information that is or becomes public through no fault of Recipient, was already lawfully known to Recipient, or is independently developed is not Confidential Information.
5. **Term.** These obligations last for two (2) years from today.
6. **No license.** No rights or licenses are granted by this disclosure.

Selecting "Agree and continue" constitutes your electronic signature.`;

export default function EventForm({
  event,
  defaultDate,
}: {
  event?: {
    id: string;
    title: string;
    date: string;
    location: string | null;
    primer: string;
    nda: string;
    status: string;
  };
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(
    event ? updateEvent : createEvent,
    initialState,
  );
  const [primer, setPrimer] = useState(event?.primer ?? "");
  const [nda, setNda] = useState(event?.nda ?? "");
  const titleRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Event title</span>
          <input
            ref={titleRef}
            name="title"
            required
            defaultValue={event?.title ?? ""}
            placeholder="EIR Dinner — Idea: AI Sales Coach"
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Date</span>
          <input
            name="date"
            type="date"
            required
            defaultValue={event?.date ?? defaultDate ?? ""}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Location <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="location"
            defaultValue={event ? (event.location ?? "") : "AI Fund Office"}
            placeholder="AI Fund Office"
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status</span>
        <select
          name="status"
          defaultValue={event?.status ?? "draft"}
          className="w-48 rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
        >
          <option value="draft">Draft (hidden from attendees)</option>
          <option value="live">Live (check-in open)</option>
          <option value="closed">Closed (read-only)</option>
        </select>
      </label>

      <PrimerGenerator
        getTitle={() => titleRef.current?.value ?? ""}
        onGenerated={setPrimer}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Idea primer (Markdown)</span>
        <textarea
          name="primer"
          rows={16}
          value={primer}
          onChange={(e) => setPrimer(e.target.value)}
          placeholder={
            "# The Idea\n\nOne-paragraph pitch…\n\n## The problem\n\n## Why now\n\n## Open questions for you"
          }
          className="rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand"
        />
        <span className="text-xs text-muted">
          This is what candidates read on their phones after checking in.
          Markdown headings, lists and links are supported.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            NDA <span className="font-normal text-muted">(optional, Markdown)</span>
          </span>
          {!nda && (
            <button
              type="button"
              onClick={() => setNda(NDA_TEMPLATE)}
              className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted hover:bg-[#fafaf8]"
            >
              Insert standard template
            </button>
          )}
        </div>
        <textarea
          name="nda"
          rows={nda ? 10 : 3}
          value={nda}
          onChange={(e) => setNda(e.target.value)}
          placeholder="Leave empty for no NDA. If filled, attendees must read and accept it after checking in, before they can see the primer."
          className="rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand"
        />
        <span className="text-xs text-muted">
          Acceptance is recorded per attendee with a timestamp (visible in the
          attendee table and CSV export). Avoid editing the NDA once the event
          is live — the record refers to the text shown at acceptance time.
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
