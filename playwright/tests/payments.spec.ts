import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { mockAdminApis, seedAdminState } from './admin-helpers';

const samplePaymentId = 4001;
const sampleCustomerName = 'Globex Retail';
const sampleInvoiceNumber = 'INV-9001';

test.describe('Payments workflows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('lists payments, filters results, and opens payment details', async ({ page }) => {
    await page.goto('/admin/payments');
    await expect(page.getByRole('button', { name: 'Receive Payments' })).toBeVisible();

    const searchInput = page.getByPlaceholder('Enter company name');
    await expect(searchInput).toBeVisible();
    await expect(page.getByText(sampleCustomerName)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ACH' })).toBeVisible();

    await searchInput.fill('xyz');
    await expect(page.getByText('No payments found.')).toBeVisible();

    await searchInput.fill('glo');
    await expect(page.getByText(sampleCustomerName)).toBeVisible();

    await page.locator('tbody tr').filter({ hasText: sampleCustomerName }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/payments/details/${samplePaymentId}$`));
    await expect(page.locator('.company-name')).toHaveText(sampleCustomerName);
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(page.locator('.value', { hasText: '$1,300.00' }).first()).toBeVisible();
  });

  test('receive payment flow validates inputs and applies a payment', async ({ page }) => {
    await page.goto('/admin/payments');
    await page.getByRole('button', { name: 'Receive Payments' }).click();
    await expect(page).toHaveURL(/\/admin\/payments\/receive-payment$/);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Company is required')).toBeVisible();
    await expect(page.getByText('Bank deposit is required and must be 0 or greater')).toBeVisible();
    await expect(page.getByText('Service fee must be 0 or greater')).toHaveCount(0);
    await expect(page.getByText('Payment method is required')).toBeVisible();
    await expect(page.getByText('Please select at least one invoice to apply the payment')).toBeVisible();
    await expect(page.getByText('Notes are required')).toBeVisible();

    const serviceFeeInput = page.locator('input[name="serviceFee"]');
    await serviceFeeInput.fill('-5');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Service fee must be 0 or greater')).toBeVisible();
    await serviceFeeInput.fill('');

    await page.locator('select[name="customer"]').selectOption({ label: sampleCustomerName });
    await expect(page.getByText(sampleInvoiceNumber)).toBeVisible();

    await page.locator('input[name="bankDeposit"]').fill('1000');
    await page.locator('input[name="serviceFee"]').fill('300');
    await page.locator('select[name="paymentMethod"]').selectOption('BANK_TRANSFER');
    await page.locator('textarea[name="notes"]').fill('Payment allocation for invoice INV-9001.');
    await page.locator('#invoice-9001').check();

    const appliedRow = page.locator('.summary-row').filter({ hasText: 'Applied to Invoices' });
    await expect(appliedRow.locator('strong').first()).toHaveText('$1,000.00');
    const unappliedRow = page.locator('.summary-row').filter({ hasText: 'Unapplied Amount' });
    await expect(unappliedRow.locator('strong').first()).toHaveText('$0.00');

    await Promise.all([
      waitForApplyPayment(page),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);

    await page.waitForURL('**/admin/payments');
    await expect(page.getByText(sampleCustomerName)).toBeVisible();
  });
});

async function waitForApplyPayment(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/payment/apply/') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}
