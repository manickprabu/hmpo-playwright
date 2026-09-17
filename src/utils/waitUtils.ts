import type { Locator, Page } from 'playwright';

export async function waitForSettled(page: Page, spinnerSelector?: string): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  if (spinnerSelector) {
    await page
      .locator(spinnerSelector)
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => undefined);
  }
}

export async function clickWhenReady(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}
