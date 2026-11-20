#!/bin/sh
# Certbot deploy hook on the VPS. Recreate only for first certificate issuance;
# later renewals need a syntax check and reload to pick up the new certificate.
set -eu

cd /root/keepsafe
compose() {
  docker compose --env-file .env.production -f compose.production.yaml "$@"
}

if ! compose exec -T nginx cmp -s /etc/nginx/conf.d/default.conf /etc/nginx/keepsafe/https.conf; then
  compose up -d --force-recreate --no-deps nginx
fi
compose exec -T nginx nginx -t
compose exec -T nginx nginx -s reload
