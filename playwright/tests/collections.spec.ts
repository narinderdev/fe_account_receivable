import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const sampleCustomerName = 'Globex Retail';
const sampleInvoiceNumber = 'INV-9001';
const promiseCustomerId = '201';

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

test.describe('Collections workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('shows tabs, sends reminders, creates promises, and views disputes', async ({ page }) => {
    await setupCollectionsRoutes(page);
    await page.goto('/admin/collections');

    const overdueBox = page.locator('.overdue-box .amount');
    await expect(overdueBox).toContainText('$18,500');

    await page.getByRole('button', { name: 'Follow-up Reminders' }).click();
    const invoiceRow = page.locator('tbody tr').filter({ hasText: sampleInvoiceNumber }).first();
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow.locator('.customer-name')).toContainText(sampleCustomerName);

    const reminderResponse = waitForReminder(page);
    await invoiceRow.getByRole('button', { name: 'Reminder' }).click();
    await reminderResponse;
    await expect(invoiceRow.getByText('Sent')).toBeVisible();

    await page.getByRole('button', { name: 'Promise to Pay' }).click();
    await expect(page.locator('.data-table')).toContainText(sampleCustomerName);

    await page.getByRole('button', { name: 'New Promise' }).click();
    const promiseModal = page.locator('.promise-modal');
    await expect(promiseModal).toBeVisible();

    await promiseModal.locator('select').first().selectOption(promiseCustomerId);
    await expect(promiseModal.locator('.overdue-display')).toContainText('$4,200');

    await promiseModal.locator('label', { hasText: 'Promise Amount' }).locator('..').locator('input').fill('1200');
    const promiseDate = futureDate(5);
    await promiseModal.locator('label', { hasText: 'Payment Date' }).locator('..').locator('input').fill(promiseDate);
    await promiseModal.locator('textarea').fill('Customer promised to pay this month.');

    const createPromise = waitForPromiseCreate(page);
    await promiseModal.getByRole('button', { name: 'Save Promise' }).click();
    await createPromise;
    await expect(promiseModal).toBeHidden();

    await page.getByRole('button', { name: 'Disputes' }).click();
    await expect(page.getByText('DSP-801')).toBeVisible();
    await page.getByRole('button', { name: 'View' }).click();
    await expect(page).toHaveURL(/\/admin\/collections\/disputes\/\d+$/);
    await expect(page.getByText('Dispute ID')).toBeVisible();
    await expect(page.getByText(sampleInvoiceNumber)).toBeVisible();
  });
});

async function setupCollectionsRoutes(page: Page) {
  await page.route('**/collections/promise', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(route.request().postDataJSON())),
    });
  });
}

function futureDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

async function waitForPromiseCreate(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/collections/promise') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function waitForReminder(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/api/reminders/invoice/') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}
