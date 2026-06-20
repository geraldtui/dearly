# Supabase Auth email templates

Branded HTML for Supabase **Authentication → Email Templates**. Paste each file’s body into the matching template in the Supabase dashboard (prod and dev projects).

Requires **Custom SMTP** configured in Supabase (see `docs/aws-ses-setup.md`) so mail sends from `Dearly <noreply@dearlyvoice.com>`.

## confirm-signup.html

**Where:** Supabase → Authentication → Email Templates → **Confirm signup**

**Suggested subject:** `Confirm your Dearly account`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}` (Supabase Go template syntax — keep these exactly as written)

**After pasting:** Send a test signup on prod and confirm the link lands on `/auth/callback` and redirects to your voice notes inbox.

**Auth links pointing at localhost?** In Supabase → Authentication → URL Configuration, set **Site URL** to your production domain (not `http://localhost:3000`) and add `/auth/callback` and `/reset-password` to **Redirect URLs**. In Vercel, set `NEXT_PUBLIC_SITE_URL` to the same domain.

## reset-password.html

**Where:** Supabase → Authentication → Email Templates → **Reset password** (sometimes labeled **Recovery**)

**Suggested subject:** `Reset your Dearly password`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}` (Supabase Go template syntax — keep these exactly as written)

**After pasting:** Request a password reset on prod and confirm the link lands on `/auth/callback`, then `/reset-password`.

**Link goes to GoDaddy?** Your domain DNS is still pointing at GoDaddy, not Vercel. In GoDaddy DNS, point `dearlyvoice.com` at Vercel (see `docs/environments.md` §3). Also confirm Supabase **Site URL** is `https://dearlyvoice.com` and **Redirect URLs** include `https://dearlyvoice.com/auth/callback`.
