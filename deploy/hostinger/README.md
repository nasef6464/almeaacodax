# Hostinger VPS / Generic Linux VPS Deployment

This folder is a production deployment template. It keeps Vercel/Render rollback possible because the app still reads URLs and secrets from environment variables.

## 1. Prepare The VPS

1. Create an Ubuntu VPS.
2. Point DNS later, after health checks pass.
3. SSH into the server.
4. Run:

```bash
sudo bash deploy/hostinger/setup-server.sh
```

## 2. Clone And Configure

```bash
sudo mkdir -p /var/www/almeaa-codax
sudo chown -R "$USER":"$USER" /var/www/almeaa-codax
git clone <YOUR_REPO_URL> /var/www/almeaa-codax/current
cd /var/www/almeaa-codax/current
cp deploy/hostinger/env.frontend.example .env.production
cp deploy/hostinger/env.backend.example server/.env.production
```

Fill the env files with owner-provided values. Do not commit real secrets.

The current application stores lesson and library media as URL references. It does not expose first-party binary upload ingestion, so do not add `UPLOAD_DIR` or `MAX_UPLOAD_SIZE` to the backend runtime env. `UPLOAD_DIR` remains available only as an override for the separate backup/restore shell scripts when a deployment actually has a filesystem media directory to preserve.

## 3. Deploy

```bash
PROJECT_DIR=/var/www/almeaa-codax/current \
DOMAIN=example.com \
API_DOMAIN=api.example.com \
BACKEND_PORT=4000 \
bash deploy/hostinger/deploy.sh
```

## 4. Nginx And SSL

Copy `deploy/hostinger/nginx.conf` to `/etc/nginx/sites-available/almeaa-codax`, replace placeholders, enable it, then run Certbot:

```bash
sudo ln -s /etc/nginx/sites-available/almeaa-codax /etc/nginx/sites-enabled/almeaa-codax
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d api.example.com
```

## 5. Health Checks

```bash
curl -fsS https://api.example.com/api/health
curl -fsS https://api.example.com/api/ready
pm2 status
pm2 logs almeaa-codax-api --lines 100
```

Verify login, admin dashboard, student dashboard, package/path navigation, payment dry-run, question bank CRUD, and lesson media playback from configured direct/CDN/YouTube/Vimeo URLs.

## 6. Rollback

Rollback the VPS:

```bash
cd /var/www/almeaa-codax/current
git log --oneline -5
git checkout <PREVIOUS_COMMIT>
bash deploy/hostinger/deploy.sh
```

Rollback to Vercel/Render:

1. Keep the current Vercel frontend and Render backend env values for at least 48 hours after DNS switch.
2. Repoint DNS or restore the Vercel project domain.
3. Set `VITE_API_URL` back to the Render API URL.

## Common Errors

- Missing `.env.production`: create frontend and backend env files before deploy.
- 502 from Nginx: check `pm2 logs` and `BACKEND_PORT`.
- CORS errors: set `CLIENT_URL` and `CORS_ALLOWED_ORIGINS`.
- Payment failures: configure provider keys and webhook secret.
- Media playback failures: verify the stored media URL is reachable by the browser and that the external host/CDN returns an appropriate media content type and cross-origin policy. `UPLOAD_DIR` is not a backend application setting.
