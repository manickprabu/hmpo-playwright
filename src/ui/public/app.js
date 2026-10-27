import { initialiseAutomationControls, loadConfiguration } from './automation-controls.js';
import { api } from './api.js';
import { renderDashboard } from './dashboard.js';
import { initialisePassportManagement, loadPassports } from './passport-management.js';
import { initialiseNavigation } from './navigation.js';
import { initialiseReportDownload } from './report-download.js';
import { initialiseProtectedMessageEditors } from './protected-message-editor.js';
import { initialiseInlineProtectedMessageEditors } from './inline-protected-message-editor.js';

async function refreshDashboard() {
  try {
    renderDashboard(await api('/api/status'));
  } catch {
    document.getElementById('state').textContent = 'Dashboard temporarily unavailable';
  }
}

initialiseAutomationControls();
initialisePassportManagement();
initialiseNavigation();
initialiseReportDownload();
initialiseProtectedMessageEditors();
initialiseInlineProtectedMessageEditors();
document.querySelectorAll('[data-message-editor-form]').forEach((form) => {
  form.addEventListener('submit', () => {
    console.log(`[${form.dataset.editorKind} message editor] submitted message:`, form.elements.message.value);
  });
});
refreshDashboard();
loadConfiguration();
loadPassports();
setInterval(refreshDashboard, 1500);
