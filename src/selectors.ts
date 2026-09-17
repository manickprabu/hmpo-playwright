/**
 * Central home for site-specific selectors. Replace every TODO selector after
 * inspecting the target site's HTML; do not distribute selectors through services.
 */
export const selectors = {
  passportInput: '[data-testid="passport-number"]', // TODO: replace
  loginButton: '[data-testid="submit-passport"]', // TODO: replace
  loginSuccessIndicator: '[data-testid="application-shell"]', // TODO: replace
  logoutButton: '[data-testid="logout"]', // TODO: replace
  loadingSpinner: '[data-testid="loading-spinner"]', // TODO: replace or set undefined
  errorMessage: '[role="alert"]', // TODO: replace with login error container
};
