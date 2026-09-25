/**
 * Central home for site-specific selectors. Replace every TODO selector after
 * inspecting the target site's HTML; do not distribute selectors through services.
 */
export const selectors = {
  passportInput: '#passportNumber',
  loginButton: '#search-submit-button',
  loginSuccessIndicator: 'body',
  logoutButton: 'button:has-text("Logout")',
  loadingSpinner: 'text=Loading',
  errorMessage: '[role="alert"], .error-message, .alert-danger',
};
