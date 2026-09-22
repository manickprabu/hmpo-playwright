const byId = (id) => document.getElementById(id);

const formatTime = (value) =>
  value
    ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
        new Date(value),
      )
    : '—';

const escapeHtml = (value) =>
  String(value).replace(/[&<>'"]/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
    return entities[character];
  });

const setText = (id, value) => {
  byId(id).textContent = String(value);
};

export function renderDashboard(status) {
  const percent = status.total ? Math.round((status.completed / status.total) * 100) : 0;
  setText(
    'state',
    status.state === 'running'
      ? 'Automation in progress'
      : status.state === 'completed'
        ? 'Run completed'
        : status.state === 'failed'
          ? 'Setup needs attention'
          : 'Waiting for a run',
  );
  setText(
    'progress-copy',
    status.total ? `${status.completed} of ${status.total} records processed` : 'No activity yet',
  );
  byId('progress-fill').style.width = `${percent}%`;
  const recordProgress = status.recordProgress || { completed: 0, total: 0 };
  const recordPercent = recordProgress.total
    ? Math.round((recordProgress.completed / recordProgress.total) * 100)
    : 0;
  setText(
    'record-progress-copy',
    recordProgress.total
      ? `Current record progress: ${recordProgress.completed} of ${recordProgress.total} steps (${recordPercent}%).`
      : 'Current record progress: waiting to start.',
  );
  byId('record-progress-fill').style.width = `${recordPercent}%`;
  byId('start-automation').disabled = status.state === 'running';
  byId('download-report').disabled = status.state !== 'completed';
  setText(
    'download-report-hint',
    status.state === 'completed'
      ? 'The ZIP contains screenshots, extracted text, diagnostics and the summary report.'
      : 'The report will be available after processing completes.',
  );
  setText('current-step', status.currentStep || 'Start the automation to see progress here.');
  setText('current-passport', status.currentPassport || '—');
  ['total', 'completed', 'successful', 'failed'].forEach((key) => setText(key, status[key]));
  setText(
    'result-count',
    `${status.results.length} record${status.results.length === 1 ? '' : 's'}`,
  );
  byId('events').innerHTML = status.events.length
    ? status.events
        .map(
          (event) =>
            `<li class="dashboard-events__item"><time class="dashboard-events__time">${formatTime(event.timestamp)}</time>${escapeHtml(event.message)}</li>`,
        )
        .join('')
    : '<li class="dashboard-events__item">No activity has been recorded.</li>';
  byId('results').innerHTML = status.results.length
    ? status.results
        .map(
          (result) =>
            `<tr class="govuk-table__row"><td class="govuk-table__cell">${escapeHtml(result.passport)}</td><td class="govuk-table__cell"><span class="dashboard-status ${result.success ? '' : 'dashboard-status--error'}">${result.success ? 'Complete' : 'Review'}</span></td><td class="govuk-table__cell">${formatTime(result.completedAt)}</td></tr>`,
        )
        .join('')
    : '<tr class="govuk-table__row"><td class="govuk-table__cell" colspan="3">Results will appear as records finish.</td></tr>';
}
