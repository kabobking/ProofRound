# Proofround Stripe investor reports

This app lets a business connect its existing Stripe Standard account with read-only scope, generate a PDF investor report, store it privately in GCS, and share a revocable public link (`/r/[reportId]?t=token`).

## Setup
- Install deps: `npm install` (new runtime deps: stripe, pdfkit, @google-cloud/storage, prisma/@prisma/client).
- Environment (examples in `.env.local`):
  - `DATABASE_URL` (Postgres)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
  - `STRIPE_SECRET_KEY` (platform key), `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_REDIRECT_URI` (e.g. `https://yourapp.com/api/stripe/connect/callback`)
  - `TOKEN_ENCRYPTION_KEY` (32+ byte key, raw or base64, for AES-256-GCM)
  - `GCS_BUCKET`, `GCS_PROJECT_ID`, `GCS_SERVICE_ACCOUNT_KEY` (JSON or base64-encoded JSON for a service account with `storage.objects.create/get`)
- Prisma schema lives in `prisma/schema.prisma` (User + Report). Run `npx prisma migrate dev --name init_reports && npx prisma generate` after setting `DATABASE_URL`.
- Stripe dashboard: create a Connect platform for Standard accounts, set the redirect URI above, and ensure the app requests `scope=read_only`. (Optional but recommended) add a webhook endpoint for `account.application.deauthorized` to clear tokens if a user disconnects.
- GCS: create a private bucket for reports, grant the service account access, and set the env vars above.

## API surface
- `GET /api/stripe/connect` → validates session, sets a CSRF state cookie, and redirects to `https://connect.stripe.com/oauth/authorize` with `scope=read_only`.
- `GET /api/stripe/connect/callback` → validates state per-user/session, exchanges the code via `stripe.oauth.token`, encrypts and stores access/refresh tokens, and redirects to `/dashboard?connected=1`.
- `POST /api/reports` → requires login + connected Stripe; computes metrics, generates a PDF, uploads to GCS, stores the Report row (with only a SHA-256 hash of the share token), and returns the share URL `/r/[id]?t=token`.
- `POST /api/reports/[reportId]/revoke` → rotates the share token hash and returns a new share URL.
- Public: `/r/[reportId]?t=token` → validates the hashed token, signs a short-lived GCS URL, and renders an iframe/download for the PDF (no login required).

## Stripe metrics calls used
- `stripe.oauth.token` for Connect OAuth.
- `stripe.balanceTransactions.list` for gross/net volume, fees, refunds, disputes, payouts (preferred source of truth).
- `stripe.invoices.list` (paid, in window) for invoice count.
- `stripe.subscriptions.list` (active) for subscription count if relevant.

## PDF + storage notes
- PDFs are built server-side with `pdfkit` (no headless browser needed). Keep these routes on the Node.js runtime, not Edge.
- If you prefer HTML-to-PDF via Playwright/Chromium, ensure the binary is available in your hosting environment and keep the route on the Node runtime; swap out `lib/pdf.ts` accordingly.
- PDFs are uploaded privately to GCS; investor links receive only a short-lived signed URL or stream, never raw tokens.

## Security highlights
- Stripe access/refresh tokens are encrypted at rest with AES-256-GCM using `TOKEN_ENCRYPTION_KEY` and never returned to the client.
- Investor links store only `hash(token)` (SHA-256); rotating a link writes a new hash. State is per-user/session via an httpOnly cookie.
