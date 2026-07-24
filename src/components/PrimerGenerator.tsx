"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function PrimerGenerator({
  getTitle,
  onGenerated,
}: {
  getTitle: () => string;
  onGenerated: (primer: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() !== null,
    () => false,
  );

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  function startRecording() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    setError(null);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      if (finalText) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalText.trim());
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Microphone error: ${event.error}`);
      }
      setRecording(false);
      setInterim("");
    };
    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (transcript.trim()) formData.append("transcript", transcript.trim());
      formData.append("title", getTitle());

      const res = await fetch("/api/generate-primer", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { primer?: string; error?: string };
      if (!res.ok || !data.primer) {
        setError(data.error ?? "Generation failed — please try again.");
        return;
      }
      onGenerated(data.primer);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const hasSource = Boolean(file) || transcript.trim().length > 0;

  return (
    <div className="rounded-xl border border-brand-light bg-brand-light/30 p-4">
      <p className="text-sm font-medium">✨ Generate the primer with AI</p>
      <p className="mt-0.5 text-xs text-muted">
        Upload a deck or memo, record a voice note, or paste rough notes — the
        AI drafts a high-level, discussion-ready primer you can edit below.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {file ? "Change document" : "📄 Upload PDF / doc"}
        </button>
        {speechSupported && (
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              recording
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {recording ? "■ Stop recording" : "🎤 Record voice note"}
          </button>
        )}
        {file && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            {file.name}
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded px-1 text-zinc-500 hover:text-zinc-800"
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {(recording || transcript || interim) && (
        <div className="mt-3">
          <textarea
            value={transcript + (interim ? ` ${interim}` : "")}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            placeholder="Your voice note transcript appears here — you can edit it."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {recording && (
            <p className="mt-1 text-xs font-medium text-red-600">
              ● Recording — speak naturally, then press Stop.
            </p>
          )}
        </div>
      )}
      {!recording && !transcript && (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={2}
          placeholder="…or type / paste rough notes about the idea here."
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
      )}

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={!hasSource || generating || recording}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "Generating… (~30s)" : "Generate primer"}
        </button>
        <span className="text-xs text-muted">
          The draft replaces the primer field below — review and edit before
          saving.
        </span>
      </div>
    </div>
  );
}
