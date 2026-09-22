import { initialiseAutomationControls, loadConfiguration } from './automation-controls.js';
import { api } from './api.js';
import { renderDashboard } from './dashboard.js';
import { initialisePassportManagement, loadPassports } from './passport-management.js';
import { initialiseNavigation } from './navigation.js';
import { initialiseReportDownload } from './report-download.js';

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
refreshDashboard();
loadConfiguration();
loadPassports();
setInterval(refreshDashboard, 1500);
