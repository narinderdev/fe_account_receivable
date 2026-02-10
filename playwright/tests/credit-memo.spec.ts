import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const sampleCreditMemoId = 6101;

const jsonHeaders = {
  ...apiCorsHeaders,
  'content-type': 'application/json',
};

const success = <T>(data: T) => ({
  statusCode: 200,
  status: 'success',
  message: 'ok',
  data,
});

test.describe('Credit memo board', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('shows created/approved tabs and approves a memo', async ({ page }) => {
    await setupCreditMemoRoutes(page);
    await page.goto('/admin/credit-memo');

    await expect(page.getByRole('button', { name: 'New Credit Memo' })).toBeVisible();
    await expect(page.getByText('CM-6101')).toBeVisible();

    await page.getByRole('button', { name: 'Approved' }).click();
    await expect(page.getByText('No approved credit memos available.')).toBeVisible();

    await page.getByRole('button', { name: 'Created' }).click();
    await page.getByRole('button', { name: /^Approve$/ }).first().click();
    const approveHeading = page.getByRole('heading', { name: 'Approve Credit Memo' });
    await expect(approveHeading).toBeVisible();
    const approveModal = approveHeading.locator('..').locator('..');

    const approval = waitForApproval(page);
    await approveModal.getByRole('button', { name: 'Confirm Approval' }).click();
    await approval;
    await expect(approveModal).toBeHidden();
  });
});

async function setupCreditMemoRoutes(page: Page) {
  await page.route(`**/credit-memos/${sampleCreditMemoId}/approve`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success({ id: sampleCreditMemoId, status: 'APPROVED' })),
    });
  });
}

async function waitForApproval(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/credit-memos/') &&
      response.url().endsWith('/approve') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}
