# Deployment Guide

## Current Production Snapshot

- GitHub repo: `https://github.com/nasef6464/almeaacodax`
- Production branch: `main`
- Render service: `almeaacodax`
- Render primary URL: `https://almeaacodax-codex.onrender.com`
- Backend API base: `https://almeaacodax-codex.onrender.com/api`
- Vercel production domain: `https://almeaacodax.vercel.app`
- Vercel preview/main domain: `https://almeaacodax-git-main-nasefs-projects-18e6bdb1.vercel.app`
- MongoDB Atlas project: `almeaacodax`
- MongoDB Atlas cluster: `almeaa`
- Production database name: `almeaa`

Do not commit real passwords, API keys, or JWT secrets. Keep secrets only in Render/Vercel/Atlas.

### Release identity rule

The canonical production path is Vercel frontend → Vercel `/api` rewrite → Render backend. A release is not considered deployed merely because the Vercel build is READY: the backend `/api/health/live` commit must match the intended GitHub SHA and `/api/health/ready` must pass. Use `npm run smoke:release-identity` from the post-deploy workflow. `/api/health/scale-ready` remains the explicit multi-instance gate and must not be bypassed.

## 1. Backend (Render.com)
1.  Create a **Web Service**.
2.  **Repo:** Connect the GitHub repo.
3.  **Root Directory:** `server`
4.  **Build Command:** `npm install && npm run build`
5.  **Start Command:** `npm start`
6.  **Environment Variables:**
    - `NODE_ENV`: production
    - `PORT`: 10000
    - `MONGODB_URI`: `mongodb+srv://nasef64:<db_password>@almeaa.5y2fzx5.mongodb.net/almeaa?appName=almeaa`
    - `JWT_SECRET`: (Random 64-char string)
    - `CLIENT_URL`: `https://almeaacodax.vercel.app`
    - `CORS_ALLOWED_ORIGINS`: `https://almeaacodax.vercel.app`
    - `REDIS_URL`: managed Redis connection string for production scale
    - `REDIS_KEY_PREFIX`: `almeaa`
    - `RATE_LIMIT_REDIS_ENABLED`: `true`
    - `NOTIFICATION_QUEUE_ENABLED`: `true`
    - `NOTIFICATION_QUEUE_CONCURRENCY`: `5`
    - `ADMIN_EMAIL`: production admin email
    - `ADMIN_NAME`: production admin display name
    - `ADMIN_PASSWORD`: production admin password, kept only in Render
    - `DEV_LOCAL_ADMIN_BYPASS`: `false`
    - `AI_PROVIDER`: one of `gemini`, `openrouter`, `qwen`, `deepseek`, `openai`, `ollama`, `lmstudio`, or `none` (optional)
    - `REQUEST_LOG_LEVEL`: `normal` in production, `debug` only during short investigations
    - `SLOW_REQUEST_LOG_MS`: `1000` default threshold for slow API request logs
    - `EMAIL_PROVIDER`: `resend`, `http`, or empty until ready; use `console` only in staging
    - `EMAIL_FROM`, `RESEND_API_KEY`, `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_TOKEN`: required according to selected email provider
    - `WHATSAPP_PROVIDER`: `whatsapp_cloud`, `http`, or empty until ready; use `console` only in staging
    - `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_URL`, `WHATSAPP_WEBHOOK_TOKEN`: required according to selected WhatsApp provider
    - `AI_PROVIDER_ORDER`: recommended production order such as `gemini,openrouter,qwen,deepseek,openai`
    - `AI_REQUEST_TIMEOUT_MS`: defaults to `15000`
    - `GEMINI_API_KEY`: (Google AI Key)
    - `GEMINI_MODEL`: Gemini model name, defaults to `gemini-2.5-flash`
    - `OPENROUTER_API_KEY`: OpenRouter key if used
    - `OPENROUTER_MODEL`: defaults to `qwen/qwen3-235b-a22b:free`
    - `QWEN_API_KEY`: Qwen / Alibaba key if used
    - `QWEN_MODEL`: defaults to `qwen-plus`
    - `QWEN_BASE_URL`: defaults to `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - `DEEPSEEK_API_KEY`: DeepSeek key if used
    - `DEEPSEEK_MODEL`: defaults to `deepseek-chat`
    - `OPENAI_API_KEY`: OpenAI key if used
    - `OPENAI_MODEL`: defaults to `gpt-4.1-mini`
    - `OLLAMA_BASE_URL`: Ollama server URL, defaults to `http://127.0.0.1:11434`
    - `OLLAMA_MODEL`: Ollama model name, defaults to `gemma3:4b`
    - `LM_STUDIO_BASE_URL`: LM Studio OpenAI-compatible URL, defaults to `http://127.0.0.1:1234/v1`
    - `LM_STUDIO_MODEL`: local LM Studio model name

> Production note: Render cannot call Ollama or LM Studio on your personal computer. For production, use a hosted provider such as Gemini, OpenRouter, Qwen, DeepSeek, or OpenAI, or host a local model on a reachable private server. Without keys, `AI_PROVIDER=none` keeps the assistant working through safe internal fallback responses.

## 2. Frontend (Vercel)
1.  Create a **New Project**.
2.  **Repo:** Connect the GitHub repo.
3.  **Root Directory:** `.` (Project Root)
4.  **Build Command:** `npm run build`
5.  **Output Directory:** `dist`
6.  **Environment Variables:**
    - `VITE_API_URL`: `/api` (canonical on Vercel; `vercel.json` owns the Render target so frontend builds do not pin a stale backend URL)

Set `VITE_API_URL` for both Production and Preview environments if preview deployments should talk to the same Render backend.

### Vercel Cache Policy

The frontend is a Vite SPA, so Vercel must not apply `no-store` to every file. The current `vercel.json` keeps the HTML shell fresh while allowing hashed assets to be cached:

- `/assets/(.*)`: long immutable cache for built JS/CSS chunks and generated assets.
- `/(.*).(js|css|woff|woff2|ttf|png|jpg|jpeg|webp|svg|ico)`: long immutable cache for static hashed files.
- `/(.*)`: `no-cache` for the SPA shell so new deployments are still discovered.

Run this before deployment if cache headers are edited:

```bash
npm run smoke:deployment-cache
npm run smoke:load-tests
npm run smoke:monitoring
npm run smoke:database
npm run smoke:notifications
npm run smoke:auth-account
npm run smoke:auth-frontend
npm run smoke:auth-login-security
npm run smoke:api-security
npm run smoke:runtime-source
npm run smoke:nosql-sanitizer
```

### Load Testing

The repeatable load-test entrypoint is `load-tests/k6-platform-journey.js`.

Run it only against staging or production-like infrastructure:

```bash
k6 run load-tests/k6-platform-journey.js \
  -e API_BASE=https://YOUR_RENDER_SERVICE.onrender.com/api \
  -e STUDENT_EMAIL=student@example.com \
  -e STUDENT_PASSWORD=StrongPassword123
```

Record results in `LOAD_TEST_REPORT.md` before increasing student rollout size.

### Backend Request Diagnostics

Render logs now include structured `http_request` JSON lines for failed and slow backend requests. This is the first place to inspect when the Vercel site feels slow:

- If a slow API log appears, optimize that endpoint or its MongoDB query.
- If no slow API log appears, investigate frontend bundles, Vercel/browser cache, network, or Render cold start.
- Do not leave `REQUEST_LOG_LEVEL=debug` enabled after the investigation.

### Production Health And Redis Readiness

Use `/api/health/live` for liveness and `/api/health/ready` for Render health checks. The readiness endpoint checks MongoDB plus Redis-backed rate-limit and queue readiness when scale features are enabled in production.

For multi-instance Render deployment, configure Redis before increasing traffic:

```env
REDIS_URL=redis://...
REDIS_KEY_PREFIX=almeaa
RATE_LIMIT_REDIS_ENABLED=true
NOTIFICATION_QUEUE_ENABLED=true
NOTIFICATION_QUEUE_CONCURRENCY=5
```

### MongoDB Index Deployment

This repo now defines production indexes in the Mongoose models for learning reads, payments, audit logs, users, groups, packages, and announcements. Deploy index changes during lower traffic where possible, then watch MongoDB Atlas index build and slow-query metrics.

### Notification Providers

The backend now creates notification delivery records and in-app notifications. External email/WhatsApp sending supports Resend, generic HTTP providers, WhatsApp Cloud API, and console staging mode. Use `EMAIL_PROVIDER=console` and `WHATSAPP_PROVIDER=console` only in staging smoke tests.

### Account Recovery

Forgot-password and email-verification flows now create hashed tokens, queue notification delivery records, and have student-facing screens at `/#/forgot-password`, `/#/reset-password?token=...`, and `/#/verify-email?token=...`. Configure `EMAIL_PROVIDER=resend` or `EMAIL_PROVIDER=http` before students rely on recovery emails outside staging.

## 3. Database (MongoDB Atlas)
1.  Create a generic M0 (Free) Cluster.
2.  Create a Database User.
3.  Network Access: Allow `0.0.0.0/0` (or specific IPs for tighter security).
4.  Use the `almeaa` database name in the connection string so production data lands in the same database Render reads from.

## Operational Test Accounts

Do not publish reusable account passwords in repository documentation. Operational smoke credentials belong in GitHub Actions / Render secrets and must be rotated if they were ever committed or pasted into chat.

## Current Verification Status

Read-only production evidence captured on 2026-09-20:

- Vercel production is READY on frontend commit `f9db56188cccf0977842cce0b84ac13add9da117`.
- The Vercel `/api` route reaches the Render backend selected by `vercel.json`.
- Live backend `/api/health/live` reports commit `848e12790a1e`, which does not match the current frontend/main release and therefore blocks synchronized-release closure.
- `/api/health/ready` returns HTTP 200 with MongoDB connected.
- `/api/health/scale-ready` returns HTTP 503 because Redis is not configured for multi-instance scale.
- A release is synchronized only when `npm run smoke:release-identity` passes for the intended SHA. Scale certification additionally requires the stronger scale-ready gate and Batch 13 measured load evidence.
