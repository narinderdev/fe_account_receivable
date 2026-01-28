import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

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

const paginated = <T>(content: T[]) => ({
  content,
  totalPages: content.length ? 1 : 0,
  totalElements: content.length,
  number: 0,
  size: 10,
});

const draftWriteOffs = [
  {
    id: 7101,
    customerName: 'Globex Retail',
    invoiceNumber: 'INV-9001',
    reason: 'Customer merger adjustment',
    writeOffDate: null,
    status: 'DRAFT',
  },
];

const approvedWriteOffs = [
  {
    id: 7102,
    customerName: 'Acme Corp',
    invoiceNumber: 'INV-1001',
    reason: 'Bankruptcy',
    writeOffDate: '2024-02-15',
    status: 'APPROVED',
  },
];

test.describe('Write-Off workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupWriteOffRoutes(page);
    await seedAdminState(page, { userContext: JSON.stringify({ isAdmin: true, permissions: [] }) });
  });

  test('creates and approves write-offs', async ({ page }) => {
    await page.goto('/admin/write-off');

    const draftRows = page.locator('.data-table tbody tr');
    await expect(draftRows).toHaveCount(1);
    await expect(draftRows.first()).toContainText('Globex Retail');

    await page.getByRole('button', { name: 'New Write-Off' }).click();
    const modal = page.locator('.write-off-modal');
    await expect(modal).toBeVisible();

    await page.selectOption('select[formcontrolname="customerId"]', '201');
    await expect(page.locator('.invoice-table')).toBeVisible();

    const invoiceRow = page.locator('.invoice-table tbody tr').first();
    await invoiceRow.click();
    await expect(invoiceRow).toHaveClass(/selected-row/);

    await page.selectOption('select[formcontrolname="arCodeId"]', '101');
    await page.fill('textarea[formcontrolname="reason"]', 'Testing write-off creation');

    const createRequest = waitForWriteOffCreate(page);
    await modal.getByRole('button', { name: 'Save Write-Off' }).click();
    await createRequest;
    await expect(modal).toBeHidden();

    const approveButton = page.locator('.data-table tbody tr').first().getByRole('button', { name: 'Approve' });
    await approveButton.click();
    const approveHeading = page.getByRole('heading', { name: 'Approve Write-Off' });
    await expect(approveHeading).toBeVisible();
    const approveModal = approveHeading.locator('..').locator('..');
    const approveRequest = waitForWriteOffApprove(page, draftWriteOffs[0].id);
    await approveModal.getByRole('button', { name: 'Confirm Approval' }).click();
    await approveRequest;
    await expect(approveModal).toBeHidden();
  });
});

async function setupWriteOffRoutes(page: Page) {
  await page.route('**/invoice/customer/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(
        success([
          {
            id: 9001,
            invoiceNumber: 'INV-9001',
            invoiceDate: '2024-02-01',
            dueDate: '2024-02-28',
            totalAmount: 2500,
            balanceDue: 1300,
            status: 'OPEN',
          },
        ])
      ),
    });
  });

  await page.route('**/write-offs/company/1/filter**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const status = (url.searchParams.get('status') ?? 'DRAFT').toUpperCase();
    const content = status === 'APPROVED' ? approvedWriteOffs : draftWriteOffs;
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(paginated(content))),
    });
  });

  await page.route('**/write-offs/company/1/invoice/**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success({ id: 7999 })),
    });
  });

  await page.route('**/write-offs/*/approve', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success({ id: Number(route.request().url().split('/').at(-2)) })),
    });
  });
}

async function waitForWriteOffCreate(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/write-offs/company/1/invoice/') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function waitForWriteOffApprove(page: Page, writeOffId: number) {
  await page.waitForResponse(
    (response) =>
      response.url().endsWith(`/write-offs/${writeOffId}/approve`) &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
}
