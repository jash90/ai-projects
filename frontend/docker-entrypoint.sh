#!/bin/sh
set -e

# Substitute BACKEND_URL in nginx config template
BACKEND_URL=${BACKEND_URL:-http://localhost:3001}
export BACKEND_URL

envsubst '$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
