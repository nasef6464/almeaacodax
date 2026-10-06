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
import { useState, useEffect, useRef, useCallback } from 'react';
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

  const esRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !isMounted.current) return;

    // أغلق الاتصال القديم إن وُجد
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${resolveNotificationApiBase(apiBase)}/notifications/stream`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.addEventListener('connected', () => {
      if (!isMounted.current) return;
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    es.addEventListener('notification', (e: MessageEvent) => {
      if (!isMounted.current) return;
      try {
        const notif: InAppNotification = JSON.parse(e.data);
        setLatestNotification(notif);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('unread_count', (e: MessageEvent) => {
      if (!isMounted.current) return;
      try {
        const { count } = JSON.parse(e.data);
        setUnreadCount(Number(count) || 0);
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      if (!isMounted.current) return;
      setIsConnected(false);
      es.close();
      esRef.current = null;

      // إعادة الاتصال تلقائياً بـ exponential backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        const delay = Math.min(RECONNECT_DELAY_MS * reconnectAttempts.current, 60_000);
        reconnectTimer.current = setTimeout(() => {
          if (isMounted.current) connect();
        }, delay);
      }
    };
  }, [enabled, apiBase]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [connect]);

  return { unreadCount, latestNotification, isConnected };
};
