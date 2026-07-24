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

// Landing page lists live events for link-free joining
await page.goto(BASE);
await page.waitForSelector("text=Happening now");
await page.click("text=EIR Dinner — Idea: AI Sales Coach");
await page.waitForSelector("text=Check in");
console.log("landing page live-event join OK");
await shot(page, "1-checkin");

await page.fill('input[name="name"]', "Test Candidate");
await page.fill('input[name="email"]', "test.candidate@example.com");
await page.fill('input[name="role"]', "Principal Engineer");
await page.fill('input[name="company"]', "TestCo");
await page.click('button[type="submit"]');
console.log("check-in OK");

// NDA gate (demo event has one seeded)
await page.waitForSelector("text=Non-Disclosure Agreement", { timeout: 15000 });
await shot(page, "1b-nda");
// Primer must not be reachable before accepting
if ((await page.textContent("body")).includes("One-liner")) {
  fail("primer visible before NDA acceptance");
}
await page.check('input[name="agree"]');
await page.click('button:has-text("Agree and continue")');
await page.waitForSelector("nav >> text=Your Take", { timeout: 15000 });
console.log("NDA accept OK");
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
  'textarea[name="vision"]',
  "Become the default coaching layer for every revenue team.",
);
await page.fill(
  'textarea[name="challenges"]',
  "Latency and rep trust in live suggestions.",
);
await page.fill(
  'textarea[name="assumptions"]',
  "That managers will act on the dashboard weekly.",
);
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
if (!body.includes("default coaching layer")) fail("vision field missing from admin feedback");
if (!body.includes("TestCo")) fail("company column missing from admin table");
console.log("admin dashboard shows live data OK");
await shot(admin, "5-admin-dashboard");

const qCard = admin.locator("li", { hasText: "How much of the first year" }).first();
await qCard.locator("text=Mark answered").click();
await admin.waitForTimeout(1500);
if (!(await admin.textContent("body")).includes("Reopen")) fail("mark-answered did not toggle");
console.log("mark answered OK");

// Moderation: delete the test question
const delCard = admin.locator("li", { hasText: "How much of the first year" }).first();
await delCard.locator('button:has-text("Delete")').click();
await admin.waitForTimeout(1500);
if ((await admin.textContent("body")).includes("How much of the first year")) {
  fail("question delete failed");
}
console.log("delete question OK");

const eventId = admin.url().split("/events/")[1].split("/")[0];
const resp = await admin.request.get(`${BASE}/admin/events/${eventId}/export?type=attendees`);
const csv = await resp.text();
if (!csv.includes("test.candidate@example.com")) fail("CSV export missing attendee");
console.log("csv export OK");

// Presentation view
await admin.goto(`${BASE}/admin/events/${eventId}/present`);
await admin.waitForSelector("text=Scan to check in");
if (!(await admin.textContent("body")).includes("DEMO42")) fail("present view missing event code");
console.log("presentation view OK");

// AI summary: without an API key the button must degrade gracefully
await admin.goto(`${BASE}/admin/events/${eventId}`);
await admin.waitForSelector("text=AI debrief");
if (!process.env.ANTHROPIC_API_KEY) {
  await admin.click('button:has-text("Generate summary")');
  await admin.waitForSelector("text=not configured", { timeout: 15000 });
  console.log("summary not-configured degradation OK");
}

// Archive / delete lifecycle on a scratch event
await admin.goto(`${BASE}/admin/events/new`);
await admin.fill('input[name="title"]', "Scratch Lifecycle Event");
await admin.click('button:has-text("Create event")');
await admin.waitForSelector('h1:has-text("Scratch Lifecycle Event")', { timeout: 15000 });
await admin.click('button:has-text("Archive event")');
await admin.waitForSelector('button:has-text("Unarchive event")', { timeout: 15000 });
console.log("archive OK");
await admin.goto(`${BASE}/admin`);
await admin.waitForSelector("h2:has-text('Archived')");
await admin.click("text=Scratch Lifecycle Event");
await admin.waitForSelector('button:has-text("Delete event permanently")');
admin.once("dialog", (d) => d.accept());
await admin.click('button:has-text("Delete event permanently")');
await admin.waitForURL(`${BASE}/admin`, { timeout: 15000 });
// innerText, not textContent: stale RSC hydration <script> payloads from
// the initial page load legitimately still mention the title.
await admin
  .waitForFunction(
    () => !document.body.innerText.includes("Scratch Lifecycle Event"),
    { timeout: 10000 },
  )
  .catch(() => fail("event delete failed — still visible on /admin"));
console.log("delete event OK");

await browser.close();
console.log("ALL E2E CHECKS PASSED");
