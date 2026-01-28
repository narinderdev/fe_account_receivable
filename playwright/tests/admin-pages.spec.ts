import { test, expect } from './test-base';
import { mockAdminApis, seedAdminState } from './admin-helpers';

test.describe('Admin workspace smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  test('renders AR Codes for the selected company', async ({ page }) => {
    await page.goto('/admin/ar-code');

    const newButton = page.getByRole('button', { name: 'New AR Code' });
    await expect(newButton).toBeVisible();
    await expect(newButton).toBeDisabled();
    await expect(newButton).toHaveAttribute(
      'title',
      'Create at least one GL code before adding AR codes.'
    );

    const rows = page.locator('table.data-table tbody tr');
    await expect(rows).toHaveCount(2);
    const firstRowCells = rows.first().locator('td');
    await expect(firstRowCells.nth(0)).toHaveText('GL-100');
    await expect(firstRowCells.nth(1)).toHaveText('General Ledger');
    await expect(firstRowCells.nth(3)).toHaveText('Primary GL bucket');
    const secondRowCells = rows.nth(1).locator('td');
    await expect(secondRowCells.nth(0)).toHaveText('BNK-001');
    await expect(secondRowCells.nth(1)).toHaveText('Bank Cash');
    await expect(secondRowCells.nth(3)).toHaveText('Cash on Hand');

  });

  test('lists existing roles and enforces permission helpers', async ({ page }) => {
    await page.goto('/admin/roles');

    await expect(page.getByRole('cell', { name: 'Collections Manager' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Billing Admin' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Role' }).click();
    await expect(page.getByRole('heading', { name: 'Add Role' })).toBeVisible();
    await expect(page.locator('.modal-subtitle')).toContainText('1 permission(s) selected');

    const companyRow = page.locator('tbody tr', { hasText: 'Company' }).first();
    const viewCheckbox = companyRow.getByRole('checkbox').first();
    await expect(viewCheckbox).toBeDisabled();

    const createCheckbox = companyRow.getByRole('checkbox').nth(1);
    await createCheckbox.check();
    await expect(page.locator('.modal-subtitle')).toContainText('2 permission(s) selected');
  });
});
