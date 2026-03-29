import { test, expect, chromium } from "@playwright/test";

test.use({ launchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] } });

const BASE = "http://localhost:8081";

test("UnifyU loads the Auth screen", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator("text=UnifyU")).toBeVisible({ timeout: 15000 });
  // Should show login/signup tabs
  await expect(page.locator("text=Log In")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=Sign Up")).toBeVisible({ timeout: 5000 });
});

test("Signup tab switches correctly", async ({ page }) => {
  await page.goto(BASE);
  await page.waitForSelector("text=Sign Up", { timeout: 15000 });
  await page.click("text=Sign Up");
  await expect(page.locator("text=Join the community")).toBeVisible({ timeout: 5000 });
});

test("Login form shows fields", async ({ page }) => {
  await page.goto(BASE);
  await page.waitForSelector("text=Log In", { timeout: 15000 });
  await page.click("text=Log In");
  await expect(page.locator("text=Welcome back")).toBeVisible({ timeout: 5000 });
});
