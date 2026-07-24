"use client";

import { useActionState } from "react";
import ReactMarkdown from "react-markdown";
import { acceptNda, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export default function NdaGate({
  code,
  title,
  nda,
  attendeeName,
}: {
  code: string;
  title: string;
  nda: string;
  attendeeName: string;
}) {
  const [state, formAction, pending] = useActionState(acceptNda, initialState);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-brand">
        AI Fund · EIR Event
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        One more step, {attendeeName.split(" ")[0]} — please review the
        agreement below to continue.
      </p>

      <article className="prose-primer mt-6 max-h-[50vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 text-[15px] shadow-sm">
        <ReactMarkdown>{nda}</ReactMarkdown>
      </article>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="code" value={code} />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="agree"
            required
            className="mt-1 h-5 w-5 accent-[var(--series-1)]"
          />
          <span className="text-sm leading-snug">
            I, <span className="font-medium">{attendeeName}</span>, have read
            and agree to the terms above. I understand this constitutes my
            electronic signature.
          </span>
        </label>

        {state.error && (
          <p className="text-sm font-medium text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60"
        >
          {pending ? "Recording…" : "Agree and continue"}
        </button>
      </form>
    </main>
  );
}
