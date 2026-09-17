import path from 'node:path';
import type { Page } from 'playwright';
import { loadConfig } from './config.js';
import { sections } from './pages.js';
import { createIsolatedPage, launchBrowser } from './services/browser.js';
import { loginWithPassport, logout } from './services/login.js';
import { navigateToSection, processTab } from './services/navigator.js';
import { readPassportNumbers } from './services/passportReader.js';
import type { PassportResult } from './types/index.js';
import { ensureDirectory, passportOutputDirectory, writeUtf8 } from './utils/fileUtils.js';
import { logger, maskPassport } from './utils/logger.js';

async function saveDiagnostics(
  page: Page,
  folder: string,
  passport: string,
  error: unknown,
): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);
  const diagnostic = [
    `Passport: ${passport}`,
    `Timestamp: ${new Date().toISOString()}`,
    `URL: ${page.url()}`,
    `Error: ${message}`,
  ].join('\n');
  await writeUtf8(path.join(folder, 'error.txt'), `${diagnostic}\n`);
  await page
    .screenshot({
      path: path.join(folder, 'error-screenshot.jpg'),
      type: 'jpeg',
      fullPage: true,
      quality: 80,
    })
    .catch(() => undefined);
  return message;
}

async function main(): Promise<void> {
  const config = loadConfig();
  await ensureDirectory(config.outputDir);
  const passports = await readPassportNumbers(config.inputFile);
  if (!passports.length) {
    logger.warn('No passport numbers were found in the input file. Nothing to process.');
    return;
  }

  const browser = await launchBrowser(config);
  const results: PassportResult[] = [];
  try {
    for (const [index, passport] of passports.entries()) {
      const startedAt = new Date().toISOString();
      const masked = maskPassport(passport);
      const folder = passportOutputDirectory(config.outputDir, passport);
      await ensureDirectory(folder);
      logger.info(`[${index + 1}/${passports.length}] Processing ${masked}`);
      let result: PassportResult;
      let session: Awaited<ReturnType<typeof createIsolatedPage>> | undefined;
      try {
        session = await createIsolatedPage(browser, config);
        logger.info('Opening website…');
        await session.page.goto(config.targetUrl, { waitUntil: 'domcontentloaded' });
        logger.info('Submitting passport…');
        await loginWithPassport(session.page, passport);
        logger.info('Login successful.');
        for (const section of sections) {
          logger.info(`Capturing ${section.name}…`);
          await navigateToSection(session.page, section);
          for (const tab of section.tabs) {
            await processTab(session.page, tab, folder, config);
            if (tab.extractText) logger.info(`Extracting ${tab.name}…`);
          }
        }
        result = {
          passportNumber: passport,
          success: true,
          startedAt,
          completedAt: new Date().toISOString(),
        };
        logger.info(`Completed ${masked}`);
      } catch (error) {
        const message = session
          ? await saveDiagnostics(session.page, folder, passport, error).catch(
              (diagnosticError) =>
                `${error instanceof Error ? error.message : String(error)}; could not save full diagnostics: ${String(diagnosticError)}`,
            )
          : error instanceof Error
            ? error.message
            : String(error);
        result = {
          passportNumber: passport,
          success: false,
          startedAt,
          completedAt: new Date().toISOString(),
          error: message,
        };
        logger.error(`Failed ${masked}. Diagnostics saved in its output folder.`);
      } finally {
        if (session) {
          await logout(session.page).catch(() => undefined);
          await session.close();
        }
      }
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  const successful = results.filter((result) => result.success).length;
  await writeUtf8(
    path.join(config.outputDir, 'summary.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: results.length,
        successful,
        failed: results.length - successful,
        results,
      },
      null,
      2,
    )}\n`,
  );
  logger.info(
    `\nProcessing completed.\n\nTotal: ${results.length}\nSuccessful: ${successful}\nFailed: ${results.length - successful}`,
  );
}

main().catch((error: unknown) => {
  logger.error(`Fatal setup error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
