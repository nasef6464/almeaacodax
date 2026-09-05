import { readFile, writeFile, rm } from 'node:fs/promises';

const files = {
  api: new URL('../services/api.ts', import.meta.url),
  header: new URL('../components/Header.tsx', import.meta.url),
  bell: new URL('../components/NotificationBell.tsx', import.meta.url),
  stream: new URL('../contexts/useNotificationStream.ts', import.meta.url),
  phaseWorkflow: new URL('../.github/workflows/platform-v3-phase-handover-gate.yml', import.meta.url),
};

async function replaceExact(path, before, after, label) {
  const source = await readFile(path, 'utf8');
  if (source.includes(after)) return false;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source block, found ${count}`);
  await writeFile(path, source.replace(before, after), 'utf8');
  return true;
}

let changed = false;

changed = (await replaceExact(
  files.api,
  'const API_BASE_URL = (',
  'export const API_BASE_URL = (',
  'export canonical API base for EventSource transport',
)) || changed;

changed = (await replaceExact(
  files.header,
  '{user && <NotificationBell token={user.token} />}',
  '{user && <NotificationBell />}',
  'Header notification bell cookie-session wiring',
)) || changed;

changed = (await replaceExact(
  files.bell,
  `interface NotificationBellProps {\n  token?: string | null;\n  apiBase?: string;\n}\n\nexport const NotificationBell: React.FC<NotificationBellProps> = ({ token, apiBase = '' }) => {`,
  `interface NotificationBellProps {\n  apiBase?: string;\n}\n\nexport const NotificationBell: React.FC<NotificationBellProps> = ({ apiBase = '' }) => {`,
  'NotificationBell remove bearer-token dependency',
)) || changed;

changed = (await replaceExact(
  files.bell,
  `  const { unreadCount, latestNotification, isConnected } = useNotificationStream({\n    token,\n    apiBase,\n    enabled: !!token,\n  });`,
  `  const { unreadCount, latestNotification, isConnected } = useNotificationStream({\n    apiBase,\n    enabled: true,\n  });`,
  'NotificationBell enable authenticated cookie stream',
)) || changed;

changed = (await replaceExact(
  files.bell,
  `  const fetchNotifications = useCallback(async () => {\n    if (!token) return;\n    setLoading(true);\n    try {\n      const res = await api.getMyNotifications({ limit: 20 }, token);\n      setNotifications((res.notifications || []) as InAppNotification[]);\n    } catch { /* silent */ } finally {\n      setLoading(false);\n    }\n  }, [token]);`,
  `  const fetchNotifications = useCallback(async () => {\n    setLoading(true);\n    try {\n      const res = await api.getMyNotifications({ limit: 20 });\n      setNotifications((res.notifications || []) as InAppNotification[]);\n    } catch { /* silent */ } finally {\n      setLoading(false);\n    }\n  }, []);`,
  'NotificationBell cookie-auth notification list read',
)) || changed;

changed = (await replaceExact(
  files.bell,
  `  const handleMarkRead = async (id: string) => {\n    if (!token) return;\n    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: Date.now() } : n)));\n    try { await api.markNotificationRead(id, token); } catch { /* silent */ }\n  };`,
  `  const handleMarkRead = async (id: string) => {\n    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: Date.now() } : n)));\n    try { await api.markNotificationRead(id); } catch { /* silent */ }\n  };`,
  'NotificationBell cookie-auth single-read mutation',
)) || changed;

changed = (await replaceExact(
  files.bell,
  `  const handleMarkAllRead = async () => {\n    if (!token) return;\n    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })));\n    try { await api.markAllNotificationsRead(token); } catch { /* silent */ }\n  };`,
  `  const handleMarkAllRead = async () => {\n    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })));\n    try { await api.markAllNotificationsRead(); } catch { /* silent */ }\n  };`,
  'NotificationBell cookie-auth mark-all mutation',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `import { useState, useEffect, useRef, useCallback } from 'react';`,
  `import { useState, useEffect, useRef, useCallback } from 'react';\nimport { API_BASE_URL } from '../services/api';`,
  'notification stream canonical API base import',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `interface UseNotificationStreamOptions {\n  /** بيانات auth token — يُمرّر كـ query param بدلاً من header لأن EventSource لا يدعم headers */\n  token?: string | null;\n  /** الـ base URL للـ API — يُستخدم في الإنتاج */\n  apiBase?: string;\n  /** تفعيل الـ stream (false إذا لم يكن المستخدم مسجلاً) */\n  enabled?: boolean;\n}`,
  `interface UseNotificationStreamOptions {\n  /** الـ base URL للـ API — عند عدم تمريره يُعاد استخدام نفس base الخاص بطبقة API */\n  apiBase?: string;\n  /** تفعيل الـ stream (false إذا لم يكن المستخدم مسجلاً) */\n  enabled?: boolean;\n}`,
  'notification stream cookie-auth options',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `export const useNotificationStream = ({\n  token,\n  apiBase = '',\n  enabled = true,\n}: UseNotificationStreamOptions = {}) => {`,
  `const resolveNotificationApiBase = (apiBase?: string) => {\n  const base = String(apiBase || API_BASE_URL).replace(/\\/$/, '');\n  return base.endsWith('/api') ? base : \`${'${base}'}/api\`;\n};\n\nexport const useNotificationStream = ({\n  apiBase = '',\n  enabled = true,\n}: UseNotificationStreamOptions = {}) => {`,
  'notification stream base resolver',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `  const connect = useCallback(() => {\n    if (!enabled || !token || !isMounted.current) return;`,
  `  const connect = useCallback(() => {\n    if (!enabled || !isMounted.current) return;`,
  'notification stream remove token guard',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `    const url = \`${'${apiBase}'}/api/notifications/stream?token=${'${encodeURIComponent(token)}'}\`;\n    const es = new EventSource(url, { withCredentials: false });`,
  `    const url = \`${'${resolveNotificationApiBase(apiBase)}'}/notifications/stream\`;\n    const es = new EventSource(url, { withCredentials: true });`,
  'notification stream use auth cookie credentials',
)) || changed;

changed = (await replaceExact(
  files.stream,
  `  }, [enabled, token, apiBase]);`,
  `  }, [enabled, apiBase]);`,
  'notification stream dependencies',
)) || changed;

changed = (await replaceExact(
  files.phaseWorkflow,
  `      - name: Security and RBAC phase 6 contract\n        run: npm run smoke:security-rbac-phase6\n      - name: Gate 6 question AI authoring contract`,
  `      - name: Security and RBAC phase 6 contract\n        run: npm run smoke:security-rbac-phase6\n      - name: Notification cookie-session contract\n        run: node scripts/smoke-notification-cookie-session-contract.mjs\n      - name: Gate 6 question AI authoring contract`,
  'permanent notification cookie-session contract wiring',
)) || changed;

console.log(changed ? 'Notification cookie-session patch applied.' : 'Notification cookie-session patch already applied.');
