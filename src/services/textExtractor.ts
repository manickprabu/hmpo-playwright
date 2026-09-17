import type { Locator } from 'playwright';
import { writeUtf8 } from '../utils/fileUtils.js';
import { preparePageForFullScreenshot } from '../utils/scrollUtils.js';

function normalizeText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export async function extractTabText(container: Locator, outputPath: string): Promise<void> {
  await container.waitFor({ state: 'visible' });
  await preparePageForFullScreenshot(container.page(), container);
  const text = normalizeText(await container.innerText());
  await writeUtf8(outputPath, `${text}\n`);
}
