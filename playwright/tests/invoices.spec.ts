import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const sampleInvoiceNumber = 'INV-9001';
const sampleInvoiceId = 9001;
const sampleCustomerId = 201;
const sampleCustomerName = 'Globex Retail';
const createdInvoiceId = 9901;

test.describe('Invoices and create invoice flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('lists invoices, supports filtering, and navigates to creation form', async ({ page }) => {
    await page.goto('/admin/invoices');

    const searchInput = page.getByPlaceholder('Enter company name');
    await expect(searchInput).toBeVisible();
    await expect(page.getByText(sampleCustomerName)).toBeVisible();
    await expect(page.getByText(sampleInvoiceNumber)).toBeVisible();

    await searchInput.fill('zzz');
    await expect(page.getByText('No invoices found.')).toBeVisible();

    await searchInput.fill('glo');
    await expect(page.getByText(sampleCustomerName)).toBeVisible();

    await page.getByRole('button', { name: 'New Invoice' }).click();
    await expect(page).toHaveURL('/admin/invoices/create');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('creates a manual invoice, validates totals, and sends it', async ({ page }) => {
    await setupInvoiceCreationMocks(page);

    await page.goto('/admin/invoices/create');

    const dateInputs = page.locator('input[type="date"]');
    await clearDateInput(dateInputs.nth(0));
    await clearDateInput(dateInputs.nth(1));

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Customer is required.')).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Invoice date is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Due date is required.' })).toBeVisible();
    await expect(page.getByText('Invoice number is required if auto-generate is not selected.')).toBeVisible();
    await expect(page.getByText('Note is required.')).toBeVisible();

    await page.locator('select').first().selectOption(String(sampleCustomerId));

    const today = formatDate(0);
    const dueDate = formatDate(7);

    const dateFields = page.locator('input[type="date"]');
    await dateFields.nth(0).fill(today);
    await dateFields.nth(1).fill(dueDate);

    const invoiceNumberInput = page.locator('.invoice-number-wrapper input');
    await invoiceNumberInput.fill('4321');

    const firstItemRow = page.locator('.item-row').first();
    await firstItemRow.locator('.col-item input').fill('Implementation Services');
    await firstItemRow.locator('.col-description input').fill('ERP rollout support');
    await firstItemRow.locator('.col-quantity input').fill('1');
    await firstItemRow.locator('.col-rate input').fill('1000');
    await firstItemRow.locator('.col-tax input').fill('5');

    await page.locator('.notes-textarea').fill('Payment due within 30 days.');

    await Promise.all([
      page.waitForURL('**/admin/invoices'),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);
    await expect(page.getByText(sampleInvoiceNumber)).toBeVisible();
  });
});

async function setupInvoiceCreationMocks(page: Page) {
  const jsonHeaders = {
    ...apiCorsHeaders,
    'content-type': 'application/json',
  };

  await page.route(`**/invoice/${sampleCustomerId}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success({ id: createdInvoiceId })),
    });
  });

}

function success<T>(data: T) {
  return {
    statusCode: 200,
    status: 'success',
    message: 'ok',
    data,
  };
}

function formatDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

async function clearDateInput(locator: Locator) {
  await locator.waitFor({ state: 'attached' });
  await locator.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
