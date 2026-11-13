#!/bin/sh
set -eu

certificate_dir=/etc/letsencrypt/live/keepsafeapi.fortunealebiosu.dev
if [ -s "$certificate_dir/fullchain.pem" ] && [ -s "$certificate_dir/privkey.pem" ]; then
  cp /etc/nginx/keepsafe/https.conf /etc/nginx/conf.d/default.conf
else
  cp /etc/nginx/keepsafe/bootstrap.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
