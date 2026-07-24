"use client";

import { useActionState, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  askQuestion,
  submitFeedback,
  toggleVote,
  type ActionState,
} from "@/lib/actions";

type QuestionItem = {
  id: string;
  body: string;
  answered: boolean;
  votes: number;
  voted: boolean;
  mine: boolean;
  askerName: string;
};

type FeedbackData = {
  interest: number | null;
  wouldJoin: string | null;
  vision: string | null;
  challenges: string | null;
  assumptions: string | null;
  body: string | null;
};

const initialState: ActionState = {};

const TABS = [
  ["primer", "The Idea"],
  ["qa", "Q&A"],
  ["share", "Your Take"],
] as const;

export default function EventHub({
  code,
  event,
  attendeeName,
  questions,
  myFeedback,
}: {
  code: string;
  event: {
    title: string;
    date: string;
    location: string | null;
    primer: string;
    closed: boolean;
  };
  attendeeName: string;
  questions: QuestionItem[];
  myFeedback: FeedbackData | null;
}) {
  const [tab, setTab] = useState<"primer" | "qa" | "share">("primer");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col sm:max-w-xl">
      <header className="px-5 pt-8 pb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          AI Fund · EIR Event
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {event.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          {event.date}
          {event.location ? ` · ${event.location}` : ""} · Hi,{" "}
          {attendeeName.split(" ")[0]} 👋
        </p>
        {event.closed && (
          <p className="mt-2 rounded-md bg-zinc-100 px-3 py-1.5 text-xs text-muted">
            This event has ended — you can still read the primer.
          </p>
        )}
      </header>

      {/* One tab bar: fixed at the bottom on phones, inline under the header on larger screens */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] sm:static sm:border-t-0 sm:border-b sm:bg-transparent sm:pb-0">
        <div className="mx-auto grid max-w-md grid-cols-3 sm:mx-0 sm:flex sm:max-w-none sm:gap-6 sm:px-5">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mt-px border-t-2 py-3.5 text-sm font-medium transition-colors sm:-mb-px sm:mt-0 sm:border-t-0 sm:border-b-2 sm:py-2.5 ${
                tab === key
                  ? "border-brand text-brand"
                  : "border-transparent text-muted sm:hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 px-5 pb-28 sm:pt-6 sm:pb-12">
        {tab === "primer" && <PrimerTab primer={event.primer} />}
        {tab === "qa" && (
          <QATab code={code} questions={questions} closed={event.closed} />
        )}
        {tab === "share" && (
          <ShareTab code={code} myFeedback={myFeedback} closed={event.closed} />
        )}
      </main>
    </div>
  );
}

function PrimerTab({ primer }: { primer: string }) {
  return (
    <article className="prose-primer text-[15px]">
      {primer ? (
        <ReactMarkdown>{primer}</ReactMarkdown>
      ) : (
        <p className="text-muted">The primer hasn&apos;t been published yet.</p>
      )}
    </article>
  );
}

function QATab({
  code,
  questions,
  closed,
}: {
  code: string;
  questions: QuestionItem[];
  closed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    askQuestion,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {!closed && (
        <form
          ref={formRef}
          action={async (formData) => {
            formAction(formData);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="code" value={code} />
          <textarea
            name="body"
            rows={3}
            required
            maxLength={1000}
            placeholder="Ask anything about the idea — we'll answer live or follow up after."
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
          />
          {state.error && (
            <p className="text-sm font-medium text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="self-end rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Posting…" : "Ask question"}
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-2.5">
        {questions.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-300 p-5 text-center text-sm text-muted">
            No questions yet — be the first to ask.
          </li>
        )}
        {questions.map((q) => (
          <li
            key={q.id}
            className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] leading-snug">{q.body}</p>
              <form action={toggleVote}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="questionId" value={q.id} />
                <button
                  type="submit"
                  disabled={closed}
                  aria-label={q.voted ? "Remove upvote" : "Upvote"}
                  className={`flex min-w-11 flex-col items-center rounded-lg border px-2 py-1 text-xs font-medium ${
                    q.voted
                      ? "border-brand bg-brand-light text-brand"
                      : "border-zinc-300 text-muted"
                  }`}
                >
                  <span aria-hidden>▲</span>
                  {q.votes}
                </button>
              </form>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {q.mine ? "You asked" : q.askerName}
              {q.answered && (
                <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                  ✓ Answered
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShareTab({
  code,
  myFeedback,
  closed,
}: {
  code: string;
  myFeedback: FeedbackData | null;
  closed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    submitFeedback,
    initialState,
  );
  const [interest, setInterest] = useState<number | null>(
    myFeedback?.interest ?? null,
  );

  if (closed) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-muted">
        The event has ended and feedback is closed. Thanks for sharing your
        thoughts!
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="code" value={code} />

      <fieldset>
        <legend className="text-sm font-medium">
          How excited are you about this idea?
        </legend>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex-1">
              <input
                type="radio"
                name="interest"
                value={n}
                checked={interest === n}
                onChange={() => setInterest(n)}
                className="peer sr-only"
              />
              <span className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-base font-medium peer-checked:border-brand peer-checked:bg-brand-light peer-checked:text-brand">
                {n}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>Not for me</span>
          <span>Very excited</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">
          Could you see yourself building this as a founding engineer?
        </legend>
        <div className="mt-2 flex gap-2">
          {(
            [
              ["yes", "Yes"],
              ["maybe", "Maybe"],
              ["no", "Not now"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex-1">
              <input
                type="radio"
                name="wouldJoin"
                value={value}
                defaultChecked={myFeedback?.wouldJoin === value}
                className="peer sr-only"
              />
              <span className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-medium peer-checked:border-brand peer-checked:bg-brand-light peer-checked:text-brand">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          What should the vision of this company be?
        </span>
        <textarea
          name="vision"
          rows={3}
          maxLength={4000}
          defaultValue={myFeedback?.vision ?? ""}
          placeholder="The 10-year ambition if this works…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          What will be the main challenges?
        </span>
        <textarea
          name="challenges"
          rows={3}
          maxLength={4000}
          defaultValue={myFeedback?.challenges ?? ""}
          placeholder="Technical, market, or go-to-market hurdles…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Which assumptions or hypotheses need to be validated?
        </span>
        <textarea
          name="assumptions"
          rows={3}
          maxLength={4000}
          defaultValue={myFeedback?.assumptions ?? ""}
          placeholder="The riskiest bets to test first…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Anything else — thoughts, feedback, ideas
        </span>
        <textarea
          name="body"
          rows={4}
          maxLength={4000}
          defaultValue={myFeedback?.body ?? ""}
          placeholder="What excites you? What concerns you? How would you approach building it?"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60"
      >
        {pending
          ? "Saving…"
          : state.ok
            ? "Saved ✓ (you can update it anytime)"
            : myFeedback
              ? "Update my feedback"
              : "Share feedback"}
      </button>
    </form>
  );
}
