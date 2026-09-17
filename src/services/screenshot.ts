import path from 'node:path';
import type { Locator, Page } from 'playwright';
import type { AppConfig } from '../types/index.js';
import { preparePageForFullScreenshot } from '../utils/scrollUtils.js';

/** Captures all loaded document content; uses sequential viewport images only if full-page capture fails. */
export async function captureScreenshot(
  page: Page,
  outputPath: string,
  config: AppConfig,
  content?: Locator,
): Promise<string[]> {
  await preparePageForFullScreenshot(page, content);
  try {
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      fullPage: true,
      quality: config.screenshotQuality,
    });
    return [outputPath];
  } catch (error) {
    const extension = path.extname(outputPath);
    const base = outputPath.slice(0, -extension.length);
    const captured: string[] = [];
    let y = 0;
    for (let index = 1; index <= 100; index += 1) {
      const dimensions = await page.evaluate(() => ({
        height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
        viewport: window.innerHeight,
      }));
      await page.evaluate((position) => window.scrollTo(0, position), y);
      const partPath = `${base}-${String(index).padStart(2, '0')}${extension}`;
      await page.screenshot({ path: partPath, type: 'jpeg', quality: config.screenshotQuality });
      captured.push(partPath);
      y += dimensions.viewport;
      if (y >= dimensions.height) break;
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    if (!captured.length) throw error;
    return captured;
  }
}
