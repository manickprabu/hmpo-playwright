import type { Page } from 'playwright';
import { selectors } from '../selectors.js';
import { clickWhenReady, waitForSettled } from '../utils/waitUtils.js';

function candidateSelectors(value: string): string[] {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return [];

  const candidates: string[] = [];
  for (const raw of parts) {
    if (!raw) continue;
    if (/[.#\[]/.test(raw)) {
      candidates.push(raw);
      continue;
    }

    const normalized = raw.replace(/^#/, '').replace(/^\./, '');
    candidates.push(
      raw,
      `#${normalized}`,
      `[id="${normalized}"]`,
      `[name="${normalized}"]`,
      `input#${normalized}`,
      `input[name="${normalized}"]`,
      `input[id="${normalized}"]`,
      `button#${normalized}`,
      `button[name="${normalized}"]`,
      `button[id="${normalized}"]`,
      `#${normalized} input`,
    );
  }

  return [...new Set(candidates)];
}

async function firstVisibleLocator(page: Page, selectorsList: string[]) {
  for (const selector of selectorsList) {
    const locator = page.locator(selector).first();
    if (await locator.count().then((count) => count > 0) && (await locator.isVisible().catch(() => false))) {
      return locator;
    }
  }
  return page.locator(selectorsList[0] || '*');
}

async function loginWithCredentials(page: Page, username: string, password: string): Promise<void> {
  const usernameSelectors = candidateSelectors(
    process.env.USERNAME_SELECTOR || 'username, input[name="username"], input[id="username"]',
  );
  const passwordSelectors = candidateSelectors(
    process.env.PASSWORD_SELECTOR || 'password, input[name="password"], input[id="password"]',
  );
  const loginButtonSelectors = candidateSelectors(
    process.env.LOGIN_BUTTON_SELECTOR ||
      'button[type="submit"], input[type="submit"], #kc-login, button#kc-login, input#kc-login, button:has-text("Log in"), button:has-text("Sign in")',
  );

  const usernameField = await firstVisibleLocator(page, usernameSelectors);
  const passwordField = await firstVisibleLocator(page, passwordSelectors);
  const submitButton = await firstVisibleLocator(page, loginButtonSelectors);

  if (!(await usernameField.isVisible().catch(() => false))) return;

  await usernameField.fill(username);
  if (await passwordField.isVisible().catch(() => false)) {
    await passwordField.fill(password);
  }
  await clickWhenReady(submitButton);

  await Promise.race([
    page.locator(selectors.passportInput).waitFor({ state: 'visible' }).catch(() => undefined),
    page.locator(selectors.loginSuccessIndicator).waitFor({ state: 'visible' }).catch(() => undefined),
    page
      .locator(selectors.errorMessage)
      .waitFor({ state: 'visible' })
      .then(async () => {
        throw new Error(
          `Login failed: ${(await page.locator(selectors.errorMessage).first().innerText()).trim()}`,
        );
      })
      .catch(() => undefined),
  ]);
}

export async function loginWithPassport(page: Page, passportNumber: string): Promise<void> {
  const username = process.env.USERNAME?.trim();
  const password = process.env.PASSWORD?.trim();

  if (username && password) {
    await loginWithCredentials(page, username, password);
  }

  const passportInput = page.locator(selectors.passportInput);
  if (!(await passportInput.isVisible().catch(() => false))) {
    const targetUrl = process.env.TARGET_URL?.trim();
    const baseUrl = targetUrl ? new URL(targetUrl) : new URL(page.url());
    const searchUrl = new URL('/passport-search', baseUrl.origin).toString();
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  }

  await passportInput.waitFor({ state: 'visible' });
  await passportInput.fill(passportNumber);
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
