import React, { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck, Link2, UserRoundPlus, Plus, Trash2, Search, Radio, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

type ProviderConfig = {
  enabled: boolean;
  mode: string;
  appId?: string;
  appSecret?: string;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  accessToken?: string;
  callbackUrl?: string;
  fromEmail?: string;
  senderName?: string;
  botUsername?: string;
  botToken?: string;
  chatId?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  verifyToken?: string;
  webhookUrl?: string;
  note?: string;
};

type RegistrationField = {
  id: string;
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  required: boolean;
  enabled: boolean;
  options: string[];
  placeholder: string;
  helpText: string;
  order: number;
};

type ExternalPlatform = {
  id: string;
  name: string;
  enabled: boolean;
  platformType: "lms" | "marketplace" | "crm" | "custom";
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  syncStudents: boolean;
  syncCourses: boolean;
  syncOrders: boolean;
  syncScheduleCron: string;
  note: string;
};

type IntegrationSettings = {
  key: string;
  auth: {
    allowSelfRegistration: boolean;
    allowEmailPassword: boolean;
    requireEmailVerification: boolean;
    requireAdminApproval: boolean;
    defaultRole: "student" | "parent";
    registrationTitle: string;
    registrationSubtitle: string;
    termsLink: string;
    privacyLink: string;
    maxAccountsPerDevice: number;
    allowedEmailDomains: string[];
  };
  providers: {
    google: ProviderConfig;
    facebook: ProviderConfig;
    whatsapp: ProviderConfig;
    telegram: ProviderConfig;
    email: ProviderConfig;
    sentry: ProviderConfig;
    redis: ProviderConfig;
    zoom: ProviderConfig;
    googleMeet: ProviderConfig;
    teams: ProviderConfig;
    youtubeLive: ProviderConfig;
  };
  seo: {
    enabled: boolean;
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultKeywords: string[];
    canonicalBaseUrl: string;
    defaultOgImage: string;
    twitterHandle: string;
    googleSiteVerification: string;
    googleAnalyticsId: string;
    googleTagManagerId: string;
    robotsIndexingEnabled: boolean;
    noIndexPaths: string[];
    organizationName: string;
    organizationLogoUrl: string;
    organizationUrl: string;
  };
  contactWidget: {
    enabled: boolean;
    channel: "whatsapp" | "telegram" | "phone";
    whatsappNumber: string;
    whatsappMessage: string;
    openInNewTab: boolean;
    showOnPublicPages: boolean;
    showOnDashboardPages: boolean;
  };
  externalPlatforms: ExternalPlatform[];
  registrationFields: RegistrationField[];
};

const emptySettings: IntegrationSettings = {
  key: "default",
  auth: {
    allowSelfRegistration: true,
    allowEmailPassword: true,
    requireEmailVerification: false,
    requireAdminApproval: false,
    defaultRole: "student",
    registrationTitle: "",
    registrationSubtitle: "",
    termsLink: "",
    privacyLink: "",
    maxAccountsPerDevice: 3,
    allowedEmailDomains: [],
  },
  providers: {
    google: { enabled: false, mode: "oauth" },
    facebook: { enabled: false, mode: "oauth" },
    whatsapp: { enabled: false, mode: "otp" },
    telegram: { enabled: false, mode: "bot" },
    email: { enabled: false, mode: "smtp" },
    sentry: { enabled: false, mode: "dsn" },
    redis: { enabled: false, mode: "managed" },
    zoom: { enabled: false, mode: "oauth" },
    googleMeet: { enabled: false, mode: "oauth" },
    teams: { enabled: false, mode: "oauth" },
    youtubeLive: { enabled: false, mode: "api" },
  },
  seo: {
    enabled: true,
    siteName: "منصة المئة",
    defaultTitle: "",
    defaultDescription: "",
    defaultKeywords: [],
    canonicalBaseUrl: "",
    defaultOgImage: "",
    twitterHandle: "",
    googleSiteVerification: "",
    googleAnalyticsId: "",
    googleTagManagerId: "",
    robotsIndexingEnabled: true,
    noIndexPaths: ["/#/admin-dashboard", "/#/dashboard", "/#/login"],
    organizationName: "",
    organizationLogoUrl: "",
    organizationUrl: "",
  },
  contactWidget: {
    enabled: true,
    channel: "whatsapp",
    whatsappNumber: "",
    whatsappMessage: "مرحبًا، أريد الاستفسار عن منصة المئة.",
    openInNewTab: true,
    showOnPublicPages: true,
    showOnDashboardPages: false,
  },
  externalPlatforms: [],
  registrationFields: [],
};

const createField = (index: number): RegistrationField => ({
  id: `field_${Date.now()}_${index}`,
  key: `custom_${index + 1}`,
  label: "حقل جديد",
  type: "text",
  required: false,
  enabled: true,
  options: [],
  placeholder: "",
  helpText: "",
  order: index,
});

const createExternalPlatform = (index: number): ExternalPlatform => ({
  id: `platform_${Date.now()}_${index}`,
  name: `منصة خارجية ${index + 1}`,
  enabled: false,
  platformType: "custom",
  baseUrl: "",
  apiKey: "",
  apiSecret: "",
  webhookUrl: "",
  webhookSecret: "",
  syncStudents: false,
  syncCourses: false,
  syncOrders: false,
  syncScheduleCron: "",
  note: "",
});

const providerLabels: Array<{ key: keyof IntegrationSettings["providers"]; label: string }> = [
  { key: "google", label: "Google Login" },
  { key: "facebook", label: "Facebook Login" },
  { key: "whatsapp", label: "WhatsApp OTP" },
  { key: "telegram", label: "Telegram Login/OTP" },
  { key: "email", label: "Email Provider" },
  { key: "sentry", label: "Sentry Monitoring" },
  { key: "redis", label: "Redis Managed" },
  { key: "zoom", label: "Zoom Live Classes" },
  { key: "googleMeet", label: "Google Meet Classes" },
  { key: "teams", label: "Microsoft Teams Classes" },
  { key: "youtubeLive", label: "YouTube Live Streams" },
];

export const PlatformIntegrationsManager: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [readiness, setReadiness] = useState<null | {
    status: string;
    score: number;
    checks: Array<{ id: string; title: string; status: "pass" | "warning" | "fail"; detail: string }>;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getPlatformIntegrations()
      .then((payload) => {
        if (cancelled) return;
        setSettings({ ...emptySettings, ...(payload as IntegrationSettings) });
      })
      .catch((error) => {
        if (cancelled) return;
        setStatusType("error");
        setStatusMessage(error instanceof Error ? error.message : "تعذر تحميل إعدادات التكاملات");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledProvidersCount = useMemo(
    () => Object.values(settings.providers).filter((provider) => provider.enabled).length,
    [settings.providers],
  );

  const updateAuth = <K extends keyof IntegrationSettings["auth"]>(key: K, value: IntegrationSettings["auth"][K]) => {
    setSettings((prev) => ({ ...prev, auth: { ...prev.auth, [key]: value } }));
  };

  const updateProvider = (providerKey: keyof IntegrationSettings["providers"], patch: Partial<ProviderConfig>) => {
    setSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [providerKey]: {
          ...prev.providers[providerKey],
          ...patch,
        },
      },
    }));
  };

  const updateSeo = <K extends keyof IntegrationSettings["seo"]>(key: K, value: IntegrationSettings["seo"][K]) => {
    setSettings((prev) => ({ ...prev, seo: { ...prev.seo, [key]: value } }));
  };
  const updateContactWidget = <K extends keyof IntegrationSettings["contactWidget"]>(
    key: K,
    value: IntegrationSettings["contactWidget"][K],
  ) => {
    setSettings((prev) => ({ ...prev, contactWidget: { ...prev.contactWidget, [key]: value } }));
  };

  const updateField = (id: string, patch: Partial<RegistrationField>) => {
    setSettings((prev) => ({
      ...prev,
      registrationFields: prev.registrationFields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  };

  const addField = () => {
    setSettings((prev) => ({
      ...prev,
      registrationFields: [...prev.registrationFields, createField(prev.registrationFields.length)],
    }));
  };

  const removeField = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      registrationFields: prev.registrationFields.filter((field) => field.id !== id),
    }));
  };

  const updateExternal = (id: string, patch: Partial<ExternalPlatform>) => {
    setSettings((prev) => ({
      ...prev,
      externalPlatforms: prev.externalPlatforms.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addExternal = () => {
    setSettings((prev) => ({
      ...prev,
      externalPlatforms: [...prev.externalPlatforms, createExternalPlatform(prev.externalPlatforms.length)],
    }));
  };

  const removeExternal = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      externalPlatforms: prev.externalPlatforms.filter((item) => item.id !== id),
    }));
  };

  const loadReadiness = async () => {
    try {
      const payload = await api.getIntegrationsReadiness();
      setReadiness(payload);
    } catch {
      setReadiness(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setStatusMessage("");
    try {
      const normalized = {
        ...settings,
        auth: {
          ...settings.auth,
          allowedEmailDomains: settings.auth.allowedEmailDomains.filter(Boolean),
        },
        seo: {
          ...settings.seo,
          defaultKeywords: settings.seo.defaultKeywords.filter(Boolean),
          noIndexPaths: settings.seo.noIndexPaths.filter(Boolean),
        },
        registrationFields: settings.registrationFields.map((field, index) => ({
          ...field,
          order: index,
          key: field.key.trim(),
          label: field.label.trim(),
          options: field.options.filter(Boolean),
        })),
        externalPlatforms: settings.externalPlatforms.map((item) => ({
          ...item,
          name: item.name.trim(),
          baseUrl: item.baseUrl.trim(),
        })),
      };
      const updated = (await api.updatePlatformIntegrations(normalized)) as IntegrationSettings;
      setSettings({ ...emptySettings, ...updated });
      setStatusType("success");
      setStatusMessage("تم حفظ إعدادات التكاملات والتسجيل وSEO بنجاح.");
      await loadReadiness();
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error instanceof Error ? error.message : "تعذر حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadReadiness();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">جاري تحميل إعدادات التكاملات...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900">إدارة التكاملات والتسجيل</h2>
            <p className="mt-1 text-sm text-gray-500">تحكم كامل على نمط WordPress: مفاتيح المشاريع، بوابات الدخول، SEO، ومنصات خارجية.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadReadiness()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700">
              <RefreshCw size={16} />
              فحص الجاهزية
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>
        </div>
        {statusMessage ? (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${statusType === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {statusMessage}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <ShieldCheck size={18} />
            <span className="text-sm font-black">سياسات التسجيل</span>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900">{settings.auth.allowSelfRegistration ? "مفتوح" : "مقفل"}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Link2 size={18} />
            <span className="text-sm font-black">التكاملات المفعلة</span>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900">{enabledProvidersCount}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <UserRoundPlus size={18} />
            <span className="text-sm font-black">حقول التسجيل</span>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900">{settings.registrationFields.length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Search size={18} />
            <span className="text-sm font-black">حالة SEO</span>
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900">{settings.seo.enabled ? "مفعل" : "متوقف"}</div>
        </div>
      </div>

      {readiness ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-lg font-black text-gray-900">جاهزية التكاملات</h3>
          <p className="mt-1 text-sm text-gray-500">الحالة: {readiness.status} - الدرجة: {readiness.score}/100</p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {readiness.checks.map((check) => (
              <div key={check.id} className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
                <div className="font-black">{check.title}</div>
                <div className={`${check.status === "pass" ? "text-emerald-700" : check.status === "warning" ? "text-amber-700" : "text-rose-700"}`}>{check.status}</div>
                <div className="text-gray-500">{check.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">إعدادات التسجيل الأساسية</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>السماح بالتسجيل الذاتي</span>
            <input type="checkbox" checked={settings.auth.allowSelfRegistration} onChange={(e) => updateAuth("allowSelfRegistration", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>السماح بالبريد وكلمة المرور</span>
            <input type="checkbox" checked={settings.auth.allowEmailPassword} onChange={(e) => updateAuth("allowEmailPassword", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>تفعيل تحقق البريد</span>
            <input type="checkbox" checked={settings.auth.requireEmailVerification} onChange={(e) => updateAuth("requireEmailVerification", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>موافقة الإدارة قبل التفعيل</span>
            <input type="checkbox" checked={settings.auth.requireAdminApproval} onChange={(e) => updateAuth("requireAdminApproval", e.target.checked)} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">مزودو التكاملات</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {providerLabels.map((provider) => (
            <div key={provider.key} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-black text-gray-900">{provider.label}</h4>
                <input type="checkbox" checked={settings.providers[provider.key].enabled} onChange={(e) => updateProvider(provider.key, { enabled: e.target.checked })} />
              </div>
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].mode || ""} onChange={(e) => updateProvider(provider.key, { mode: e.target.value })} placeholder="mode" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].appId || ""} onChange={(e) => updateProvider(provider.key, { appId: e.target.value })} placeholder="App ID / Project ID" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].clientId || ""} onChange={(e) => updateProvider(provider.key, { clientId: e.target.value })} placeholder="Client ID" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].clientSecret || ""} onChange={(e) => updateProvider(provider.key, { clientSecret: e.target.value })} placeholder="Client Secret / API Secret" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].apiKey || ""} onChange={(e) => updateProvider(provider.key, { apiKey: e.target.value })} placeholder="API Key" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].accessToken || ""} onChange={(e) => updateProvider(provider.key, { accessToken: e.target.value })} placeholder="Access Token / DSN / Redis URL" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].callbackUrl || ""} onChange={(e) => updateProvider(provider.key, { callbackUrl: e.target.value })} placeholder="Callback URL" />
              <input className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].webhookUrl || ""} onChange={(e) => updateProvider(provider.key, { webhookUrl: e.target.value })} placeholder="Webhook URL" />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} value={settings.providers[provider.key].note || ""} onChange={(e) => updateProvider(provider.key, { note: e.target.value })} placeholder="ملاحظات تشغيلية" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">زر التواصل العائم</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>تفعيل الزر العائم</span>
            <input type="checkbox" checked={settings.contactWidget.enabled} onChange={(e) => updateContactWidget("enabled", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>فتح في تبويب جديد</span>
            <input type="checkbox" checked={settings.contactWidget.openInNewTab} onChange={(e) => updateContactWidget("openInNewTab", e.target.checked)} />
          </label>
          <select className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.contactWidget.channel} onChange={(e) => updateContactWidget("channel", e.target.value as "whatsapp" | "telegram" | "phone")}>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="phone">Phone</option>
          </select>
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.contactWidget.whatsappNumber} onChange={(e) => updateContactWidget("whatsappNumber", e.target.value)} placeholder="رقم الواتساب بصيغة دولية 9665xxxxxxx" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" value={settings.contactWidget.whatsappMessage} onChange={(e) => updateContactWidget("whatsappMessage", e.target.value)} placeholder="رسالة البداية" />
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>إظهار في الصفحات العامة</span>
            <input type="checkbox" checked={settings.contactWidget.showOnPublicPages} onChange={(e) => updateContactWidget("showOnPublicPages", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>إظهار في لوحات المستخدمين</span>
            <input type="checkbox" checked={settings.contactWidget.showOnDashboardPages} onChange={(e) => updateContactWidget("showOnDashboardPages", e.target.checked)} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">إعدادات SEO والظهور في Google</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>تفعيل SEO</span>
            <input type="checkbox" checked={settings.seo.enabled} onChange={(e) => updateSeo("enabled", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>السماح بالأرشفة (robots index)</span>
            <input type="checkbox" checked={settings.seo.robotsIndexingEnabled} onChange={(e) => updateSeo("robotsIndexingEnabled", e.target.checked)} />
          </label>
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.siteName} onChange={(e) => updateSeo("siteName", e.target.value)} placeholder="اسم الموقع" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.defaultTitle} onChange={(e) => updateSeo("defaultTitle", e.target.value)} placeholder="العنوان الافتراضي" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" value={settings.seo.defaultDescription} onChange={(e) => updateSeo("defaultDescription", e.target.value)} placeholder="الوصف الافتراضي" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.canonicalBaseUrl} onChange={(e) => updateSeo("canonicalBaseUrl", e.target.value)} placeholder="Canonical Base URL" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.defaultOgImage} onChange={(e) => updateSeo("defaultOgImage", e.target.value)} placeholder="OG Image URL" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleSiteVerification} onChange={(e) => updateSeo("googleSiteVerification", e.target.value)} placeholder="Google Site Verification" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleAnalyticsId} onChange={(e) => updateSeo("googleAnalyticsId", e.target.value)} placeholder="Google Analytics ID (G-XXXX)" />
          <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleTagManagerId} onChange={(e) => updateSeo("googleTagManagerId", e.target.value)} placeholder="Google Tag Manager ID (GTM-XXXX)" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">ربط المنصات الخارجية (Eduoma وغيرها)</h3>
          <button onClick={addExternal} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
            <Plus size={14} />
            إضافة منصة
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {settings.externalPlatforms.map((platform) => (
            <div key={platform.id} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 p-3 md:grid-cols-12">
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.name} onChange={(e) => updateExternal(platform.id, { name: e.target.value })} placeholder="اسم المنصة" />
              <select className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.platformType} onChange={(e) => updateExternal(platform.id, { platformType: e.target.value as ExternalPlatform["platformType"] })}>
                <option value="lms">LMS</option>
                <option value="marketplace">Marketplace</option>
                <option value="crm">CRM</option>
                <option value="custom">Custom</option>
              </select>
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.baseUrl} onChange={(e) => updateExternal(platform.id, { baseUrl: e.target.value })} placeholder="API Base URL" />
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.apiKey} onChange={(e) => updateExternal(platform.id, { apiKey: e.target.value })} placeholder="API Key" />
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={platform.enabled} onChange={(e) => updateExternal(platform.id, { enabled: e.target.checked })} />
                active
              </label>
              <button onClick={() => removeExternal(platform.id)} className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-black text-rose-700 md:col-span-1">
                <Trash2 size={14} />
              </button>
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.webhookUrl} onChange={(e) => updateExternal(platform.id, { webhookUrl: e.target.value })} placeholder="Webhook URL" />
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.webhookSecret} onChange={(e) => updateExternal(platform.id, { webhookSecret: e.target.value })} placeholder="Webhook Secret" />
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.syncScheduleCron} onChange={(e) => updateExternal(platform.id, { syncScheduleCron: e.target.value })} placeholder="Sync schedule (cron)" />
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={platform.syncStudents} onChange={(e) => updateExternal(platform.id, { syncStudents: e.target.checked })} />
                طلاب
              </label>
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={platform.syncCourses} onChange={(e) => updateExternal(platform.id, { syncCourses: e.target.checked })} />
                كورسات
              </label>
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={platform.syncOrders} onChange={(e) => updateExternal(platform.id, { syncOrders: e.target.checked })} />
                طلبات
              </label>
            </div>
          ))}
          {settings.externalPlatforms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">لا توجد منصات خارجية مضافة.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">حقول التسجيل المتقدمة</h3>
          <button onClick={addField} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
            <Plus size={14} />
            إضافة حقل
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {settings.registrationFields.map((field) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 p-3 md:grid-cols-12">
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.key} onChange={(e) => updateField(field.id, { key: e.target.value })} placeholder="key" />
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="label" />
              <select className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as RegistrationField["type"] })}>
                <option value="text">text</option>
                <option value="email">email</option>
                <option value="phone">phone</option>
                <option value="select">select</option>
                <option value="textarea">textarea</option>
              </select>
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.placeholder || ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="placeholder" />
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                required
              </label>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" checked={field.enabled} onChange={(e) => updateField(field.id, { enabled: e.target.checked })} />
                active
              </label>
              <button onClick={() => removeField(field.id)} className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-black text-rose-700 md:col-span-1">
                <Trash2 size={14} />
              </button>
              <input className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-12" value={field.helpText || ""} onChange={(e) => updateField(field.id, { helpText: e.target.value })} placeholder="help text" />
            </div>
          ))}
          {settings.registrationFields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">لا توجد حقول إضافية حالياً.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-sm text-indigo-800">
        <h3 className="mb-2 text-base font-black">دليل سريع للربط</h3>
        <ul className="space-y-1">
          <li className="flex items-start gap-2"><Radio size={14} className="mt-1" /> Google/Facebook: ضع Client ID/Secret + Callback URL ثم فعّل المزود.</li>
          <li className="flex items-start gap-2"><Radio size={14} className="mt-1" /> WhatsApp/Telegram: ضع Token + Webhook URL + Verify token، ثم اختبر الاستقبال.</li>
          <li className="flex items-start gap-2"><Radio size={14} className="mt-1" /> Zoom/Meet/Teams/YouTube Live: أضف مفاتيح OAuth/API وحدد callback ثم اربطها مع الدروس الحية.</li>
          <li className="flex items-start gap-2"><Radio size={14} className="mt-1" /> SEO: أضف site verification + GA/GTM + canonical ثم احفظ.</li>
          <li className="flex items-start gap-2"><Radio size={14} className="mt-1" /> Eduoma أو منصة خارجية: أضف base URL + API keys + webhook وفعل مزامنة الطلاب/الكورسات.</li>
        </ul>
      </div>
    </div>
  );
};
