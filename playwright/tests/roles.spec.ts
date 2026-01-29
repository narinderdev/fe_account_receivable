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

const sampleRoles = [
  {
    id: 1,
    name: 'Collections Manager',
    description: 'Handles outreach to customers',
    permissions: ['VIEW_COLLECTIONS', 'CREATE_PROMISE_TO_PAY'],
  },
  {
    id: 2,
    name: 'Billing Admin',
    description: 'Full receivables access',
    permissions: ['VIEW_COMPANY', 'CREATE_AR_CODE', 'VIEW_ROLES'],
  },
];

test.describe('Roles workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupRoleRoutes(page);
    await seedAdminState(page);
  });

  test('lists roles and enforces permission dependencies when creating a new role', async ({ page }) => {
    await page.goto('/admin/roles', { waitUntil: 'domcontentloaded' });

    const rows = page.locator('.roles-table tbody tr');
    await expect(rows).toHaveCount(sampleRoles.length);
    await expect(rows.first()).toContainText('Collections Manager');

    await page.getByRole('button', { name: 'Add Role' }).click();
    const modal = page.locator('.modal-card');
    await expect(modal).toBeVisible();

    const companyRow = modal.locator('tr', { hasText: 'Company' }).first();
    const viewCheckbox = companyRow.locator('td').nth(1).locator('input');
    await expect(viewCheckbox).toBeChecked();
    await expect(viewCheckbox).toBeDisabled();

    const createCheckbox = companyRow.locator('td').nth(2).locator('input');
    await createCheckbox.check({ force: true });
    await expect(createCheckbox).toBeChecked();
    await expect(viewCheckbox).toBeChecked();

    const subtitle = modal.locator('.modal-subtitle');
    await expect(subtitle).toContainText('2 permission');

    await page.fill('input[formcontrolname="name"]', 'Playwright QA Role');
    await page.fill('textarea[formcontrolname="description"]', 'Created via automated coverage');

    const createRequest = waitForRoleCreate(page);
    await modal.getByRole('button', { name: 'Create Role' }).click();
    await createRequest;
    await expect(modal).toBeHidden();
  });
});

async function setupRoleRoutes(page: Page) {
  await page.route('**/api/roles/company/1', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(success(sampleRoles)),
      });
      return;
    }
    if (method === 'POST') {
      const payload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(
          success({
            id: 999,
            name: payload.name,
            description: payload.description,
            permissions: payload.permissions,
          })
        ),
      });
      return;
    }
    await route.continue();
  });
}

async function waitForRoleCreate(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/api/roles/company/1') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}
