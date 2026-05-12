# Monitoring And Logging Guide

## Current Status

The backend now has production-safe request diagnostics for API failures and slow endpoints.

Implemented:

- `/api/health` returns API and MongoDB connection status.
- `requestLogger` writes structured JSON log lines for failed requests, slow requests, and debug-level request tracing.
- Slow request threshold is configurable with `SLOW_REQUEST_LOG_MS`.
- Routine health checks are not logged unless they fail, become slow, or `REQUEST_LOG_LEVEL=debug`.
- Request bodies, passwords, tokens, cookies, and authorization headers are not logged.

## Environment Variables

Set these in Render:

```text
REQUEST_LOG_LEVEL=normal
SLOW_REQUEST_LOG_MS=1000
```

Use `REQUEST_LOG_LEVEL=debug` only during short investigations because it logs successful non-slow requests too.

## Log Shape

Example slow request log:

```json
{
  "level": "warn",
  "event": "http_request",
  "method": "GET",
  "path": "/api/content/bootstrap",
  "statusCode": 200,
  "durationMs": 1350.25,
  "slowThresholdMs": 1000,
  "userId": "student-id",
  "role": "student",
  "ip": "client-ip"
}
```

## How To Diagnose Vercel Or Render Slowness

1. Open the site from Vercel and reproduce the slow page.
2. Check Render logs for `event=http_request`.
3. If no slow backend logs appear, the delay is likely frontend bundle size, browser cache, network, or Render cold start before the request reaches Express.
4. If slow backend logs appear, note `path`, `durationMs`, and user role, then optimize that endpoint or MongoDB query.
5. During a short investigation, temporarily set `REQUEST_LOG_LEVEL=debug`, reproduce once, then set it back to `normal`.

## Health Check

Use:

```bash
curl https://YOUR_RENDER_SERVICE.onrender.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

## Still Needed Before Large Launch

- Connect Sentry or another error tracker with `SENTRY_DSN`.
- Add uptime monitoring from an external service.
- Add MongoDB Atlas slow-query monitoring and index review after real load tests.
- Add alert rules for repeated 5xx responses, high latency, and database disconnects.
