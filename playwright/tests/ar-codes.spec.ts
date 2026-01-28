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

const glCodeOptions = [
  { id: 1, glCode: '1000', description: 'Cash' },
  { id: 2, glCode: '2000', description: 'Revenue' },
];

const arCodeRows = [
  {
    id: 501,
    code: 'AR-100',
    name: 'Receivables',
    description: 'Primary AR bucket',
    codeType: 'GL',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    active: true,
    glMappingStatus: 'CONFIGURED',
  },
  {
    id: 502,
    code: 'ADJ-200',
    name: 'Adjustments',
    description: 'Manual adjustments',
    codeType: 'ADJUST_REASON',
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z',
    active: false,
    glMappingStatus: 'MISSING',
  },
];

const mappingPrefill = {
  id: 9001,
  arCode: { id: arCodeRows[0].id },
  debitGlCode: { id: glCodeOptions[0].id },
  creditGlCode: { id: glCodeOptions[1].id },
  active: true,
};

test.describe('AR Codes workspace', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupArCodeRoutes(page);
    await seedAdminState(page);
  });

  test('lists AR codes, allows creation, and configures GL mapping', async ({ page }) => {
    await page.goto('/admin/ar-code');

    const tableRows = page.locator('.data-table tbody tr');
    await expect(tableRows).toHaveCount(2);
    const ar100Row = tableRows.filter({ hasText: 'AR-100' });
    await expect(ar100Row).toHaveCount(1);

    const newButton = page.getByRole('button', { name: 'New AR Code' });
    await expect(newButton).toBeEnabled();
    await newButton.click();

    const modal = page.locator('.ar-code-modal');
    await expect(modal).toBeVisible();

    await page.fill('input[formcontrolname="arCode"]', 'AR-900');
    await page.fill('input[formcontrolname="codeName"]', 'Playwright Test Code');
    await page.selectOption('select[formcontrolname="codeType"]', 'ADJUST_REASON');
    await page.fill('textarea[formcontrolname="description"]', 'Created via Playwright coverage');

    const createRequest = waitForArCodeCreate(page);
    await modal.getByRole('button', { name: 'Save AR Code' }).click();
    await createRequest;
    await expect(modal).toBeHidden();

    const mappingButton = ar100Row.getByRole('button', { name: /configured/i });
    await mappingButton.click();

    const mappingModal = page.locator('.gl-mapping-modal');
    await expect(mappingModal).toBeVisible();

    const debitSelect = mappingModal.locator('select[formcontrolname="debitGlCodeId"]');
    const creditSelect = mappingModal.locator('select[formcontrolname="creditGlCodeId"]');
    await expect(debitSelect).toHaveValue(`${glCodeOptions[0].id}`);
    await expect(creditSelect).toHaveValue(`${glCodeOptions[1].id}`);

    await debitSelect.selectOption(`${glCodeOptions[1].id}`);
    await creditSelect.selectOption(`${glCodeOptions[0].id}`);

    const mappingSave = waitForGlMappingUpdate(page, arCodeRows[0].id);
    await mappingModal.getByRole('button', { name: 'Save' }).click();
    await mappingSave;
    await expect(mappingModal).toBeHidden();
  });
});

async function setupArCodeRoutes(page: Page) {
  await page.route('**/api/gl-codes/company/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(glCodeOptions)),
    });
  });

  await page.route('**/codes/ar-codes/1*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(success(paginated(arCodeRows))),
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
            code: payload.code,
            name: payload.name,
            description: payload.description,
            codeType: payload.codeType ?? 'GL',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true,
            glMappingStatus: 'MISSING',
          })
        ),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/ar-gl-mappings/ar-code/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(mappingPrefill)),
    });
  });

  await page.route('**/api/ar-gl-mappings/companies/1/user/1/ar-code/*', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(
        success({
          ...mappingPrefill,
          debitGlCode: { id: Number(route.request().postDataJSON().debitGlCodeId) },
          creditGlCode: { id: Number(route.request().postDataJSON().creditGlCodeId) },
        })
      ),
    });
  });
}

async function waitForArCodeCreate(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/codes/ar-codes/1') &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function waitForGlMappingUpdate(page: Page, arCodeId: number) {
  await page.waitForResponse(
    (response) =>
      response.url().includes(`/api/ar-gl-mappings/companies/1/user/1/ar-code/${arCodeId}`) &&
      response.request().method() === 'PUT' &&
      response.status() === 200
  );
}
