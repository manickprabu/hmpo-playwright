import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import {
  initialiseAutomationControls,
  loadConfiguration,
} from '../src/ui/public/automation-controls.js';
import { flushEvents, installDom, jsonResponse } from './helpers/dom.js';

let dom;
afterEach(() => {
  sinon.restore();
  dom?.restore();
  dom = undefined;
});

function setup() {
  dom = installDom(`
    <form id="target-url-form"><input id="target-url"><button type="submit">Save</button></form>
    <button id="start-automation">Start</button><p id="control-message"></p>
  `);
  return dom.dom.window.document;
}

describe('automation controls', () => {
  it('loads a configured URL and reports load failures', async () => {
    const document = setup();
    sinon
      .stub(globalThis, 'fetch')
      .onFirstCall()
      .resolves(jsonResponse({ targetUrl: 'https://example.test' }));
    await loadConfiguration();
    assert.equal(document.getElementById('target-url').value, 'https://example.test');

    globalThis.fetch.onSecondCall().rejects(new Error('offline'));
    await loadConfiguration();
    assert.equal(
      document.getElementById('control-message').textContent,
      'Could not load the current target URL.',
    );
    assert.match(document.getElementById('control-message').className, /govuk-error-message/);
  });

  it('saves the trimmed target URL and restores the submit button', async () => {
    const document = setup();
    const fetch = sinon
      .stub(globalThis, 'fetch')
      .resolves(jsonResponse({ targetUrl: 'https://example.test/' }));
    document.getElementById('target-url').value = '  https://example.test/  ';
    initialiseAutomationControls();
    document
      .getElementById('target-url-form')
      .dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();

    assert.deepEqual(JSON.parse(fetch.firstCall.args[1].body), {
      targetUrl: 'https://example.test/',
    });
    assert.equal(document.getElementById('target-url').value, 'https://example.test/');
    assert.equal(document.querySelector('#target-url-form button').disabled, false);
    assert.equal(
      document.getElementById('control-message').textContent,
      'Target website URL saved.',
    );
  });

  it('shows save and start errors, and displays successful start messages', async () => {
    const document = setup();
    const fetch = sinon.stub(globalThis, 'fetch');
    fetch.onFirstCall().rejects(new Error('Save failed'));
    fetch.onSecondCall().resolves(jsonResponse({ message: 'Automation started.' }));
    fetch.onThirdCall().rejects(new Error('Start failed'));
    initialiseAutomationControls();

    document
      .getElementById('target-url-form')
      .dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();
    assert.equal(document.getElementById('control-message').textContent, 'Save failed');
    assert.equal(document.querySelector('#target-url-form button').disabled, false);

    document.getElementById('start-automation').click();
    await flushEvents();
    assert.equal(document.getElementById('control-message').textContent, 'Automation started.');

    document.getElementById('start-automation').click();
    await flushEvents();
    assert.equal(document.getElementById('control-message').textContent, 'Start failed');
    assert.match(document.getElementById('control-message').className, /govuk-error-message/);
  });
});
