import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import { renderDashboard } from '../src/ui/public/dashboard.js';
import { installDom } from './helpers/dom.js';

let dom;
afterEach(() => {
  dom?.restore();
  dom = undefined;
});

function setup() {
  dom = installDom(`
    <span id="state"></span><span id="progress-copy"></span><div id="progress-fill"></div>
    <span id="record-progress-copy"></span><div id="record-progress-fill"></div>
    <button id="download-report"></button><span id="download-report-hint"></span>
    <span id="current-step"></span><span id="current-passport"></span>
    <span id="total"></span><span id="completed"></span><span id="successful"></span>
    <span id="failed"></span><span id="result-count"></span><ul id="events"></ul><table id="results"></table>
  `);
  return dom.dom.window.document;
}

const emptyStatus = {
  state: 'idle',
  total: 0,
  completed: 0,
  successful: 0,
  failed: 0,
  results: [],
  events: [],
};

describe('renderDashboard', () => {
  it('renders the waiting state and empty activity placeholders', () => {
    const document = setup();
    renderDashboard(emptyStatus);

    assert.equal(document.getElementById('state').textContent, 'Waiting for a run');
    assert.equal(document.getElementById('progress-copy').textContent, 'No activity yet');
    assert.equal(document.getElementById('progress-fill').style.width, '0%');
    assert.equal(
      document.getElementById('record-progress-copy').textContent,
      'Current record progress: waiting to start.',
    );
    assert.equal(document.getElementById('download-report').disabled, true);
    assert.match(document.getElementById('events').textContent, /No activity/);
    assert.match(document.getElementById('results').textContent, /Results will appear/);
    assert.equal(document.getElementById('result-count').textContent, '0 records');
  });

  it('renders progress, report availability, and escaped activity/results', () => {
    const document = setup();
    renderDashboard({
      ...emptyStatus,
      state: 'completed',
      total: 2,
      completed: 1,
      successful: 1,
      currentStep: 'Finished one record',
      currentPassport: 'P*****67',
      recordProgress: { completed: 2, total: 4 },
      events: [{ timestamp: '2026-01-02T03:04:05Z', message: '<script>alert("x")</script>' }],
      results: [
        { passport: '<img src=x>', success: true, completedAt: '2026-01-02T03:04:05Z' },
        { passport: 'P123', success: false, completedAt: '2026-01-02T03:05:05Z' },
      ],
    });

    assert.equal(document.getElementById('state').textContent, 'Run completed');
    assert.equal(document.getElementById('progress-fill').style.width, '50%');
    assert.equal(document.getElementById('record-progress-fill').style.width, '50%');
    assert.equal(document.getElementById('download-report').disabled, false);
    assert.equal(document.getElementById('current-step').textContent, 'Finished one record');
    assert.equal(document.getElementById('result-count').textContent, '2 records');
    assert.match(document.getElementById('events').innerHTML, /&lt;script&gt;/);
    assert.doesNotMatch(document.getElementById('events').innerHTML, /<script>/);
    assert.match(document.getElementById('results').innerHTML, /&lt;img/);
    assert.match(document.getElementById('results').innerHTML, /dashboard-status--error/);
  });

  it('renders failed and running states with fallback labels', () => {
    const document = setup();
    renderDashboard({ ...emptyStatus, state: 'failed', results: [{ success: true }] });
    assert.equal(document.getElementById('state').textContent, 'Setup needs attention');
    assert.equal(
      document.getElementById('current-step').textContent,
      'Start the automation to see progress here.',
    );
    assert.equal(document.getElementById('result-count').textContent, '1 record');

    renderDashboard({
      ...emptyStatus,
      state: 'running',
      total: 1,
      completed: 1,
      recordProgress: { completed: 1, total: 1 },
    });
    assert.equal(document.getElementById('state').textContent, 'Automation in progress');
    assert.equal(document.getElementById('progress-fill').style.width, '100%');
  });
});
