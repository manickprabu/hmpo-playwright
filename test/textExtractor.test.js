import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import { extractTabText } from '../src/services/textExtractor.ts';

let temporaryDirectory;

afterEach(async () => {
  sinon.restore();
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

async function createContainer(innerText) {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'text-extractor-'));
  const descendants = { evaluateAll: sinon.stub().resolves() };
  const container = {
    waitFor: sinon.stub().resolves(),
    innerText: sinon.stub().resolves(innerText),
    page: () => ({ evaluate: sinon.stub().resolves(undefined) }),
    locator: sinon.stub(),
  };
  container.locator.withArgs('*').returns({ count: sinon.stub().resolves(0) });
  container.locator.withArgs(':scope *').returns(descendants);
  return { container, outputPath: path.join(temporaryDirectory, 'tab.txt') };
}

describe('extractTabText', () => {
  it('normalizes whitespace and writes extracted text', async () => {
    const { container, outputPath } = await createContainer('  alpha\t beta  \n\n line   two \r\n');

    await extractTabText(container, outputPath);

    assert.equal(await fs.readFile(outputPath, 'utf8'), 'alpha beta\nline two\n');
    assert.equal(container.waitFor.calledOnceWithExactly({ state: 'visible' }), true);
  });

  it('writes a newline for empty visible content', async () => {
    const { container, outputPath } = await createContainer(' \n\t ');
    await extractTabText(container, outputPath);
    assert.equal(await fs.readFile(outputPath, 'utf8'), '\n');
  });
});
