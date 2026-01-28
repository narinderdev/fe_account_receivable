import { test, expect } from './test-base';
import { mockAdminApis, seedAdminState } from './admin-helpers';

const adminRouteCases = [
  { path: '/admin/dashboard', title: 'Dashboard' },
  { path: '/admin/company', title: 'Company' },
  { path: '/admin/company/add', title: 'Add Company' },
  { path: '/admin/company/edit/1', title: 'Edit Company' },
  { path: '/admin/company/1', title: 'Company Details' },
  { path: '/admin/company/1/invoices/9001', title: 'Invoice Detail' },
  { path: '/admin/lender', title: 'Lender' },
  { path: '/admin/lender/add/step-1', title: 'Add Lender' },
  { path: '/admin/lender/add/step-2', title: 'Add Lender' },
  { path: '/admin/lender/add/step-3', title: 'Add Lender' },
  { path: '/admin/lender/add/step-4', title: 'Add Lender' },
  { path: '/admin/lender/edit/1/step-1', title: 'Edit Lender' },
  { path: '/admin/lender/edit/1/step-2', title: 'Edit Lender' },
  { path: '/admin/lender/edit/1/step-3', title: 'Edit Lender' },
  { path: '/admin/lender/edit/1/step-4', title: 'Edit Lender' },
  {
    path: '/admin/lender/onboarding-complete',
    title: 'Onboarding Complete',
    locator: '.onboarding-container .page-title',
  },
  { path: '/admin/invoices', title: 'Invoices' },
  { path: '/admin/invoices/create', title: 'Create Invoice' },
  { path: '/admin/invoices/detail/9001', title: 'Invoice Detail' },
  { path: '/admin/payments', title: 'Payments' },
  { path: '/admin/payments/receive-payment', title: 'Receive Payment' },
  { path: '/admin/payments/details/4001', title: 'Payment Details' },
  { path: '/admin/users', title: 'Users' },
  { path: '/admin/roles', title: 'Roles' },
  { path: '/admin/roles/details/1', title: 'Roles' },
  { path: '/admin/ar-reports', title: 'Aging Reports' },
  { path: '/admin/invoices-reports', title: 'Invoices Reports' },
  { path: '/admin/payment-reports', title: 'Payments Reports' },
  { path: '/admin/collections', title: 'Collections' },
  { path: '/admin/collections/disputes/801', title: 'Collections' },
  { path: '/admin/ar-code', title: 'AR Codes' },
  { path: '/admin/credit-memo', title: 'Credit Memo' },
  { path: '/admin/write-off', title: 'Write-Off' },
];

test.describe('Admin routing smoke coverage', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await seedAdminState(page);
  });

  for (const routeCase of adminRouteCases) {
    test(`navigates to ${routeCase.path}`, async ({ page }) => {
      await page.goto(routeCase.path);
      const targetLocator = routeCase.locator ?? 'h1.navbar-title';
      await expect(page.locator(targetLocator)).toHaveText(routeCase.title);
    });
  }
});
