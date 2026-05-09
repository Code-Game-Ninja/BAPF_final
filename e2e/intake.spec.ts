import { test, expect } from "@playwright/test";
import path from "path";

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

test.describe("Intake Flow with PDF Upload", () => {
  test.describe.configure({ mode: "serial" });

  test("Should complete policy intake via PDF extraction", async ({ page }) => {
    // 1. Login
    await login(page);

    // 2. Go to Intake desk
    await page.goto("/dashboard/intake");
    await expect(page.getByText(/Unified Intake Desk/i)).toBeVisible({ timeout: 10000 });

    // Step 0: Auto Detect (skips to Customer selection)
    await page.getByRole("heading", { name: /Auto-Detect/i }).click();

    // Step 2: Customer Selection
    await expect(page.getByText(/Client Identity|New Onboarding/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Begin Onboarding/i }).click();

    // Step 3: OCR Upload
    await expect(page.getByText(/Policy OCR Engine/i)).toBeVisible({ timeout: 10000 });
    
    // Upload the PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/pdf/apnGreenEnergy.pdf');

    // Wait for Extraction to complete (isExtracting goes true then false)
    // The "AI Extraction in Progress" overlay should appear and then disappear
    await expect(page.getByText(/AI Extraction in Progress/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/AI Extraction in Progress/i)).toBeHidden({ timeout: 30000 });

    // Wait for Step 4 (SideBySideReview) or Step 5 (ProductForm) depending on flow
    // A toast "Detected: ... Auto-filled fields" should appear
    
    // Step 4: Verify Extraction Result
    // Check if we reached Step 4
    const step4Heading = page.getByText(/Verify Extraction Result|Capture Product Specifics/i);
    await expect(step4Heading.first()).toBeVisible({ timeout: 10000 });

    // Click Confirm or Next
    const confirmBtn = page.getByRole("button", { name: /Confirm|Proceed|Next/i });
    if (await confirmBtn.count() > 0) {
       await confirmBtn.first().click();
    }

    // Step 5: Product Form (Capture Product Specifics)
    const step5Heading = page.getByText(/Capture Product Specifics|Final Execution/i);
    await expect(step5Heading.first()).toBeVisible({ timeout: 10000 });

    const nextBtn = page.getByRole("button", { name: /Next|Review|Continue/i });
    if (await nextBtn.count() > 0) {
       await nextBtn.first().click();
    }

    // Step 6: Final Execution
    const step6Heading = page.getByText(/Final Execution/i);
    await expect(step6Heading).toBeVisible({ timeout: 10000 });

    // Trigger Final Execution
    await page.getByRole("button", { name: /Issue|Create|Finalize|Confirm/i }).last().click();

    // Should redirect to Business Case or show success
    await expect(page).toHaveURL(/business-cases|dashboard/, { timeout: 30000 });
  });
});
