import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'mocha';
import {
  ensureDirectory,
  passportOutputDirectory,
  sanitizeFileComponent,
  writeUtf8,
} from '../src/utils/fileUtils.ts';

let temporaryDirectory;

afterEach(async () => {
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

describe('file utilities', () => {
  it('sanitizes unsafe filename components and limits their length', () => {
    assert.equal(sanitizeFileComponent('  ..AB 12/34.. '), 'AB_12_34');
    assert.equal(sanitizeFileComponent('x'.repeat(130)).length, 120);
    assert.throws(() => sanitizeFileComponent('...'), /Filename became empty/);
  });

  it('builds passport folders from sanitized numbers', () => {
    assert.equal(passportOutputDirectory('/output', 'A/12'), path.join('/output', 'A_12'));
  });

  it('creates directories and writes UTF-8 content', async () => {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'passport-tests-'));
    const nestedDirectory = path.join(temporaryDirectory, 'nested');
    await ensureDirectory(nestedDirectory);
    const outputPath = path.join(nestedDirectory, 'result.txt');
    await writeUtf8(outputPath, 'text\n');
    assert.equal(await fs.readFile(outputPath, 'utf8'), 'text\n');
  });
});
