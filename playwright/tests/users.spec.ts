import type { Page } from '@playwright/test';
import { expect, test } from './test-base';
import { apiCorsHeaders, mockAdminApis, seedAdminState } from './admin-helpers';

const jsonHeaders = {
  ...apiCorsHeaders,
  'content-type': 'application/json',
};

const listUsersRegex = /\/api\/companies\/users\/\d+$/;
const inviteUsersRegex = /\/api\/companies\/\d+\/users$/;

const success = <T>(data: T) => ({
  statusCode: 200,
  status: 'success',
  message: 'ok',
  data,
});

const demoUsers = [
  {
    id: 901,
    firstName: 'Jamie',
    lastName: 'Ops',
    name: 'Jamie Ops',
    email: 'jamie.ops@example.com',
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'Billing Admin' } }],
  },
  {
    id: 902,
    firstName: 'Taylor',
    lastName: 'Support',
    name: 'Taylor Support',
    email: 'taylor.support@example.com',
    status: 'INVITED',
    userRoles: [{ role: { name: 'Support' } }],
  },
];

test.describe('Company users management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setupUserRoutes(page);
    await seedAdminState(page);
  });

  test('lists company users and invites a new user', async ({ page }) => {
    await page.goto('/admin/users');

    const tableRows = page.locator('.users-table tbody tr');
    await expect(tableRows).toHaveCount(demoUsers.length);
    await expect(tableRows.first()).toContainText('Jamie Ops');
    await expect(tableRows.nth(1)).toContainText('Invited');

    const inviteButton = page.getByRole('button', { name: 'Invite User' });
    await inviteButton.click();

    const modal = page.locator('.modal-card');
    await expect(modal).toBeVisible();

    await page.fill('input[formcontrolname="firstName"]', 'Casey');
    await page.fill('input[formcontrolname="lastName"]', 'QA');
    await page.fill('input[formcontrolname="email"]', 'casey.qa@example.com');
    await page.selectOption('select[formcontrolname="roleIds"]', '1');

    const inviteRequest = waitForInvite(page);
    await modal.getByRole('button', { name: 'Create User' }).click();
    await inviteRequest;
    await expect(modal).toBeHidden();
  });
});

async function setupUserRoutes(page: Page) {
  await page.route(listUsersRegex, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success(demoUsers)),
    });
  });

  await page.route(inviteUsersRegex, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify(success({ id: 999 })),
    });
  });
}

async function waitForInvite(page: Page) {
  await page.waitForResponse((response) => {
    let pathname: string;
    try {
      pathname = new URL(response.url()).pathname;
    } catch {
      return false;
    }
    return (
      inviteUsersRegex.test(pathname) &&
      response.request().method() === 'POST' &&
      response.status() === 200
    );
  });
}
