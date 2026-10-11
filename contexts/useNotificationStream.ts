/**
 * useNotificationStream — React hook for real-time in-app notifications via SSE
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses EventSource to connect to GET /api/notifications/stream.
 * Manages connection lifecycle (open, error, reconnect) automatically.
 *
 * Returns:
 *   - unreadCount: number of unread notifications
 *   - latestNotification: the last notification received (for toast display)
 *   - isConnected: stream connection status
 *
 * Usage:
 *   const { unreadCount, latestNotification } = useNotificationStream(token);
 */
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../services/api';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  readAt?: number;
  createdAt: string;
  variables?: Record<string, string | number | boolean | null>;
}

interface UseNotificationStreamOptions {
  /** توافق قديم مع callers سابقة؛ النقل الحالي يعتمد auth cookie ولا يرسل token في URL. */
  token?: string | null;
  /** الـ base URL للـ API — عند عدم تمريره يُعاد استخدام نفس base الخاص بطبقة API */
  apiBase?: string;
  /** تفعيل الـ stream (false إذا لم يكن المستخدم مسجلاً) */
  enabled?: boolean;
}

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;

const resolveNotificationApiBase = (apiBase?: string) => {
  const base = String(apiBase || API_BASE_URL).replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const useNotificationStream = ({
  apiBase = '',
  enabled = true,
}: UseNotificationStreamOptions = {}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<InAppNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let disposed = false;
    let stream: EventSource | null = null;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      const previous = stream;
      stream = null;
      previous?.close();
    };
    const connect = () => {
      if (disposed || !enabled || navigator.onLine === false || stream) return;

      const url = `${resolveNotificationApiBase(apiBase)}/notifications/stream`;
      const es = new EventSource(url, { withCredentials: true });
      stream = es;
      const isCurrent = () => !disposed && stream === es;

      es.addEventListener('connected', () => {
        if (!isCurrent()) return;
        setIsConnected(true);
        attempts = 0;
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        if (!isCurrent()) return;
        try {
          const notif: InAppNotification = JSON.parse(e.data);
          setLatestNotification(notif);
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('unread_count', (e: MessageEvent) => {
        if (!isCurrent()) return;
        try {
          const { count } = JSON.parse(e.data);
          setUnreadCount(Number(count) || 0);
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        if (!isCurrent()) return;
        setIsConnected(false);
        stop();

        // إعادة الاتصال بتأخير متزايد ومحدود
        if (navigator.onLine !== false && attempts < MAX_RECONNECT_ATTEMPTS) {
          attempts += 1;
          const delay = Math.min(RECONNECT_DELAY_MS * attempts, 60_000);
          timer = setTimeout(() => {
            timer = null;
            connect();
          }, delay);
        }
      };
    };
    const offline = () => { stop(); setIsConnected(false); };
    const online = () => { if (stream) return; stop(); attempts = 0; connect(); };
    setIsConnected(false);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    connect();

    return () => {
      disposed = true;
      stop();
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [enabled, apiBase]);

  return { unreadCount, latestNotification, isConnected };
};
