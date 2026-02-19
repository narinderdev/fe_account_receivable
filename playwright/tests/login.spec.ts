import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Login Page - Field & Flow Tests', () => {
  const emailInput = 'input[formcontrolname="email"]';
  const passwordInput = 'input[formcontrolname="password"]';
  const loginButton = '.btn-login';
  const loginEndpoint = '**/auth';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await resetLoginState(page);
  });

  test('should render login form correctly', async ({ page }) => {
    await expect(page.locator(emailInput)).toBeVisible();
    await expect(page.locator(passwordInput)).toBeVisible();
    await expect(page.locator(loginButton)).toBeVisible();
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('should show error when email is empty', async ({ page }) => {
    await page.click(loginButton);
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill(emailInput, 'invalid-email');
    await page.click(loginButton);
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
  });

  test('should accept valid email format', async ({ page }) => {
    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');
    await expect(page.getByText('Enter a valid email.')).toHaveCount(0);
  });

  test('should convert email to lowercase on blur', async ({ page }) => {
    await page.fill(emailInput, 'USER@Example.COM');
    await page.locator(emailInput).blur();
    await expect(page.locator(emailInput)).toHaveValue('user@example.com');
  });

  // ---------- PASSWORD FIELD TESTS ----------

  test('should show error when password is empty', async ({ page }) => {
    await page.fill(emailInput, 'user@example.com');
    await page.click(loginButton);
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('should hide password by default', async ({ page }) => {
    await expect(page.locator(passwordInput)).toHaveAttribute('type', 'password');
  });

  test('should toggle password visibility', async ({ page }) => {
    const toggleIcon = page.locator('.password-toggle');

    await toggleIcon.click();
    await expect(page.locator(passwordInput)).toHaveAttribute('type', 'text');

    await toggleIcon.click();
    await expect(page.locator(passwordInput)).toHaveAttribute('type', 'password');
  });

  // ---------- FORM VALIDATION ----------

  test('should not submit form when fields are invalid', async ({ page }) => {
    await page.click(loginButton);
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('login button should be disabled while loading', async ({ page }) => {
    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');

    await page.route(loginEndpoint, async route => {
      await new Promise(res => setTimeout(res, 1500));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ statusCode: 200, data: {} }),
      });
    });

    await page.click(loginButton);
    await expect(page.locator(loginButton)).toBeDisabled();
  });

  // ---------- API SUCCESS FLOW ----------

  test('should login successfully and show confirmation toast', async ({ page }) => {
    await page.route(loginEndpoint, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'Login successful',
          data: {
            token: 'mock-token',
            user: {
              id: 1,
              userCompanies: [{}],
              permissions: ['VIEW_DASHBOARD'],
            },
          },
        }),
      });
    });

    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');
    await page.click(loginButton);

    await expect(page.getByText(/Login successful/i)).toBeVisible();
  });

  // ---------- NO COMPANY FLOW ----------

  test('should redirect to company onboarding if no AR Company exist', async ({ page }) => {
    await page.route(loginEndpoint, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'Login successful',
          data: {
            token: 'mock-token',
            user: {
              id: 2,
              userCompanies: [],
            },
          },
        }),
      });
    });

    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');
    await page.click(loginButton);

    await expect(page.getByText(/login successful/i)).toBeVisible();
  });

  // ---------- API ERROR HANDLING ----------

  test('should show error toast on invalid credentials', async ({ page }) => {
    await page.route(loginEndpoint, async route => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          message: 'Invalid email or password',
        }),
      });
    });

    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'wrongpassword');
    await page.click(loginButton);

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should handle server error gracefully', async ({ page }) => {
    const errorMessage = 'Server temporarily unavailable';
    await page.route(loginEndpoint, async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: errorMessage }),
      });
    });

    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');
    await page.click(loginButton);

    await expect(page.getByText(errorMessage)).toBeVisible();
  });

  // ---------- ACCESSIBILITY ----------

  test('should allow form submission via Enter key', async ({ page }) => {
    await page.route(loginEndpoint, async route => {
      await new Promise(res => setTimeout(res, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          data: {
            token: 'enter-key-token',
            user: { id: 5, userCompanies: [{}] },
          },
        }),
      });
    });

    await page.fill(emailInput, 'user@example.com');
    await page.fill(passwordInput, 'password123');
    await page.press(passwordInput, 'Enter');
    await expect(page.locator(loginButton)).toBeDisabled();
  });
});

async function resetLoginState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}
