import { expect, test } from './test-base';
import { mockAdminApis, seedAdminState } from './admin-helpers';

const sampleCustomerName = 'Globex Retail';

test.describe('Aging report', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('filters by customer/status and offers PDF export', async ({ page }) => {
    await page.goto('/admin/ar-reports');

    const exportButton = page.getByRole('button', { name: 'Export Report' });
    await expect(exportButton).toBeVisible();
    await exportButton.click();
    await expect(page.getByRole('button', { name: 'Export as PDF' })).toBeVisible();
    await exportButton.click();

    const agingTable = page.locator('#agingTable');
    await expect(agingTable.getByText(sampleCustomerName, { exact: true })).toBeVisible();
    await expect(agingTable.getByText('$5,000.00', { exact: true })).toBeVisible();

    const selects = page.locator('.filters-row select');
    await selects.first().selectOption({ label: sampleCustomerName });
    await selects.nth(1).selectOption('OPEN');

    await expect(agingTable.getByText('$3,200.00', { exact: true })).toBeVisible();
    await expect(agingTable.getByText(sampleCustomerName, { exact: true })).toBeVisible();
  });
});
