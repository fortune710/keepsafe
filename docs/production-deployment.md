# Keepsafe production deployment

The VPS runs the API and Keepsafe NGINX as Compose project `keepsafe`. The API
uses a separately managed Redis service. Source is at `/root/keepsafe`; ACME challenge
files are under `/var/lib/keepsafe/acme`. Supabase owns the production database,
storage, and bearer-token authentication. The mobile application is released
separately and should use `EXPO_PUBLIC_BACKEND_URL=https://keepsafeapi.fortunealebiosu.dev`.
The backend also binds `127.0.0.1:8080` on the VPS for local health checks;
public clients reach it through NGINX, which proxies to `backend:8080` on the
private Compose network.

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
| `REDIS_URL` | URL for the separate Keepsafe Redis service. |
| `REDIS_PASSWORD` | Password for the separate Keepsafe Redis service. |
| `GOOGLE_GENERATIVE_AI_KEY` | Keepsafe Gemini credential, passed to the backend as `GOOGLE_GENERATIVE_AI_API_KEY`. |
| `PINECONE_API_KEY` | Keepsafe Pinecone credential. |
| `SENDGRID_API_KEY` | Keepsafe mail credential. |
| `SENDGRID_FROM_EMAIL` | Verified Keepsafe sender address. |
| `SENDGRID_FROM_NAME` | Keepsafe sender display name. |
| `ENTRY_REPORT_NOTIFICATION_TO_EMAIL` | Entry report recipient. |
| `SUPABASE_WEBHOOK_SECRET` | HMAC signing key shared with Supabase Vault. |

Optional secrets for enabled integrations: `POSTHOG_API_KEY`, `POSTHOG_HOST`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
`TWILIO_FROM_NUMBER`. Optional nonsecret Environment variables:
`PINECONE_INDEX_NAME` (default `keepsafe-entries`). `REDIS_DB`, `ENVIRONMENT`, `PORT`, and
`ALLOWED_HOSTS` are fixed in Compose. Do not add database, RabbitMQ, Vault,
JWT, or SMTP credentials from another application.

Use a Redis service and credentials isolated from other applications. Set
`REDIS_URL` to a host reachable from the backend container, without a password
in the URL, and supply the password separately. Use `rediss://` when the
service supports TLS. Compose no longer starts or checks Redis; verify its
connectivity and health independently before deployment.

Before using `gh secret set`, run `gh auth status`. If it fails, stop and run
`gh auth login -h github.com`. Supply values through a private terminal or
GitHub's Environment UI; never place them in a command argument, log, or PR.

## First deployment

1. Stage a separately managed host ingress for public ports 80 and 443.
   For `keepsafeapi.fortunealebiosu.dev`, route public HTTP port 80 to
   `127.0.0.1:28080` and public HTTPS port 443 to `127.0.0.1:28443`.
   Preserve TLS passthrough so Keepsafe NGINX serves the certificate. Keep
   this route staged until the temporary ingress cutover below is complete.
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
4. Configure DNS and shared ingress for `keepsafeapi.fortunealebiosu.dev`.
   Issue a valid certificate on the VPS at
   `/etc/letsencrypt/live/keepsafeapi.fortunealebiosu.dev/`, serving ACME
   challenges from `/var/lib/keepsafe/acme`. Configure the host's Certbot deploy
   hook to invoke `/root/keepsafe/scripts/deploy/reload-nginx-after-cert.sh`.
5. Merge the Keepsafe PR. The migration workflow installs the durable outbox
   and scheduled dispatcher. The deploy job checks their prerequisites and a
   consistent trigger state, then starts the backend and NGINX. The original
   webhook triggers remain active until the signed cutover. Confirm NGINX passes
   `nginx -t`, the public hostname routes to it, the certificate is valid, and
   `/health` succeeds. If the certificate was issued after NGINX started, run
   the Certbot deploy hook before switching traffic.
6. Confirm the running backend accepts correctly signed requests to both
   `/webhooks/entries` and `/webhooks/entry-reports`, and reports an entry
   notification enqueue failure as a failure. Independently verify the HMAC
   against the exact request body without logging payloads, signatures, or keys.
   Check the GitHub Environment secret matches the Vault signing key without
   exposing either value. Keep the original triggers active until these checks
   pass; if an existing backend serves those triggers, confirm its deliveries
   continue to work until cutover.
7. Apply `scripts/deploy/activate-signed-webhooks.sql` to switch both triggers
   atomically. Create a controlled entry and entry report. Verify signed
   delivery to both paths, confirm the intended downstream effects, and check
   that `keepsafe_internal.webhook_delivery_status` records both tables.
   If either delivery fails, apply `scripts/deploy/rollback-signed-webhooks.sql`
   and investigate. Rollback restores the old triggers but does not cancel
   events already in the outbox; inspect and reconcile those events to avoid
   duplicate effects.
8. Verify HTTP ACME access, the HTTPS redirect, TLS hostname/certificate,
   `/health`, a mobile authenticated API call, and signed deliveries to both
   webhook paths. Confirm unsigned requests receive `401` from the new backend.
   Renewals use the same certificate hook.

The trigger saves each event in a logged outbox in the same transaction as the
insert. The scheduled dispatcher retries failed, partial, and missing responses;
it marks an event delivered only after a successful HTTP response with a JSON
`status` of `success`. Inspect pending counts and `last_error` in
`keepsafe_internal.webhook_outbox` without exposing payloads or signatures. An
empty or missing signing secret leaves events pending. Delivery is at least once:
an interrupted response or partial processing can cause a retry and duplicate
notifications or emails. Monitor the outbox and reconcile downstream effects.

The workflows never print `.env.production`. Both it and candidate
`.env.production.next` are ignored by Git; the candidate is validated with
`docker compose config --quiet` before replacement. Keep private keys,
certificate material, and any service token files outside Git.
