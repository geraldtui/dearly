/**
 * Dev-only escape hatch: when `DEARLY_SKIP_AUTH=true` AND the app runs in
 * development, the login redirects on protected pages are skipped so every
 * page can be opened without a session. Has no effect in production builds.
 */
export function authGuardDisabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEARLY_SKIP_AUTH === "true";
}
