import { api, requestOptions } from './api.js';

const byId = (id) => document.getElementById(id);

function setMessage(message, isError = false) {
  const element = byId('passport-message');
  element.textContent = message;
  element.className = isError
    ? 'govuk-error-message govuk-!-margin-bottom-0'
    : 'govuk-body govuk-!-margin-bottom-0';
}

function renderPassports(passports) {
  const list = byId('passport-list');
  list.replaceChildren();
  if (!passports.length) {
    const item = document.createElement('li');
    item.textContent = 'No passport numbers have been added.';
    list.append(item);
  }
  for (const passport of passports) {
    const item = document.createElement('li');
    item.className = 'govuk-!-margin-bottom-2';
    const label = document.createElement('span');
    label.textContent = passport;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className =
      'govuk-button govuk-button--secondary govuk-!-margin-left-3 govuk-!-margin-bottom-0';
    remove.textContent = 'Delete';
    remove.dataset.passport = passport;
    item.append(label, remove);
    list.append(item);
  }
  byId('passport-count').textContent =
    `${passports.length} passport number${passports.length === 1 ? '' : 's'} in the next batch.`;
}

export async function loadPassports() {
  try {
    const result = await api('/api/passports');
    renderPassports(result.passports);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Could not load passport numbers.', true);
  }
}

export function initialisePassportManagement() {
  byId('passport-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(
        '/api/passports',
        requestOptions('POST', { passportNumber: byId('passport-number').value }),
      );
      byId('passport-number').value = '';
      setMessage(
        result.added
          ? `Passport number added. ${result.total} record${result.total === 1 ? '' : 's'} ready for the next batch.`
          : `That passport number is already in the batch. ${result.total} record${result.total === 1 ? '' : 's'} ready.`,
      );
      await loadPassports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add passport number.', true);
    } finally {
      button.disabled = false;
    }
  });

  byId('passport-list').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-passport]');
    if (!button) return;
    button.disabled = true;
    try {
      const result = await api(
        '/api/passports',
        requestOptions('DELETE', { passportNumber: button.dataset.passport }),
      );
      setMessage(
        result.deleted
          ? `Passport number deleted. ${result.total} record${result.total === 1 ? '' : 's'} remain.`
          : 'The passport number was not found in the batch.',
      );
      await loadPassports();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not delete passport number.',
        true,
      );
      button.disabled = false;
    }
  });
}
