import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const MOCK_COMPANY_ID = 50201;
const DEFAULT_USER_ID = '101';

const defaultBasicInfo = {
  legalName: 'Acme Holdings LLC',
  tradeName: 'Acme Receivables',
  companyCode: 'ACM-100',
  country: 'USA',
  baseCurrency: 'USD',
  timeZone: 'UTC',
};

const defaultAddressInfo = {
  addressLine1: '742 Evergreen Terrace',
  city: 'Springfield',
  stateProvince: 'Illinois',
  postalCode: '62704',
  addressCountry: 'USA',
  primaryContactName: 'Lisa Simpson',
  position: 'AR Manager',
  primaryContactEmail: 'lisa@example.com',
  primaryContactPhone: '3125550199',
  website: 'https://acme.example.com',
  primaryContactCountry: 'USA',
};

const defaultFinancialInfo = {
  fiscalYearStartMonth: '1',
  revenueRecognitionMode: 'On Invoice',
  defaultTaxHandling: 'Line Item Level',
  defaultPaymentTerms: 'Net 30',
  agingBucketConfig: '31-60',
  dunningFrequencyDays: '15',
  defaultCreditLimit: '75000',
  allowOtherTerms: true,
  enableCreditLimitChecking: true,
  enableAutomatedDunningEmails: true,
};

const jsonHeaders = {
  ...apiCorsHeaders,
  'content-type': 'application/json',
};

const emptyCompanyList = {
  statusCode: 200,
  status: 'success',
  message: 'ok',
  data: {
    rows: [],
    content: [],
    totalPages: 0,
    number: 0,
    size: 10,
    totalElements: 0,
    first: true,
    last: true,
  },
};

const success = <T>(data: T) => ({
  statusCode: 200,
  status: 'success',
  message: 'ok',
  data,
});

test.describe('Add lender onboarding wizard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupOnboardingApiMocks(page);
    await seedAdminState(page, {
      hasCompanies: 'false',
      selectedCompanyId: '',
    });
    await page.goto('/admin/lender/add/step-1');
    await expect(page.getByText('Basic Information')).toBeVisible();
  });

  test('basic info step enforces validations and saves the shell company', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Basic Info' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Address Info' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Financial AR Settings' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Banks & Payment' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Save & Continue' }).click();

    await expect(page.locator('.error', { hasText: 'Legal Name is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Trade Name is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Lender Code is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Country is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Base Currency is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Time Zone is required.' })).toBeVisible();

    await fillBasicInfoForm(page, defaultBasicInfo);
    await Promise.all([
      waitForPost(page, `/api/companies/${DEFAULT_USER_ID}`),
      page.getByRole('button', { name: 'Save & Continue' }).click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`/admin/lender/add/step-2\\?id=${MOCK_COMPANY_ID}$`));

    const companyId = await page.evaluate(() => localStorage.getItem('companyId'));
    expect(companyId).toBe(String(MOCK_COMPANY_ID));
    const currentStep = await page.evaluate(() => localStorage.getItem('currentStep'));
    expect(currentStep).toBe('step-2');

    const editingCompany = await page.evaluate(() => localStorage.getItem('editingCompany'));
    expect(editingCompany).not.toBeNull();
    const parsed = JSON.parse(editingCompany ?? '{}');
    expect(parsed.legalName).toBe(defaultBasicInfo.legalName);
    expect(parsed.companyCode).toBe(defaultBasicInfo.companyCode);
  });

  test('company address step validates formatting and persists contact info', async ({ page }) => {
    await completeBasicInfo(page);

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.error', { hasText: 'Address Line 1 is required' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'City is required' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Postal Code is required' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Contact name is required' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Email is required' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Phone is required' })).toBeVisible();

    await page.locator('[formcontrolname="city"]').fill('Austin99');
    await expect(page.locator('[formcontrolname="city"]')).toHaveValue('Austin');

    await page.locator('[formcontrolname="stateProvince"]').fill('Texas123');
    await expect(page.locator('[formcontrolname="stateProvince"]')).toHaveValue('Texas');

    await page.locator('[formcontrolname="postalCode"]').fill('12ab34567');
    await expect(page.locator('[formcontrolname="postalCode"]')).toHaveValue('123456');

    await page.locator('[formcontrolname="primaryContactPhone"]').fill('123-456-789012');
    await expect(page.locator('[formcontrolname="primaryContactPhone"]')).toHaveValue('1234567890');

    await page.locator('[formcontrolname="primaryContactEmail"]').fill('CONTACT@EXAMPLE.COM');
    await expect(page.locator('[formcontrolname="primaryContactEmail"]')).toHaveValue('contact@example.com');

    await fillCompanyAddressForm(page, defaultAddressInfo);
    await Promise.all([
      waitForPost(page, `/api/companies/${MOCK_COMPANY_ID}/company-address`),
      page.getByRole('button', { name: 'Continue' }).click(),
    ]);

    await expect(page).toHaveURL('/admin/lender/add/step-3');
    const currentStep = await page.evaluate(() => localStorage.getItem('currentStep'));
    expect(currentStep).toBe('step-3');

    const editingCompany = await page.evaluate(() => localStorage.getItem('editingCompany'));
    expect(editingCompany).not.toBeNull();
    const parsed = JSON.parse(editingCompany ?? '{}');
    expect(parsed.addressLine1).toBe(defaultAddressInfo.addressLine1);
    expect(parsed.primaryContactEmail).toBe(defaultAddressInfo.primaryContactEmail);
  });

  test('financial & AR settings require valid selections and numeric ranges', async ({ page }) => {
    await completeBasicInfo(page);
    await completeCompanyAddress(page);

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.error', { hasText: 'Fiscal year start is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Revenue recognition mode is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Default tax handling is required.' })).toBeVisible();
    await expect(page.locator('.error', { hasText: 'Default payment terms are required.' })).toBeVisible();

    await fillFinancialSettingsForm(page, {
      ...defaultFinancialInfo,
      defaultCreditLimit: '-10',
    });

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.error', { hasText: 'Must be 0 or above.' })).toBeVisible();

    await fillFinancialSettingsForm(page, defaultFinancialInfo);
    await expect(page.locator('input[formcontrolname="allowOtherTerms"]')).toBeChecked();
    await expectCheckedIfPresent(page.locator('input[formcontrolname="enableAutomatedDunningEmails"]'));
    await expectCheckedIfPresent(page.locator('input[formcontrolname="enableCreditLimitChecking"]'));

    await Promise.all([
      waitForPost(page, `/api/companies/${MOCK_COMPANY_ID}/financial-settings`),
      page.getByRole('button', { name: 'Continue' }).click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`/admin/lender/onboarding-complete\\?id=${MOCK_COMPANY_ID}$`));
    const currentStep = await page.evaluate(() => localStorage.getItem('currentStep'));
    expect(currentStep).toBe('step-3');
    await expect(page.getByRole('heading', { name: 'Onboarding Complete' })).toBeVisible();
  });

  // No dedicated banks & payments step anymore; onboarding completes after financial settings.
});

async function setupOnboardingApiMocks(page: Page) {
  await page.route('**/api/companies/user/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(emptyCompanyList),
    });
  });

  await page.route(`**/api/companies/${DEFAULT_USER_ID}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(
        success({
          ...payload,
          id: MOCK_COMPANY_ID,
          addressLine1: null,
          city: null,
          stateProvince: null,
          postalCode: null,
          addressCountry: null,
          primaryContactName: null,
          position: null,
          primaryContactEmail: null,
          primaryContactPhone: null,
          website: null,
          primaryContactCountry: null,
        })
      ),
    });
  });

  const downstreamEndpoints = [
    `**/api/companies/${MOCK_COMPANY_ID}/company-address`,
    `**/api/companies/${MOCK_COMPANY_ID}/financial-settings`,
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
        body: JSON.stringify(success(null)),
      });
    });
  }
}

async function waitForPost(page: Page, pathFragment: string) {
  await page.waitForResponse(
    (response) =>
      response.url().includes(pathFragment) && response.request().method() === 'POST' && response.status() === 200
  );
}

async function completeBasicInfo(page: Page) {
  await fillBasicInfoForm(page, defaultBasicInfo);
  await Promise.all([
    waitForPost(page, `/api/companies/${DEFAULT_USER_ID}`),
    page.getByRole('button', { name: 'Save & Continue' }).click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`/admin/lender/add/step-2\\?id=${MOCK_COMPANY_ID}$`));
}

async function fillBasicInfoForm(page: Page, data = defaultBasicInfo) {
  await page.locator('[formcontrolname="legalName"]').fill(data.legalName);
  await page.locator('[formcontrolname="tradeName"]').fill(data.tradeName);
  await page.locator('[formcontrolname="companyCode"]').fill(data.companyCode);
  await page.locator('select[formcontrolname="country"]').selectOption(data.country);
  await page.locator('[formcontrolname="baseCurrency"]').fill(data.baseCurrency);
  await page.locator('select[formcontrolname="timeZone"]').selectOption(data.timeZone);
}

async function completeCompanyAddress(page: Page) {
  await fillCompanyAddressForm(page, defaultAddressInfo);
  await Promise.all([
    waitForPost(page, `/api/companies/${MOCK_COMPANY_ID}/company-address`),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
  await expect(page).toHaveURL('/admin/lender/add/step-3');
}

async function fillCompanyAddressForm(page: Page, data = defaultAddressInfo) {
  await page.locator('[formcontrolname="addressLine1"]').fill(data.addressLine1);
  await page.locator('[formcontrolname="city"]').fill(data.city);
  await page.locator('[formcontrolname="stateProvince"]').fill(data.stateProvince);
  await page.locator('[formcontrolname="postalCode"]').fill(data.postalCode);
  await page.locator('select[formcontrolname="addressCountry"]').selectOption(data.addressCountry);
  await page.locator('[formcontrolname="primaryContactName"]').fill(data.primaryContactName);
  await page.locator('[formcontrolname="position"]').fill(data.position);
  await page.locator('[formcontrolname="primaryContactEmail"]').fill(data.primaryContactEmail);
  await page.locator('[formcontrolname="primaryContactPhone"]').fill(data.primaryContactPhone);
  await page.locator('[formcontrolname="website"]').fill(data.website);
  await page.locator('select[formcontrolname="primaryContactCountry"]').selectOption(data.primaryContactCountry);
}

async function fillFinancialSettingsForm(page: Page, data = defaultFinancialInfo) {
  await page.locator('select[formcontrolname="fiscalYearStartMonth"]').selectOption(data.fiscalYearStartMonth);
  await page.locator('select[formcontrolname="revenueRecognitionMode"]').selectOption(data.revenueRecognitionMode);
  await page.locator('select[formcontrolname="defaultTaxHandling"]').selectOption(data.defaultTaxHandling);
  await page.locator('select[formcontrolname="defaultPaymentTerms"]').selectOption(data.defaultPaymentTerms);
  await page.locator('input[formcontrolname="defaultCreditLimit"]').fill(data.defaultCreditLimit);
  await fillIfPresent(page.locator('input[formcontrolname="dunningFrequencyDays"]'), data.dunningFrequencyDays);

  await toggleIfNeeded(page.locator('input[formcontrolname="allowOtherTerms"]'), data.allowOtherTerms);
  await toggleIfNeeded(
    page.locator('input[formcontrolname="enableAutomatedDunningEmails"]'),
    data.enableAutomatedDunningEmails
  );
  await toggleIfNeeded(
    page.locator('input[formcontrolname="enableCreditLimitChecking"]'),
    data.enableCreditLimitChecking
  );
}

async function toggleIfNeeded(locator: Locator, shouldBeChecked: boolean) {
  if ((await locator.count()) === 0) {
    return;
  }
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

async function fillIfPresent(locator: Locator, value: string | undefined) {
  if (value === undefined) {
    return;
  }
  if ((await locator.count()) === 0) {
    return;
  }
  await locator.fill(value);
}

async function expectCheckedIfPresent(locator: Locator) {
  if ((await locator.count()) === 0) {
    return;
  }
  await expect(locator).toBeChecked();
}
