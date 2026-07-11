# Supabase Auth email templates

Branded HTML for Supabase **Authentication → Email Templates**. Paste each file's body into the matching template in the Supabase dashboard (prod and dev projects).

Requires **Custom SMTP** configured in Supabase (see `docs/aws-ses-setup.md`) so mail sends from `Sona <noreply@dearlyvoice.com>`.

**Auth links pointing at localhost?** In Supabase → Authentication → URL Configuration, set **Site URL** to your production domain (not `http://localhost:3000`) and add `/auth/callback` and `/reset-password` to **Redirect URLs**. In Vercel, set `NEXT_PUBLIC_SITE_URL` to the same domain.

**Link goes to GoDaddy?** Your domain DNS is still pointing at GoDaddy, not Vercel. In GoDaddy DNS, point `dearlyvoice.com` at Vercel (see `docs/environments.md` §3). Also confirm Supabase **Site URL** is `https://dearlyvoice.com` and **Redirect URLs** include `https://dearlyvoice.com/auth/callback`.

## confirm-signup.html

**Where:** Supabase → Authentication → Email Templates → **Confirm signup**

**Suggested subject:** `Confirm your Sona account`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}`

**After pasting:** Send a test signup on prod and confirm the link lands on `/auth/callback` and redirects to your voice notes inbox.

## reset-password.html

**Where:** Supabase → Authentication → Email Templates → **Reset password** (sometimes labeled **Recovery**)

**Suggested subject:** `Reset your Sona password`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}`

**After pasting:** Request a password reset on prod and confirm the link lands on `/auth/callback`, then `/reset-password`.

## magic-link.html

**Where:** Supabase → Authentication → Email Templates → **Magic Link**

**Suggested subject:** `Your Sona sign-in link`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}` (OTP fallback for clients that prefer a code over a link)

**After pasting:** Request a magic-link sign-in and confirm the link lands on `/auth/callback` and redirects into the app.

## invite-user.html

**Where:** Supabase → Authentication → Email Templates → **Invite user**

**Suggested subject:** `You've been invited to Sona`

**Variables used:** `{{ .Email }}`, `{{ .ConfirmationURL }}`

**Only relevant if** you invite users from the Supabase dashboard/Admin API instead of self-serve signup.

## change-email-address.html

**Where:** Supabase → Authentication → Email Templates → **Change email address**

**Suggested subject:** `Confirm your new Sona email`

**Variables used:** `{{ .Email }}` (current address), `{{ .NewEmail }}` (address being confirmed), `{{ .ConfirmationURL }}`

**Note:** if **Secure email change** is enabled in Supabase, this same template is sent to *both* the old and new address — the copy below is written to make sense either way.

## reauthentication.html

**Where:** Supabase → Authentication → Email Templates → **Reauthentication**

**Suggested subject:** `{{ .Token }} is your Sona verification code`

**Variables used:** `{{ .Token }}` (6-digit OTP; this flow has no confirmation link)

**When sent:** Supabase triggers this before a sensitive action (e.g. changing a password while already signed in) when reauthentication is required.

## Go template syntax

All `{{ .Variable }}` placeholders use Supabase's Go template syntax — keep them exactly as written when pasting into the dashboard. Not every variable is available in every template; see [Supabase's docs](https://supabase.com/docs/guides/auth/auth-email-templates) if you add more.
