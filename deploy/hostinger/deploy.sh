#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/almeaa-codax/current}"
FRONTEND_DIR="${FRONTEND_DIR:-$PROJECT_DIR}"
BACKEND_DIR="${BACKEND_DIR:-$PROJECT_DIR/server}"
DOMAIN="${DOMAIN:-example.com}"
API_DOMAIN="${API_DOMAIN:-api.example.com}"
BACKEND_PORT="${BACKEND_PORT:-4000}"

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1"
    exit 1
  fi
}

cd "$PROJECT_DIR"
require_file "$FRONTEND_DIR/.env.production"
require_file "$BACKEND_DIR/.env.production"

if [[ -d .git ]]; then
  git pull --ff-only
fi

cd "$FRONTEND_DIR"
npm ci
npm run build

cd "$BACKEND_DIR"
npm ci
npm run build

mkdir -p "$PROJECT_DIR/uploads" /var/log/almeaa-codax
cd "$PROJECT_DIR"
BACKEND_PORT="$BACKEND_PORT" pm2 startOrReload deploy/hostinger/ecosystem.config.cjs --env production
pm2 save

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

echo "Deploy complete for $DOMAIN with API $API_DOMAIN on backend port $BACKEND_PORT."
