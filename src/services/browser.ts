import { chromium, type Browser, type Page } from 'playwright';
import type { AppConfig } from '../types/index.js';

export async function launchBrowser(config: AppConfig): Promise<Browser> {
  return chromium.launch({ headless: config.headless, slowMo: config.slowMo });
}

export async function createIsolatedPage(
  browser: Browser,
  config: AppConfig,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(config.navigationTimeout);
  context.setDefaultNavigationTimeout(config.navigationTimeout);
  return { page: await context.newPage(), close: () => context.close() };
}
