import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { mockAdminApis, seedAdminState } from './admin-helpers';

const samplePaymentId = 4001;
const sampleCustomerName = 'Globex Retail';
const viewPaymentsOnlyPermissions = ['VIEW_PAYMENTS'];
const applyPaymentPermissions = [...viewPaymentsOnlyPermissions, 'APPLY_PAYMENT'];
const approvePaymentPermissions = [...applyPaymentPermissions, 'APPROVE_PAYMENT'];

test.describe('Payments workflows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
  });

  test('lists payments, filters results, toggles views, and opens payment details', async ({ page }) => {
    await loginWithPermissions(page, approvePaymentPermissions);
    await page.goto('/admin/payments');

    await expect(page.getByRole('button', { name: 'Upload BAI File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Receive Payments' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

    const approveApplyButtons = page.getByRole('button', { name: 'Approve & Apply' });
    await expect(approveApplyButtons.first()).toBeVisible();

    const searchInput = page.getByPlaceholder('Enter customer name');
    await expect(searchInput).toBeVisible();
    await expect(page.getByText(sampleCustomerName)).toBeVisible();

    const periodSelect = page.locator('.period-select');
    await expect(periodSelect).toHaveValue('12');
    await periodSelect.selectOption('custom');

    const customDateFields = page.locator('.search-card-body input[type="date"]');
    await expect(customDateFields).toHaveCount(2);
    await customDateFields.first().fill('2024-01-01');
    await customDateFields.nth(1).fill('2024-02-01');

    await periodSelect.selectOption('1');
    await expect(customDateFields).toHaveCount(0);

    await searchInput.fill('xyz');
    await expect(page.getByText('No payments found.')).toBeVisible();

    await searchInput.fill('glo');
    await expect(page.getByText(sampleCustomerName)).toBeVisible();

    await page.getByRole('button', { name: 'Approved' }).click();
    await expect(page.getByText('No approved payments found.')).toBeVisible();
    await page.getByRole('button', { name: 'Created' }).click();

    const paymentRow = page.locator('tbody tr').filter({ hasText: sampleCustomerName }).first();
    await paymentRow.locator('td').first().click();

    await expect(page).toHaveURL(new RegExp(`/admin/payments/details/MANUAL/${samplePaymentId}$`));
    await expect(page.locator('.company-name')).toHaveText(sampleCustomerName);
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(
      page.locator('.summary-item', { hasText: 'Amount Received' }).locator('.value')
    ).toHaveText('$1,300.00');
    await expect(
      page.locator('.summary-item', { hasText: 'Bank Deposit' }).locator('.value')
    ).toHaveText('$1,300.00');
  });

  test('receive payment flow validates inputs and applies a payment', async ({ page }) => {
    await loginWithPermissions(page, applyPaymentPermissions);
    await page.goto('/admin/payments');

    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Approve & Apply' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Receive Payments' }).click();
    await expect(page).toHaveURL(/\/admin\/payments\/receive-payment$/);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Company is required')).toBeVisible();
    await expect(page.getByText('Bank deposit is required and must be 0 or greater')).toBeVisible();
    await expect(page.getByText('Payment method is required')).toBeVisible();
    await expect(page.getByText('Notes are required')).toBeVisible();

    const serviceFeeInput = page.locator('input[name="serviceFee"]');
    await serviceFeeInput.fill('');

    await page.locator('select[name="customer"]').selectOption({ label: sampleCustomerName });

    await page.locator('input[name="bankDeposit"]').fill('1000');
    await page.locator('input[name="serviceFee"]').fill('300');
    await page.locator('select[name="paymentMethod"]').selectOption('BANK_TRANSFER');
    await page.locator('textarea[name="notes"]').fill('Payment allocation for invoice INV-9001.');

    const summaryBox = page.locator('.summary-box');
    const bankRow = summaryBox.locator('.summary-row').filter({ hasText: 'Bank Deposit' });
    await expect(bankRow.locator('strong')).toHaveText('$1,000.00');
    const feeRow = summaryBox.locator('.summary-row').filter({ hasText: 'Service Fee' });
    await expect(feeRow.locator('strong')).toHaveText('$300.00');
    const totalRow = summaryBox.locator('.summary-row.total-row');
    await expect(totalRow.locator('strong')).toHaveText('$1,000.00');

    await Promise.all([
      waitForApplyPayment(page),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);

    await page.waitForURL('**/admin/payments');
    await expect(page.getByText(sampleCustomerName)).toBeVisible();
  });

  test('hides payment intake controls without APPLY_PAYMENT permission', async ({ page }) => {
    await loginWithPermissions(page, viewPaymentsOnlyPermissions);
    await page.goto('/admin/payments');

    await expect(page.getByRole('button', { name: 'Upload BAI File' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Receive Payments' })).toHaveCount(0);
  });
});

async function waitForApplyPayment(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/payment/manual/create/') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function loginWithPermissions(page: Page, permissions: string[]) {
  await seedAdminState(page, {
    userContext: JSON.stringify({
      userId: 1,
      roleName: 'AR Specialist',
      permissions,
      isAdmin: false,
    }),
  });
}
