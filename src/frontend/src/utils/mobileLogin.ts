/**
 * Mobile login helper.
 *
 * Internet Identity's authClient handles popup vs redirect automatically.
 * We simply call the provided login() function in all cases.
 * The authClient is configured to use redirect mode when a popup cannot be opened
 * (e.g. on mobile browsers) via windowOpenerFeatures fallback.
 */
export function handleLogin(login: () => void): void {
  login();
}
