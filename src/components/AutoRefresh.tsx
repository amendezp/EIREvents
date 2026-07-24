"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, router]);

  return null;
}
