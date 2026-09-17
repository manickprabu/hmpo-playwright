import 'dotenv/config';
import path from 'node:path';
import type { AppConfig } from './types/index.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
}

function numberValue(name: string, fallback: number, minimum = 0): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be a number greater than or equal to ${minimum}.`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const screenshotQuality = numberValue('SCREENSHOT_QUALITY', 90, 0);
  if (screenshotQuality > 100) throw new Error('SCREENSHOT_QUALITY must be between 0 and 100.');
  return {
    targetUrl: required('TARGET_URL'),
    headless: booleanValue('HEADLESS', true),
    slowMo: numberValue('SLOW_MO', 0),
    navigationTimeout: numberValue('NAVIGATION_TIMEOUT', 30_000, 1),
    screenshotQuality,
    outputDir: path.resolve(process.env.OUTPUT_DIR?.trim() || 'output'),
    inputFile: path.resolve(process.env.INPUT_FILE?.trim() || 'input/passports.txt'),
  };
}
