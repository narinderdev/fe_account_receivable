import { Page, Route } from '@playwright/test';
import { environment } from '../../src/environments/environment';

const defaultStorage = {
  isLoggedIn: 'true',
  hasCompanies: 'true',
  selectedCompanyId: '1',
  signupUserId: '101',
  logintoken: 'demo-token',
  userContext: JSON.stringify({
    userId: 1,
    roleName: 'Admin',
    permissions: [],
    isAdmin: true,
  }),
};

export const apiCorsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const defaultApiHosts = [
  environment.apiUrl,
  'https://88373bf2f128.ngrok-free.app',
  'http://54.225.63.207:8080',
];

const configuredHost = process.env.PLAYWRIGHT_API_BASE_URL;
const apiBaseUrls = Array.from(
  new Set([configuredHost, ...defaultApiHosts].filter((value): value is string => !!value))
);

const demoCompany = {
  id: 1,
  legalName: 'Acme Corporation',
  tradeName: 'Acme Corp',
  companyCode: 'ACME',
  baseCurrency: 'USD',
  timeZone: 'UTC',
  country: 'USA',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  financialSettings: {
    id: 1,
    fiscalYearStartMonth: 1,
    defaultArAccountCode: 'AR-100',
    revenueRecognitionMode: 'ACCRUAL',
    defaultTaxHandling: 'STANDARD',
    defaultPaymentTerms: 'NET30',
    allowOtherTerms: true,
    enableCreditLimitChecking: true,
    agingBucketConfig: '30,60,90',
    dunningFrequencyDays: 15,
    enableAutomatedDunningEmails: true,
    defaultCreditLimit: 100000,
  },
  paymentSettings: {
    id: 1,
    acceptCheck: true,
    acceptCreditCard: true,
    acceptBankTransfer: true,
    acceptCash: false,
    remittanceInstructions: 'Pay within 30 days.',
  },
  companyAddress: {
    id: 1,
    addressLine1: '123 Main Street',
    city: 'Metropolis',
    stateProvince: 'NY',
    postalCode: '12345',
    addressCountry: 'USA',
    primaryContactName: 'Alex Admin',
    position: 'Director of Finance',
    primaryContactEmail: 'alex@example.com',
    primaryContactPhone: '555-0101',
    website: 'https://example.com',
    primaryContactCountry: 'USA',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  bankAccounts: [],
  users: [],
  companyCustomers: [],
};

const sampleCustomerEntity = {
  id: 201,
  customerId: 5001,
  customerName: 'Globex Retail',
  customerType: 'Retail',
  email: 'billing@globex.com',
  deleted: false,
  address: {
    id: 301,
    addressLine1: '500 Market Street',
    city: 'Metropolis',
    stateProvince: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  cashApplication: {
    id: 44,
    applyPayments: true,
    autoApplyPayments: false,
    shipCreditCheck: true,
    toleranceAmount: 75,
    tolerancePercentage: 5,
  },
  dunning: {
    id: 19,
    creditLimit: 25000,
    dunningLevel: 'Level 1',
    level1: 'Reminder 1',
    level2: 'Reminder 2',
    level3: 'Reminder 3',
    level4: 'Collections',
    pastDue: '30',
    placeOnCreditHold: false,
  },
  statement: null,
  eft: null,
  vat: null,
};

const sampleCustomerDetail = {
  ...sampleCustomerEntity,
  companyId: 1,
  companyName: demoCompany.legalName,
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
};

const sampleInvoice = {
  id: 9001,
  invoiceNumber: 'INV-9001',
  invoiceDate: '2024-02-01',
  dueDate: '2024-02-28',
  subTotal: 2500,
  taxAmount: 125,
  totalAmount: 2625,
  description: 'Quarterly subscription',
  balanceDue: 1300,
  status: 'OPEN',
  lastPaymentDate: null,
  note: 'Pay within 30 days',
  generated: true,
  active: true,
  deleted: false,
  customer: sampleCustomerEntity,
  items: [
    {
      id: 1,
      itemName: 'Support',
      description: 'Support package',
      quantity: 1,
      rate: 2500,
      amount: 2500,
      taxAmount: 125,
      total: 2625,
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    },
  ],
};

const samplePayment = {
  id: 4001,
  bankDeposit: 1300,
  serviceFee: 0,
  paymentAmount: 1300,
  paymentMethod: 'ACH',
  paymentDate: '2024-02-15',
  notes: 'Auto-applied',
  customer: sampleCustomerEntity,
  applications: [
    {
      id: 7001,
      invoice: {
        id: sampleInvoice.id,
        invoiceNumber: sampleInvoice.invoiceNumber,
        invoiceDate: sampleInvoice.invoiceDate,
        dueDate: sampleInvoice.dueDate,
        subTotal: sampleInvoice.subTotal,
        totalAmount: sampleInvoice.totalAmount,
        balanceDue: sampleInvoice.balanceDue,
        status: 'OPEN',
        lastPaymentDate: sampleInvoice.lastPaymentDate,
        note: sampleInvoice.note,
        generated: true,
        active: true,
        deleted: false,
        customer: sampleCustomerEntity,
      },
      appliedAmount: 1300,
      openAmount: 0,
    },
  ],
};

const samplePromiseRecord = {
  id: 301,
  customerName: sampleCustomerEntity.customerName,
  invoiceNumber: sampleInvoice.invoiceNumber,
  amountPromised: 1200,
  promiseDate: '2024-02-20',
  status: 'PENDING',
  notes: 'Customer confirmed payment on 20th',
};

const sampleDisputeRecord = {
  id: 801,
  disputeId: 'DSP-801',
  companyId: 1,
  customer: sampleCustomerEntity,
  invoice: sampleInvoice,
  invoiceOriginalAmount: sampleInvoice.totalAmount,
  disputedAmount: 300,
  disputeCode: 'DAMAGES',
  reason: 'Damaged goods',
  status: 'UNDER_REVIEW',
  resolutionDate: null,
  createdAt: '2024-02-05T00:00:00.000Z',
  updatedAt: '2024-02-05T00:00:00.000Z',
};

const sampleCreditMemo = {
  id: 6101,
  creditMemoNo: 'CM-6101',
  creditReason: 'Pricing adjustment',
  amount: 250,
  appliedAmount: 0,
  currency: 'USD',
  arCodeId: 1,
  arCode: { id: 321, name: 'Discounts', code: 'DISC' },
  customer: sampleCustomerEntity,
  status: 'ACTIVE',
  active: true,
  createdAt: '2024-02-01T00:00:00.000Z',
  updatedAt: '2024-02-01T00:00:00.000Z',
  postingDate: '2024-02-01',
  targetInvoiceId: sampleInvoice.id,
};

const sampleWriteOff = {
  id: 7101,
  customerId: sampleCustomerEntity.id,
  customerName: sampleCustomerEntity.customerName,
  invoiceId: sampleInvoice.id,
  invoiceNumber: sampleInvoice.invoiceNumber,
  reason: 'Uncollectible balance',
  writeOffDate: '2024-02-28',
};

const sampleAgingRows = [
  {
    customerId: sampleCustomerEntity.id,
    customerName: sampleCustomerEntity.customerName,
    totalDue: 5000,
    current: 3200,
    bucket1To30: 900,
    bucket31To60: 600,
    bucket61To90: 200,
    bucketGt90: 100,
  },
];

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
    permissions: ['VIEW_COMPANY', 'CREATE_CODE', 'VIEW_ROLES'],
  },
];

const sampleArCodes = [
  {
    id: 101,
    code: 'GL-100',
    name: 'General Ledger',
    description: 'Primary GL bucket',
    codeType: 'GL',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    active: true,
  },
  {
    id: 102,
    code: 'BNK-001',
    name: 'Bank Cash',
    description: 'Cash on Hand',
    codeType: 'BANK_CASH',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    active: false,
  },
];

const sampleCompanyUser = {
  id: 901,
  name: 'Jamie Ops',
  firstName: 'Jamie',
  lastName: 'Ops',
  email: 'jamie.ops@example.com',
  status: 'ACTIVE',
  role: { id: 2, name: 'Billing Admin', description: 'Full access' },
  userRoles: [{ id: 1, role: { id: 2, name: 'Billing Admin', description: 'Full access' } }],
};

const dashboardSummary = {
  totalPaymentReceived: 89000,
  todayPaymentReceived: 5400,
  totalCustomers: 18,
  totalReceivables: 175000,
  currentReceivables: 112500,
  totalInvoices: 72,
  pendingInvoices: 16,
  currentPromiseToPay: 4,
};

const dashboardGraphData = {
  companyId: 1,
  series: Array.from({ length: 6 }).map((_, idx) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - idx));
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { month, balance: 80000 + idx * 2500 };
  }),
};

const pendingCustomerSummaries = [
  { id: sampleCustomerEntity.id, customerName: sampleCustomerEntity.customerName, overdueAmount: 5400 },
];

const overdueInvoices = [
  {
    invoiceId: sampleInvoice.id,
    invoiceNumber: sampleInvoice.invoiceNumber,
    customerId: sampleCustomerEntity.id,
    customerName: sampleCustomerEntity.customerName,
    invoiceDate: sampleInvoice.invoiceDate,
    dueDate: sampleInvoice.dueDate,
    balanceDue: sampleInvoice.balanceDue,
    totalAmount: sampleInvoice.totalAmount,
    status: 'OPEN',
  },
];

const defaultSuccess = <T>(data: T) => ({
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

function resolveApiResponse(url: URL, method: string) {
  const { pathname, searchParams } = url;

  if (method !== 'GET') {
    if (/\/api\/companies\/\d+\/users$/.test(pathname)) {
      return defaultSuccess(sampleCompanyUser);
    }
    return defaultSuccess(null);
  }

  if (/\/dashboard\/summary\/company\/\d+/.test(pathname)) {
    return defaultSuccess(dashboardSummary);
  }
  if (/\/ar\/company\/\d+\/balance-series$/.test(pathname)) {
    return defaultSuccess(dashboardGraphData);
  }
  if (pathname === '/ar/company/month-end') {
    const companyId = Number(searchParams.get('companyId') ?? '1');
    const month = searchParams.get('month') ?? '2024-02';
    return defaultSuccess({ companyId, month, monthEndBalance: 128000.25 });
  }
  if (pathname === '/ar/customer/month-end') {
    const customerId = Number(searchParams.get('customerId') ?? sampleCustomerEntity.id);
    const month = searchParams.get('month') ?? '2024-02';
    return defaultSuccess({ customerId, month, monthEndBalance: 6400.75 });
  }
  if (/\/api\/companies\/user\//.test(pathname)) {
    return defaultSuccess(paginated([demoCompany]));
  }
  if (/\/api\/companies\/users\/\d+/.test(pathname)) {
    return defaultSuccess([sampleCompanyUser]);
  }
  if (/\/api\/companies\/\d+$/.test(pathname)) {
    return defaultSuccess(demoCompany);
  }
  if (/\/customer\/company\/\d+/.test(pathname)) {
    return defaultSuccess(paginated([sampleCustomerEntity]));
  }
  if (/\/customer\/\d+$/.test(pathname)) {
    return defaultSuccess(sampleCustomerDetail);
  }
  if (/\/invoice\/customer\/\d+/.test(pathname)) {
    return defaultSuccess([sampleInvoice]);
  }
  if (/\/invoice\/unpaid\/company\/\d+/.test(pathname)) {
    return defaultSuccess(paginated([sampleInvoice]));
  }
  if (/\/invoice\/company\/\d+\/with-pending-amounts/.test(pathname)) {
    return defaultSuccess(pendingCustomerSummaries);
  }
  if (/\/invoice\/company\/\d+\/overdue-invoices/.test(pathname)) {
    return defaultSuccess(overdueInvoices);
  }
  if (/\/invoice\/company\/\d+/.test(pathname)) {
    return defaultSuccess(paginated([sampleInvoice]));
  }
  if (/\/invoice\/unpaid\/\d+$/.test(pathname)) {
    return defaultSuccess([sampleInvoice]);
  }
  if (/\/invoice\/\d+$/.test(pathname)) {
    return defaultSuccess(sampleInvoice);
  }
  if (/\/codes\/ar-codes\/\d+/.test(pathname)) {
    const hasPagination = searchParams.has('page') || searchParams.has('size');
    return hasPagination ? defaultSuccess(paginated(sampleArCodes)) : defaultSuccess(sampleArCodes);
  }
  if (/\/api\/roles\/company\/\d+/.test(pathname)) {
    return defaultSuccess(sampleRoles);
  }
  if (/\/payment\/company\/\d+\/filter/.test(pathname) || /\/payment\/company\/\d+/.test(pathname)) {
    return defaultSuccess(paginated([samplePayment]));
  }
  if (/\/payment\/apply\/\d+/.test(pathname)) {
    return defaultSuccess(samplePayment);
  }
  if (/\/credit-memos\/company\/\d+/.test(pathname)) {
    const statusFilter = searchParams.get('status');
    if (statusFilter && statusFilter.toUpperCase() === 'APPROVED') {
      return defaultSuccess(paginated([]));
    }
    return defaultSuccess(paginated([sampleCreditMemo]));
  }
  if (/\/credit-memos\/customer\/\d+/.test(pathname)) {
    return defaultSuccess([sampleCreditMemo]);
  }
  if (/\/write-offs\/company\/\d+/.test(pathname)) {
    return defaultSuccess(paginated([sampleWriteOff]));
  }
  if (/\/reports\/aging\/company\/\d+/.test(pathname)) {
    return defaultSuccess({ asOfDate: '2024-02-29', rows: sampleAgingRows });
  }
  if (/\/collections\/promise\/company\/\d+/.test(pathname)) {
    return defaultSuccess([samplePromiseRecord]);
  }
  if (/\/collections\/promise\/customer\/\d+/.test(pathname)) {
    return defaultSuccess([samplePromiseRecord]);
  }
  if (/\/invoice\/\d+\/pending-amount-customer/.test(pathname)) {
    return defaultSuccess(4200);
  }
  if (/\/invoice\/\d+\/pending-amount-company/.test(pathname)) {
    return defaultSuccess(18500);
  }
  if (/\/api\/disputes\/codes/.test(pathname)) {
    return defaultSuccess([{ code: 'DAMAGES', label: 'Damages' }]);
  }
  if (/\/api\/disputes\/company\/\d+/.test(pathname)) {
    return defaultSuccess([sampleDisputeRecord]);
  }
  if (/\/api\/disputes\/\d+$/.test(pathname)) {
    return defaultSuccess(sampleDisputeRecord);
  }
  if (/\/api\/reminders\/invoice\/\d+/.test(pathname)) {
    return defaultSuccess('Reminder queued');
  }
  if (/\/collections\/promise$/.test(pathname)) {
    return defaultSuccess([samplePromiseRecord]);
  }
  return defaultSuccess(null);
}

export function handlePreflight(route: Route): boolean {
  if (route.request().method() !== 'OPTIONS') {
    return false;
  }
  route.fulfill({
    status: 200,
    headers: apiCorsHeaders,
    body: '',
  });
  return true;
}

export async function seedAdminState(page: Page, extraStorage: Record<string, string> = {}) {
  const storage = { ...defaultStorage, ...extraStorage };
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((entries) => {
    Object.entries(entries).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
  }, storage);
}

export async function mockAdminApis(page: Page) {
  await Promise.all(
    apiBaseUrls.map(async (baseUrl) => {
      await page.route(`${baseUrl}/**`, async (route) => {
        if (handlePreflight(route)) {
          return;
        }

        if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
          await route.continue();
          return;
        }

        const responseBody = resolveApiResponse(new URL(route.request().url()), route.request().method());

        await route.fulfill({
          status: 200,
          headers: {
            ...apiCorsHeaders,
            'content-type': 'application/json',
          },
          body: JSON.stringify(responseBody),
        });
      });
    })
  );
}
