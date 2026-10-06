#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root or with sudo."
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git nginx ufw certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2
systemctl enable nginx

ufw allow OpenSSH || true
ufw allow "Nginx Full" || true
ufw --force enable || true

mkdir -p /var/www/almeaa-codax /var/log/almeaa-codax
echo "Server base packages are ready. Clone the repository and configure env files next."
