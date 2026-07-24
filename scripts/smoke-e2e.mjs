// Browser smoke test for the full candidate + admin flow.
// Prereqs: server running (npm run dev or npm start) and demo data seeded (npm run seed).
// Usage: node scripts/smoke-e2e.mjs
// Env: BASE_URL (default http://localhost:3000), ADMIN_PASSWORD (default eir-admin),
//      SHOTS_DIR (screenshots; default: skip screenshots), CHROMIUM_PATH.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "eir-admin";
const SHOTS = process.env.SHOTS_DIR ?? null;
const shot = (page, name) =>
  SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve();
const fail = (msg) => {
  console.error("FAIL: " + msg);
  process.exit(1);
};

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

// ---- Candidate flow (mobile viewport) ----
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await mobile.newPage();

await page.goto(`${BASE}/e/DEMO42`);
await page.waitForSelector("text=Check in");
await shot(page, "1-checkin");

await page.fill('input[name="name"]', "Test Candidate");
await page.fill('input[name="email"]', "test.candidate@example.com");
await page.fill('input[name="role"]', "Principal Engineer @ TestCo");
await page.click('button[type="submit"]');
await page.waitForSelector("nav >> text=Your Take", { timeout: 15000 });
console.log("check-in OK");
await shot(page, "2-primer");

await page.click("text=Q&A");
await page.waitForSelector("textarea[name=body]");
await page.fill(
  "textarea[name=body]",
  "How much of the first year is research risk vs. execution risk?",
);
await page.click("text=Ask question");
await page.waitForSelector("text=How much of the first year", { timeout: 15000 });
console.log("ask question OK");

await page.locator('button[aria-label="Upvote"]').first().click();
await page.waitForTimeout(1500);
await shot(page, "3-qa");
console.log("upvote OK");

await page.click("text=Your Take");
await page.waitForSelector("text=How excited are you");
await page.click('label:has(input[name="interest"][value="5"])');
await page.click('label:has(input[name="wouldJoin"][value="yes"])');
await page.fill(
  'textarea[name="body"]',
  "Really compelling. I would want to derisk real-time latency in week 1.",
);
await shot(page, "4-feedback");
await page.click('button[type="submit"]');
await page.waitForSelector("text=Saved", { timeout: 15000 });
console.log("feedback OK");

// ---- Admin flow (desktop viewport) ----
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
});
const admin = await desktop.newPage();

await admin.goto(`${BASE}/admin`);
await admin.waitForSelector('input[name="password"]');
await admin.fill('input[name="password"]', PASSWORD);
await admin.click('button[type="submit"]');
await admin.waitForSelector("text=Events", { timeout: 15000 });
console.log("admin login OK");

await admin.click("text=EIR Dinner — Idea: AI Sales Coach");
await admin.waitForSelector("text=Checked in");
await admin.waitForTimeout(500);

const body = await admin.textContent("body");
if (!body.includes("test.candidate@example.com")) fail("test attendee missing from admin table");
if (!body.includes("How much of the first year")) fail("test question missing from admin list");
if (!body.includes("Really compelling")) fail("test feedback missing from admin list");
console.log("admin dashboard shows live data OK");
await shot(admin, "5-admin-dashboard");

const qCard = admin.locator("li", { hasText: "How much of the first year" }).first();
await qCard.locator("text=Mark answered").click();
await admin.waitForTimeout(1500);
if (!(await admin.textContent("body")).includes("Reopen")) fail("mark-answered did not toggle");
console.log("mark answered OK");

const eventId = admin.url().split("/events/")[1].split("/")[0];
const resp = await admin.request.get(`${BASE}/admin/events/${eventId}/export?type=attendees`);
const csv = await resp.text();
if (!csv.includes("test.candidate@example.com")) fail("CSV export missing attendee");
console.log("csv export OK");

await browser.close();
console.log("ALL E2E CHECKS PASSED");
