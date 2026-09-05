import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const assertIncludes = (source, value, label) => {
  if (!source.includes(value)) throw new Error(`${label}: missing ${JSON.stringify(value)}`);
};
const assertNotIncludes = (source, value, label) => {
  if (source.includes(value)) throw new Error(`${label}: stale ${JSON.stringify(value)}`);
};

const [api, authContext, header, bell, stream, authMiddleware, notificationRoutes, app] = await Promise.all([
  read('services/api.ts'),
  read('contexts/AuthContext.tsx'),
  read('components/Header.tsx'),
  read('components/NotificationBell.tsx'),
  read('contexts/useNotificationStream.ts'),
  read('server/src/middleware/auth.ts'),
  read('server/src/routes/notification.routes.ts'),
  read('server/src/app.ts'),
]);

assertIncludes(api, 'export const API_BASE_URL = (', 'canonical API base is reusable');
assertIncludes(api, 'credentials: "include"', 'API transport remains cookie-first');
assertIncludes(authContext, "delete parsed.token;", 'legacy browser bearer token is intentionally removed');
assertIncludes(header, '<NotificationBell />', 'authenticated header mounts cookie-session bell');
assertNotIncludes(header, 'token={user.token}', 'header no longer relies on absent session token');

assertIncludes(bell, 'enabled: true', 'bell enables stream for mounted authenticated user');
assertIncludes(bell, 'api.getMyNotifications({ limit: 20 })', 'notification list uses normal cookie API transport');
assertIncludes(bell, 'api.markNotificationRead(id)', 'single-read mutation uses cookie API transport');
assertIncludes(bell, 'api.markAllNotificationsRead()', 'mark-all mutation uses cookie API transport');
assertNotIncludes(bell, 'if (!token) return;', 'bell must not silently disable cookie sessions');
assertNotIncludes(bell, 'token?: string | null', 'bell no longer exposes a false bearer-token contract');

assertIncludes(stream, "import { API_BASE_URL } from '../services/api';", 'SSE reuses canonical API base');
assertIncludes(stream, "return base.endsWith('/api') ? base", 'SSE normalizes API base once');
assertIncludes(stream, '/notifications/stream', 'SSE uses protected notification stream route');
assertIncludes(stream, 'withCredentials: true', 'SSE includes the auth cookie');
assertNotIncludes(stream, '?token=', 'SSE does not leak or depend on query bearer tokens');
assertNotIncludes(stream, '!token', 'SSE does not reject cookie-only sessions');

assertIncludes(authMiddleware, 'const token = bearerToken || cookieToken;', 'backend auth accepts the same cookie used by SSE');
assertIncludes(notificationRoutes, 'notificationRouter.get("/stream", requireAuth, openNotificationSseStream);', 'SSE remains protected by existing RBAC/auth boundary');
assertIncludes(app, 'credentials: true', 'CORS allows credentialed EventSource requests for allowed origins');

console.log('PASS notification cookie-session contract');
