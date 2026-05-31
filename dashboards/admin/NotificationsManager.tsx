import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, RefreshCcw, Send } from 'lucide-react';
import { api } from '../../services/api';
import { Role } from '../../types';
import { useStore } from '../../store/useStore';

type TemplateItem = {
  key: string;
  name: string;
  channel: 'in_app' | 'email' | 'whatsapp';
  title: string;
  body: string;
  isActive?: boolean;
};

type DeliveryItem = {
  id: string;
  channel: 'in_app' | 'email' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  title?: string;
  createdAt?: string;
  recipientUserId?: string;
};

const roleOptions: Array<{ id: Role; label: string }> = [
  { id: Role.STUDENT, label: 'طلاب' },
  { id: Role.PARENT, label: 'أولياء الأمور' },
  { id: Role.TEACHER, label: 'معلمون' },
  { id: Role.SUPERVISOR, label: 'مشرفون' },
  { id: Role.ADMIN, label: 'مديرون' },
];

export const NotificationsManager: React.FC = () => {
  const { users } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [summary, setSummary] = useState<{ pendingCount?: number; failedCount?: number }>({});

  const [templateKey, setTemplateKey] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<Array<'in_app' | 'email' | 'whatsapp'>>(['in_app']);
  const [roles, setRoles] = useState<string[]>([]);
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);

  const candidateUsers = useMemo(() => users.slice(0, 200), [users]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [templatesPayload, deliveriesPayload] = await Promise.all([
        api.getNotificationTemplates({ limit: 50 }),
        api.getNotificationDeliveries({ limit: 50 }),
      ]);

      const templateItems = Array.isArray((templatesPayload as { templates?: unknown[] })?.templates)
        ? ((templatesPayload as { templates?: TemplateItem[] }).templates || [])
        : [];
      const deliveryItems = Array.isArray((deliveriesPayload as { deliveries?: unknown[] })?.deliveries)
        ? ((deliveriesPayload as { deliveries?: DeliveryItem[] }).deliveries || [])
        : [];
      setTemplates(templateItems);
      setDeliveries(deliveryItems);
      setSummary((deliveriesPayload as { summary?: { pendingCount?: number; failedCount?: number } })?.summary || {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات الإشعارات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleChannel = (channel: 'in_app' | 'email' | 'whatsapp') => {
    setChannels((current) => {
      if (current.includes(channel)) {
        const filtered = current.filter((item) => item !== channel);
        return filtered.length ? filtered : ['in_app'];
      }
      return [...current, channel];
    });
  };

  const toggleRole = (roleId: string) => {
    setRoles((current) => (current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId]));
  };

  const toggleUser = (userId: string) => {
    setPickedUserIds((current) => (current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]));
  };

  const handleSend = async () => {
    setError('');
    setSuccess('');
    if (!channels.length) {
      setError('اختر قناة واحدة على الأقل.');
      return;
    }
    if (!templateKey && (!title.trim() || !body.trim())) {
      setError('اكتب عنوانًا ومحتوى للإشعار أو اختر Template جاهز.');
      return;
    }
    if (!pickedUserIds.length && !roles.length) {
      setError('اختر مستخدمين أو أدوار قبل الإرسال.');
      return;
    }

    setSaving(true);
    try {
      await api.sendNotifications({
        templateKey: templateKey || undefined,
        title: title.trim() || undefined,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
        channels,
        userIds: pickedUserIds,
        roles,
      });
      setSuccess('تم إنشاء دفعة إشعارات بنجاح.');
      await loadData();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'تعذر إرسال الإشعارات.');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessPending = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await api.processPendingNotifications({ limit: 25 });
      setSuccess('تم تشغيل معالجة الإشعارات المعلقة.');
      await loadData();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'تعذر تشغيل المعالجة.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900">مركز الإشعارات</h2>
            <p className="text-sm text-gray-500 mt-1">إرسال إشعارات، متابعة التسليم، ومعالجة الرسائل المعلقة.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
            >
              <RefreshCcw size={14} />
              تحديث
            </button>
            <button
              type="button"
              onClick={handleProcessPending}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              معالجة المعلق
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">معلق: {summary.pendingCount || 0}</div>
          <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">فاشل: {summary.failedCount || 0}</div>
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Templates: {templates.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900">إرسال إشعار جديد</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-bold text-gray-700">
            <span>Template Key (اختياري)</span>
            <input aria-label="Template Key للإشعار" title="Template Key للإشعار" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-bold text-gray-700">
            <span>الموضوع (اختياري للبريد)</span>
            <input aria-label="موضوع الإشعار" title="موضوع الإشعار" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-bold text-gray-700">
            <span>العنوان</span>
            <input aria-label="عنوان الإشعار" title="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-bold text-gray-700">
            <span>المحتوى</span>
            <input aria-label="محتوى الإشعار" title="محتوى الإشعار" value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['in_app', 'email', 'whatsapp'] as const).map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => toggleChannel(channel)}
              className={`rounded-xl px-3 py-2 text-xs font-black ${channels.includes(channel) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {channel}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {roleOptions.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleRole(role.id)}
              className={`rounded-xl px-3 py-2 text-xs font-black ${roles.includes(role.id) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {role.label}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-gray-100 p-3">
          <div className="text-xs font-bold text-gray-500 mb-2">اختيار مستخدمين (اختياري - أول 200 مستخدم)</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {candidateUsers.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" aria-label={`اختيار المستخدم ${user.name}`} title={`اختيار المستخدم ${user.name}`} checked={pickedUserIds.includes(user.id)} onChange={() => toggleUser(user.id)} />
                <span>{user.name} ({user.role})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSend}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            إرسال الآن
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-gray-900 mb-3">آخر عمليات التسليم</h3>
        {loading ? (
          <div className="text-sm text-gray-500">جارٍ التحميل...</div>
        ) : deliveries.length ? (
          <div className="space-y-2">
            {deliveries.slice(0, 20).map((delivery) => (
              <div key={delivery.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                <div className="font-bold text-gray-900">{delivery.title || 'بدون عنوان'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {delivery.channel} - {delivery.status} - {delivery.recipientUserId || '-'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">لا توجد عمليات تسليم بعد.</div>
        )}
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div> : null}
    </div>
  );
};

export default NotificationsManager;
