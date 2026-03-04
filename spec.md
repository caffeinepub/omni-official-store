# Omni Official Store

## Current State
Full-stack diamond top-up store with admin panel, wallet, redeem codes, payment management, and site customization. The app uses Internet Identity for authentication and the Caffeine authorization system for role-based access control.

The root bug: `access-control.mo`'s `initialize` function only grants admin to the FIRST caller who provides the correct token (`adminAssigned` guard). On any subsequent session (new login, new device, or after a backend upgrade that resets state), the caller is registered as a regular `#user` even when they provide the correct admin token. This is why all admin actions return "Unauthorized: Only admins can...".

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `access-control.mo` `initialize` function: Remove the `not state.adminAssigned` guard. Any caller who provides the correct admin token must ALWAYS be granted admin role, on every call, on every login. If the token is wrong or empty, register as user (but preserve existing admin role for already-admin callers).

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend Motoko with the fixed `initialize` function logic: token correct → always set #admin; token wrong/empty → set #user (unless already #admin, in which case keep existing role).
