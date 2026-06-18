# AWS SES Setup — Dearly

> **Status: active.** Dearly sends all email through **Amazon SES** via
> Nodemailer over SES SMTP (`src/lib/email.ts`). This guide covers the SES/DNS
> setup; the app just needs the `SES_SMTP_*` env vars from §5.

Step-by-step guide to set up Amazon SES so Dearly can send email from
`dearlyvoice.com`. Follow these in order. The two slow parts — DNS propagation
and **production-access approval** — are flagged so you can start them early.

The app sends via **SMTP** (Nodemailer over SES SMTP), so the end goal is a set
of SMTP credentials plus a verified sending domain.

---

## 0. Prerequisites

- An AWS account with permission to use SES and IAM.
- Access to DNS for `dearlyvoice.com` (your domain registrar or DNS host).
- Decide on **one region** and stick with it. SMTP credentials and the SMTP
  host are **region-specific and not portable**.
  - Recommended: **`us-east-1`** (most features, what every guide assumes).
  - Use `us-west-2` only if you'll host the app on the US West coast.

> Throughout this guide, replace `us-east-1` if you chose a different region.

---

## 1. Verify the sending domain (Easy DKIM)

1. Open the **SES Console** and confirm the region (top-right) is `us-east-1`.
2. Go to **Configuration → Identities → Create identity**.
3. Choose **Domain**, enter `dearlyvoice.com`.
4. Enable **Easy DKIM** with **RSA 2048-bit**.
5. (Optional but recommended) Leave **"Use a custom MAIL FROM domain"** for
   step 3 below — you can add it now or after verification.
6. Click **Create identity**. SES shows DNS records to add.

### Add the DNS records

SES gives you **3 CNAME records** for DKIM. Add all three at your DNS host for
`dearlyvoice.com` exactly as shown (they look like
`xxxx._domainkey.dearlyvoice.com → xxxx.dkim.amazonses.com`).

- If your DNS host auto-appends the domain, enter only the host part
  (`xxxx._domainkey`) to avoid doubling the domain.
- Verification usually completes within minutes but can take a few hours.

**Done when:** the identity status shows **Verified** and **DKIM: Successful**.

Verifying the *domain* (not a single address) lets you send from any address
`@dearlyvoice.com` and its subdomains — e.g. `noreply@dearlyvoice.com`.

---

## 2. Request production access (exit the sandbox) — START EARLY

By default SES is in the **sandbox**: you can only send **to verified
addresses**, and rates are throttled. Dearly emails arbitrary recipients, so
you **must** leave the sandbox.

1. SES Console → **Account dashboard**.
2. Click **Request production access**.
3. Fill the form:
   - **Mail type:** Transactional.
   - **Website URL:** `https://dearlyvoice.com`.
   - **Use case description:** e.g. "Dearly lets a user record a short voice
     note in the browser and email it to a recipient the user specifies. Emails
     are transactional (one note per user action), sent to recipients whose
     addresses the sender entered. We also email ourselves on waitlist signups.
     We honor bounces/complaints and only send user-initiated mail."
   - Confirm you handle **bounces and complaints** and only send to people who
     expect it.
4. Submit. AWS typically reviews within **~24 hours**.

> While in the sandbox you can still test by verifying your own recipient
> address as a second identity (same steps as §1 but choose **Email address**).

---

## 3. (Recommended) Custom MAIL FROM + DMARC for deliverability

These improve inbox placement and protect the domain. Optional but worth it.

### Custom MAIL FROM
1. On the `dearlyvoice.com` identity → **MAIL FROM domain** → set a subdomain,
   e.g. `mail.dearlyvoice.com`.
2. Add the records SES shows: an **MX** record and a **TXT (SPF)** record for
   `mail.dearlyvoice.com`.

### DMARC
Add a TXT record at `_dmarc.dearlyvoice.com`. A safe starting policy:

```
_dmarc.dearlyvoice.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@dearlyvoice.com"
```

Start with `p=none` (monitor only), then tighten to `quarantine`/`reject` later.

---

## 4. Create SMTP credentials

1. SES Console → **SMTP settings**.
2. Note the **SMTP endpoint** for your region, e.g.
   `email-smtp.us-east-1.amazonaws.com`.
3. Click **Create SMTP credentials**. This creates an IAM user with
   `ses:SendRawEmail` and generates an **SMTP username + password**.
4. **Download / copy them now** — the password is shown only once.

> SES SMTP credentials are NOT your AWS access key/secret. They are a separate
> username/password pair specifically for SMTP sending.

---

## 5. Configure the app

Add these to `.env.local` (local dev) and to your hosting provider's
environment variables (production). Remove the old `RESEND_API_KEY`.

```bash
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USER=<your SES SMTP username>
SES_SMTP_PASSWORD=<your SES SMTP password>

DEARLY_FROM_EMAIL="Dearly <noreply@dearlyvoice.com>"
WAITLIST_NOTIFY_EMAIL=<the inbox that should receive waitlist signups>
```

Notes:
- `DEARLY_FROM_EMAIL` must be an address on the **verified** domain.
- Port `587` uses STARTTLS (default). Use `465` for implicit TLS if needed.

---

## 6. Test

1. Run the app locally: `npm install` then `npm run dev`.
2. Send a voice note to an address you control.
   - **In sandbox:** the recipient address must be verified first (see §2 note).
   - **In production:** any recipient works.
3. Confirm:
   - The recipient receives the email with the **MP3 attachment** (inline play
     button in Gmail/Apple Mail).
   - The **sender is BCC'd** (gets their own copy).
   - A waitlist signup emails `WAITLIST_NOTIFY_EMAIL`.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `554 Message rejected: Email address is not verified` | Still in the **sandbox** — verify the recipient address, or finish production-access request (§2). |
| `535 Authentication Credentials Invalid` | Wrong SMTP user/password, or creds are from a **different region** than `SES_SMTP_HOST`. Recreate in the correct region. |
| Domain stuck "Pending" | DNS records missing/typo'd, or host doubled the domain. Re-check the 3 DKIM CNAMEs. |
| Emails land in spam | Add custom MAIL FROM + SPF + DMARC (§3); warm up sending volume gradually. |
| `Connection timeout` to SMTP host | Host/port blocked by network or firewall; confirm `email-smtp.<region>.amazonaws.com:587` is reachable. |

---

## Quick checklist

- [ ] Region chosen (`us-east-1`) and used consistently
- [ ] `dearlyvoice.com` domain identity created with Easy DKIM
- [ ] 3 DKIM CNAME records added → status **Verified**
- [ ] Production access requested and approved
- [ ] (Optional) Custom MAIL FROM + SPF + DMARC added
- [ ] SMTP credentials created and saved
- [ ] `.env` / host env vars filled in, `RESEND_API_KEY` removed
- [ ] Test send succeeds (attachment + BCC + waitlist)
