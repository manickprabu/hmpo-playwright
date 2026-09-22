export function initialiseReportDownload() {
  document.getElementById('download-report').addEventListener('click', () => {
    window.location.assign('/api/reports/download');
  });
}
