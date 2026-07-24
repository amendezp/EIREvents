"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (trimmed) router.push(`/e/${encodeURIComponent(trimmed)}`);
      }}
      className="flex gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Event code, e.g. ABC123"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
        className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-base uppercase outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Join
      </button>
    </form>
  );
}
