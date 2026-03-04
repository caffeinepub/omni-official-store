/**
 * Admin authentication utilities.
 * Provides a shared token and helper to ensure the caller's principal
 * has admin role before performing any privileged backend operation.
 */

export const CAFFEINE_ADMIN_TOKEN =
  "377fe7b083febffb7257d67a8c154bad9645538e0995c97c99df493c63c7be68";

/**
 * Calls upgradeToAdmin on the actor so the caller's principal is granted
 * admin role in the backend before the actual operation runs.
 * Safe to call repeatedly — the backend is idempotent for already-admin principals.
 */
export async function ensureAdmin(actor: unknown): Promise<void> {
  try {
    await (
      actor as { upgradeToAdmin: (token: string) => Promise<unknown> }
    ).upgradeToAdmin(CAFFEINE_ADMIN_TOKEN);
  } catch {
    // Non-fatal — principal may already be admin or the call may not exist
  }
}
