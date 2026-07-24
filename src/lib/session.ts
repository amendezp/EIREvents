import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "eir_admin";
const ADMIN_SESSION_MS = 1000 * 60 * 60 * 12;

const onVercel = () => Boolean(process.env.VERCEL);
const secureCookies = () => process.env.NODE_ENV === "production";

export const adminPassword = (): string => {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  if (onVercel()) {
    throw new Error(
      "ADMIN_PASSWORD must be set in production — without it the admin " +
        "dashboard would be protected by a publicly known default password.",
    );
  }
  return "eir-admin";
};

const secret = (): string => {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (s) return s;
  if (onVercel()) {
    throw new Error(
      "SESSION_SECRET (or ADMIN_PASSWORD) must be set in production — " +
        "without it session cookies would be forgeable.",
    );
  }
  return "eir-dev-secret";
};

// Timing-safe comparison via fixed-length digests.
export function verifyAdminPassword(input: string): boolean {
  const expected = crypto.createHash("sha256").update(adminPassword()).digest();
  const got = crypto.createHash("sha256").update(input).digest();
  return crypto.timingSafeEqual(expected, got);
}

// Per-instance brute-force damper: failed logins get an escalating delay.
let recentFailures = 0;
let failureWindowStart = 0;

export async function loginFailureDelay(): Promise<void> {
  const now = Date.now();
  if (now - failureWindowStart > 15 * 60_000) {
    failureWindowStart = now;
    recentFailures = 0;
  }
  recentFailures++;
  const delayMs = Math.min(500 + recentFailures * 500, 5000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function hmac(value: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("hex")
    .slice(0, 32);
}

export function sign(value: string): string {
  return `${value}.${hmac(value)}`;
}

export function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expected = hmac(value);
  if (
    mac.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  return value;
}

export async function setAdminCookie(): Promise<void> {
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  (await cookies()).set(ADMIN_COOKIE, sign(`admin:${expiresAt}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: ADMIN_SESSION_MS / 1000,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = verify((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!value?.startsWith("admin:")) return false;
  return Number(value.slice("admin:".length)) > Date.now();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function setAttendeeCookie(
  eventId: string,
  attendeeId: string,
): Promise<void> {
  (await cookies()).set(`eir_att_${eventId}`, sign(attendeeId), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getAttendeeId(eventId: string): Promise<string | null> {
  return verify((await cookies()).get(`eir_att_${eventId}`)?.value);
}
