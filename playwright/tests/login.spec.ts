import { test, expect } from './test-base';

test.describe('Login page smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows the login form controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText('Login to manage your receivables')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your email')).toHaveAttribute('type', 'email');
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  test('displays validation errors for incomplete submissions', async ({ page, typeWithDelay }) => {
    await typeWithDelay(page.getByPlaceholder('Enter your email'), 'not-an-email');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Enter a valid email.')).toBeVisible();

    await page.getByPlaceholder('Enter your password').click();
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('navigates to the sign up flow', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });
});
