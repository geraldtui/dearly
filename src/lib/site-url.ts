/**
 * Canonical public site origin for auth email links (signup confirm, password reset).
 * Set NEXT_PUBLIC_SITE_URL per Vercel environment so links stay on dearlyvoice.com
 * even when developing locally against a remote Supabase project.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
