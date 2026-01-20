import { test, expect, Page } from '@playwright/test';

test.describe('Verify OTP Page - Field & Flow Tests', () => {
  const otpInputs = '.otp-inputs input';
  const verifyBtn = '.btn-verify';
  const errorText = '.error';
  const verifyEndpoint = '**/auth/signup/verify';

  test.beforeEach(async ({ page }) => {
    // Simulate valid signup flow
    await page.addInitScript(() => {
      localStorage.setItem('signupEmail', 'user@example.com');
      localStorage.setItem('signupUserId', '123');
    });
  });

  // ---------- RENDERING ----------

  test('renders OTP page with 6 inputs and email', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');

    await expect(page.getByText('Verify Your Email')).toBeVisible();
    await expect(page.getByText('user@example.com')).toBeVisible();
    await expect(page.locator(otpInputs)).toHaveCount(6);
    await expect(page.locator(verifyBtn)).toBeVisible();
  });

  test('uses stored email when query param is missing', async ({ page }) => {
    await page.goto('/verify-otp');
    await expect(page.getByText('user@example.com')).toBeVisible();
  });

  test('redirects to signup when no signup context exists', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/verify-otp');
    await expect(page).toHaveURL('/signup');
  });

  // ---------- INPUT BEHAVIOR ----------

  test('allows only numeric input per OTP box', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    const firstInput = page.locator(otpInputs).first();
    await firstInput.fill('a');
    await expect(firstInput).toHaveValue('');

    await firstInput.fill('5');
    await expect(firstInput).toHaveValue('5');
  });

  test('auto-focuses next input after typing', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    await page.locator(otpInputs).nth(0).focus();
    await page.locator(otpInputs).nth(0).fill('1');
    await expect(page.locator(otpInputs).nth(1)).toBeFocused();
  });

  test('backspace moves focus to previous input', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    const inputs = page.locator(otpInputs);
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');

    await inputs.nth(1).press('Backspace');
    await inputs.nth(1).press('Backspace');
    await expect(inputs.nth(0)).toBeFocused();
  });

  // ---------- PASTE BEHAVIOR ----------

  test('pasting full OTP fills all inputs', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    await pasteIntoOtp(page, 0, '123456');

    for (let i = 0; i < 6; i++) {
      await expect(page.locator(otpInputs).nth(i)).toHaveValue(String(i + 1));
    }
  });

  test('pasting partial OTP fills sequentially', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    await pasteIntoOtp(page, 2, '789');

    await expect(page.locator(otpInputs).nth(2)).toHaveValue('7');
    await expect(page.locator(otpInputs).nth(3)).toHaveValue('8');
    await expect(page.locator(otpInputs).nth(4)).toHaveValue('9');
  });

  // ---------- VALIDATION ----------

  test('shows error when OTP is incomplete', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    await page.locator(otpInputs).nth(0).fill('1');
    await page.locator(otpInputs).nth(1).fill('2');

    await page.click(verifyBtn);
    await expect(page.locator(errorText)).toHaveText('Enter the 6-digit code we sent.');
  });

  // ---------- AUTO SUBMIT ----------

  test('auto-submits when all 6 digits are entered', async ({ page }) => {
    await page.route(verifyEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'OTP verified successfully.',
        }),
      });
    });

    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await page
        .locator(otpInputs)
        .nth(i)
        .fill(String(i + 1));
    }

    await expect(page).toHaveURL('/login');
  });

  // ---------- LOADING STATE ----------

  test('disables verify button and shows spinner while loading', async ({ page }) => {
    await page.route(verifyEndpoint, async (route) => {
      await new Promise((res) => setTimeout(res, 1200));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ statusCode: 200 }),
      });
    });

    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await page.locator(otpInputs).nth(i).fill(String(i + 1));
    }

    await expect(page.locator(verifyBtn)).toBeDisabled();
    await expect(page.locator('app-spinner')).toBeVisible();
  });

  // ---------- SUCCESS FLOW ----------

  test('successful OTP verification clears storage and redirects to login', async ({ page }) => {
    await page.route(verifyEndpoint, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 201,
          message: 'OTP verified successfully.',
        }),
      });
    });

    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    const firstInput = page.locator(otpInputs).first();
    await firstInput.focus();
    await page.keyboard.type('123456');

    await expect(page).toHaveURL('/login');

    const storage = await page.evaluate(() => ({
      email: localStorage.getItem('signupEmail'),
      userId: localStorage.getItem('signupUserId'),
    }));

    expect(storage.email).toBeNull();
    expect(storage.userId).toBeNull();
  });

  // ---------- INVALID OTP ----------

  test('shows error on invalid OTP', async ({ page }) => {
    await page.route(verifyEndpoint, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: 'Invalid code',
        }),
      });
    });

    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);

    const firstInput = page.locator(otpInputs).first();
    await firstInput.focus();
    await page.keyboard.type('123456');
    await expect(page.locator(errorText)).toHaveText('Invalid code');
  });

  // ---------- NETWORK ERROR ----------

  test('shows fallback error on network failure', async ({ page }) => {
    await page.route(verifyEndpoint, async (route) => {
      await route.abort();
    });

    await page.goto('/verify-otp?email=user@example.com');
    await expect(page.locator(otpInputs)).toHaveCount(6);
    const firstInput = page.locator(otpInputs).first();
    await firstInput.focus();
    await page.keyboard.type('123456');

    await expect(page.locator(errorText)).toHaveText('Failed to fetch');
  });

  // ---------- NAVIGATION ----------

  test('clicking "Use a different email" navigates to signup', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await page.getByText('Use a different email').click();
    await expect(page).toHaveURL('/signup');
  });

  test('Back to login link works', async ({ page }) => {
    await page.goto('/verify-otp?email=user@example.com');
    await page.getByText('Back to login').click();
    await expect(page).toHaveURL('/login');
  });
});

async function pasteIntoOtp(page: Page, index: number, value: string) {
  await page.evaluate(
    ({ selector, idx, text }) => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
      const target = inputs[idx];
      if (!target) {
        return;
      }
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      target.dispatchEvent(event);
    },
    { selector: '.otp-inputs input', idx: index, text: value }
  );
}
