import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Plus, RefreshCw, Save, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { api } from '../../../services/api';
type AiCloudProvider = 'gemini' | 'openrouter' | 'qwen' | 'deepseek' | 'openai';
type AiPlan = 'free' | 'trial' | 'paid' | 'unknown';
type QuotaScope = 'project' | 'account' | 'organization' | 'workspace' | 'model' | 'unknown';
type CapabilityId = 'student_chat' | 'question_tutor' | 'admin_copilot' | 'study_plan' | 'learning_path' | 'remediation' | 'authoring' | 'course_summary';
type CapabilityProfile = { providerOrder: string; paidAllowed: boolean; maxOutputTokens: number };
type ExternalPlatform = {
  id: string;
  name: string;
  enabled: boolean;
  platformType: 'lms' | 'marketplace' | 'crm' | 'custom';
  baseUrl: string;
  apiKey: string;
  apiKeys: string[];
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  syncStudents: boolean;
  syncCourses: boolean;
  syncOrders: boolean;
  syncScheduleCron: string;
  note: string;
};
type PlatformIntegrationSettings = {
  externalPlatforms: ExternalPlatform[];
  externalPlatformSecretState?: Record<string, Record<string, boolean>>;
};
type DraftPool = {
  provider: AiCloudProvider;
  poolLabel: string;
  accountLabel: string;
  projectLabel: string;
  plan: AiPlan;
  quotaScope: QuotaScope;
  model: string;
  baseUrl: string;
  priority: number;
  freeOnly: boolean;
  keysText: string;
};
const capabilityLabel: Record<CapabilityId, string> = {
  student_chat: 'مساعد الطالب',
  question_tutor: 'مساعد السؤال',
  admin_copilot: 'مساعد المدير',
  study_plan: 'خطة الدراسة',
  learning_path: 'المسار التعليمي',
  remediation: 'الخطة العلاجية',
  authoring: 'إنشاء المحتوى',
  course_summary: 'ملخص الدورة',
};
const capabilityIds = Object.keys(capabilityLabel) as CapabilityId[];
const providerLabel: Record<AiCloudProvider, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  qwen: 'Qwen / Alibaba',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
};
const defaultModel: Record<AiCloudProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openrouter: 'openrouter/auto',
  qwen: 'qwen-plus',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
};
const emptyExternal = (id: string, name: string): ExternalPlatform => ({
  id,
  name,
  enabled: true,
  platformType: 'custom',
  baseUrl: '',
  apiKey: '',
  apiKeys: [],
  apiSecret: '',
  webhookUrl: '',
  webhookSecret: '',
  syncStudents: false,
  syncCourses: false,
  syncOrders: false,
  syncScheduleCron: '',
  note: '',
});
const parseNote = (value: string) => {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};
const slug = (value: string) =>
  String(value || 'pool')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'pool';
const defaultDraft = (): DraftPool => ({
  provider: 'gemini',
  poolLabel: 'Google Project',
  accountLabel: '',
  projectLabel: '',
  plan: 'free',
  quotaScope: 'project',
  model: defaultModel.gemini,
  baseUrl: '',
  priority: 1,
  freeOnly: true,
  keysText: '',
});
export const AiControlCenterSettings: React.FC<{ onSaved?: () => Promise<void> | void }> = ({ onSaved }) => {
  const [settings, setSettings] = useState<PlatformIntegrationSettings | null>(null);
  const [draft, setDraft] = useState<DraftPool>(defaultDraft());
  const [paidAllowed, setPaidAllowed] = useState(false);
  const [dailySpendCapUsd, setDailySpendCapUsd] = useState(0);
  const [providerOrder, setProviderOrder] = useState('gemini,openrouter,qwen,deepseek,openai,none');
  const [routeProfiles, setRouteProfiles] = useState<Record<CapabilityId, CapabilityProfile>>(() =>
    Object.fromEntries(capabilityIds.map((id) => [id, { providerOrder: '', paidAllowed: false, maxOutputTokens: 700 }])) as Record<CapabilityId, CapabilityProfile>,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const hydrateGlobal = (next: PlatformIntegrationSettings) => {
    const global = next.externalPlatforms.find((item) => item.id.trim().toLowerCase() === 'ai-global');
    const note = parseNote(global?.note || '');
    setPaidAllowed(note.paidAllowed === true);
    setDailySpendCapUsd(Math.max(0, Number(note.dailySpendCapUsd || 0)));
    setProviderOrder(String(global?.syncScheduleCron || 'gemini,openrouter,qwen,deepseek,openai,none'));
    const rawProfiles = note.routeProfiles && typeof note.routeProfiles === 'object' ? note.routeProfiles as Record<string, Record<string, unknown>> : {};
    setRouteProfiles(Object.fromEntries(capabilityIds.map((id) => {
      const profile = rawProfiles[id] || {};
      return [id, {
        providerOrder: Array.isArray(profile.providerOrder) ? profile.providerOrder.map(String).join(',') : '',
        paidAllowed: profile.paidAllowed === true,
        maxOutputTokens: Math.max(64, Math.min(4000, Number(profile.maxOutputTokens || 700))),
      }];
    })) as Record<CapabilityId, CapabilityProfile>);
  };
  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.getPlatformIntegrations() as PlatformIntegrationSettings;
      const normalized = { ...response, externalPlatforms: Array.isArray(response?.externalPlatforms) ? response.externalPlatforms : [] };
      setSettings(normalized);
      hydrateGlobal(normalized);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر تحميل إعدادات الذكاء الاصطناعي.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const pools = useMemo(() => {
    if (!settings) return [];
    return settings.externalPlatforms
      .filter((item) => /^ai-(gemini|openrouter|qwen|deepseek|openai)(-|$)/.test(item.id.trim().toLowerCase()))
      .map((item) => {
        const note = parseNote(item.note);
        const provider = item.id.split('-')[1] as AiCloudProvider;
        const hasStoredSecret = Boolean(
          settings.externalPlatformSecretState?.[item.id.trim().toLowerCase()]?.apiKeys
          || settings.externalPlatformSecretState?.[item.id.trim().toLowerCase()]?.apiKey,
        );
        return { item, note, provider, hasStoredSecret };
      });
  }, [settings]);
  const updateExternal = (id: string, patch: Partial<ExternalPlatform>) => {
    setSettings((current) => current ? ({
      ...current,
      externalPlatforms: current.externalPlatforms.map((item) => item.id === id ? { ...item, ...patch } : item),
    }) : current);
  };
  const removePool = (id: string) => {
    setSettings((current) => current ? ({
      ...current,
      externalPlatforms: current.externalPlatforms.filter((item) => item.id !== id),
    }) : current);
  };
  const addPool = () => {
    if (!settings) return;
    const projectIdentity = draft.projectLabel || draft.accountLabel || draft.poolLabel;
    const baseId = `ai-${draft.provider}-${slug(projectIdentity)}`;
    let id = baseId;
    let counter = 2;
    const existing = new Set(settings.externalPlatforms.map((item) => item.id.trim().toLowerCase()));
    while (existing.has(id)) id = `${baseId}-${counter++}`;
    const keys = draft.keysText
      .split(/\r?\n|,/)
      .map((key) => key.trim())
      .filter(Boolean);
    const entry: ExternalPlatform = {
      ...emptyExternal(id, `${providerLabel[draft.provider]} — ${draft.poolLabel || draft.projectLabel || 'Pool'}`),
      baseUrl: draft.baseUrl.trim(),
      apiKeys: keys,
      note: JSON.stringify({
        quotaPoolId: id,
        poolLabel: draft.poolLabel.trim() || id,
        accountLabel: draft.accountLabel.trim(),
        projectLabel: draft.projectLabel.trim(),
        projectId: draft.projectLabel.trim(),
        plan: draft.plan,
        quotaScope: draft.quotaScope,
        priority: Math.max(1, Number(draft.priority || 1)),
        freeOnly: draft.freeOnly,
        model: draft.model.trim() || defaultModel[draft.provider],
      }),
    };
    setSettings((current) => current ? ({ ...current, externalPlatforms: [...current.externalPlatforms, entry] }) : current);
    setDraft(defaultDraft());
    setMessage({ kind: 'success', text: 'أضيفت الحصة محليًا. اضغط حفظ لتشفير المفاتيح وتفعيلها على الخادم.' });
  };
  const persist = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = [...settings.externalPlatforms];
      const index = next.findIndex((item) => item.id.trim().toLowerCase() === 'ai-global');
      const existingGlobal = index >= 0 ? next[index] : emptyExternal('ai-global', 'AI Global Routing');
      const existingNote = parseNote(existingGlobal.note);
      const global: ExternalPlatform = {
        ...existingGlobal,
        id: 'ai-global',
        name: existingGlobal.name || 'AI Global Routing',
        enabled: true,
        syncScheduleCron: providerOrder,
        note: JSON.stringify({
          ...existingNote,
          mode: 'auto',
          provider: String(providerOrder.split(',').map((item) => item.trim()).find(Boolean) || 'gemini'),
          paidAllowed,
          dailySpendCapUsd: Math.max(0, Number(dailySpendCapUsd || 0)),
          routeProfiles: Object.fromEntries(capabilityIds.map((id) => {
            const profile = routeProfiles[id];
            const providerOrder = profile.providerOrder.split(',').map((item) => item.trim()).filter(Boolean);
            return [id, {
              ...(providerOrder.length ? { providerOrder } : {}),
              paidAllowed: profile.paidAllowed,
              maxOutputTokens: Math.max(64, Math.min(4000, Number(profile.maxOutputTokens || 700))),
            }];
          })),
        }),
      };
      if (index >= 0) next[index] = global;
      else next.push(global);
      const saved = await api.updatePlatformIntegrations({ externalPlatforms: next }) as PlatformIntegrationSettings;
      const normalized = { ...saved, externalPlatforms: Array.isArray(saved?.externalPlatforms) ? saved.externalPlatforms : [] };
      setSettings(normalized);
      hydrateGlobal(normalized);
      setMessage({ kind: 'success', text: 'تم حفظ إعدادات الذكاء الاصطناعي وتشفير المفاتيح بنجاح.' });
      await onSaved?.();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ إعدادات الذكاء الاصطناعي.' });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-500"><Loader2 className="mx-auto mb-3 animate-spin" />جاري تحميل مفاتيح ومشاريع الذكاء...</div>;
  }
  return (
    <div className="space-y-5">
      {message && (
        <div className={`rounded-2xl border p-4 text-xs font-bold flex items-center gap-2 ${message.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {message.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2"><ShieldCheck size={17} className="text-indigo-600" />السياسة العامة والتكلفة</h3>
              <p className="text-xs text-gray-500 mt-1">Free First افتراضيًا. لن تستخدم الحصص المدفوعة إلا عند السماح الصريح.</p>
            </div>
            <button type="button" onClick={() => void load()} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"><RefreshCw size={15} /></button>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div>
              <p className="text-xs font-black text-gray-900">السماح بالمزودات المدفوعة</p>
              <p className="text-[11px] font-bold text-gray-500">اتركه مغلقًا لتعمل المنصة على المجاني والـfallback فقط.</p>
            </div>
            <input type="checkbox" checked={paidAllowed} onChange={(e) => setPaidAllowed(e.target.checked)} className="h-5 w-5" />
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-black text-gray-700">سقف التكلفة اليومية بالدولار</span>
              <input type="number" min={0} step="0.1" value={dailySpendCapUsd} onChange={(e) => setDailySpendCapUsd(Number(e.target.value || 0))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs" />
              <span className="text-[10px] font-bold text-gray-400">0 = لا سقف مالي إضافي؛ paidAllowed يظل مفتاح الحماية الأساسي.</span>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black text-gray-700">ترتيب المزودات العام</span>
              <input value={providerOrder} onChange={(e) => setProviderOrder(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono" />
              <span className="text-[10px] font-bold text-gray-400">يمكن لكل Capability لاحقًا أن تملك ترتيبًا خاصًا.</span>
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
          <Wallet size={20} className="text-indigo-700 mb-2" />
          <h3 className="font-black text-sm text-indigo-950">قاعدة الحصة</h3>
          <p className="text-xs font-bold text-indigo-800/80 mt-2 leading-relaxed">
            عدة مفاتيح داخل نفس Project = حصة واحدة. عند 429 ينتقل النظام إلى Project/Quota Pool آخر بدل تدوير مفاتيح تشترك في نفس الحد.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-black text-sm text-gray-900">توجيه كل مساعد حسب المهمة</h3>
          <p className="text-xs text-gray-500 mt-1">اترك ترتيب المزودات فارغًا لاستخدام الترتيب العام. السماح المدفوع هنا لا يعمل إلا إذا كان السماح العام مفعّلًا أيضًا.</p>
        </div>
        <div className="space-y-2">
          {capabilityIds.map((id) => {
            const profile = routeProfiles[id];
            return (
              <div key={id} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_120px_120px] gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <span className="text-xs font-black text-gray-800">{capabilityLabel[id]}</span>
                <input
                  value={profile.providerOrder}
                  onChange={(e) => setRouteProfiles((current) => ({ ...current, [id]: { ...current[id], providerOrder: e.target.value } }))}
                  placeholder="مثال: gemini,qwen,openrouter"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-mono"
                />
                <input
                  type="number"
                  min={64}
                  max={4000}
                  value={profile.maxOutputTokens}
                  onChange={(e) => setRouteProfiles((current) => ({ ...current, [id]: { ...current[id], maxOutputTokens: Number(e.target.value || 700) } }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
                  title="أقصى Output Tokens"
                />
                <label className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-600">
                  <input
                    type="checkbox"
                    checked={profile.paidAllowed}
                    onChange={(e) => setRouteProfiles((current) => ({ ...current, [id]: { ...current[id], paidAllowed: e.target.checked } }))}
                  />
                  مدفوع
                </label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-2"><KeyRound size={17} className="text-violet-600" />الحسابات والمشاريع والمفاتيح</h3>
          <p className="text-xs text-gray-500 mt-1">المفاتيح لا تعود من الخادم. يظهر فقط هل يوجد سر محفوظ، ويتم الاحتفاظ بالمفتاح القديم إذا تركت الحقل فارغًا.</p>
        </div>
        <div className="space-y-2">
          {pools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs font-bold text-gray-400">لا توجد Quota Pools سحابية بعد.</div>
          ) : pools.map(({ item, note, provider, hasStoredSecret }) => (
            <div key={item.id} className="rounded-xl border border-gray-200 p-3 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-xs text-gray-900">{String(note.poolLabel || item.name)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black">{providerLabel[provider] || provider}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">{String(note.plan || 'unknown')}</span>
                  {hasStoredSecret && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">مفتاح محفوظ 🔐</span>}
                </div>
                <p className="text-[11px] text-gray-500 font-bold mt-1 truncate">{String(note.accountLabel || '—')} / {String(note.projectLabel || note.projectId || '—')} · {String(note.model || 'model تلقائي')}</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <input type="checkbox" checked={item.enabled} onChange={(e) => updateExternal(item.id, { enabled: e.target.checked })} />
                مفعّل
              </label>
              <button type="button" onClick={() => removePool(item.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" title="حذف الحصة"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h4 className="text-xs font-black text-gray-800 flex items-center gap-2"><Plus size={15} />إضافة Account / Project / Quota Pool</h4>
          <div className="grid md:grid-cols-3 gap-3">
            <select value={draft.provider} onChange={(e) => {
              const provider = e.target.value as AiCloudProvider;
              setDraft((v) => ({ ...v, provider, model: defaultModel[provider], poolLabel: providerLabel[provider] }));
            }} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold">
              {Object.entries(providerLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <input value={draft.accountLabel} onChange={(e) => setDraft((v) => ({ ...v, accountLabel: e.target.value }))} placeholder="اسم الحساب - مثال Google A" className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <input value={draft.projectLabel} onChange={(e) => setDraft((v) => ({ ...v, projectLabel: e.target.value }))} placeholder="Project / Workspace ID أو اسم" className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <input value={draft.poolLabel} onChange={(e) => setDraft((v) => ({ ...v, poolLabel: e.target.value }))} placeholder="اسم الحصة داخل المنصة" className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <input value={draft.model} onChange={(e) => setDraft((v) => ({ ...v, model: e.target.value }))} placeholder="Model" className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono" />
            <input type="number" min={1} value={draft.priority} onChange={(e) => setDraft((v) => ({ ...v, priority: Number(e.target.value || 1) }))} placeholder="Priority" className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <select value={draft.plan} onChange={(e) => setDraft((v) => ({ ...v, plan: e.target.value as AiPlan }))} className="rounded-xl border border-gray-200 px-3 py-2 text-xs">
              <option value="free">Free</option><option value="trial">Trial</option><option value="paid">Paid</option><option value="unknown">Unknown</option>
            </select>
            <select value={draft.quotaScope} onChange={(e) => setDraft((v) => ({ ...v, quotaScope: e.target.value as QuotaScope }))} className="rounded-xl border border-gray-200 px-3 py-2 text-xs">
              <option value="project">Project</option><option value="account">Account</option><option value="organization">Organization</option><option value="workspace">Workspace</option><option value="model">Model</option><option value="unknown">Unknown</option>
            </select>
            <label className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold flex items-center gap-2">
              <input type="checkbox" checked={draft.freeOnly} onChange={(e) => setDraft((v) => ({ ...v, freeOnly: e.target.checked }))} />
              Free-only
            </label>
            <input value={draft.baseUrl} onChange={(e) => setDraft((v) => ({ ...v, baseUrl: e.target.value }))} placeholder="Base URL اختياري" className="md:col-span-3 rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono" />
            <textarea value={draft.keysText} onChange={(e) => setDraft((v) => ({ ...v, keysText: e.target.value }))} rows={3} placeholder="API Keys — مفتاح في كل سطر. لن تُعرض بعد الحفظ." className="md:col-span-3 rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono" />
          </div>
          <button type="button" onClick={addPool} disabled={!draft.projectLabel.trim() && !draft.accountLabel.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black disabled:opacity-50"><Plus size={15} />إضافة الحصة</button>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => void persist()} disabled={saving || !settings} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          حفظ إعدادات الذكاء
        </button>
      </div>
    </div>
  );
};
