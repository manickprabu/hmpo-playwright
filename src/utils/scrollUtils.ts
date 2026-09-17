import type { Locator, Page } from 'playwright';

const SETTLE_MS = 150;

async function gradualScrollPage(page: Page): Promise<void> {
  let previousHeight = -1;
  let stablePasses = 0;
  for (let index = 0; index < 120 && stablePasses < 3; index += 1) {
    const state = await page
      .evaluate(() => {
        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        );
        const clientHeight = window.innerHeight;
        const before = window.scrollY;
        const next = Math.min(
          before + Math.max(250, Math.floor(clientHeight * 0.8)),
          Math.max(0, scrollHeight - clientHeight),
        );
        window.scrollTo(0, next);
        return { before, next, scrollHeight, clientHeight };
      })
      .catch(() => undefined);
    if (!state) break;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const atBottom = state.next >= state.scrollHeight - state.clientHeight;
    stablePasses = atBottom && state.scrollHeight === previousHeight ? stablePasses + 1 : 0;
    previousHeight = state.scrollHeight;
  }
}

async function gradualScrollLocator(locator: Locator): Promise<void> {
  let previousHeight = -1;
  let stablePasses = 0;
  for (let index = 0; index < 120 && stablePasses < 3; index += 1) {
    const state = await locator
      .evaluate((element) => {
        const target = element as HTMLElement;
        const { scrollTop: before, clientHeight, scrollHeight } = target;
        const next = Math.min(
          before + Math.max(250, Math.floor(clientHeight * 0.8)),
          Math.max(0, scrollHeight - clientHeight),
        );
        target.scrollTop = next;
        return { before, next, scrollHeight, clientHeight };
      })
      .catch(() => undefined);
    if (!state) break;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const atBottom = state.next >= state.scrollHeight - state.clientHeight;
    stablePasses = atBottom && state.scrollHeight === previousHeight ? stablePasses + 1 : 0;
    previousHeight = state.scrollHeight;
  }
}

/** Reveals lazy content in the document and active tab's nested scroll panels. */
export async function preparePageForFullScreenshot(page: Page, content?: Locator): Promise<void> {
  await gradualScrollPage(page);
  if (content) {
    const scrollables = content.locator('*');
    const count = await scrollables.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const item = scrollables.nth(index);
      const isScrollable = await item
        .evaluate((element) => {
          const styles = getComputedStyle(element);
          return (
            element.scrollHeight > element.clientHeight + 2 &&
            /(auto|scroll)/.test(styles.overflowY)
          );
        })
        .catch(() => false);
      if (isScrollable) await gradualScrollLocator(item);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  if (content) {
    await content
      .locator(':scope *')
      .evaluateAll((elements) => {
        for (const element of elements) {
          const styles = getComputedStyle(element);
          if (
            element.scrollHeight > element.clientHeight + 2 &&
            /(auto|scroll)/.test(styles.overflowY)
          ) {
            (element as HTMLElement).scrollTop = 0;
          }
        }
      })
      .catch(() => undefined);
  }
}
