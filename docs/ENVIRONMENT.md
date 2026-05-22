# Environment Reference

No real secrets belong in the repository. Copy the example files and fill them on each platform.

## Frontend

Required locally:
- `VITE_API_URL`: local API URL, usually `http://localhost:4000/api`.
- `VITE_PUBLIC_SITE_URL`: local frontend URL.

Required in production, Hostinger, Docker, Vercel/Render rollback:
- `VITE_API_URL`: backend API URL. On a same-domain VPS behind Nginx it can be `/api`; on Vercel/Render use the Render API URL.
- `VITE_PUBLIC_SITE_URL`: public frontend origin for canonical/OG tags.
- `VITE_APP_NAME`: display/app metadata.

Optional:
- `VITE_SENTRY_DSN`
- `VITE_AUTH_COOKIE_FIRST`
- `VITE_ENABLE_PWA`

## Backend

Required for local:
- `NODE_ENV`
- `PORT`
- `CLIENT_URL`
- `MONGODB_URI`
- `JWT_SECRET`

Required for production and Hostinger:
- `NODE_ENV=production`
- `PORT`
- `CLIENT_URL`
- `CORS_ALLOWED_ORIGINS`
- `MONGODB_URI`
- `JWT_SECRET`
- `PAYMENT_WEBHOOK_SECRET` if payments are enabled

Optional infrastructure:
- `REDIS_URL`
- `REDIS_KEY_PREFIX`
- `RATE_LIMIT_REDIS_ENABLED`
- `NOTIFICATION_QUEUE_ENABLED`
- `NOTIFICATION_QUEUE_CONCURRENCY`
- `UPLOAD_DIR`
- `MAX_UPLOAD_SIZE`

Optional integrations requiring owner secrets:
- `PAYMENT_PROVIDER`
- `PAYMENT_SECRET_KEY`
- `PAYMENT_PUBLIC_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WEBHOOK_URL`
- `WHATSAPP_WEBHOOK_TOKEN`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `LOG_LEVEL`
- `REQUEST_LOG_LEVEL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

Development-only:
- `DEV_LOCAL_ADMIN_BYPASS` must remain `false` in production.

## Owner-Provided Values

Before launch the owner must provide: domain, VPS IP, MongoDB URI, optional Redis URL, payment keys, email keys, WhatsApp keys, AI keys, Sentry DSN, and GitHub/Vercel/Render secrets.
