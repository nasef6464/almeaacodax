import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, CheckCircle2, Clock, Download, Loader2, Mail, MessageSquare,
  RefreshCcw, Search, Send, Users, XCircle, Zap, Filter, ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import {
  CHANNEL_META,
  ROLE_OPTIONS,
  StatusIcon,
  STATUS_LABEL,
  STATUS_STYLE,
} from './notificationsPresentation.js';
import type { Channel, DeliveryItem, TemplateItem } from './notificationsPresentation.js';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const NotificationsManager: React.FC = () => {
  const { users } = useStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [templates, setTemplates]   = useState<TemplateItem[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [summary, setSummary]       = useState<{ pendingCount?: number; failedCount?: number; sentCount?: number }>({});

  // ── Form state ─────────────────────────────────────────────────────────────
  const [templateKey,   setTemplateKey]   = useState('');
  const [title,         setTitle]         = useState('');
  const [subject,       setSubject]       = useState('');
  const [body,          setBody]          = useState('');
  const [channels,      setChannels]      = useState<Channel[]>(['in_app']);
  const [roles,         setRoles]         = useState<string[]>([]);
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);
  const [userSearch,    setUserSearch]    = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  // ── Filtered users ─────────────────────────────────────────────────────────
  const candidateUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users
      .filter(u => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 100);
  }, [users, userSearch]);

  const filteredDeliveries = useMemo(() => {
    if (deliveryFilter === 'all') return deliveries;
    return deliveries.filter(d => d.status === deliveryFilter);
  }, [deliveries, deliveryFilter]);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tpl, dlv] = await Promise.all([
        api.getNotificationTemplates({ limit: 50 }),
        api.getNotificationDeliveries({ limit: 100 }),
      ]);
      setTemplates(((tpl as { templates?: TemplateItem[] })?.templates) || []);
      const dlvItems = ((dlv as { deliveries?: DeliveryItem[] })?.deliveries) || [];
      setDeliveries(dlvItems);
      const sent    = dlvItems.filter(d => d.status === 'sent').length;
      const pending = dlvItems.filter(d => ['pending','retrying'].includes(d.status)).length;
      const failed  = dlvItems.filter(d => d.status === 'failed').length;
      setSummary({ sentCount: sent, pendingCount: pending, failedCount: failed });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الإشعارات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toggles ────────────────────────────────────────────────────────────────
  const toggleChannel = (ch: Channel) =>
    setChannels(c => c.includes(ch) ? (c.length > 1 ? c.filter(x => x !== ch) : c) : [...c, ch]);
  const toggleRole    = (r: string) =>
    setRoles(c => c.includes(r) ? c.filter(x => x !== r) : [...c, r]);
  const toggleUser    = (id: string) =>
    setPickedUserIds(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  // Apply template to form fields
  const applyTemplate = (t: TemplateItem) => {
    setTemplateKey(t.key);
    setTitle(t.title || '');
    setBody(t.body || '');
    if (t.channel) setChannels([t.channel]);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setError(''); setSuccess('');
    if (!channels.length)                              return setError('اختر قناة واحدة على الأقل.');
    if (!templateKey && (!title.trim() || !body.trim())) return setError('اكتب عنوانًا ومحتوى أو اختر Template جاهز.');
    if (!pickedUserIds.length && !roles.length)        return setError('اختر مستخدمين أو أدوار قبل الإرسال.');
    setSaving(true);
    try {
      await api.sendNotifications({ templateKey: templateKey || undefined, title: title.trim() || undefined, subject: subject.trim() || undefined, body: body.trim() || undefined, channels, userIds: pickedUserIds, roles });
      setSuccess(`✅ تم إنشاء ${pickedUserIds.length + (roles.length ? 1 : 0)} دفعة إشعارات بنجاح.`);
      setTitle(''); setBody(''); setSubject(''); setTemplateKey(''); setRoles([]); setPickedUserIds([]);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال الإشعارات.');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessPending = async () => {
    setProcessing(true); setError(''); setSuccess('');
    try {
      await api.processPendingNotifications({ limit: 25 });
      setSuccess('✅ تم تشغيل معالجة الإشعارات المعلقة.');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تشغيل المعالجة.');
    } finally {
      setProcessing(false);
    }
  };

  const exportDeliveriesCSV = () => {
    const rows = [
      ['الحالة', 'القناة', 'العنوان', 'المستلم', 'التاريخ'],
      ...deliveries.map(d => [
        STATUS_LABEL[d.status] || d.status,
        d.channel,
        d.title || '',
        d.recipientUserId || '',
        d.createdAt ? new Date(d.createdAt).toLocaleDateString('ar-SA') : '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `إشعارات_${new Date().toLocaleDateString('ar-SA')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const selectedCount = pickedUserIds.length + (roles.length > 0 ? users.filter(u => roles.includes(u.role)).length : 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-right">

      {/* ── Header Stats ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Bell className="text-indigo-600" size={22} />
              مركز الإشعارات
            </h2>
            <p className="text-sm text-gray-500 mt-1">إرسال إشعارات جماعية، متابعة حالة التسليم، ومعالجة الرسائل المعلقة.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
            <button onClick={handleProcessPending} disabled={processing} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50">
              {processing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              معالجة المعلق ({summary.pendingCount || 0})
            </button>
            <button onClick={exportDeliveriesCSV} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <Download size={14} /> تصدير CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'مُرسَلة',         val: summary.sentCount    ?? 0, cls: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
            { label: 'معلقة / جارية',   val: summary.pendingCount ?? 0, cls: 'bg-amber-50 border-amber-100 text-amber-800' },
            { label: 'فاشلة',           val: summary.failedCount  ?? 0, cls: 'bg-rose-50 border-rose-100 text-rose-800' },
          ].map(({ label, val, cls }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${cls}`}>
              <div className="text-2xl font-black">{val}</div>
              <div className="text-xs font-bold mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Templates ────────────────────────────────────────────────────── */}
      {templates.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-indigo-500" /> قوالب جاهزة (اختياري)
          </h3>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button key={t.key} onClick={() => applyTemplate(t)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${templateKey === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'}`}>
                {t.name || t.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Compose ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Send size={18} className="text-indigo-600" /> إنشاء إشعار جديد
        </h3>

        {/* Title + Body */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-gray-700">العنوان <span className="text-rose-500">*</span></span>
            <input
              aria-label="عنوان الإشعار" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: تذكير بالاختبار الأسبوعي"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-bold text-gray-700">
              المحتوى <span className="text-rose-500">*</span>
            </span>
            <input
              aria-label="محتوى الإشعار" value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="مثال: يرجى الاستعداد للاختبار المقرر غداً..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors" />
          </label>
        </div>

        {/* Advanced: subject + templateKey */}
        <div>
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800">
            <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            {showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'خيارات متقدمة (Template Key / الموضوع)'}
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-gray-600">Template Key (اختياري)</span>
                <input aria-label="Template Key" value={templateKey} onChange={e => setTemplateKey(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-gray-600">الموضوع (للبريد الإلكتروني)</span>
                <input aria-label="موضوع الإشعار" value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </label>
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-gray-700">قنوات الإرسال</span>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CHANNEL_META) as [Channel, typeof CHANNEL_META[Channel]][]).map(([ch, meta]) => (
              <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${channels.includes(ch) ? meta.active : meta.inactive}`}>
                {meta.icon} {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-gray-700">إرسال لجميع بدور معين</span>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(r => (
              <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${roles.includes(r.id) ? r.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* User search */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Users size={14} /> إرسال لمستخدمين محددين (اختياري)
          </span>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="بحث عن مستخدم"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors" />
          </div>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {candidateUsers.length === 0 && (
              <p className="text-xs text-gray-400 col-span-2 text-center py-4">لا توجد نتائج</p>
            )}
            {candidateUsers.map(u => (
              <label key={u.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${pickedUserIds.includes(u.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-white'}`}>
                <input type="checkbox" aria-label={`اختيار ${u.name}`} checked={pickedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-indigo-600" />
                <span className="text-xs font-bold text-gray-800 truncate">{u.name}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{u.role}</span>
              </label>
            ))}
          </div>
          {(pickedUserIds.length > 0 || roles.length > 0) && (
            <p className="text-xs text-indigo-600 font-bold">
              سيصل الإشعار لـ ~{selectedCount} مستخدم
            </p>
          )}
        </div>

        {/* Send Button */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={handleSend} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-all hover:shadow-md">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {saving ? 'جارٍ الإرسال...' : 'إرسال الإشعار'}
          </button>
          {(title || body || pickedUserIds.length > 0 || roles.length > 0) && (
            <button type="button" onClick={() => { setTitle(''); setBody(''); setSubject(''); setTemplateKey(''); setRoles([]); setPickedUserIds([]); setError(''); setSuccess(''); }}
              className="text-xs font-bold text-gray-500 hover:text-rose-600 transition-colors">
              مسح الحقول
            </button>
          )}
        </div>

        {error   && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div>}
      </div>

      {/* ── Delivery Log ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Filter size={16} className="text-gray-500" /> سجل عمليات التسليم
          </h3>
          <div className="flex items-center gap-2">
            {(['all', 'sent', 'pending', 'failed'] as const).map(f => (
              <button key={f} onClick={() => setDeliveryFilter(f)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${deliveryFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'all' ? 'الكل' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">لا توجد عمليات تسليم.</div>
        ) : (
          <div className="space-y-2">
            {filteredDeliveries.slice(0, 50).map(d => (
              <div key={d.id} className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 flex items-start justify-between gap-3 hover:bg-white transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{d.title || 'بدون عنوان'}</p>
                  {d.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{d.body}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span className="font-bold">{CHANNEL_META[d.channel]?.label || d.channel}</span>
                    {d.recipientUserId && <span>المستلم: {d.recipientUserId.slice(0, 8)}…</span>}
                    {d.createdAt && <span>{new Date(d.createdAt).toLocaleDateString('ar-SA', { dateStyle: 'short' })}</span>}
                  </div>
                </div>
                <span className={`shrink-0 flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[d.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  <StatusIcon status={d.status} />
                  {STATUS_LABEL[d.status] || d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsManager;
