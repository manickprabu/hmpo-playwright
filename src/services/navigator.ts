import path from 'node:path';
import type { Page } from 'playwright';
import { selectors } from '../selectors.js';
import type { AppConfig, SectionDefinition, TabDefinition } from '../types/index.js';
import { captureScreenshot } from './screenshot.js';
import { extractTabText } from './textExtractor.js';
import { clickWhenReady, waitForSettled } from '../utils/waitUtils.js';

export async function navigateToSection(page: Page, section: SectionDefinition): Promise<void> {
  await clickWhenReady(page.locator(section.navigationSelector));
  if (section.readySelector)
    await page.locator(section.readySelector).waitFor({ state: 'visible' });
  await waitForSettled(page, selectors.loadingSpinner);
}

export async function processTab(
  page: Page,
  tab: TabDefinition,
  folder: string,
  config: AppConfig,
): Promise<void> {
  await clickWhenReady(page.locator(tab.selector));
  const content = tab.contentSelector ? page.locator(tab.contentSelector) : undefined;
  if (content) await content.waitFor({ state: 'visible' });
  await waitForSettled(page, selectors.loadingSpinner);
  await captureScreenshot(page, path.join(folder, tab.screenshotFilename), config, content);
  if (tab.extractText) {
    if (!content)
      throw new Error(`Tab ${tab.name} requires a contentSelector for text extraction.`);
    await extractTabText(
      content,
      path.join(folder, `${path.parse(tab.screenshotFilename).name}.txt`),
    );
  }
}
