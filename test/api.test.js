import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import { api, requestOptions } from '../src/ui/public/api.js';
import { jsonResponse } from './helpers/dom.js';

afterEach(() => sinon.restore());

describe('dashboard API client', () => {
  it('sends no-store requests and parses JSON responses', async () => {
    const fetch = sinon.stub(globalThis, 'fetch').resolves(jsonResponse({ state: 'idle' }));

    assert.deepEqual(await api('/api/status'), { state: 'idle' });
    assert.equal(fetch.calledOnceWithExactly('/api/status', { cache: 'no-store' }), true);
  });

  it('returns an empty object for an empty success response', async () => {
    sinon.stub(globalThis, 'fetch').resolves(jsonResponse(''));
    assert.deepEqual(await api('/api/status'), {});
  });

  it('rejects invalid JSON and non-success responses', async () => {
    sinon
      .stub(globalThis, 'fetch')
      .onFirstCall()
      .resolves(jsonResponse('<html>', { status: 502, statusText: 'Bad Gateway' }));
    await assert.rejects(api('/api/status'), /502 Bad Gateway/);

    globalThis.fetch
      .onSecondCall()
      .resolves(jsonResponse({ error: 'URL is required.' }, { ok: false, status: 400 }));
    await assert.rejects(api('/api/config', {}), /URL is required/);

    globalThis.fetch.onThirdCall().resolves(jsonResponse({}, { ok: false }));
    await assert.rejects(api('/api/config'), /request could not be completed/);
  });

  it('creates JSON request options', () => {
    assert.deepEqual(requestOptions('POST', { targetUrl: 'https://example.test' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"targetUrl":"https://example.test"}',
    });
  });
});
