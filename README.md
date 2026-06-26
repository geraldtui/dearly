# Dearly

> Voice logs for the ones you love.

Record a short voice note in the browser and send it, with love, to a dear one over email. Built from the [Claude Design](https://claude.ai/design) handoff, recreated pixel-for-pixel in **Next.js** (App Router + TypeScript).

## How it works

- **Client side**: the entire UI — the form, the live-waveform voice recorder, the waitlist modal, and the success screen — runs in the browser as a React client component.
- **Server side (tiny)**: two Next.js Route Handlers hold the secret Amazon SES SMTP credentials and do the actual sending:
  - `POST /api/send` — emails the voice note to the recipient and attaches the recorded audio (sender is not copied).
  - `POST /api/waitlist` — emails you when someone joins the waitlist (from either the success-screen card or the roadmap modal).

### Email behaviour

- Sent **to** the recipient's email.
- The sender is **not** copied on recipient emails; logged-in senders keep a copy in Dearly (see spec 08).
- `Reply-To` is set to the sender, so replies go to the right place.
- The browser audio `Blob` is transcoded to **MP3 in the browser** (via `@breezystack/lamejs`) and attached to the recipient email. MP3 is used so that major mail clients render an **inline play button** on the attachment — **Gmail** (web/mobile) and **Apple Mail** let the recipient listen without downloading the file. If transcoding fails, it falls back to attaching the original WebM/Ogg recording.
- Note: email clients strip `<audio>` tags from the message body for security, so a player can't be embedded in the body itself — the inline play button comes from the MP3 *attachment*. Outlook desktop doesn't preview audio attachments; for guaranteed in-browser playback everywhere you'd need to host the file and link to it.
- If the visitor's mic is unavailable, the recorder falls back to a demo waveform and the email is sent without an attachment.

## A note on hosting (please read)

**SES needs secret SMTP credentials.** They can never live in client-side code — anyone could read them from the browser and abuse your account. So the email sending (via Nodemailer over SES SMTP) lives in server-side Route Handlers (`/api/send`, `/api/waitlist`), which run on the **Node.js runtime**. The UI is still 100% client-rendered; only the email send touches a server. This is why the app needs a Node host, not a static-only host like GitHub Pages.

**Recommended deploy:** [Vercel](https://vercel.com) — zero-config for Next.js. Any Node host works too (Render, Fly.io, a container, etc.). See the steps below.

## Deploying to Vercel

Dearly runs as **two isolated environments**, each with its own domain, branch, and
Supabase database. See the full runbook in [`docs/environments.md`](docs/environments.md).

| | Production | Development |
| --- | --- | --- |
| Domain | `dearlyvoice.com` | `dev.dearlyvoice.com` |
| Branch | `main` | `develop` |
| Supabase project | `dearly-prod` | `dearly-dev` |

Quick setup:

1. **Push** this repo to GitHub and **Import** it in Vercel (auto-detects Next.js).
2. **Set the Production Branch to `main`** (Settings → Git), and add a `development`
   environment (or Preview) tracking `develop`.
3. **Create two Supabase projects** (`dearly-prod`, `dearly-dev`); apply
   `supabase/migrations/*` to each and set each project's Auth Site/Redirect URLs to
   its own domain. (Details in the runbook.)
4. **Add environment variables** (Settings → Environment Variables) with the **same
   names, different values per scope** — Production → prod keys, Development → dev keys:
   - `SES_SMTP_HOST`, `SES_SMTP_PORT`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD`, `DEARLY_FROM_EMAIL`, `WAITLIST_NOTIFY_EMAIL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. **Add domains** (Settings → Domains): `dearlyvoice.com` → Production;
   `dev.dearlyvoice.com` → the develop/Development environment. Point DNS at Vercel.

Notes:
- The app reads Supabase from env vars and derives all URLs from the request origin, so the same build works on either domain — separation lives entirely in per-environment config.
- Node version is pinned via `.nvmrc` / `engines` (Node 20).
- Secrets are never committed — `.env*` is gitignored; only `.env.example` (placeholders) is tracked.
- Email is sent via Amazon SES (Nodemailer over SES SMTP). Setup: [`docs/aws-ses-setup.md`](docs/aws-ses-setup.md).

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
| --- | --- | --- |
| `SES_SMTP_HOST` | yes | SES SMTP endpoint for your region, e.g. `email-smtp.us-east-1.amazonaws.com`. |
| `SES_SMTP_PORT` | no | SMTP port. Defaults to `587` (STARTTLS); use `465` for implicit TLS. |
| `SES_SMTP_USER` | yes | SES SMTP username (Console → SES → SMTP settings → Create SMTP credentials). |
| `SES_SMTP_PASSWORD` | yes | SES SMTP password (shown once at creation). **Server-only.** |
| `DEARLY_FROM_EMAIL` | recommended | Sender on a domain verified in SES, e.g. `Dearly <noreply@dearlyvoice.com>`. |
| `WAITLIST_NOTIFY_EMAIL` | for waitlist | Inbox that receives waitlist signups. If unset, signups still succeed in the UI but are only logged server-side. |
| `NEXT_PUBLIC_SUPABASE_URL` | for accounts | Supabase project URL (Dearly accounts: auth, DB, audio storage). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for accounts | Supabase anon (publishable) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | for accounts | Supabase service-role key. **Server-only — never expose to the client.** |

> **Dearly accounts**: apply the `supabase/migrations/*.sql` files in order (`0001_accounts.sql`, then `0002_sent_copies.sql`) to each Supabase project (SQL editor or `supabase db push`) before using signup/login, `/compose`, or `/inbox`. Architecture: `docs/dearly-accounts-architecture.md`. Per-environment setup (prod vs dev DB): `docs/environments.md`.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your Resend key
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run start       # run the production build
npm run lint        # eslint
npm test            # run the Vitest unit/component suite once
npm run test:watch  # run unit tests in watch mode
npm run test:e2e    # run the Playwright browser tests
```

## Testing

**Unit / component (Vitest + React Testing Library)** cover the highest-risk
code: the `/api/send` and `/api/notes` route handlers (validation, hybrid
in-app/email delivery, rollback paths), shared utilities (`sanitizeSubject`,
`emailOk`, `snakeCaseName`, email templates), and key client components
(`SignupPopover`, `Notepad`, `ComposeForm`). Resend and Supabase are mocked at
the module boundary, so tests need no network access or real keys.

**End-to-end (Playwright)** cover the browser-only chain the unit suites can't:
the MP3 transcoder running in a real browser, plus the homepage record → send
happy path (with a fake microphone) and the empty-form validation guard.
`/api/send` is intercepted in the browser, so these tests also need no backend.

```bash
# One-time local setup (uses the public npm registry; see note below):
npx playwright install chromium
npm run test:e2e
```

> The corporate Artifactory mirror forbids the Playwright packages, so they
> were installed with `--registry https://registry.npmjs.org/`. CI runners are
> not behind that firewall and install normally.

**CI**: `.github/workflows/ci.yml` runs lint, type-check, and the Vitest suite
on every PR and on pushes to `develop`/`main`. `.github/workflows/e2e.yml` runs
Playwright on pushes to `develop`/`main` and on manual dispatch — deliberately
not on every PR, so E2E timing never blocks merges.

## Project structure

```
src/
  app/
    layout.tsx              # fonts + root html
    globals.css             # full design system ported from the handoff
    page.tsx                # main Dearly app (form, success, waitlist wiring)
    api/
      send/route.ts         # SES: voice note → recipient (no sender BCC)
      waitlist/route.ts     # SES: waitlist signup → your inbox
  components/
    VoiceRecorder.tsx       # MediaRecorder + Web Audio waveform (+ demo fallback)
    Waitlist.tsx            # roadmap modal
    icons.tsx               # shared inline SVG icons + feature list
  lib/
    email.ts                # SES SMTP transport (Nodemailer) + branded email templates
    api.ts                  # client fetch helpers
    audio.ts                # client-side WebM/Ogg → MP3 transcoding
    validation.ts           # shared email validation
  types.ts
```

## Design fidelity

The visual layer is a faithful recreation of the handoff prototype (`Dearly.html`, `app.jsx`, `recorder.jsx`): same fonts (Cormorant Garamond / Playfair / Dancing Script / Mulish), same palette, radii, shadows, animations, and component structure. The original prototype simulated the send with a `setTimeout`; here that's replaced with a real Amazon SES send while keeping the identical sending → success transition. (The prototype also shipped a live "Tweaks" theming panel — that was a prototyping-only tool and has been removed.)
