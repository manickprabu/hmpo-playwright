import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import { initialiseNavigation } from '../src/ui/public/navigation.js';
import { installDom } from './helpers/dom.js';

let dom;
afterEach(() => {
  dom?.restore();
  dom = undefined;
});

function setup(url) {
  dom = installDom(
    `
    <button data-panel-target="automation-panel" role="tab">Automation</button>
    <button data-panel-target="activity-panel" role="tab">Activity</button>
    <section id="automation-panel"></section><section id="activity-panel" hidden></section>
  `,
    url,
  );
  return dom.dom.window.document;
}

describe('dashboard navigation', () => {
  it('selects a valid hash on load and changes panels on click', () => {
    const document = setup('http://localhost/#activity-panel');
    initialiseNavigation();

    const activityTab = document.querySelector('[data-panel-target="activity-panel"]');
    const automationTab = document.querySelector('[data-panel-target="automation-panel"]');
    assert.equal(activityTab.getAttribute('aria-selected'), 'true');
    assert.equal(document.getElementById('activity-panel').hidden, false);
    assert.equal(document.getElementById('automation-panel').hidden, true);

    automationTab.click();
    assert.equal(automationTab.classList.contains('is-active'), true);
    assert.equal(automationTab.getAttribute('aria-selected'), 'true');
    assert.equal(document.getElementById('automation-panel').hidden, false);
    assert.equal(document.getElementById('activity-panel').hidden, true);
    assert.equal(dom.dom.window.location.hash, '#automation-panel');
  });

  it('leaves the default selection alone when the URL hash is unknown', () => {
    const document = setup('http://localhost/#missing-panel');
    initialiseNavigation();
    assert.equal(document.getElementById('automation-panel').hidden, false);
    assert.equal(
      document
        .querySelector('[data-panel-target="automation-panel"]')
        .getAttribute('aria-selected'),
      null,
    );
  });
});
