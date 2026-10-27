import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  createMessageSegments,
  normaliseProtectedRanges,
} from '../src/ui/public/inline-protected-message-editor.js';

describe('inline protected message editor segments', () => {
  it('preserves protected values, empty lines, and editable text in order', () => {
    const message = 'Hello JOHN,\n\nReady';
    assert.deepEqual(createMessageSegments(message, [{ start: 6, end: 10 }]).map(({ type, value }) => ({ type, value })), [
      { type: 'editable', value: 'Hello ' },
      { type: 'protected', value: 'JOHN' },
      { type: 'editable', value: ',' },
      { type: 'newline', value: '\n' },
      { type: 'newline', value: '\n' },
      { type: 'editable', value: 'Ready' },
    ]);
  });

  it('uses positions for repeated text and accepts adjacent protected ranges', () => {
    const message = 'ID ID';
    const segments = createMessageSegments(message, [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
    assert.deepEqual(segments.map(({ type, value }) => ({ type, value })), [
      { type: 'protected', value: 'ID' },
      { type: 'editable', value: ' ' },
      { type: 'protected', value: 'ID' },
    ]);
  });

  it('preserves a protected range spanning a line break', () => {
    const message = 'A\nB';
    assert.deepEqual(createMessageSegments(message, [{ start: 0, end: 3 }]).map(({ type, value, protected: isProtected }) => ({ type, value, protected: isProtected })), [
      { type: 'protected', value: 'A', protected: undefined },
      { type: 'newline', value: '\n', protected: true },
      { type: 'protected', value: 'B', protected: undefined },
    ]);
  });

  it('rejects invalid and overlapping UTF-16 ranges', () => {
    assert.throws(() => normaliseProtectedRanges('🙂x', [{ start: 0, end: 4 }]));
    assert.throws(() => normaliseProtectedRanges('abcd', [{ start: 0, end: 2 }, { start: 1, end: 3 }]));
  });
});
