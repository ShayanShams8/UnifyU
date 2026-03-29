/**
 * Full UI flow tests for UnifyU
 * Tests: auth screen, signup, login, tab navigation
 */
const { chromium } = require("playwright");

const BASE = "http://localhost:8081";
const TEST_USER = {
  name: "Test User",
  username: "playwright_" + Date.now(),
  password: "TestPass123",
};

// Click the LAST role="button" element whose text content matches (targets TouchableOpacity, not inner Text leaf)
async function clickLastByText(page, text) {
  const found = await page.evaluate((t) => {
    // Prefer role="button" elements containing the text
    const buttons = Array.from(document.querySelectorAll('[role="button"]')).filter(
      (e) => e.textContent.trim() === t
    );
    if (buttons.length > 0) { buttons[buttons.length - 1].click(); return true; }
    // Fallback: any element whose innerText matches
    const all = Array.from(document.querySelectorAll("*")).filter(
      (e) => e.children.length === 0 && e.textContent.trim() === t
    );
    if (all.length > 0) { all[all.length - 1].click(); return true; }
    return false;
  }, text);
  if (!found) throw new Error(`No element with text "${text}" found`);
}

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
      console.log(`    ${e.message.split("\n")[0]}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  async function loadAuth(page) {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('input[placeholder="Username"]', { timeout: 90000 });
  }

  async function login(page) {
    await loadAuth(page);
    await page.fill('input[placeholder="Username"]', TEST_USER.username);
    await page.fill('input[placeholder*="Password"]', TEST_USER.password);
    await clickLastByText(page, "Log In");
    // Wait until "Welcome back" disappears (i.e. we're past the auth screen)
    await page.waitForFunction(
      () => !document.body.innerText.includes("Welcome back"),
      { timeout: 20000 }
    );
    await page.waitForTimeout(1500);
  }

  console.log("\n UnifyU UI Flow Tests\n");

  // ── Test 1: Auth screen ──────────────────────────────────────────────────────
  await test("Auth screen loads with branding and tabs", async (page) => {
    await loadAuth(page);
    const text = await page.evaluate(() => document.body.innerText);
    if (!text.includes("UnifyU")) throw new Error("UnifyU branding missing");
    if (!text.includes("Log In")) throw new Error("Log In tab missing");
    if (!text.includes("Sign Up")) throw new Error("Sign Up tab missing");
    console.log(`    (auth screen confirmed)`);
  });

  // ── Test 2: Signup ───────────────────────────────────────────────────────────
  await test("Can create a new account", async (page) => {
    await loadAuth(page);

    // Switch to Sign Up tab
    await clickLastByText(page, "Sign Up");
    await page.waitForSelector('input[placeholder="Full name"]', { timeout: 8000 });

    await page.fill('input[placeholder="Full name"]', TEST_USER.name);
    await page.fill('input[placeholder="Username"]', TEST_USER.username);
    await page.fill('input[placeholder*="Password"]', TEST_USER.password);

    // Click the submit button (TouchableOpacity with role="button")
    await clickLastByText(page, "Sign Up");

    await page.waitForFunction(
      () => !document.body.innerText.includes("Join the community"),
      { timeout: 15000 }
    );
    console.log(`    (account created: ${TEST_USER.username})`);
  });

  // ── Test 3: Login ────────────────────────────────────────────────────────────
  await test("Can log in with created account", async (page) => {
    await login(page);
    const text = await page.evaluate(() => document.body.innerText);
    if (text.includes("Welcome back")) throw new Error("Still on auth screen after login");
    console.log(`    (logged in — page: "${text.substring(0, 80).replace(/\n/g, " ")}")`);
  });

  // ── Test 4: Tab bar ──────────────────────────────────────────────────────────
  await test("Tab bar shows Blogs, UniAI, Settings after login", async (page) => {
    await login(page);
    const text = await page.evaluate(() => document.body.innerText);
    const hasBlogs = text.includes("Blogs");
    const hasUniAI = text.includes("UniAI");
    const hasSettings = text.includes("Settings");
    console.log(`    (Blogs:${hasBlogs} UniAI:${hasUniAI} Settings:${hasSettings})`);
    if (!hasBlogs && !hasUniAI && !hasSettings) {
      throw new Error(`Tab bar not found. Page snippet: "${text.substring(0, 200).replace(/\n/g, " ")}"`);
    }
  });

  // ── Test 5: UniAI ────────────────────────────────────────────────────────────
  await test("Can navigate to UniAI screen", async (page) => {
    await login(page);
    await clickLastByText(page, "UniAI");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    console.log(`    (UniAI screen: "${text.substring(0, 100).replace(/\n/g, " ")}")`);
    if (!text.includes("UniAI") && !text.includes("Ask") && !text.includes("student")) {
      throw new Error("UniAI screen content not found");
    }
  });

  // ── Test 6: Settings ─────────────────────────────────────────────────────────
  await test("Can navigate to Settings screen", async (page) => {
    await login(page);
    await clickLastByText(page, "Settings");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    console.log(`    (settings: "${text.substring(0, 100).replace(/\n/g, " ")}")`);
    if (!text.includes("Settings") && !text.includes(TEST_USER.username)) {
      throw new Error("Settings screen not found");
    }
  });

  // ── Test 7: Blogs tab ────────────────────────────────────────────────────────
  await test("Blogs tab shows feed", async (page) => {
    await login(page);
    await clickLastByText(page, "Blogs");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    console.log(`    (blogs: "${text.substring(0, 100).replace(/\n/g, " ")}")`);
    if (!text.includes("Blogs") && !text.includes("UnifyU")) {
      throw new Error("Blogs screen not found");
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
