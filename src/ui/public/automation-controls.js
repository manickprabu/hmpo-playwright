import { api, requestOptions } from './api.js';

const byId = (id) => document.getElementById(id);

function setMessage(message, isError = false) {
  const element = byId('control-message');
  element.textContent = message;
  element.className = isError
    ? 'govuk-error-message govuk-!-margin-bottom-0'
    : 'govuk-body govuk-!-margin-bottom-0';
}

export async function loadConfiguration() {
  try {
    const configuration = await api('/api/config');
    byId('target-url').value = configuration.targetUrl || '';
  } catch {
    setMessage('Could not load the current target URL.', true);
  }
}

export function initialiseAutomationControls() {
  byId('target-url-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(
        '/api/config/target-url',
        requestOptions('POST', { targetUrl: byId('target-url').value.trim() }),
      );
      byId('target-url').value = result.targetUrl;
      setMessage('Target website URL saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the target URL.', true);
    } finally {
      button.disabled = false;
    }
  });

  byId('start-automation').addEventListener('click', async () => {
    try {
      const result = await api('/api/automation/start', requestOptions('POST', {}));
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start automation.', true);
    }
  });
}
