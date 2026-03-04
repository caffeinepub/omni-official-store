/**
 * Mobile login helper.
 *
 * On desktop browsers, Internet Identity uses a popup window (controlled by
 * the @dfinity/auth-client). Mobile browsers (Safari on iOS, Chrome on Android)
 * block popups triggered by asynchronous code, so the popup never opens and the
 * login silently fails.
 *
 * This helper detects mobile and redirects to Internet Identity in the same tab
 * instead, which always works. On desktop the normal hook `login()` is called.
 */
export function handleLogin(login: () => void): void {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Redirect the current tab to Internet Identity with the current page as
    // the redirect_uri so the user comes back after authentication.
    const iiUrl =
      (import.meta.env.VITE_II_URL as string | undefined) ||
      "https://identity.ic0.app";
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${iiUrl}?redirect_uri=${redirectUri}`;
  } else {
    login();
  }
}
