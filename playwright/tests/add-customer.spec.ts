import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const DEFAULT_USER_ID = '101';
const DEFAULT_COMPANY_ID = 1;
const CREATED_CUSTOMER_ID = 8801;

const defaultMainInfo = {
  companyId: String(DEFAULT_COMPANY_ID),
  customerName: 'Globex Retail',
  customerType: 'Retail',
  email: 'billing@globex.com',
  phoneNumber: '3125550199',
};

const defaultAddressInfo = {
  addressLine1: '500 Market Street',
  city: 'Metropolis',
  stateProvince: 'New York',
  postalCode: '10001',
  country: 'USA',
};

const defaultEftInfo = {
  bankName: 'First National Bank',
  ibanAccountNumber: 'US00-1234-5678',
  bankIdentifierCode: 'FNBOUS44',
  enableAchPayments: true,
  allowDirectDebit: true,
};

const defaultVatInfo = {
  taxIdentificationNumber: 'TIN-019283',
  taxAgencyName: 'IRS',
  enableVatCodes: true,
  vatCode: 'Standard Rate (20%)',
};

const defaultDunningInfo = {
  placeOnCreditHold: true,
  creditLimit: '25000',
  dunningLevel: 'Level 2',
  pastDue: '10',
  level1: '20',
  level2: '30',
  level3: '28',
  level4: '40',
};

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

test.describe('Add customer onboarding wizard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupAddCustomerApiMocks(page);
    await seedAdminState(page);

    await page.goto('/admin/company/add');
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
  });

  test('main tab enforces validations and unlocks address tab', async ({ page }) => {
    const tabButtons = {
      main: page.getByRole('button', { name: 'Main', exact: true }),
      address: page.getByRole('button', { name: 'Address', exact: true }),
      eft: page.getByRole('button', { name: 'EFT', exact: true }),
      vat: page.getByRole('button', { name: 'VAT', exact: true }),
      dunning: page.getByRole('button', { name: 'Dunning / Credit', exact: true }),
    };

    await expect(tabButtons.main).toBeEnabled();
    await expect(tabButtons.address).toBeDisabled();
    await expect(tabButtons.eft).toBeDisabled();
    await expect(tabButtons.vat).toBeDisabled();
    await expect(tabButtons.dunning).toBeDisabled();

    await page.getByRole('button', { name: 'Save Main' }).click();
    await expect(page.getByText('Company Name is required.')).toBeVisible();
    await expect(page.getByText('Company Type is required.')).toBeVisible();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Phone Number is required.')).toBeVisible();

    await page.locator('[formcontrolname="customerName"]').fill('A');
    await expect(page.getByText('Company Name must be at least 2 letters.')).toBeVisible();

    await page.locator('[formcontrolname="customerType"]').fill('Retail123');
    await expect(page.getByText('Only letters and spaces are allowed.')).toBeVisible();

    await page.locator('[formcontrolname="email"]').fill('not-an-email');
    await expect(page.locator('.error', { hasText: 'Invalid email format.' })).toBeVisible();

    await completeMainStep(page);

    await expect(tabButtons.address).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Billing Address' })).toBeVisible();
    await expect(tabButtons.eft).toBeDisabled();
  });

  test('address step validates required fields and normalizes inputs', async ({ page }) => {
    await completeMainStep(page);

    await page.getByRole('button', { name: 'Save Address' }).click();
    await expect(page.getByText('Address Line 1 is required.')).toBeVisible();
    await expect(page.getByText('City is required.')).toBeVisible();
    await expect(page.getByText('State / Province is required.')).toBeVisible();
    await expect(page.getByText('Postal Code is required.')).toBeVisible();
    await expect(page.getByText('Country is required.')).toBeVisible();

    const postal = page.locator('[formcontrolname="postalCode"]');
    await postal.fill('12ab34cd5678');
    await expect(postal).toHaveValue('123456');

    await completeAddressStep(page);
    await expect(page.getByRole('heading', { name: 'Bank Information' })).toBeVisible();
  });

  test('completes EFT, VAT, and Dunning steps to finish onboarding', async ({ page }) => {
    await completeMainStep(page);
    await completeAddressStep(page);

    // EFT validations
    await page.getByRole('button', { name: 'Save EFT' }).click();
    await expect(page.getByText('Bank Name is required.')).toBeVisible();
    await expect(page.getByText('IBAN / Account Number is required.')).toBeVisible();
    await expect(page.getByText('Bank Identifier Code is required.')).toBeVisible();

    await completeEftStep(page);
    await expect(page.getByRole('heading', { name: 'VAT Information' })).toBeVisible();

    await page.getByRole('button', { name: 'Save VAT' }).click();
    await expect(page.getByRole('heading', { name: 'Credit Settings' })).toBeVisible();

    // Dunning validations
    await page.getByRole('button', { name: 'Save Dunning' }).click();
    await expect(page.getByText('Credit Limit is required.')).toBeVisible();
    await expect(page.getByText('Dunning Level is required.')).toBeVisible();
    await expect(page.getByText('Past Due is required.')).toBeVisible();
    await expect(page.getByText('Level 1 is required.')).toBeVisible();
    await expect(page.getByText('Level 2 is required.')).toBeVisible();
    await expect(page.getByText('Level 3 is required.')).toBeVisible();
    await expect(page.getByText('Level 4 is required.')).toBeVisible();

    await completeDunningStep(page);
    await expect(page).toHaveURL('/admin/company/add');
  });
});

async function setupAddCustomerApiMocks(page: Page) {
  await page.route(
    `**/customer/${DEFAULT_USER_ID}/${DEFAULT_COMPANY_ID}`,
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(
          success({
            id: CREATED_CUSTOMER_ID,
            ...route.request().postDataJSON(),
          })
        ),
      });
    }
  );

  const downstreamEndpoints = [
    `**/customer/${CREATED_CUSTOMER_ID}/address`,
    `**/customer/${CREATED_CUSTOMER_ID}/eft`,
    `**/customer/${CREATED_CUSTOMER_ID}/vat`,
    `**/customer/${CREATED_CUSTOMER_ID}/dunning-credit`,
  ];

  for (const endpoint of downstreamEndpoints) {
    await page.route(endpoint, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(success(route.request().postDataJSON() ?? null)),
      });
    });
  }
}

async function waitForPost(page: Page, pathFragment: string) {
  await page.waitForResponse(
    (response) =>
      response.url().includes(pathFragment) &&
      response.request().method() === 'POST' &&
      response.status() === 200
  );
}

async function completeMainStep(page: Page) {
  await fillMainForm(page, defaultMainInfo);
  await Promise.all([
    waitForPost(page, `/customer/${DEFAULT_USER_ID}/${DEFAULT_COMPANY_ID}`),
    page.getByRole('button', { name: 'Save Main' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'Billing Address' })).toBeVisible();
}

async function fillMainForm(page: Page, data = defaultMainInfo) {
  const companySelect = page.locator('select[formcontrolname="companyId"]');
  if (await companySelect.count()) {
    await companySelect.selectOption(data.companyId);
  }
  await page.locator('[formcontrolname="customerName"]').fill(data.customerName);
  await page.locator('[formcontrolname="customerType"]').fill(data.customerType);
  await page.locator('[formcontrolname="email"]').fill(data.email);
  const phoneInput = page.locator('[formcontrolname="phoneNumber"]');
  if (await phoneInput.count()) {
    await phoneInput.fill(data.phoneNumber ?? '');
  }
}

async function completeAddressStep(page: Page) {
  await fillAddressForm(page, defaultAddressInfo);
  await Promise.all([
    waitForPost(page, `/customer/${CREATED_CUSTOMER_ID}/address`),
    page.getByRole('button', { name: 'Save Address' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'Bank Information' })).toBeVisible();
}

async function fillAddressForm(page: Page, data = defaultAddressInfo) {
  await page.locator('[formcontrolname="addressLine1"]').fill(data.addressLine1);
  await page.locator('[formcontrolname="city"]').fill(data.city);
  await page.locator('[formcontrolname="stateProvince"]').fill(data.stateProvince);
  await page.locator('[formcontrolname="postalCode"]').fill(data.postalCode);
  await page.locator('select[formcontrolname="country"]').selectOption(data.country);
}

async function completeEftStep(page: Page) {
  await fillEftForm(page, defaultEftInfo);
  await Promise.all([
    waitForPost(page, `/customer/${CREATED_CUSTOMER_ID}/eft`),
    page.getByRole('button', { name: 'Save EFT' }).click(),
  ]);
}

async function fillEftForm(page: Page, data = defaultEftInfo) {
  await page.locator('[formcontrolname="bankName"]').fill(data.bankName);
  await page.locator('[formcontrolname="ibanAccountNumber"]').fill(data.ibanAccountNumber);
  await page.locator('[formcontrolname="bankIdentifierCode"]').fill(data.bankIdentifierCode);
  await toggleIfNeeded(page.locator('input[formcontrolname="enableAchPayments"]'), data.enableAchPayments);
  await toggleIfNeeded(page.locator('input[formcontrolname="allowDirectDebit"]'), data.allowDirectDebit);
}

async function completeDunningStep(page: Page) {
  await fillDunningForm(page, defaultDunningInfo);
  await page.getByRole('button', { name: 'Save Dunning' }).click();
}

async function fillDunningForm(page: Page, data = defaultDunningInfo) {
  await toggleIfNeeded(page.locator('input[formcontrolname="placeOnCreditHold"]'), data.placeOnCreditHold);
  await page.locator('input[formcontrolname="creditLimit"]').fill(data.creditLimit);
  await page.locator('select[formcontrolname="dunningLevel"]').selectOption(data.dunningLevel);
  await page.locator('select[formcontrolname="pastDue"]').selectOption(data.pastDue);
  await page.locator('select[formcontrolname="level1"]').selectOption(data.level1);
  await page.locator('select[formcontrolname="level2"]').selectOption(data.level2);
  await page.locator('select[formcontrolname="level3"]').selectOption(data.level3);
  await page.locator('select[formcontrolname="level4"]').selectOption(data.level4);
}

async function toggleIfNeeded(locator: Locator, shouldBeChecked: boolean) {
  await locator.waitFor({ state: 'attached' });
  await locator.evaluate(
    (element, checked) => {
      const input = element as HTMLInputElement;
      if (input.checked === checked) {
        return;
      }
      input.checked = checked;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    shouldBeChecked,
  );
}

