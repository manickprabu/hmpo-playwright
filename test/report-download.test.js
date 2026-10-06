import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, describe, it } from 'mocha';
import { initialiseReportDownload } from '../src/ui/public/report-download.js';
import { installDom } from './helpers/dom.js';

let dom;
let previousWindow;
afterEach(() => {
  sinon.restore();
  dom?.restore();
  dom = undefined;
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
  previousWindow = undefined;
});

describe('report download control', () => {
  it('navigates to the report download endpoint when clicked', () => {
    dom = installDom('<button id="download-report"></button>');
    previousWindow = globalThis.window;
    const assign = sinon.stub();
    globalThis.window = { location: { assign } };

    initialiseReportDownload();
    globalThis.document.getElementById('download-report').click();

    assert.equal(assign.calledOnceWithExactly('/api/reports/download'), true);
  });
});
