import { test, expect } from "@playwright/test";

test.describe("AI Legal Assist — End-to-End User Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API calls with deterministic mock responses
    await page.route("**/api/summarize", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: "This consulting agreement outlines standard advisory services and milestone deliverables.",
          key_points: [
            "Monthly compensation of $5,000 paid net 30.",
            "Work product is owned exclusively by the Client.",
          ],
          actionable_checklist: [
            "Submit monthly invoices by the 25th calendar day.",
            "Sign confidentiality Schedule B prior to onboarding.",
          ],
          next_steps: [
            "Confirm invoice submission email address.",
          ],
          original_length: 512,
        }),
      });
    });

    await page.route("**/api/risks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          overall_assessment: "Moderate risk identified in indemnification obligations.",
          risks: [
            {
              clause: "Indemnity",
              risk_level: "high",
              explanation: "Unilateral indemnification requires consultant to defend client against third-party claims.",
              recommendation: "Request mutual indemnification capped at total fees paid.",
            },
          ],
          actionable_next_steps: [
            "Propose revision inserting mutual limitation of liability.",
          ],
        }),
      });
    });

    await page.goto("/");
  });

  test("1. Landing page loads with mandatory persistent disclaimer and accessibility markers", async ({
    page,
  }) => {
    // Verify application title
    await expect(page).toHaveTitle(/AI Legal Assist/i);

    // Verify persistent legal disclaimer banner
    const disclaimer = page.locator("#legal-disclaimer");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText("Important Legal Notice");
    await expect(disclaimer).toContainText("does not constitute, nor should it replace, professional legal advice");

    // Verify all four core tool tabs are present
    await expect(page.locator("#tab-simplifier")).toBeVisible();
    await expect(page.locator("#tab-comparator")).toBeVisible();
    await expect(page.locator("#tab-risks")).toBeVisible();
    await expect(page.locator("#tab-chat")).toBeVisible();
  });

  test("2. Upload document, view summary, key points, and interactive checklist", async ({
    page,
  }) => {
    // Select Document Simplifier tab
    await page.locator("#tab-simplifier").click();

    // Prepare mock legal file upload
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "agreement.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Consulting agreement terms and conditions for demonstration purposes."),
    });

    // Verify file name is indicated in upload zone
    await expect(page.locator("#panel-simplifier")).toContainText("agreement.txt");

    // Click Simplify Document button
    const simplifyBtn = page.getByRole("button", { name: /simplify document/i });
    await expect(simplifyBtn).toBeEnabled();
    await simplifyBtn.click();

    // Verify generated Plain-Language Summary renders
    await expect(page.locator("#panel-simplifier")).toContainText("consulting agreement outlines standard advisory services");

    // Verify Key Points render
    await expect(page.locator("#panel-simplifier")).toContainText("Monthly compensation of $5,000");

    // Verify Actionable Checklist renders with interactive checkboxes
    await expect(page.locator("#panel-simplifier")).toContainText("Actionable Checklist");
    const checkbox = page.locator('input[type="checkbox"]').nth(1); // after disclaimer checkbox
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test("3. Trigger Risk Highlighter and verify flagged liabilities and remediation steps", async ({
    page,
  }) => {
    // Switch to Risk Highlighter tab
    await page.locator("#tab-risks").click();
    await expect(page.locator("#panel-risks")).toBeVisible();

    // Upload contract
    const fileInput = page.locator('#panel-risks input[type="file"]');
    await fileInput.setInputFiles({
      name: "vendor_contract.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Vendor terms with indemnity clause."),
    });

    // Click Analyze Risks button
    const analyzeBtn = page.getByRole("button", { name: /analyze risks & obligations/i });
    await expect(analyzeBtn).toBeEnabled();
    await analyzeBtn.click();

    // Verify Overall Assessment and High Risk badge
    await expect(page.locator("#panel-risks")).toContainText("Moderate risk identified in indemnification obligations");
    await expect(page.locator(".risk-badge.high")).toBeVisible();

    // Verify Actionable Priority Remediation Steps
    await expect(page.locator("#panel-risks")).toContainText("Priority Remediation Steps");
    await expect(page.locator("#panel-risks")).toContainText("mutual limitation of liability");
  });
});
