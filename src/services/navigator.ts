import path from 'node:path';
import type { Page } from 'playwright';
import { selectors } from '../selectors.js';
import type { AppConfig, SectionDefinition, TabDefinition } from '../types/index.js';
import { captureScreenshot } from './screenshot.js';
import { extractTabText } from './textExtractor.js';
import { clickWhenReady, waitForSettled } from '../utils/waitUtils.js';

async function waitForSectionOrTabContent(page: Page, selector: string, activeSelector?: string): Promise<void> {
  await page.waitForFunction(
    ({ selector, activeSelector }) => {
      const panel = document.querySelector(selector) as HTMLElement | null;
      if (!panel) return false;

      const panelVisible =
        !panel.hidden &&
        panel.getAttribute('aria-hidden') !== 'true' &&
        panel.getClientRects().length > 0;

      if (panelVisible) return true;

      if (!activeSelector) return false;

      const activeElement = document.querySelector(activeSelector) as HTMLElement | null;
      if (!activeElement) return false;

      return (
        activeElement.getAttribute('aria-selected') === 'true' ||
        activeElement.getAttribute('aria-expanded') === 'true' ||
        activeElement.getAttribute('data-state') === 'active' ||
        activeElement.classList.contains('active') ||
        activeElement.classList.contains('selected') ||
        activeElement.classList.contains('is-active')
      );
    },
    { selector, activeSelector },
  );
}

export async function navigateToSection(page: Page, section: SectionDefinition): Promise<void> {
  await clickWhenReady(page.locator(section.navigationSelector));
  if (section.readySelector)
    await waitForSectionOrTabContent(page, section.readySelector, section.navigationSelector);
  await waitForSettled(page, selectors.loadingSpinner);
}

export async function processTab(
  page: Page,
  tab: TabDefinition,
  folder: string,
  config: AppConfig,
): Promise<void> {
  await clickWhenReady(page.locator(tab.selector));
  const contentSelector = tab.contentSelector;
  const content = contentSelector ? page.locator(contentSelector) : undefined;
  if (contentSelector) {
    await waitForSectionOrTabContent(page, contentSelector, tab.selector);
  }
  await waitForSettled(page, selectors.loadingSpinner);

  const screenshotName =
    tab.screenshotFilename ?? `${tab.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
  const textName = tab.textFilename ?? `${path.parse(screenshotName).name}.txt`;

  if (!tab.ignoreScreenshot) {
    await captureScreenshot(page, path.join(folder, screenshotName), config, content);
  }
  if (!tab.extractText) return;
  if (!content) throw new Error(`Tab ${tab.name} requires a contentSelector for text extraction.`);
  await extractTabText(content, path.join(folder, textName));
}
