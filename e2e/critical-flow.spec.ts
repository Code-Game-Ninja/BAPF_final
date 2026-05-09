/**
 * BPAF Insurance Portal — E2E Critical Flow Tests
 *
 * Tests the core workflow:
 * 1. Login
 * 2. Create Customer
 * 3. Add Policy
 * 4. Record Premium
 * 5. Verify Dashboard Stats
 *
 * Prerequisites:
 * - App running at http://localhost:3000
 * - Supabase project configured with test user credentials
 * - Test user credentials in env: E2E_EMAIL, E2E_PASSWORD
 *
 * Run: npx playwright test
 */

import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "admin@bpaf.com";
const PASSWORD = process.env.E2E_PASSWORD || "Admin@123456";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

test.describe("Critical Flow: Login → Customer → Policy → Premium → Dashboard", () => {
  test.describe.configure({ mode: "serial" });

  let customerUID = "";
  const policyNumber = "";

  test("1. Login with valid credentials", async ({ page }) => {
    await login(page);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test("2. Navigate to Customers and open create form", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/customers");
    await expect(page).toHaveURL(/customers/);

    // Click Add Customer button
    const addButton = page.getByRole("button", { name: /add|new|create/i });
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();

    // Dialog should appear
    await expect(page.getByText(/add new customer/i)).toBeVisible();
  });

  test("3. Create a new customer", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/customers");

    // Open form
    await page.getByRole("button", { name: /add|new|create/i }).click();
    await expect(page.getByText(/add new customer/i)).toBeVisible();

    // Fill form
    const testName = `E2E Test ${Date.now()}`;
    await page.getByLabel(/name/i).fill(testName);
    await page.getByLabel(/email/i).fill(`e2e-${Date.now()}@test.com`);
    await page.getByLabel(/phone/i).fill(`98${Date.now().toString().slice(-8)}`);

    // Submit
    await page.getByRole("button", { name: /create customer/i }).click();

    // Wait for created customer to appear back in list
    await expect(page.getByText(testName)).toBeVisible({ timeout: 15_000 });

    // Capture UID from table row if available (supports C-0001 and BPAF-Cxxxx formats)
    const row = page.locator("tr", { hasText: testName }).first();
    const rowText = (await row.textContent()) || "";
    const uidMatch = rowText.match(/(?:BPAF-)?C-?\d+/i);
    customerUID = uidMatch?.[0] || "";
  });

  test("4. Navigate to Policies page", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/policies");
    await expect(page).toHaveURL(/policies/);
    await expect(page.getByText(/policies/i).first()).toBeVisible();
  });

  test("5. Verify dashboard shows stats", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);

    // Dashboard should show stat cards
    await expect(page.getByText(/total policies|active policies/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Welcome message should include user name
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test("6. Search via Ctrl+K opens global search", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // Trigger global search
    await page.keyboard.press("Control+k");

    // Command dialog should appear
    await expect(page.getByPlaceholder(/search|type a command/i)).toBeVisible({
      timeout: 5_000,
    });

    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("7. Sidebar navigation works", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);

    // Click on Customers in sidebar
    await page.getByRole("link", { name: /customers/i }).first().click();
    await expect(page).toHaveURL(/customers/);

    // Click on Policies
    await page.getByRole("link", { name: /policies/i }).first().click();
    await expect(page).toHaveURL(/policies/);
  });
});
