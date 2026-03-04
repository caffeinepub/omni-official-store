# Omni Official Store

## Current State
Full-stack diamond top-up store with Internet Identity authentication, wallet, orders, leaderboard, admin panel, redeem codes, and UPI/bank payment flow.

## Requested Changes (Diff)

### Add
- Error message shown below login button when `loginStatus === "loginError"` so users can retry.
- Subtitle on Account login screen clarifying Google, passkey, and phone are supported inside Internet Identity.

### Modify
- **Root cause fix**: All pages used `isLoggedIn = loginStatus === "success"`. When a stored identity is loaded on app start, `loginStatus` ends at `"idle"` (not `"success"`), so authenticated users were always shown the "Login Required" screen after returning from Internet Identity. Fixed to `isLoggedIn = !!identity` in: Header, AccountPage, DiamondPage, WalletPage, OrdersPage, AdminPage.
- **mobileLogin.ts**: Was doing a raw `window.location.href` redirect to Internet Identity, bypassing `authClient.login()` entirely, so the delegation handshake never completed and login state was never set. Fixed to simply call `login()` directly — authClient handles popup vs redirect internally.
- Login buttons now disabled during `"initializing"` state (app startup) to prevent premature clicks.
- Login button label changed from "Login" to "Sign In" for clarity.

### Remove
- Raw mobile redirect logic that broke authentication on all mobile browsers.

## Implementation Plan
1. Rewrite `mobileLogin.ts` to call `login()` directly (no raw redirect).
2. Update `isLoggedIn` to `!!identity` in Header, AccountPage, DiamondPage, WalletPage, OrdersPage, AdminPage.
3. Remove unused `loginStatus` destructuring from WalletPage, OrdersPage, DiamondPage.
4. Add `isInitializing` guard to disable login buttons during app startup.
5. Add login error state display in AccountPage and AdminPage.
6. Update login subtitle in AccountPage to mention Google/passkey/phone support.
