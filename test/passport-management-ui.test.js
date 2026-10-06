import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import {
  initialisePassportManagement,
  loadPassports,
} from '../src/ui/public/passport-management.js';
import { flushEvents, installDom, jsonResponse } from './helpers/dom.js';

let dom;
afterEach(() => {
  sinon.restore();
  dom?.restore();
  dom = undefined;
});

function setup() {
  dom = installDom(`
    <form id="passport-form"><input id="passport-number"><button type="submit">Add</button></form>
    <ul id="passport-list"></ul><p id="passport-count"></p><p id="passport-message"></p>
  `);
  return dom.dom.window.document;
}

describe('passport management UI', () => {
  it('renders passport values as text and handles an empty list', async () => {
    const document = setup();
    const fetch = sinon.stub(globalThis, 'fetch');
    fetch.onFirstCall().resolves(jsonResponse({ passports: ['P1234567', '<script>'] }));
    fetch.onSecondCall().resolves(jsonResponse({ passports: [] }));

    await loadPassports();
    assert.equal(document.querySelectorAll('#passport-list li').length, 2);
    assert.equal(document.querySelector('#passport-list li span').textContent, 'P1234567');
    assert.equal(document.querySelector('#passport-list').querySelector('script'), null);
    assert.equal(
      document.getElementById('passport-count').textContent,
      '2 passport numbers in the next batch.',
    );

    await loadPassports();
    assert.equal(
      document.getElementById('passport-list').textContent,
      'No passport numbers have been added.',
    );
    assert.equal(
      document.getElementById('passport-count').textContent,
      '0 passport numbers in the next batch.',
    );
  });

  it('reports errors when passport numbers cannot be loaded', async () => {
    const document = setup();
    const fetch = sinon.stub(globalThis, 'fetch').onFirstCall().rejects(new Error('offline'));
    await loadPassports();
    assert.equal(document.getElementById('passport-message').textContent, 'offline');
    assert.match(document.getElementById('passport-message').className, /govuk-error-message/);

    fetch.onSecondCall().callsFake(() => Promise.reject('offline'));
    await loadPassports();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'Could not load passport numbers.',
    );
  });

  it('adds a number, clears input, reloads the list, and handles duplicates', async () => {
    const document = setup();
    const fetch = sinon.stub(globalThis, 'fetch');
    fetch.onCall(0).resolves(jsonResponse({ added: true, total: 1 }));
    fetch.onCall(1).resolves(jsonResponse({ passports: ['P1234567'] }));
    fetch.onCall(2).resolves(jsonResponse({ added: false, total: 1 }));
    fetch.onCall(3).resolves(jsonResponse({ passports: ['P1234567'] }));
    fetch.onCall(4).resolves(jsonResponse({ added: true, total: 2 }));
    fetch.onCall(5).resolves(jsonResponse({ passports: ['P1234567', 'P7654321'] }));
    document.getElementById('passport-number').value = 'P1234567';
    initialisePassportManagement();

    const form = document.getElementById('passport-form');
    form.dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();
    assert.equal(document.getElementById('passport-number').value, '');
    assert.equal(
      document.getElementById('passport-message').textContent,
      'Passport number added. 1 record ready for the next batch.',
    );
    assert.equal(form.querySelector('button').disabled, false);

    document.getElementById('passport-number').value = 'P1234567';
    form.dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'That passport number is already in the batch. 1 record ready.',
    );

    document.getElementById('passport-number').value = 'P7654321';
    form.dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'Passport number added. 2 records ready for the next batch.',
    );
  });

  it('re-enables add after failure and handles delete success, missing, and errors', async () => {
    const document = setup();
    const fetch = sinon.stub(globalThis, 'fetch');
    fetch.onCall(0).rejects(new Error('cannot add'));
    fetch.onCall(1).resolves(jsonResponse({ passports: ['P1234567'] }));
    fetch.onCall(2).resolves(jsonResponse({ deleted: true, total: 0 }));
    fetch.onCall(3).resolves(jsonResponse({ passports: [] }));
    fetch.onCall(4).resolves(jsonResponse({ passports: ['P7654321'] }));
    fetch.onCall(5).resolves(jsonResponse({ deleted: false, total: 0 }));
    fetch.onCall(6).resolves(jsonResponse({ passports: [] }));
    fetch.onCall(7).resolves(jsonResponse({ passports: ['P7654321'] }));
    fetch.onCall(8).rejects(new Error('cannot delete'));
    fetch.onCall(9).resolves(jsonResponse({ passports: ['P7654321'] }));
    fetch.onCall(10).callsFake(() => Promise.reject('cannot delete'));
    initialisePassportManagement();

    const form = document.getElementById('passport-form');
    form.dispatchEvent(new dom.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushEvents();
    assert.equal(form.querySelector('button').disabled, false);
    assert.equal(document.getElementById('passport-message').textContent, 'cannot add');

    await loadPassports();
    document.querySelector('#passport-list button').click();
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'Passport number deleted. 0 records remain.',
    );

    await loadPassports();
    document.querySelector('#passport-list button')?.click();
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'The passport number was not found in the batch.',
    );

    document.querySelector('#passport-list li').click();
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'The passport number was not found in the batch.',
    );

    await loadPassports();
    document.querySelector('#passport-list button').click();
    await flushEvents();
    assert.equal(document.getElementById('passport-message').textContent, 'cannot delete');
    assert.equal(document.querySelector('#passport-list button').disabled, false);

    await loadPassports();
    document.querySelector('#passport-list button').click();
    await flushEvents();
    assert.equal(
      document.getElementById('passport-message').textContent,
      'Could not delete passport number.',
    );
    assert.equal(document.querySelector('#passport-list button').disabled, false);
  });
});
