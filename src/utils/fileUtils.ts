import fs from 'node:fs/promises';
import path from 'node:path';

export function sanitizeFileComponent(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+|\.+$/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '..')
    throw new Error('Filename became empty after sanitization.');
  return cleaned.slice(0, 120);
}

export async function ensureDirectory(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
}

export function passportOutputDirectory(root: string, passportNumber: string): string {
  return path.join(root, sanitizeFileComponent(passportNumber));
}

export async function writeUtf8(filePath: string, contents: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
}
