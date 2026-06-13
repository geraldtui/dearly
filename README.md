# Dearly

> Voice logs for the ones you love.

Record a short voice note in the browser and send it, with love, to a dear one over email. Built from the [Claude Design](https://claude.ai/design) handoff, recreated pixel-for-pixel in **Next.js** (App Router + TypeScript).

## How it works

- **Client side**: the entire UI — the form, the live-waveform voice recorder, the waitlist modal, and the success screen — runs in the browser as a React client component.
- **Server side (tiny)**: two Next.js Route Handlers hold the secret Resend API key and do the actual sending:
  - `POST /api/send` — emails the voice note to the recipient, **BCCs the sender**, and attaches the recorded audio.
  - `POST /api/waitlist` — emails you when someone joins the waitlist (from either the success-screen card or the roadmap modal).

### Email behaviour

- Sent **to** the recipient's email.
- The sender is added as **BCC** on every recipient email (as requested), so they always get a copy.
- `Reply-To` is set to the sender, so replies go to the right place.
- The browser audio `Blob` is transcoded to **MP3 in the browser** (via `@breezystack/lamejs`) and attached to the recipient email. MP3 is used so that major mail clients render an **inline play button** on the attachment — **Gmail** (web/mobile) and **Apple Mail** let the recipient listen without downloading the file. If transcoding fails, it falls back to attaching the original WebM/Ogg recording.
- Note: email clients strip `<audio>` tags from the message body for security, so a player can't be embedded in the body itself — the inline play button comes from the MP3 *attachment*. Outlook desktop doesn't preview audio attachments; for guaranteed in-browser playback everywhere you'd need to host the file and link to it.
- If the visitor's mic is unavailable, the recorder falls back to a demo waveform and the email is sent without an attachment.

## A note on hosting (please read)

**Resend needs a secret API key.** That key can never live in client-side code — anyone could read it from the browser and abuse your account. So the Resend calls live in server-side Route Handlers (`/api/send`, `/api/waitlist`), which run on the **Node.js runtime**. The UI is still 100% client-rendered; only the email send touches a server. This is why the app needs a Node host, not a static-only host like GitHub Pages.

**Recommended deploy:** [Vercel](https://vercel.com) — zero-config for Next.js. Any Node host works too (Render, Fly.io, a container, etc.). See the steps below.

## Deploying to Vercel

1. **Push** this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **New Project → Import** the repo. Vercel auto-detects Next.js — no build settings to change.
3. **Add environment variables** (Project → Settings → Environment Variables) for Production (and Preview), matching [`.env.example`](.env.example):
   - `RESEND_API_KEY`
   - `DEARLY_FROM_EMAIL` (must be a domain/address verified in Resend)
   - `WAITLIST_NOTIFY_EMAIL`
4. **Deploy.** Vercel builds and gives you a `*.vercel.app` URL.
5. **Add your domain:** Project → Settings → Domains → add `dearlyvoice.com` (and/or `www`), then point the DNS records Vercel shows at your registrar.

Notes:
- Node version is pinned via `.nvmrc` / `engines` (Node 20).
- Secrets are never committed — `.env*` is gitignored; only `.env.example` (placeholders) is tracked.
- Migrating to Amazon SES later? See [`docs/aws-ses-setup.md`](docs/aws-ses-setup.md).

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | Your Resend API key ([create one](https://resend.com/api-keys)). |
| `DEARLY_FROM_EMAIL` | recommended | Verified sender, e.g. `Dearly <noreply@yourdomain.com>`. Defaults to Resend's `onboarding@resend.dev` for quick tests. |
| `WAITLIST_NOTIFY_EMAIL` | for waitlist | Inbox that receives waitlist signups. If unset, signups still succeed in the UI but are only logged server-side. |
| `NEXT_PUBLIC_SUPABASE_URL` | for accounts | Supabase project URL (Dearly accounts: auth, DB, audio storage). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for accounts | Supabase anon (publishable) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | for accounts | Supabase service-role key. **Server-only — never expose to the client.** |

> **Dearly accounts**: apply `supabase/migrations/0001_accounts.sql` to your Supabase project (SQL editor or `supabase db push`) before using signup/login, `/compose`, or `/inbox`. Architecture: `docs/dearly-accounts-architecture.md`.

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
      send/route.ts         # Resend: voice note → recipient (BCC sender)
      waitlist/route.ts     # Resend: waitlist signup → your inbox
  components/
    VoiceRecorder.tsx       # MediaRecorder + Web Audio waveform (+ demo fallback)
    Waitlist.tsx            # roadmap modal
    icons.tsx               # shared inline SVG icons + feature list
  lib/
    email.ts                # Resend client + branded email templates
    api.ts                  # client fetch helpers
    audio.ts                # client-side WebM/Ogg → MP3 transcoding
    validation.ts           # shared email validation
  types.ts
```

## Design fidelity

The visual layer is a faithful recreation of the handoff prototype (`Dearly.html`, `app.jsx`, `recorder.jsx`): same fonts (Cormorant Garamond / Playfair / Dancing Script / Mulish), same palette, radii, shadows, animations, and component structure. The original prototype simulated the send with a `setTimeout`; here that's replaced with a real Resend call while keeping the identical sending → success transition. (The prototype also shipped a live "Tweaks" theming panel — that was a prototyping-only tool and has been removed.)
