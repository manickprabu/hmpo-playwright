import type { Page } from 'playwright';
import { selectors } from '../selectors.js';
import { clickWhenReady, waitForSettled } from '../utils/waitUtils.js';

export async function loginWithPassport(page: Page, passportNumber: string): Promise<void> {
  await page.locator(selectors.passportInput).waitFor({ state: 'visible' });
  await page.locator(selectors.passportInput).fill(passportNumber);
  await clickWhenReady(page.locator(selectors.loginButton));
  await Promise.race([
    page.locator(selectors.loginSuccessIndicator).waitFor({ state: 'visible' }),
    page
      .locator(selectors.errorMessage)
      .waitFor({ state: 'visible' })
      .then(async () => {
        throw new Error(
          `Login/search failed: ${(await page.locator(selectors.errorMessage).first().innerText()).trim()}`,
        );
      }),
  ]);
  await waitForSettled(page, selectors.loadingSpinner);
}

export async function logout(page: Page): Promise<void> {
  const button = page.locator(selectors.logoutButton);
  if (await button.isVisible().catch(() => false)) {
    await clickWhenReady(button);
    await page
      .locator(selectors.passportInput)
      .waitFor({ state: 'visible' })
      .catch(() => undefined);
  }
}
