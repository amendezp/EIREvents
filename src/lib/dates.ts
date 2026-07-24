// Events carry a plain YYYY-MM-DD date. "Today" must be evaluated in the
// timezone where events physically happen — the server runs on UTC, where a
// Palo Alto evening is already tomorrow.
export function todayInEventTz(): string {
  const tz = process.env.EVENT_TIMEZONE || "America/Los_Angeles";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
