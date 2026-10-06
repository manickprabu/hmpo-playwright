import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import { ActivityTracker } from '../src/services/activityTracker.ts';

let temporaryDirectory;

afterEach(async () => {
  sinon.restore();
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

async function createTracker() {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'activity-tests-'));
  return {
    tracker: new ActivityTracker(temporaryDirectory),
    statusPath: path.join(temporaryDirectory, 'run-status.json'),
  };
}

async function readStatus(statusPath) {
  return JSON.parse(await fs.readFile(statusPath, 'utf8'));
}

describe('ActivityTracker', () => {
  it('tracks progress and results while masking passport numbers', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2026-01-02T03:04:05.000Z') });
    const { tracker, statusPath } = await createTracker();
    await tracker.start(2);
    tracker.beginRecord('P1234567', 2);
    await tracker.step('P1234567', 'Opening site.');
    await tracker.step('P1234567', 'Searching record.');
    await tracker.step('P1234567', 'Extra step capped.');
    await tracker.record({
      passportNumber: 'P1234567',
      success: true,
      startedAt: 'start',
      completedAt: 'end',
    });
    await tracker.record({
      passportNumber: 'A7654321',
      success: false,
      startedAt: 'start-2',
      completedAt: 'end-2',
      error: 'record not found',
    });

    const status = await readStatus(statusPath);
    assert.equal(status.state, 'running');
    assert.equal(status.total, 2);
    assert.equal(status.completed, 2);
    assert.equal(status.successful, 1);
    assert.equal(status.failed, 1);
    assert.equal(status.currentPassport, 'P*****67');
    assert.equal(status.recordProgress.completed, 2);
    assert.equal(status.results[0].passport, 'A*****21');
    assert.equal(status.results[0].error, 'record not found');
    assert.equal(status.results[1].passport, 'P*****67');
    assert.equal(status.events[0].level, 'error');
    assert.equal(status.events[1].level, 'success');
    assert.equal(status.updatedAt, '2026-01-02T03:04:05.000Z');
    clock.restore();
  });

  it('finishes a batch and caps the event history at 25 entries', async () => {
    const { tracker, statusPath } = await createTracker();
    await tracker.start(0);
    for (let index = 0; index < 30; index += 1) {
      await tracker.step('P1234567', `step ${index}`);
    }
    await tracker.finish();

    const status = await readStatus(statusPath);
    assert.equal(status.state, 'completed');
    assert.equal(status.currentPassport, undefined);
    assert.equal(status.currentStep, 'Processing completed.');
    assert.equal(status.events.length, 25);
    assert.equal(status.events[0].level, 'success');
  });

  it('marks setup failures', async () => {
    const { tracker, statusPath } = await createTracker();
    await tracker.start(1);
    await tracker.fail('Browser could not start.');

    const status = await readStatus(statusPath);
    assert.equal(status.state, 'failed');
    assert.equal(status.currentStep, 'Setup failed.');
    assert.equal(status.events[0].message, 'Browser could not start.');
    assert.equal(status.events[0].level, 'error');
  });
});
