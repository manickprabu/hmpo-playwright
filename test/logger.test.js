import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import { logger, maskPassport } from '../src/utils/logger.ts';

afterEach(() => sinon.restore());

describe('logger utilities', () => {
  it('masks short and long passport numbers', () => {
    assert.equal(maskPassport('ABC'), '***');
    assert.equal(maskPassport('ABCD'), 'A***CD');
    assert.equal(maskPassport('P1234567'), 'P*****67');
  });

  it('forwards messages to the matching console method', () => {
    const info = sinon.stub(console, 'log');
    const warn = sinon.stub(console, 'warn');
    const error = sinon.stub(console, 'error');

    logger.info('info message');
    logger.warn('warning message');
    logger.error('error message');

    assert.equal(info.calledOnceWithExactly('info message'), true);
    assert.equal(warn.calledOnceWithExactly('warning message'), true);
    assert.equal(error.calledOnceWithExactly('error message'), true);
  });
});
