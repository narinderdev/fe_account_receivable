import { test, expect } from '@playwright/test';

test.describe('Signup Page - Field & Flow Tests', () => {
  // selectors based on your template
  const firstName = 'input[formcontrolname="firstName"]';
  const lastName = 'input[formcontrolname="lastName"]';
  const email = 'input[formcontrolname="email"]';
  const password = 'input[formcontrolname="password"]';
  const confirmPassword = 'input[formcontrolname="confirmPassword"]';
  const createBtn = '.btn-create';

  const firstNameErr = 'First name must be at least 2 letters.';
  const lastNameErr = 'Last name must be at least 2 letters.';
  const emailErr = 'Enter a valid email address.';
  const passErr = 'Password must be 8+ chars, include 1 uppercase, 1 number & 1 symbol.';
  const mismatchErr = 'Passwords do not match.';

  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  // ---------- RENDER ----------

  test('renders signup form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.locator(firstName)).toBeVisible();
    await expect(page.locator(lastName)).toBeVisible();
    await expect(page.locator(email)).toBeVisible();
    await expect(page.locator(password)).toBeVisible();
    await expect(page.locator(confirmPassword)).toBeVisible();
    await expect(page.locator(createBtn)).toBeVisible();
  });

  // ---------- REQUIRED VALIDATIONS ----------

  test('shows errors when submitting empty form', async ({ page }) => {
    await page.click(createBtn);

    await expect(page.getByText(firstNameErr)).toBeVisible();
    await expect(page.getByText(lastNameErr)).toBeVisible();
    await expect(page.getByText(emailErr)).toBeVisible();
    await expect(page.getByText(passErr)).toBeVisible();
    // confirm password is required but UI shows mismatch error only when form.touched + mismatch,
    // and when both pass/confirm are empty pass === confirm so mismatch is null.
    await expect(page.getByText(mismatchErr)).toHaveCount(0);
  });

  // ---------- FIRST / LAST NAME VALIDATION ----------

  test('firstName invalid: 1 letter', async ({ page }) => {
    await page.fill(firstName, 'A');
    await page.click(createBtn);
    await expect(page.getByText(firstNameErr)).toBeVisible();
  });

  test('firstName invalid: numbers/special chars', async ({ page }) => {
    await page.fill(firstName, 'Jo3');
    await page.click(createBtn);
    await expect(page.getByText(firstNameErr)).toBeVisible();
  });

  test('firstName valid: 2+ letters', async ({ page }) => {
    await page.fill(firstName, 'Jane');
    await page.click(createBtn);
    await expect(page.getByText(firstNameErr)).toHaveCount(0);
  });

  test('lastName invalid: 1 letter', async ({ page }) => {
    await page.fill(lastName, 'D');
    await page.click(createBtn);
    await expect(page.getByText(lastNameErr)).toBeVisible();
  });

  test('lastName invalid: numbers/special chars', async ({ page }) => {
    await page.fill(lastName, 'Do3');
    await page.click(createBtn);
    await expect(page.getByText(lastNameErr)).toBeVisible();
  });

  test('lastName valid: 2+ letters', async ({ page }) => {
    await page.fill(lastName, 'Doe');
    await page.click(createBtn);
    await expect(page.getByText(lastNameErr)).toHaveCount(0);
  });

  // ---------- EMAIL VALIDATION ----------

  test('email invalid format shows error', async ({ page }) => {
    await page.fill(email, 'invalid-email');
    await page.click(createBtn);
    await expect(page.getByText(emailErr)).toBeVisible();
  });

  test('email lowercases on blur', async ({ page }) => {
    await page.fill(email, 'USER@Example.COM');
    await page.locator(email).blur();
    await expect(page.locator(email)).toHaveValue('user@example.com');
  });

  // ---------- PASSWORD RULE VALIDATION ----------

  test('password invalid: less than 8 chars', async ({ page }) => {
    await page.fill(password, 'A1@a'); // too short
    await page.click(createBtn);
    await expect(page.getByText(passErr)).toBeVisible();
  });

  test('password invalid: missing uppercase', async ({ page }) => {
    await page.fill(password, 'secret123@');
    await page.click(createBtn);
    await expect(page.getByText(passErr)).toBeVisible();
  });

  test('password invalid: missing number', async ({ page }) => {
    await page.fill(password, 'Secret@@@');
    await page.click(createBtn);
    await expect(page.getByText(passErr)).toBeVisible();
  });

  test('password invalid: missing symbol', async ({ page }) => {
    await page.fill(password, 'Secret123');
    await page.click(createBtn);
    await expect(page.getByText(passErr)).toBeVisible();
  });

  test('password valid: meets policy', async ({ page }) => {
    await page.fill(password, 'Secret123!');
    await page.click(createBtn);
    await expect(page.getByText(passErr)).toHaveCount(0);
  });

  // ---------- CONFIRM PASSWORD + MISMATCH VALIDATOR ----------

  test('shows mismatch when confirm password differs', async ({ page }) => {
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123@'); // mismatch
    await page.click(createBtn);
    await expect(page.getByText(mismatchErr)).toBeVisible();
  });

  test('does not show mismatch when passwords match', async ({ page }) => {
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');
    await page.click(createBtn);
    await expect(page.getByText(mismatchErr)).toHaveCount(0);
  });

  // ---------- PASSWORD VISIBILITY TOGGLES ----------

  test('password is hidden by default & toggles visibility', async ({ page }) => {
    await expect(page.locator(password)).toHaveAttribute('type', 'password');
    // first toggle for password field (there are two toggles - password and confirm)
    const toggles = page.locator('.password-toggle');
    await toggles.nth(0).click();
    await expect(page.locator(password)).toHaveAttribute('type', 'text');
    await toggles.nth(0).click();
    await expect(page.locator(password)).toHaveAttribute('type', 'password');
  });

  test('confirm password is hidden by default & toggles visibility', async ({ page }) => {
    await expect(page.locator(confirmPassword)).toHaveAttribute('type', 'password');
    const toggles = page.locator('.password-toggle');
    await toggles.nth(1).click();
    await expect(page.locator(confirmPassword)).toHaveAttribute('type', 'text');
    await toggles.nth(1).click();
    await expect(page.locator(confirmPassword)).toHaveAttribute('type', 'password');
  });

  // ---------- LOADING STATE ----------

  test('create button disables during loading and shows spinner', async ({ page }) => {
    // fill valid values
    await page.fill(firstName, 'Jane');
    await page.fill(lastName, 'Doe');
    await page.fill(email, 'user@example.com');
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');

    await page.route('**/auth/signup', async (route) => {
      await new Promise((res) => setTimeout(res, 1200));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 201, message: 'Signup successful', data: { id: 55 } }),
      });
    });

    await page.click(createBtn);

    await expect(page.locator(createBtn)).toBeDisabled();
    await expect(page.locator('app-spinner')).toBeVisible();
  });

  // ---------- SUCCESS FLOW ----------

  test('successful signup redirects to verify-otp with email query param', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 201,
          message: 'Signup successful',
          data: { id: 99 },
        }),
      });
    });

    await page.fill(firstName, 'Jane');
    await page.fill(lastName, 'Doe');
    await page.fill(email, 'USER@Example.COM'); // should normalize
    await page.locator(email).blur();
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');

    await page.click(createBtn);

    await expect(page).toHaveURL(/\/verify-otp\?email=user@example\.com/);
  });

  // ---------- NON-SUCCESS STATUS (409 etc) ----------

  test('non-success status code shows error toast and stays on signup', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 409,
          message: 'Email already exists',
        }),
      });
    });

    await page.fill(firstName, 'Jane');
    await page.fill(lastName, 'Doe');
    await page.fill(email, 'user@example.com');
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');

    await page.click(createBtn);

    await expect(page.getByText('Email already exists')).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  // ---------- NETWORK / SERVER ERROR ----------

  test('server/network error shows fallback error toast', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.fill(firstName, 'Jane');
    await page.fill(lastName, 'Doe');
    await page.fill(email, 'user@example.com');
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');

    await page.click(createBtn);

    await expect(
      page.getByText('An error occurred during signup. Please try again.'),
    ).toBeVisible();
  });

  // ---------- ENTER KEY SUBMIT ----------

  test('submits on Enter key', async ({ page }) => {
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 201, data: { id: 10 } }),
      });
    });

    await page.fill(firstName, 'Jane');
    await page.fill(lastName, 'Doe');
    await page.fill(email, 'user@example.com');
    await page.fill(password, 'Secret123!');
    await page.fill(confirmPassword, 'Secret123!');

    await page.press(confirmPassword, 'Enter');
    await expect(page).toHaveURL(/\/verify-otp/);
  });
});
