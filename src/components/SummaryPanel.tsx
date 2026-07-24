"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import LocalTime from "@/components/LocalTime";

export default function SummaryPanel({
  eventId,
  summary,
  generatedAt,
}: {
  eventId: string;
  summary: string | null;
  generatedAt: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/event-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !data.summary) {
        setError(data.error ?? "Summary generation failed — please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          ✨ AI debrief
        </h2>
        <div className="flex items-center gap-3">
          {generatedAt && (
            <span className="text-xs text-muted">
              Generated at <LocalTime ms={generatedAt} />
            </span>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy
              ? "Analyzing… (~30s)"
              : summary
                ? "Regenerate"
                : "Generate summary"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
      )}
      {summary ? (
        <article className="prose-primer mt-3 rounded-3xl border border-line bg-white p-6 text-[15px] shadow-soft">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </article>
      ) : (
        !error && (
          <p className="mt-3 rounded-3xl border border-dashed border-[#ddd9d0] p-6 text-sm text-muted">
            Distills the whole event — question themes, feedback patterns,
            standout candidates, and suggested follow-ups. Best run after the
            event wraps.
          </p>
        )
      )}
    </section>
  );
}
