/**
 * NotificationBell — مكوّن جرس الإشعارات في الـ Header
 * ─────────────────────────────────────────────────────
 * يستخدم useNotificationStream للاستقبال الفوري.
 * يعرض badge بعدد غير المقروء.
 * عند النقر: يفتح dropdown بآخر الإشعارات + زر "قراءة الكل".
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Loader2 } from 'lucide-react';
import { useNotificationStream, InAppNotification } from '../contexts/useNotificationStream';
import { api } from '../services/api';

interface NotificationBellProps {
  token?: string | null;
  apiBase?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ token, apiBase = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { unreadCount, latestNotification, isConnected } = useNotificationStream({
    token,
    apiBase,
    enabled: !!token,
  });

  // جلب الإشعارات عند فتح الـ panel
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getMyNotifications({ limit: 20 }, token);
      setNotifications((res.notifications || []) as InAppNotification[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  // عند استقبال إشعار جديد — أضفه في أعلى القائمة
  useEffect(() => {
    if (latestNotification) {
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === latestNotification.id);
        if (exists) return prev;
        return [latestNotification, ...prev.slice(0, 19)];
      });
    }
  }, [latestNotification]);

  // فتح وجلب الإشعارات
  const handleOpen = () => {
    setIsOpen((v) => !v);
    if (!isOpen) fetchNotifications();
  };

  // إغلاق عند النقر خارجاً
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // قراءة إشعار واحد
  const handleMarkRead = async (id: string) => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: Date.now() } : n)));
    try { await api.markNotificationRead(id, token); } catch { /* silent */ }
  };

  // قراءة الكل
  const handleMarkAllRead = async () => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })));
    try { await api.markAllNotificationsRead(token); } catch { /* silent */ }
  };

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── زر الجرس ── */}
      <button
        onClick={handleOpen}
        aria-label="الإشعارات"
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
      >
        <Bell
          size={22}
          className={`transition-colors ${unreadCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
        />
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* مؤشر الاتصال */}
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900" />
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="absolute left-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <h3 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Bell size={16} className="text-indigo-600" />
              الإشعارات
              {unread.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[11px] font-black px-2 py-0.5 rounded-full">
                  {unread.length} جديد
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  title="تعليم الكل كمقروء"
                >
                  <CheckCheck size={13} />
                  قراءة الكل
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* القائمة */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                لا توجد إشعارات
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                      !notif.readAt ? 'bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                    onClick={() => !notif.readAt && handleMarkRead(notif.id)}
                  >
                    {/* نقطة غير مقروء */}
                    <div className="mt-1.5 shrink-0">
                      {notif.readAt ? (
                        <Check size={14} className="text-gray-300" />
                      ) : (
                        <span className="block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${!notif.readAt ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
