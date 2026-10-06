import assert from 'node:assert/strict';
import path from 'node:path';
import { afterEach, describe, it } from 'mocha';
import { loadConfig } from '../src/config.ts';

const configKeys = [
  'TARGET_URL',
  'HEADLESS',
  'SLOW_MO',
  'NAVIGATION_TIMEOUT',
  'SCREENSHOT_QUALITY',
  'OUTPUT_DIR',
  'INPUT_FILE',
];
const originalEnvironment = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));

function setEnvironment(values) {
  for (const key of configKeys) delete process.env[key];
  Object.assign(process.env, values);
}

afterEach(() => {
  setEnvironment(originalEnvironment);
});

describe('loadConfig', () => {
  it('uses defaults and requires a target URL', () => {
    setEnvironment({ TARGET_URL: ' https://example.test/path ' });

    assert.deepEqual(loadConfig(), {
      targetUrl: 'https://example.test/path',
      headless: true,
      slowMo: 0,
      navigationTimeout: 30_000,
      screenshotQuality: 90,
      outputDir: path.resolve('output'),
      inputFile: path.resolve('input/passports.txt'),
    });
  });

  it('parses configured values and boolean false', () => {
    setEnvironment({
      TARGET_URL: 'https://example.test',
      HEADLESS: ' false ',
      SLOW_MO: '125',
      NAVIGATION_TIMEOUT: '4000',
      SCREENSHOT_QUALITY: '0',
      OUTPUT_DIR: 'reports',
      INPUT_FILE: 'data/list.txt',
    });

    const config = loadConfig();
    assert.equal(config.headless, false);
    assert.equal(config.slowMo, 125);
    assert.equal(config.navigationTimeout, 4000);
    assert.equal(config.screenshotQuality, 0);
    assert.equal(config.outputDir, path.resolve('reports'));
    assert.equal(config.inputFile, path.resolve('data/list.txt'));
  });

  it('rejects a missing target URL', () => {
    setEnvironment({});
    assert.throws(() => loadConfig(), /Missing required environment variable: TARGET_URL/);
  });

  it('rejects invalid booleans and numbers', () => {
    setEnvironment({ TARGET_URL: 'https://example.test', HEADLESS: 'yes' });
    assert.throws(() => loadConfig(), /HEADLESS must be true or false/);

    setEnvironment({ TARGET_URL: 'https://example.test', SLOW_MO: '-1' });
    assert.throws(() => loadConfig(), /SLOW_MO must be a number/);

    setEnvironment({ TARGET_URL: 'https://example.test', NAVIGATION_TIMEOUT: '0' });
    assert.throws(() => loadConfig(), /NAVIGATION_TIMEOUT must be a number/);

    setEnvironment({ TARGET_URL: 'https://example.test', SCREENSHOT_QUALITY: '101' });
    assert.throws(() => loadConfig(), /SCREENSHOT_QUALITY must be between 0 and 100/);
  });
});
