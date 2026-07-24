"use client";

// Renders a timestamp in the viewer's own timezone. The server renders its
// local time first; suppressHydrationWarning lets the client correct it.
export default function LocalTime({ ms }: { ms: number }) {
  return (
    <span suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(ms))}
    </span>
  );
}
