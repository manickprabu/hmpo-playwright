import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import { installDom } from './helpers/dom.js';
import {
  ProtectedMessageEditor,
  normaliseRanges,
  updateProtectedRanges,
} from '../src/ui/public/protected-message-editor.js';
import {
  normaliseMessageNewlines,
  validateEditedMessage,
} from '../src/ui/protectedMessageValidation.ts';

let dom;
afterEach(() => { dom?.restore(); dom = undefined; });

function editor(value = 'Hello JOHN,\nwelcome.', ranges = [{ start: 6, end: 10 }]) {
  dom = installDom(`<form><div><div data-message-overlay></div><textarea>${value}</textarea></div></form>`);
  const document = dom.dom.window.document;
  const textarea = document.querySelector('textarea');
  const overlay = document.querySelector('[data-message-overlay]');
  return { textarea, overlay, controller: new ProtectedMessageEditor({ textarea, overlay, protectedRanges: ranges }) };
}

function change(instance, value, start, end = start, inputType = 'insertText') {
  instance.textarea.setSelectionRange(start, end);
  const before = new dom.dom.window.InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType });
  instance.textarea.dispatchEvent(before);
  if (!before.defaultPrevented) {
    instance.textarea.value = value;
    instance.textarea.dispatchEvent(new dom.dom.window.InputEvent('input', { bubbles: true, inputType }));
  }
  return before;
}

describe('protected message editor', () => {
  it('renders protected multiline message text as red DOM text without HTML injection', () => {
    const instance = editor('A\n<name>', [{ start: 2, end: 8 }]);
    assert.equal(instance.overlay.textContent, 'A\n<name>');
    assert.equal(instance.overlay.querySelector('.protected-message-editor__protected').textContent, '<name>');
    assert.equal(instance.overlay.querySelector('name'), null);
  });

  it('allows edits before a protected range and moves the range', () => {
    const instance = editor();
    change(instance, 'Hello there JOHN,\nwelcome.', 5);
    assert.equal(instance.textarea.value, 'Hello there JOHN,\nwelcome.');
    assert.deepEqual(instance.controller.protectedRanges, [{ start: 12, end: 16 }]);
  });

  it('blocks typing, delete, replacement, paste and cut over protected text', () => {
    const instance = editor();
    for (const inputType of ['insertText', 'deleteContentBackward', 'insertFromPaste', 'deleteByCut']) {
      const before = change(instance, 'Hello X,\nwelcome.', 6, 10, inputType);
      assert.equal(before.defaultPrevented, true);
      assert.equal(instance.textarea.value, 'Hello JOHN,\nwelcome.');
    }
  });

  it('keeps multiple and adjacent ranges, including repeated values, distinct by position', () => {
    const ranges = normaliseRanges('XX XX', [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
    assert.deepEqual(updateProtectedRanges(ranges, 0, 0, 2), [{ start: 2, end: 4 }, { start: 5, end: 7 }]);
    assert.deepEqual(normaliseRanges('ABC', [{ start: 0, end: 1 }, { start: 1, end: 3 }]), [{ start: 0, end: 1 }, { start: 1, end: 3 }]);
  });

  it('normalises CRLF and accepts multiline unicode edits while rejecting changed protected content', () => {
    assert.equal(normaliseMessageNewlines('one\r\ntwo\rthree'), 'one\ntwo\nthree');
    const original = 'Before ÀLEX\nafter';
    assert.equal(validateEditedMessage(original, [{ start: 7, end: 11 }], 'Changed\nÀLEX\n🙂').valid, true);
    assert.equal(validateEditedMessage(original, [{ start: 7, end: 11 }], 'Before ALEX\nafter').valid, false);
  });

  it('restores original value and protected positions on form reset', async () => {
    const instance = editor();
    change(instance, 'Hi JOHN,\nwelcome.', 0, 5);
    instance.textarea.form.reset();
    await new Promise((resolve) => queueMicrotask(resolve));
    assert.equal(instance.textarea.value, 'Hello JOHN,\nwelcome.');
    assert.deepEqual(instance.controller.protectedRanges, [{ start: 6, end: 10 }]);
  });
});
