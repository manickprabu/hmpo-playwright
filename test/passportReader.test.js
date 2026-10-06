import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'mocha';
import { readPassportNumbers } from '../src/services/passportReader.ts';

describe('readPassportNumbers', () => {
  it('trims values, skips comments and blanks, and removes duplicates', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'passport-input-'));
    const inputPath = path.join(directory, 'passports.txt');
    try {
      await fs.writeFile(inputPath, ' P123 \r\n# ignored\n\nP456\nP123\n', 'utf8');
      assert.deepEqual(await readPassportNumbers(inputPath), ['P123', 'P456']);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('propagates filesystem errors for missing input', async () => {
    await assert.rejects(readPassportNumbers('/missing/passports.txt'), { code: 'ENOENT' });
  });
});
