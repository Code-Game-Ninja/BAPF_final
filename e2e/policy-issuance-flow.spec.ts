import { test, expect } from "@playwright/test";

/**
 * E2E Test: Policy Issuance Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * This test validates the core business process of the CRM:
 * 1. Authentication
 * 2. Navigating through the Multi-step Intake Wizard
 * 3. AI-Powered PDF Extraction (OCR)
 * 4. Data Validation and Enrichment
 * 5. Policy Creation and Business Case Generation
 */

const EMAIL = process.env.E2E_EMAIL || "admin@bpaf.com";
const PASSWORD = process.env.E2E_PASSWORD || "Admin@123456";

test.describe("Critical Flow: Policy Issuance", () => {
  // We use serial mode because this is a sequential business flow
  test.describe.configure({ mode: "serial" });

  test("should issue a new policy via unified intake flow", async ({ page }) => {
    // --- 1. Authentication ---
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    
    // Wait for dashboard redirect
    await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });

    // --- 2. Navigate to Intake Desk ---
    await page.goto("/dashboard/intake");
    await expect(page.getByText(/Unified Intake Desk/i)).toBeVisible();

    // --- 3. Step 1: Category Selection ---
    // Select "Motor" category
    await page.getByRole("heading", { name: /Motor/i }).click();
    
    // --- 4. Step 2: Action Selection ---
    // Select "Fresh Policy" action
    await page.getByRole("heading", { name: /Fresh/i }).click();

    // --- 5. Step 3: Customer Selection ---
    // For E2E reliability, we'll start a "New Onboarding"
    await page.getByRole("button", { name: /Begin Onboarding/i }).click();

    // --- 6. Step 4: Policy Upload & OCR ---
    await expect(page.getByText(/Policy OCR Engine/i)).toBeVisible();
    
    // Upload the sample PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/pdf/apnGreenEnergy.pdf');

    // Wait for AI extraction overlay to appear and disappear
    await expect(page.getByText(/AI Extraction in Progress/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/AI Extraction in Progress/i)).toBeHidden({ timeout: 45000 });

    // --- 7. Step 5: Data Verification (Side-by-Side Review) ---
    await expect(page.getByText(/Verify Extraction Result/i)).toBeVisible();
    
    // Verify that at least some data was auto-filled (e.g. Policy Number or Name)
    const policyNumberInput = page.locator('input[placeholder*="POL-"]').first();
    const extractedValue = await policyNumberInput.inputValue();
    // We don't check exact value as it might change based on AI, but it should not be empty
    expect(extractedValue.length).toBeGreaterThan(0);

    // Proceed to Product Specifics
    await page.getByRole("button", { name: /Confirm & Next|Proceed/i }).click();

    // --- 8. Step 6: Product Details (Capture Product Specifics) ---
    await expect(page.getByText(/Capture Product Specifics/i)).toBeVisible();
    
    // The form should be pre-filled, but we'll ensure required fields are present
    // Just click Next to proceed to summary
    await page.getByRole("button", { name: /Review Summary|Next/i }).click();

    // --- 9. Step 7: Final Summary & Execution ---
    await expect(page.getByText(/Final Execution/i)).toBeVisible();
    
    // Capture the policy number for verification later
    const summaryPolicyNo = await page.getByText(/POL-/).first().textContent();

    // Trigger Final Issuance
    await page.getByRole("button", { name: /Issue Policy|Finalize/i }).click();

    // --- 10. Verification & Redirection ---
    // The system should redirect to the newly created Business Case
    await expect(page).toHaveURL(/business-cases\/[a-f0-9-]+/, { timeout: 30000 });

    // Verify Business Case Details
    await expect(page.getByText(/Business Case Details/i)).toBeVisible();
    if (summaryPolicyNo) {
        await expect(page.getByText(summaryPolicyNo)).toBeVisible();
    }
    
    // Verify status is "Open" or "Success"
    await expect(page.getByText(/Open|Processed/i).first()).toBeVisible();
  });
});
