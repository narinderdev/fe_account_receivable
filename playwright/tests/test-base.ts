import { expect, test as base } from '@playwright/test';
import type { Locator } from '@playwright/test';

type TypeWithDelayFn = (
  locator: Locator,
  text: string,
  options?: Parameters<Locator['type']>[1]
) => Promise<void>;

export const inputTypeDelayMs =
  Number(process.env.PLAYWRIGHT_INPUT_DELAY ?? '150');

export const test = base.extend<{
  typeWithDelay: TypeWithDelayFn;
}>({
  typeWithDelay: async ({}, use) => {
    await use(async (locator, text, options) => {
      await locator.type(text, {
        delay: inputTypeDelayMs,
        ...options,
      });
    });
  },
});

export { expect };
