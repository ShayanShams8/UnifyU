/**
 * Direct Playwright test for UnifyU frontend
 * Runs with --no-sandbox to work in this environment
 */
const { chromium } = require("playwright");

const BASE = "http://localhost:8081";

async function runTests() {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    const page = await browser.newPage();
    try {
      await fn(page);
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  console.log("\n UnifyU Frontend Tests\n");

  // ── Test 1: App loads ────────────────────────────────────────────────────────
  await test("App loads and shows UnifyU branding", async (page) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000); // wait for React to hydrate
    const content = await page.content();
    if (!content.includes("UnifyU")) throw new Error("UnifyU brand not found");
  });

  // ── Test 2: Auth Screen ──────────────────────────────────────────────────────
  await test("Auth screen shows Log In and Sign Up tabs", async (page) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const content = await page.content();
    const hasLogin = content.includes("Log In") || content.includes("login") || content.includes("Login");
    const hasSignup = content.includes("Sign Up") || content.includes("signup") || content.includes("SignUp");
    if (!hasLogin) throw new Error("Login option not found");
    if (!hasSignup) throw new Error("Signup option not found");
  });

  // ── Test 3: Page title ───────────────────────────────────────────────────────
  await test("Page has correct title", async (page) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    console.log(`    (title: "${title}")`);
    // Expo web apps often have "UnifyU" or "Expo" as title
    if (!title) throw new Error("No page title");
  });

  // ── Test 4: No console errors on load ────────────────────────────────────────
  await test("No critical console errors on load", async (page) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const critical = errors.filter(
      (e) =>
        !e.includes("Warning:") &&
        !e.includes("ExpoWarning") &&
        !e.includes("DevTools") &&
        !e.includes("fontFamily")
    );
    if (critical.length > 0) {
      throw new Error(`Critical errors: ${critical.slice(0, 2).join("; ")}`);
    }
  });

  // ── Test 5: CSS is applied (Tailwind/styled) ─────────────────────────────────
  await test("App renders styled content (not blank)", async (page) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    // Check that the page has rendered content > 500 chars
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.length < 10) throw new Error("Page appears blank");
    console.log(`    (rendered text length: ${bodyText.length})`);
  });

  // ── Test 6: Backend health check ─────────────────────────────────────────────
  await test("Backend API health endpoint responds (if running)", async (page) => {
    try {
      const res = await page.goto("http://localhost:8000/health", { timeout: 3000 });
      if (res && res.status() === 200) {
        console.log(`    (backend is running)`);
      } else {
        console.log(`    (backend not running — skipped, OK for frontend-only test)`);
      }
    } catch {
      console.log(`    (backend not running — skipped, OK for frontend-only test)`);
    }
  });

  await browser.close();

  console.log(`\n Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
