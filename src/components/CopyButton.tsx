"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted hover:bg-[#fafaf8]"
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
