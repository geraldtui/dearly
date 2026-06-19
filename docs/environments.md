# Environments: Production vs Development

Dearly runs as **two isolated environments**, each with its own domain, git branch,
and Supabase database. Nothing in the code hard-codes an environment — separation is
achieved entirely through **per-environment configuration** (Vercel env vars + a
separate Supabase project each). The app reads Supabase config from env vars
(`src/lib/supabase/*`) and derives all URLs from the request origin, so the same
build works on either domain without code changes.

| | Production | Development |
| --- | --- | --- |
| Domain | `dearlyvoice.com` | `dev.dearlyvoice.com` |
| Git branch | `main` | `develop` |
| Vercel environment | Production | Development (custom env) / Preview |
| Supabase project | `dearly-prod` | `dearly-dev` |

> **Golden rule:** the Development environment must **never** point at the production
> Supabase project (and vice-versa). Keys are set independently per Vercel
> environment scope.

---

## 1. Supabase — one project per environment

Create **two** Supabase projects, e.g. `dearly-prod` and `dearly-dev`.

For **each** project:

1. **Apply migrations** (SQL editor, or `supabase db push`), in order:
   - `supabase/migrations/0001_accounts.sql` — profiles, voice_notes, RLS,
     profile trigger, **and the private `voice-notes` storage bucket**.
   - `supabase/migrations/0002_sent_copies.sql` — makes `recipient_id` nullable.
2. **Auth → URL Configuration** (required — signup confirmation uses an
   origin-based redirect that Supabase validates against an allowlist):
   - `dearly-prod`: **Site URL** `https://dearlyvoice.com`; **Redirect URLs**
     `https://dearlyvoice.com/auth/callback` (add `https://www.dearlyvoice.com/auth/callback` if you serve `www`).
   - `dearly-dev`: **Site URL** `https://dev.dearlyvoice.com`; **Redirect URLs**
     `https://dev.dearlyvoice.com/auth/callback` (add `http://localhost:3000/auth/callback` for local dev against the dev DB).
3. **Copy the keys** (Project Settings → API): Project URL, anon/publishable key,
   and service-role key. You'll paste these into the matching Vercel scope below.

---

## 2. Vercel — branch + domain + env-var mapping

In the Vercel project (Settings):

1. **Git → Production Branch = `main`.** This makes Production build only from
   `main`; all other branches build as non-production deployments.
2. **Development environment for `develop`.** Two supported options:
   - **Recommended — Custom Environment:** Settings → Environments → create one
     named `development`, set its **branch tracking to `develop`**, and give it its
     own env vars (the `dearly-dev` keys). Custom environments get a stable URL and
     can hold a domain.
   - **Alternative — Preview scoped to `develop`:** keep the default Preview
     environment and set the dev env vars scoped to the `develop` branch.
3. **Domains** (Settings → Domains):
   - Add `dearlyvoice.com` → assign to **Production**.
   - Add `dev.dearlyvoice.com` → assign to the **`development` environment / `develop` branch**.
4. **Environment Variables** (Settings → Environment Variables) — set the **same
   names** with **different values** per scope:

   | Variable | Production scope | Development scope |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | dev project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key | dev anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | prod service-role key | dev service-role key |
   | `SES_SMTP_HOST` | region endpoint | region endpoint |
   | `SES_SMTP_PORT` | `587` | `587` |
   | `SES_SMTP_USER` | prod SMTP user | prod or test SMTP user |
   | `SES_SMTP_PASSWORD` | prod SMTP password | prod or test SMTP password |
   | `DEARLY_FROM_EMAIL` | verified sender | verified sender |
   | `WAITLIST_NOTIFY_EMAIL` | prod inbox | dev inbox |

   Leave `DEARLY_SKIP_AUTH` unset/`false` in both — it is only honored when
   `NODE_ENV=development` (i.e. `npm run dev`) and has no effect on Vercel builds.

> **Heads-up on Preview scope:** Vercel's built-in **Preview** env vars apply to
> *all* non-production branches. If you use the Preview option (not a custom
> environment), every feature-branch preview will use the **dev** Supabase project.
> That's usually fine; use a Custom Environment if you need stricter isolation.

---

## 3. DNS (at your registrar)

Point both hostnames at Vercel using the exact records Vercel shows under
Settings → Domains:

- `dearlyvoice.com` — apex record(s) per Vercel (A/ALIAS or the recommended setup).
- `dev.dearlyvoice.com` — `CNAME` → `cname.vercel-dns.com`.

---

## 4. Deploy flow

- Merge work into **`develop`** → deploys to **`dev.dearlyvoice.com`** (dev DB).
- When verified, merge **`develop` → `main`** → deploys to **`dearlyvoice.com`**
  (prod DB).

> `main` may lag behind `develop`; Production only reflects what's merged to `main`.

---

## 5. Verify the separation

1. Open `https://dev.dearlyvoice.com` and `https://dearlyvoice.com`; each loads.
2. Sign up a test account on **dev** → it lands in `dearly-dev` (and **not** in
   `dearly-prod`). Confirm the account does not appear in the prod project.
3. Send a voice note on dev → the row/object live in `dearly-dev` storage only.
4. Confirm signup confirmation emails link back to the **same** domain you signed
   up on (origin-based redirect) and that Supabase accepted the redirect URL.
