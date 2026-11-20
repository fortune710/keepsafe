# Keepsafe production deployment

The VPS runs the API, a private Redis cache, and the Keepsafe NGINX container
as Compose project `keepsafe`. Source is at `/root/keepsafe`; ACME challenge
files are under `/var/lib/keepsafe/acme`. Supabase owns the production database,
storage, and bearer-token authentication. The mobile application is released
separately and should use `EXPO_PUBLIC_BACKEND_URL=https://keepsafeapi.fortunealebiosu.dev`.
The backend also binds `127.0.0.1:8080` on the VPS for local health checks;
public clients reach it through NGINX, which proxies to `backend:8080` on the
private Compose network. Redis has no host port.

There is no browser frontend origin for this mobile-only deployment. Production
FastAPI CORS has no allowed browser origins, and the backend does not issue
JWTs or auth cookies.

## GitHub production Environment

Create the `production` Environment and supply these **Keepsafe-specific** secrets:

| Secret | Use |
| --- | --- |
| `VPS_SSH_PRIVATE_KEY` | Existing VPS deploy SSH key; sharing the connection key is allowed. |
| `VPS_SSH_KNOWN_HOSTS` | Pinned host key for the existing VPS. |
| `SUPABASE_DB_URL` | Keepsafe production database connection, used only by migration checks and Supabase CLI. |
| `SUPABASE_URL` | Keepsafe production Supabase project URL. |
| `SUPABASE_KEY` | Keepsafe service role key for backend access. |
| `REDIS_PASSWORD` | New password for the private Keepsafe Redis instance. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Keepsafe Gemini credential. |
| `PINECONE_API_KEY` | Keepsafe Pinecone credential. |
| `SENDGRID_API_KEY` | Keepsafe mail credential. |
| `SENDGRID_FROM_EMAIL` | Verified Keepsafe sender address. |
| `SENDGRID_FROM_NAME` | Keepsafe sender display name. |
| `ENTRY_REPORT_NOTIFICATION_TO_EMAIL` | Entry report recipient. |
| `SUPABASE_WEBHOOK_SECRET` | HMAC signing key shared with Supabase Vault. |

Optional secrets for enabled integrations: `POSTHOG_API_KEY`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
`TWILIO_FROM_NUMBER`. Optional nonsecret Environment variables:
`PINECONE_INDEX_NAME` (default `keepsafe-entries`), `PINECONE_ENVIRONMENT`,
and `POSTHOG_HOST`. `REDIS_URL`, `REDIS_DB`, `ENVIRONMENT`, `PORT`, and
`ALLOWED_HOSTS` are fixed in Compose. Do not add database, RabbitMQ, Vault,
JWT, or SMTP credentials from another application.

Before using `gh secret set`, run `gh auth status`. If it fails, stop and run
`gh auth login -h github.com`. Supply values through a private terminal or
GitHub's Environment UI; never place them in a command argument, log, or PR.

## First deployment

1. Stage a separately managed host ingress for public ports 80 and 443.
   Coordinate its activation with the sibling application's loopback-port
   change, then confirm that application's HTTP redirects and HTTPS health.
   Keep the shared routing configuration outside either application's NGINX
   configuration.
2. Clone Keepsafe `main` to `/root/keepsafe` on the VPS and keep that checkout
   clean. Create `/var/lib/keepsafe/acme` with mode 0755. Configure the GitHub
   production Environment secrets listed above.
3. Compare `frontend/supabase/migrations` with
   `supabase_migrations.schema_migrations` in the Keepsafe production project.
   The migration workflow requires the current baseline and refuses a gap or
   unknown version. Reconcile any difference before merging the Keepsafe PR.
   The existing production project currently has migrations beyond the baseline
   that are absent from this branch; bring the matching migration files into the
   deployment branch and review their application compatibility before release.
4. Before merging the PR, point `keepsafeapi.fortunealebiosu.dev` at a temporary
   HTTPS ingress that forwards both webhook paths to the **existing** backend.
   Serve ACME challenges from `/var/lib/keepsafe/acme` and issue a valid
   certificate on the VPS at `/etc/letsencrypt/live/keepsafeapi.fortunealebiosu.dev/`.
   Configure upstream TLS/Host routing, and verify the new hostname reaches that
   backend without changing the request body or `x-supabase-signature` header.
   The signing function sends requests to this hostname, so DNS, TLS, and
   forwarding must work before switching triggers.
5. Verify that the existing backend accepts signed requests for both paths using
   the Vault signing key. The entry handler on `main` ignores the signature;
   it does not prove the signature is valid. The entry-report handler on `main`
   already verifies HMAC and needs the matching secret. Confirm the running
   backend's version and settings without exposing secrets; if either path
   cannot accept signed deliveries, stop and keep the existing triggers active.
   Confirm the GitHub Environment secret matches the Vault signing key.
6. Apply `scripts/deploy/activate-signed-webhooks.sql` to switch both database
   triggers atomically. Verify actual signed deliveries to `/webhooks/entries`
   and `/webhooks/entry-reports` through the temporary ingress **to the existing
   backend**, and confirm their intended downstream processing. Independently
   verify each HMAC against the raw request body using a controlled verifier
   that does not log payloads, signatures, or secrets; a successful response
   from the entry handler alone is insufficient. If either delivery fails,
   apply `scripts/deploy/rollback-signed-webhooks.sql` and investigate before
   proceeding. The previous triggers remain available but disabled after cutover.
7. Once both signed deliveries are verified, merge the Keepsafe PR. The migration
   workflow runs first; the deploy workflow runs only after its successful
   migration job. Keep the temporary ingress forwarding to the existing backend
   until the VPS backend and its NGINX are healthy and HTTPS is ready.
8. Confirm the certificate is available to the Keepsafe VPS NGINX and its
   HTTPS configuration passes `nginx -t`, then route the public hostname to it.
   Configure the host's Certbot deploy hook to invoke
   `/root/keepsafe/scripts/deploy/reload-nginx-after-cert.sh`. If the certificate
   was issued after NGINX started, run the hook before switching traffic.
9. Verify HTTP ACME access, the HTTPS redirect, TLS hostname/certificate,
   `/health`, a mobile authenticated API call, and signed deliveries to both
   webhook paths. Confirm unsigned requests receive `401` from the new backend.
   Renewals use the same certificate hook.

The workflows never print `.env.production`. Both it and candidate
`.env.production.next` are ignored by Git; the candidate is validated with
`docker compose config --quiet` before replacement. Keep private keys,
certificate material, and any service token files outside Git.
