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
  rows: [],
  content,
  totalPages: content.length ? 1 : 0,
  number: 0,
  size: 10,
  totalElements: content.length,
  first: true,
  last: true,
});

const glCodeRows = [
  {
    id: 301,
    glCode: '1000',
    description: 'Cash and cash equivalents',
    accountType: 'CASH',
    active: true,
  },
  {
    id: 302,
    glCode: '2000',
    description: 'Accounts Receivable',
    accountType: 'AR',
    active: true,
  },
];

test.describe('GL Codes workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupGlCodeRoutes(page);
    await seedAdminState(page);
  });

  test('lists, creates, and edits GL codes', async ({ page }) => {
    await page.goto('/admin/gl-code');

    const rows = page.locator('.data-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('1000');

    const newButton = page.getByRole('button', { name: 'New GL Code' });
    await newButton.click();

    const modal = page.locator('.gl-code-modal');
    await expect(modal).toBeVisible();

    await page.fill('input[formcontrolname="glCode"]', '5000');
    await page.fill('textarea[formcontrolname="description"]', 'Revenue placeholder created in E2E');
    await page.selectOption('select[formcontrolname="accountType"]', 'REVENUE');

    const createRequest = waitForGlCodeCreate(page);
    await modal.getByRole('button', { name: 'Save GL Code' }).click();
    await createRequest;
    await expect(modal).toBeHidden();

    await page.getByAltText('Edit GL code').first().click();
    await expect(modal).toBeVisible();
    await page.fill('textarea[formcontrolname="description"]', 'Updated cash bucket via test');
    await page.selectOption('select[formcontrolname="accountType"]', 'EXPENSE');

    const updateRequest = waitForGlCodeUpdate(page, glCodeRows[0].id);
    await modal.getByRole('button', { name: 'Save GL Code' }).click();
    await updateRequest;
    await expect(modal).toBeHidden();
  });
});

async function setupGlCodeRoutes(page: Page) {
  await page.route('**/api/gl-codes/company/1*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    // let PUT/other specialized routes handle their logic
    if (/\/api\/gl-codes\/company\/1\/\d+/.test(route.request().url())) {
      await route.continue();
      return;
    }
    if (/\/api\/gl-codes\/company\/1\/user\//.test(route.request().url())) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(paginated(glCodeRows))),
    });
  });

  await page.route('**/api/gl-codes/company/1/user/1', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(
        success({
          id: 999,
          glCode: payload.glCode,
          description: payload.description,
          accountType: payload.accountType,
          active: true,
        })
      ),
    });
  });

  await page.route('**/api/gl-codes/company/1/*', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(
        success({
          id: Number(route.request().url().split('/').pop()),
          glCode: payload.glCode ?? glCodeRows[0].glCode,
          description: payload.description ?? glCodeRows[0].description,
          accountType: payload.accountType ?? glCodeRows[0].accountType,
          active: true,
        })
      ),
    });
  });
}

async function waitForGlCodeCreate(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/api/gl-codes/company/1/user/1') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function waitForGlCodeUpdate(page: Page, glCodeId: number) {
  await page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/gl-codes/company/1/${glCodeId}`) &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
}
