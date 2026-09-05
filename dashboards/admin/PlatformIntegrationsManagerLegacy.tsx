import React, { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck, Link2, UserRoundPlus, Plus, Trash2, Search, Radio, RefreshCw, ExternalLink, Copy } from "lucide-react";
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
  apiKeys?: string[];
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
  providerSecretState?: Record<string, Partial<Record<"appSecret" | "clientSecret" | "apiKey" | "accessToken" | "botToken" | "verifyToken", boolean>>>;
  externalPlatformSecretState?: Record<string, Partial<Record<"apiKey" | "apiSecret" | "webhookSecret" | "apiKeys", boolean>>>;
};

type IntegrationHistoryItem = {
  _id: string;
  updatedBy?: string;
  note?: string;
  createdAt?: string;
};

type SetupChecklist = {
  publicBaseUrl: string;
  apiBaseUrl: string;
  summary: { total: number; enabled: number; configuredEnabled: number; blockers: string[] };
  checks: Array<{
    id: string;
    title: string;
    envKeys: string[];
    callbackUrl: string;
    webhookUrl: string;
    enabled: boolean;
    isConfigured: boolean;
    notes: string;
  }>;
};

type RuntimeAudit = {
  summary: { total: number; enabled: number; runtimeReady: number; blocked: string[] };
  items: Array<{
    id: string;
    title: string;
    enabled: boolean;
    dbConfigured: boolean;
    envConfigured: boolean;
    runtimeReady: boolean;
    health?: { ok: boolean; status: string; latencyMs: number | null; error: string };
  }>;
};

type StudentAiRuntimeSummary = {
  provider: string;
  model: string;
  providerOrderSource: string;
  routingMode: "manual" | "auto" | "unknown";
  providerOrder: string;
  configuredProviders: number;
  studentChats24h: number;
  fallbackStudentChats24h: number;
  errors24h: number;
  lastStudentProvider: string;
  lastStudentStatus: string;
  lastStudentFallback: boolean;
  lastStudentFallbackReason?: string;
  note?: string;
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
  apiKeys: [],
  apiSecret: "",
  webhookUrl: "",
  webhookSecret: "",
  syncStudents: false,
  syncCourses: false,
  syncOrders: false,
  syncScheduleCron: "",
  note: "",
});

const aiExternalTemplates: Array<{
  id: string;
  name: string;
  baseUrl: string;
  note: string;
}> = [
  { id: "ai-global", name: "AI Global Routing", baseUrl: "", note: "gemini" },
  { id: "ai-gemini", name: "AI Gemini Free", baseUrl: "", note: "model=gemini-2.5-flash" },
  { id: "ai-openrouter", name: "AI OpenRouter Free", baseUrl: "https://openrouter.ai/api/v1", note: "model=qwen/qwen3-235b-a22b:free" },
  { id: "ai-qwen", name: "AI Qwen Free", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", note: "model=qwen-plus" },
  { id: "ai-deepseek", name: "AI DeepSeek", baseUrl: "https://api.deepseek.com", note: "model=deepseek-chat" },
  { id: "ai-openai", name: "AI OpenAI", baseUrl: "https://api.openai.com/v1", note: "model=gpt-4.1-mini" },
  { id: "ai-ollama", name: "AI Ollama Local", baseUrl: "http://127.0.0.1:11434", note: "model=gemma3:4b" },
  { id: "ai-lmstudio", name: "AI LM Studio Local", baseUrl: "http://127.0.0.1:1234/v1", note: "model=local-model" },
];

const aiProviderOptions = [
  { id: "auto", label: "تلقائي" },
  { id: "gemini", label: "Gemini" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "qwen", label: "Qwen" },
];

const isAiExternalPlatform = (id: string) => id.trim().toLowerCase().startsWith("ai-");

const aiProviderFromExternalId = (id: string) => id.trim().toLowerCase().replace(/^ai-/, "");

const readAiNote = (note: string) => {
  try {
    const parsed = JSON.parse(note || "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const model = String(note || "").match(/(?:^|[,\s;])model\s*[:=]\s*([A-Za-z0-9_.:/-]+)/i)?.[1] || "";
    return model ? { model } : {};
  }
};

const writeAiNote = (currentNote: string, patch: Record<string, string>) =>
  JSON.stringify({ ...readAiNote(currentNote), ...patch });

const aiProviderOrder = (primary: string) => {
  const base = ["gemini", "openrouter", "openai", "deepseek", "qwen", "ollama", "lmstudio", "none"];
  if (primary === "auto") return base.join(",");
  return [primary, ...base.filter((item) => item !== primary)].join(",");
};

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

const providerGuides: Record<
  keyof IntegrationSettings["providers"],
  {
    sourceLabel: string;
    sourceUrl: string;
    fieldsHelp: string[];
    notes: string[];
    callbackPath?: string;
    webhookPath?: string;
  }
> = {
  google: {
    sourceLabel: "Google Cloud Console",
    sourceUrl: "https://console.cloud.google.com/apis/credentials",
    fieldsHelp: [
      "Client ID -> ضعها في خانة Client ID",
      "Client Secret -> ضعها في خانة Client Secret",
      "Redirect URI -> ضعها في خانة Callback URL",
    ],
    notes: ["نوع التطبيق: Web application", "فعّل Google Identity/OAuth consent screen"],
    callbackPath: "/api/auth/google/callback",
  },
  facebook: {
    sourceLabel: "Meta Developers",
    sourceUrl: "https://developers.facebook.com/apps/",
    fieldsHelp: [
      "App ID -> ضعها في App ID",
      "App Secret -> ضعها في Client Secret",
      "Valid OAuth Redirect URI -> ضعها في Callback URL",
    ],
    notes: ["أضف النطاق في App Domains", "فعّل Facebook Login (Web)"],
    callbackPath: "/api/auth/facebook/callback",
  },
  whatsapp: {
    sourceLabel: "Meta WhatsApp Cloud API",
    sourceUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/",
    fieldsHelp: [
      "Access Token -> ضعها في Access Token",
      "Phone Number ID -> ضعها في Phone Number ID",
      "Business Account ID -> ضعها في Business Account ID",
      "Verify Token -> ضعها في Verify Token",
      "Webhook URL -> ضعها في Webhook URL",
    ],
    notes: ["الرقم يكون دولي بدون 00 في الإعدادات العامة للزر العائم", "اختبر Webhook من Meta dashboard"],
    webhookPath: "/api/webhooks/whatsapp",
  },
  telegram: {
    sourceLabel: "Telegram BotFather",
    sourceUrl: "https://t.me/BotFather",
    fieldsHelp: [
      "Bot Token -> ضعها في Access Token أو Bot Token",
      "Bot Username -> ضعها في Bot Username",
      "Webhook URL -> ضعها في Webhook URL",
    ],
    notes: ["استخدم /setdomain و /setprivacy عند الحاجة"],
    webhookPath: "/api/webhooks/telegram",
  },
  email: {
    sourceLabel: "Email Provider Dashboard",
    sourceUrl: "https://resend.com/",
    fieldsHelp: [
      "API Key -> ضعها في API Key",
      "From Email -> ضعها في From Email",
      "Sender Name -> ضعها في Sender Name",
    ],
    notes: ["يمكن التبديل بين Resend/SendGrid/Mailgun حسب البنية الخلفية"],
  },
  sentry: {
    sourceLabel: "Sentry Project Settings",
    sourceUrl: "https://sentry.io/settings/",
    fieldsHelp: ["DSN -> ضعها في Access Token (DSN)", "Environment -> يوضع في متغيرات الخادم"],
    notes: ["يفضل تفعيل release tracking"],
  },
  redis: {
    sourceLabel: "Upstash / Redis Cloud",
    sourceUrl: "https://console.upstash.com/",
    fieldsHelp: ["Redis URL -> ضعها في Access Token (أو REDIS_URL في env)"],
    notes: ["مطلوبة للـqueue + distributed rate limit"],
  },
  zoom: {
    sourceLabel: "Zoom Marketplace",
    sourceUrl: "https://marketplace.zoom.us/",
    fieldsHelp: [
      "Client ID -> خانة Client ID",
      "Client Secret -> خانة Client Secret",
      "Redirect URL -> خانة Callback URL",
    ],
    notes: ["نوع التطبيق: OAuth"],
    callbackPath: "/api/auth/zoom/callback",
  },
  googleMeet: {
    sourceLabel: "Google Cloud (Calendar/Meet scopes)",
    sourceUrl: "https://console.cloud.google.com/apis/credentials",
    fieldsHelp: ["Client ID", "Client Secret", "Callback URL"],
    notes: ["فعّل Google Calendar API وصلاحيات إنشاء الاجتماعات"],
    callbackPath: "/api/auth/google-meet/callback",
  },
  teams: {
    sourceLabel: "Microsoft Entra Admin Center",
    sourceUrl: "https://entra.microsoft.com/",
    fieldsHelp: ["Application (client) ID", "Client Secret", "Redirect URI (Callback URL)"],
    notes: ["فعّل صلاحيات Teams/Graph المناسبة"],
    callbackPath: "/api/auth/teams/callback",
  },
  youtubeLive: {
    sourceLabel: "Google Cloud (YouTube Data API)",
    sourceUrl: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    fieldsHelp: ["API Key أو OAuth حسب التدفق", "Callback URL عند استخدام OAuth"],
    notes: ["فعّل YouTube Data API v3"],
    callbackPath: "/api/auth/youtube/callback",
  },
};

export const PlatformIntegrationsManager: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>(emptySettings);
  const [history, setHistory] = useState<IntegrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [setupChecklist, setSetupChecklist] = useState<SetupChecklist | null>(null);
  const [runtimeAudit, setRuntimeAudit] = useState<RuntimeAudit | null>(null);
  const [studentAiRuntimeSummary, setStudentAiRuntimeSummary] = useState<StudentAiRuntimeSummary | null>(null);
  const [studentAiRuntimeLoading, setStudentAiRuntimeLoading] = useState(false);
  const [readiness, setReadiness] = useState<null | {
    status: string;
    score: number;
    checks: Array<{ id: string; title: string; status: "pass" | "warning" | "fail"; detail: string }>;
  }>(null);
  const [openGuideFor, setOpenGuideFor] = useState<keyof IntegrationSettings["providers"] | null>(null);
  const [testChannel, setTestChannel] = useState<"email" | "whatsapp">("email");
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("هذه رسالة اختبار من منصة المئة.");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<"providers" | "ai-platforms" | "auth-registration" | "seo-branding" | "audit-tests">("providers");

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

  const addExternalTemplate = (templateId: string) => {
    const template = aiExternalTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setSettings((prev) => {
      if (prev.externalPlatforms.some((item) => item.id.trim().toLowerCase() === template.id)) {
        setStatusType("error");
        setStatusMessage(`المعرف ${template.id} موجود بالفعل.`);
        return prev;
      }
      return {
        ...prev,
        externalPlatforms: [
          ...prev.externalPlatforms,
          {
            ...createExternalPlatform(prev.externalPlatforms.length),
            id: template.id,
            name: template.name,
            enabled: true,
            platformType: "custom",
            baseUrl: template.baseUrl,
            note: template.note,
          },
        ],
      };
    });
  };

  const setupFreeAiStack = () => {
    setSettings((prev) => {
      const next = [...prev.externalPlatforms];
      const byId = new Map(next.map((item, index) => [item.id.trim().toLowerCase(), index] as const));

      const upsert = (templateId: string, patch?: Partial<ExternalPlatform>) => {
        const template = aiExternalTemplates.find((item) => item.id === templateId);
        if (!template) return;
        const foundIndex = byId.get(template.id);
        if (typeof foundIndex === "number") {
          next[foundIndex] = {
            ...next[foundIndex],
            enabled: true,
            baseUrl: next[foundIndex].baseUrl || template.baseUrl,
            note: next[foundIndex].note || template.note,
            ...(patch || {}),
          };
          return;
        }
        const newItem: ExternalPlatform = {
          ...createExternalPlatform(next.length),
          id: template.id,
          name: template.name,
          enabled: true,
          platformType: "custom",
          baseUrl: template.baseUrl,
          note: template.note,
          ...(patch || {}),
        };
        next.push(newItem);
        byId.set(template.id, next.length - 1);
      };

      upsert("ai-global", {
        syncScheduleCron: aiProviderOrder("auto"),
        note: JSON.stringify({ mode: "auto", provider: "gemini" }),
      });
      upsert("ai-gemini");
      upsert("ai-openrouter");
      upsert("ai-qwen");

      return {
        ...prev,
        externalPlatforms: next,
      };
    });
    setStatusType("success");
    setStatusMessage("تمت تهيئة المسار المجاني للذكاء: Gemini ثم OpenRouter ثم Qwen ثم fallback.");
  };

  const aiTemplateStatus = useMemo(() => {
    const byId = new Map(
      settings.externalPlatforms.map((item) => [item.id.trim().toLowerCase(), item] as const),
    );
    return aiExternalTemplates.map((template) => {
      const item = byId.get(template.id);
      return {
        id: template.id,
        exists: Boolean(item),
        enabled: Boolean(item?.enabled),
        hasKey: Boolean(String(item?.apiKey || item?.apiSecret || "").trim() || (item?.apiKeys || []).some((key) => String(key || "").trim())),
      };
    });
  }, [settings.externalPlatforms]);

  const aiConfigWarnings = useMemo(() => {
    const warnings: string[] = [];
    const byId = new Map(settings.externalPlatforms.map((item) => [item.id.trim().toLowerCase(), item] as const));
    const global = byId.get("ai-global");
    const route = String(global?.syncScheduleCron || "").trim();

    if (!global) {
      warnings.push("عنصر ai-global غير موجود. يُفضّل إضافته لتحديد ترتيب المزودات.");
    } else if (!route) {
      warnings.push("ai-global موجود لكن ترتيب المزودات فارغ. أضف مثل: gemini,openrouter,qwen,none");
    } else {
      const invalid = route
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .filter((x) => !["gemini", "openrouter", "deepseek", "qwen", "openai", "ollama", "lmstudio", "none"].includes(x));
      if (invalid.length > 0) warnings.push(`ترتيب ai-global يحتوي مزودات غير معروفة: ${invalid.join(", ")}`);
    }

    aiExternalTemplates
      .filter((item) => item.id !== "ai-global")
      .forEach((template) => {
        const entry = byId.get(template.id);
        if (!entry || !entry.enabled) return;
        const hasKey = Boolean(String(entry.apiKey || entry.apiSecret || "").trim() || (entry.apiKeys || []).some((key) => String(key || "").trim()));
        if (!hasKey && !["ai-ollama", "ai-lmstudio"].includes(template.id)) {
          warnings.push(`${template.id} مفعّل بدون مفتاح API.`);
        }
      });

    return warnings;
  }, [settings.externalPlatforms]);

  const autoFixAiConfig = () => {
    const allowedOrder = aiProviderOrder("auto");
    setSettings((prev) => {
      const next = [...prev.externalPlatforms];
      const byId = new Map(next.map((item, index) => [item.id.trim().toLowerCase(), index] as const));

      const ensureGlobal = () => {
        const index = byId.get("ai-global");
        if (typeof index === "number") {
          next[index] = {
            ...next[index],
            enabled: true,
            syncScheduleCron: allowedOrder,
            note: JSON.stringify({ mode: "auto", provider: "gemini" }),
          };
          return;
        }
        next.push({
          ...createExternalPlatform(next.length),
          id: "ai-global",
          name: "AI Global Routing",
          enabled: true,
          platformType: "custom",
          syncScheduleCron: allowedOrder,
          note: JSON.stringify({ mode: "auto", provider: "gemini" }),
        });
      };

      ensureGlobal();

      for (const template of aiExternalTemplates.filter((t) => t.id !== "ai-global")) {
        const idx = byId.get(template.id);
        if (typeof idx !== "number") continue;
        const item = next[idx];
        const hasKey = Boolean(String(item.apiKey || item.apiSecret || "").trim() || (item.apiKeys || []).some((key) => String(key || "").trim()));
        if (!hasKey && !["ai-ollama", "ai-lmstudio"].includes(template.id)) {
          next[idx] = { ...item, enabled: false };
        }
      }

      return { ...prev, externalPlatforms: next };
    });
    setStatusType("success");
    setStatusMessage("تم الإصلاح التلقائي: ضبط ترتيب ai-global وتعطيل المزودات المفعلة بدون مفتاح.");
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

  const loadSetupChecklist = async () => {
    try {
      const payload = await api.getPlatformIntegrationsSetupChecklist();
      setSetupChecklist(payload);
    } catch {
      setSetupChecklist(null);
    }
  };

  const loadRuntimeAudit = async () => {
    try {
      const payload = await api.getPlatformIntegrationsRuntimeAudit();
      setRuntimeAudit(payload);
    } catch {
      setRuntimeAudit(null);
    }
  };

  const loadStudentAiRuntimeSummary = async () => {
    setStudentAiRuntimeLoading(true);
    try {
      const [statusPayload, readinessPayload, interactionsPayload] = await Promise.all([
        api.aiStatus(),
        api.aiReadiness(),
        api.getAiInteractions(12),
      ]);
      const aiStatus = statusPayload as {
        provider?: string;
        model?: string;
        providerOrderSource?: string;
        routingMode?: "manual" | "auto";
        providerOrder?: string[];
        providers?: Array<{ id: string; configured?: boolean }>;
      };
      const aiReadiness = readinessPayload as {
        studentAdvisor?: { studentChats24h?: number; fallbackStudentChats24h?: number };
        monitoring?: { aiErrors24h?: number; fallbackStudentChats24h?: number };
      };
      const interactions = interactionsPayload as {
        items?: Array<{
          endpoint?: string;
          audience?: string;
          provider?: string;
          status?: string;
          usedFallback?: boolean;
          error?: string;
          metadata?: { providerErrors?: string[]; fallbackReason?: string };
        }>;
      };
      const studentItems = (interactions.items || []).filter(
        (item) => item.endpoint === "/ai/chat" || item.audience === "student",
      );
      const lastStudent = studentItems[0];

      setStudentAiRuntimeSummary({
        provider: String(aiStatus.provider || "none"),
        model: String(aiStatus.model || "local-fallback"),
        providerOrderSource: String(aiStatus.providerOrderSource || "env"),
        routingMode: aiStatus.routingMode || "unknown",
        providerOrder: Array.isArray(aiStatus.providerOrder) ? aiStatus.providerOrder.join(", ") : "",
        configuredProviders: (aiStatus.providers || []).filter((provider) => provider.id !== "none" && provider.configured).length,
        studentChats24h: Number(aiReadiness.studentAdvisor?.studentChats24h || 0),
        fallbackStudentChats24h: Number(
          aiReadiness.studentAdvisor?.fallbackStudentChats24h || aiReadiness.monitoring?.fallbackStudentChats24h || 0,
        ),
        errors24h: Number(aiReadiness.monitoring?.aiErrors24h || 0),
        lastStudentProvider: String(lastStudent?.provider || "لا يوجد سجل طالب"),
        lastStudentStatus: String(lastStudent?.status || "لا يوجد سجل طالب"),
        lastStudentFallback: Boolean(lastStudent?.usedFallback),
        lastStudentFallbackReason: lastStudent?.metadata?.fallbackReason || lastStudent?.metadata?.providerErrors?.join(" | ") || lastStudent?.error || "",
      });
    } catch (error) {
      setStudentAiRuntimeSummary({
        provider: "unknown",
        model: "unknown",
        providerOrderSource: "unknown",
        routingMode: "unknown",
        providerOrder: "",
        configuredProviders: 0,
        studentChats24h: 0,
        fallbackStudentChats24h: 0,
        errors24h: 0,
        lastStudentProvider: "unknown",
        lastStudentStatus: "تعذر قراءة حالة مساعد الطالب",
        lastStudentFallback: true,
        note: error instanceof Error ? error.message : "تعذر قراءة حالة مساعد الطالب",
      });
    } finally {
      setStudentAiRuntimeLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const payload = await api.getPlatformIntegrationsHistory();
      setHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch {
      setHistory([]);
    }
  };

  const restoreSnapshot = async (snapshotId: string) => {
    setRestoringId(snapshotId);
    setStatusMessage("");
    try {
      const restored = await api.restorePlatformIntegrationsHistory(snapshotId);
      setSettings({ ...emptySettings, ...(restored.settings as IntegrationSettings) });
      setStatusType("success");
      setStatusMessage("تم استرجاع إعدادات التكاملات بنجاح.");
      await Promise.all([loadReadiness(), loadHistory(), loadSetupChecklist(), loadRuntimeAudit(), loadStudentAiRuntimeSummary()]);
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error instanceof Error ? error.message : "تعذر استرجاع النسخة.");
    } finally {
      setRestoringId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setStatusMessage("");
    try {
      const normalizedExternal = settings.externalPlatforms.map((item) => ({
        ...item,
        id: item.id.trim().toLowerCase(),
        name: item.name.trim(),
        baseUrl: item.baseUrl.trim(),
        apiKeys: (item.apiKeys || []).map((key) => key.trim()).filter(Boolean),
      }));

      const emptyId = normalizedExternal.find((item) => !item.id);
      if (emptyId) {
        setStatusType("error");
        setStatusMessage("يوجد منصة خارجية بدون ID. رجاءً أدخل معرفًا فريدًا لكل منصة.");
        setSaving(false);
        return;
      }

      const duplicateIds = normalizedExternal
        .map((item) => item.id)
        .filter((id, idx, arr) => arr.indexOf(id) !== idx);
      if (duplicateIds.length > 0) {
        setStatusType("error");
        setStatusMessage(`يوجد معرفات مكررة في المنصات الخارجية: ${[...new Set(duplicateIds)].join(", ")}`);
        setSaving(false);
        return;
      }

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
        externalPlatforms: normalizedExternal,
      };
      const updated = (await api.updatePlatformIntegrations(normalized)) as IntegrationSettings;
      setSettings({ ...emptySettings, ...updated });
      setStatusType("success");
      setStatusMessage("تم حفظ إعدادات التكاملات والتسجيل وSEO بنجاح.");
      await Promise.all([loadReadiness(), loadHistory(), loadSetupChecklist(), loadRuntimeAudit(), loadStudentAiRuntimeSummary()]);
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error instanceof Error ? error.message : "تعذر حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };

  const recommendedPublicBase = useMemo(() => {
    const bySeo = String(settings.seo.canonicalBaseUrl || "").trim();
    if (bySeo) return bySeo.replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin.replace(/\/+$/, "");
    return "https://your-domain.com";
  }, [settings.seo.canonicalBaseUrl]);

  const suggestedUrl = (path?: string) => (path ? `${recommendedPublicBase}${path}` : "");

  const copyText = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatusType("success");
      setStatusMessage("تم نسخ الرابط.");
    } catch {
      setStatusType("error");
      setStatusMessage("تعذر النسخ، انسخه يدويًا.");
    }
  };

  const sendIntegrationTest = async () => {
    setSendingTest(true);
    setTestResult("");
    try {
      const payload =
        testChannel === "email"
          ? { channel: "email" as const, recipientEmail: testEmail, title: "اختبار البريد", subject: "اختبار البريد", body: testMessage }
          : { channel: "whatsapp" as const, recipientPhone: testPhone, title: "اختبار واتساب", subject: "اختبار واتساب", body: testMessage };
      const result = await api.testIntegrationDelivery(payload);
      if (result.ok) {
        setTestResult(`نجح الاختبار عبر ${result.provider}${result.providerMessageId ? ` - ${result.providerMessageId}` : ""}`);
      } else {
        setTestResult(`فشل الاختبار: ${result.failureReason || "provider_error"}`);
      }
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "تعذر تنفيذ اختبار الإرسال.");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    void loadReadiness();
    void loadHistory();
    void loadSetupChecklist();
    void loadRuntimeAudit();
    void loadStudentAiRuntimeSummary();
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
            <button
              onClick={() => {
                window.location.hash = "#/admin-dashboard?tab=ai-assistant";
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700"
            >
              <Link2 size={16} />
              فتح إدارة المساعد
            </button>
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
        {aiConfigWarnings.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <div className="font-black">تنبيهات إعداد الذكاء:</div>
            <ul className="mt-1 list-disc space-y-1 pr-4">
              {aiConfigWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <button
              onClick={autoFixAiConfig}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-800 hover:bg-amber-100"
            >
              <RefreshCw size={12} />
              إصلاح تلقائي للتنبيهات
            </button>
          </div>
        ) : null}
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-black text-indigo-700">تشخيص مباشر لمساعد الطالب</div>
              <h3 className="mt-1 text-lg font-black text-gray-900">مساعد الطالب يرى أي مزود الآن؟</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                هذا الفحص يقرأ /ai/status و /ai/readiness وسجل /ai/chat، حتى لا يبقى المفتاح محفوظا في التكاملات بينما الطالب يعمل على fallback.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadStudentAiRuntimeSummary()}
              disabled={studentAiRuntimeLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-black text-indigo-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={studentAiRuntimeLoading ? "animate-spin" : ""} />
              اختبار مزود الطالب
            </button>
          </div>
          {studentAiRuntimeSummary ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-white p-3 text-sm">
                <div className="text-xs font-black text-gray-500">المزود الحالي</div>
                <div className="mt-1 font-black text-gray-900">{studentAiRuntimeSummary.provider}</div>
                <div className="mt-1 text-xs text-gray-500">{studentAiRuntimeSummary.model}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm">
                <div className="text-xs font-black text-gray-500">مصدر الترتيب</div>
                <div className="mt-1 font-black text-gray-900">
                  {studentAiRuntimeSummary.providerOrderSource === "admin" ? "ai-global من الإدارة" : studentAiRuntimeSummary.providerOrderSource}
                </div>
                <div className="mt-1 text-xs font-bold text-indigo-700">
                  {studentAiRuntimeSummary.routingMode === "auto"
                    ? "الوضع: تلقائي مع انتقال عند التعطل"
                    : studentAiRuntimeSummary.routingMode === "manual"
                      ? "الوضع: يدوي حسب المزود المختار"
                      : "الوضع: غير معروف"}
                </div>
                <div className="mt-1 text-xs text-gray-500">{studentAiRuntimeSummary.providerOrder || "لا يوجد ترتيب معلن"}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm">
                <div className="text-xs font-black text-gray-500">استخدام الطلاب 24 ساعة</div>
                <div className="mt-1 font-black text-gray-900">{studentAiRuntimeSummary.studentChats24h}</div>
                <div className="mt-1 text-xs text-gray-500">Fallback: {studentAiRuntimeSummary.fallbackStudentChats24h}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm">
                <div className="text-xs font-black text-gray-500">آخر محادثة طالب</div>
                <div className="mt-1 font-black text-gray-900">{studentAiRuntimeSummary.lastStudentProvider}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {studentAiRuntimeSummary.lastStudentStatus}
                  {studentAiRuntimeSummary.lastStudentFallback ? " - fallback" : ""}
                </div>
                {studentAiRuntimeSummary.lastStudentFallbackReason ? (
                  <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">
                    {studentAiRuntimeSummary.lastStudentFallbackReason}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-white p-3 text-sm text-gray-600">اضغط اختبار مزود الطالب لقراءة حالة التشغيل الحالية.</div>
          )}
          {studentAiRuntimeSummary?.note ? (
            <div className="mt-3 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-700">
              {studentAiRuntimeSummary.note}
            </div>
          ) : null}
        </div>
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

      {/* Category Sub-Navigation Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        {[
          { id: "providers", label: "مزودو الخدمات والتواصل", icon: "🔌" },
          { id: "ai-platforms", label: "الذكاء الاصطناعي والتكاملات", icon: "🤖" },
          { id: "auth-registration", label: "التسجيل والحقول", icon: "🔐" },
          { id: "seo-branding", label: "محركات البحث SEO", icon: "🌐" },
          { id: "audit-tests", label: "فحص التشغيل والاختبار", icon: "🧪" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveIntegrationTab(tab.id as any)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
              activeIntegrationTab === tab.id
                ? "bg-amber-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
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

      {activeIntegrationTab === "providers" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="text-lg font-black text-gray-900">مزودو التكاملات</h3>
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
          <div className="font-black">الدومين الحالي المقترح للروابط:</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="truncate">{recommendedPublicBase}</code>
            <button onClick={() => void copyText(recommendedPublicBase)} className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-white px-2 py-1">
              <Copy size={12} />
              نسخ
            </button>
          </div>
          <div className="mt-2">عند نقل المنصة لاستضافة جديدة، غيّر Canonical Base URL في SEO ثم استخدم نفس الأزرار لنسخ الروابط الجديدة تلقائيًا.</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {providerLabels.map((provider) => (
            <div key={provider.key} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-black text-gray-900">{provider.label}</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpenGuideFor(provider.key)} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs">
                    <ExternalLink size={12} />
                    فتح دليل الإعداد
                  </button>
                  <input type="checkbox" aria-label={`تفعيل مزود ${provider.label}`} title={`تفعيل مزود ${provider.label}`} checked={settings.providers[provider.key].enabled} onChange={(e) => updateProvider(provider.key, { enabled: e.target.checked })} />
                </div>
              </div>
              {settings.providerSecretState?.[provider.key] ? (
                <div className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                  توجد مفاتيح سرية محفوظة لهذا المزود. اترك حقل السر فارغًا إذا لا تريد تغييره.
                </div>
              ) : null}
              <input aria-label={`وضع مزود ${provider.label}`} title={`وضع مزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].mode || ""} onChange={(e) => updateProvider(provider.key, { mode: e.target.value })} placeholder="mode" />
              <input aria-label={`App ID أو Project ID لمزود ${provider.label}`} title={`App ID أو Project ID لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].appId || ""} onChange={(e) => updateProvider(provider.key, { appId: e.target.value })} placeholder="App ID / Project ID" />
              <input aria-label={`Client ID لمزود ${provider.label}`} title={`Client ID لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].clientId || ""} onChange={(e) => updateProvider(provider.key, { clientId: e.target.value })} placeholder="Client ID" />
              <input aria-label={`Client Secret أو API Secret لمزود ${provider.label}`} title={`Client Secret أو API Secret لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].clientSecret || ""} onChange={(e) => updateProvider(provider.key, { clientSecret: e.target.value })} placeholder="Client Secret / API Secret" />
              <input aria-label={`API Key لمزود ${provider.label}`} title={`API Key لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].apiKey || ""} onChange={(e) => updateProvider(provider.key, { apiKey: e.target.value })} placeholder="API Key" />
              <input aria-label={`Access Token أو DSN لمزود ${provider.label}`} title={`Access Token أو DSN لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].accessToken || ""} onChange={(e) => updateProvider(provider.key, { accessToken: e.target.value })} placeholder="Access Token / DSN / Redis URL" />
              <input aria-label={`Callback URL لمزود ${provider.label}`} title={`Callback URL لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].callbackUrl || ""} onChange={(e) => updateProvider(provider.key, { callbackUrl: e.target.value })} placeholder="Callback URL" />
              <input aria-label={`Webhook URL لمزود ${provider.label}`} title={`Webhook URL لمزود ${provider.label}`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={settings.providers[provider.key].webhookUrl || ""} onChange={(e) => updateProvider(provider.key, { webhookUrl: e.target.value })} placeholder="Webhook URL" />
              <textarea aria-label={`ملاحظات تشغيلية لمزود ${provider.label}`} title={`ملاحظات تشغيلية لمزود ${provider.label}`} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" rows={2} value={settings.providers[provider.key].note || ""} onChange={(e) => updateProvider(provider.key, { note: e.target.value })} placeholder="ملاحظات تشغيلية" />
              {(providerGuides[provider.key].callbackPath || providerGuides[provider.key].webhookPath) ? (
                <div className="mt-2 space-y-1 text-xs">
                  {providerGuides[provider.key].callbackPath ? (
                    <div className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1">
                      <span className="text-gray-500">Callback URL:</span>
                      <button onClick={() => void copyText(suggestedUrl(providerGuides[provider.key].callbackPath))} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5">
                        <Copy size={11} />
                        نسخ
                      </button>
                    </div>
                  ) : null}
                  {providerGuides[provider.key].webhookPath ? (
                    <div className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1">
                      <span className="text-gray-500">Webhook URL:</span>
                      <button onClick={() => void copyText(suggestedUrl(providerGuides[provider.key].webhookPath))} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5">
                        <Copy size={11} />
                        نسخ
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {openGuideFor ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">ملف شرح الإعداد - {providerLabels.find((p) => p.key === openGuideFor)?.label}</h3>
            <button onClick={() => setOpenGuideFor(null)} className="rounded border border-gray-200 bg-white px-2 py-1 text-xs">إغلاق</button>
          </div>
          <a href={providerGuides[openGuideFor].sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 underline">
            {providerGuides[openGuideFor].sourceLabel}
            <ExternalLink size={14} />
          </a>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-white p-3">
              <div className="font-black text-sm">القيم التي تضعها هنا</div>
              <ul className="mt-2 list-disc space-y-1 pr-4 text-xs text-gray-700">
                {providerGuides[openGuideFor].fieldsHelp.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-3">
              <div className="font-black text-sm">ملاحظات مهمة</div>
              <ul className="mt-2 list-disc space-y-1 pr-4 text-xs text-gray-700">
                {providerGuides[openGuideFor].notes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {providerGuides[openGuideFor].callbackPath ? (
                <div className="mt-2 rounded border border-gray-100 px-2 py-1 text-xs">
                  <div>Authorized Redirect URI:</div>
                  <code className="break-all">{suggestedUrl(providerGuides[openGuideFor].callbackPath)}</code>
                </div>
              ) : null}
              {providerGuides[openGuideFor].webhookPath ? (
                <div className="mt-2 rounded border border-gray-100 px-2 py-1 text-xs">
                  <div>Webhook URL:</div>
                  <code className="break-all">{suggestedUrl(providerGuides[openGuideFor].webhookPath)}</code>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {setupChecklist ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black text-gray-900">جاهزية الربط الإنتاجي</h3>
            <button
              onClick={() => void loadSetupChecklist()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700"
            >
              <RefreshCw size={14} />
              تحديث القائمة
            </button>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">إجمالي التكاملات</div>
              <div className="font-black text-gray-900">{setupChecklist.summary.total}</div>
            </div>
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">المفعلة</div>
              <div className="font-black text-gray-900">{setupChecklist.summary.enabled}</div>
            </div>
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">مكتملة التفعيل</div>
              <div className="font-black text-gray-900">{setupChecklist.summary.configuredEnabled}</div>
            </div>
          </div>
          <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <div>Public Base URL: <code className="break-all">{setupChecklist.publicBaseUrl || "-"}</code></div>
            <div>API Base URL: <code className="break-all">{setupChecklist.apiBaseUrl || "-"}</code></div>
          </div>
          <div className="space-y-2">
            {setupChecklist.checks.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 px-3 py-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-gray-900">{item.title}</div>
                  <div className={`rounded-full px-2 py-0.5 text-xs font-black ${item.enabled ? (item.isConfigured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700") : "bg-gray-100 text-gray-600"}`}>
                    {item.enabled ? (item.isConfigured ? "مفعل ومكتمل" : "مفعل ناقص") : "غير مفعل"}
                  </div>
                </div>
                <div className="mb-1 text-xs text-gray-600">{item.notes}</div>
                {item.callbackUrl ? (
                  <div className="mb-1 flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1 text-xs">
                    <span className="text-gray-500">Callback URL</span>
                    <button onClick={() => void copyText(item.callbackUrl)} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5">
                      <Copy size={11} />
                      نسخ
                    </button>
                  </div>
                ) : null}
                {item.webhookUrl ? (
                  <div className="mb-1 flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1 text-xs">
                    <span className="text-gray-500">Webhook URL</span>
                    <button onClick={() => void copyText(item.webhookUrl)} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5">
                      <Copy size={11} />
                      نسخ
                    </button>
                  </div>
                ) : null}
                <div className="text-xs text-gray-600">ENV: {item.envKeys.join(" , ")}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {runtimeAudit ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black text-gray-900">فحص التشغيل الفعلي (Runtime)</h3>
            <button
              onClick={() => void loadRuntimeAudit()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700"
            >
              <RefreshCw size={14} />
              تحديث الفحص
            </button>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">المفعل</div>
              <div className="font-black text-gray-900">{runtimeAudit.summary.enabled}</div>
            </div>
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">جاهز تشغيل فعلي</div>
              <div className="font-black text-gray-900">{runtimeAudit.summary.runtimeReady}</div>
            </div>
            <div className="rounded-xl border border-gray-100 px-3 py-2 text-sm">
              <div className="text-xs text-gray-500">معطل بسبب نقص</div>
              <div className="font-black text-gray-900">{runtimeAudit.summary.blocked.length}</div>
            </div>
          </div>
          <div className="space-y-2">
            {runtimeAudit.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 px-3 py-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-gray-900">{item.title}</div>
                  <div className={`rounded-full px-2 py-0.5 text-xs font-black ${item.enabled ? (item.runtimeReady ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-gray-100 text-gray-600"}`}>
                    {item.enabled ? (item.runtimeReady ? "جاهز فعليًا" : "مفعل لكن غير جاهز") : "غير مفعل"}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  DB: {item.dbConfigured ? "مكتمل" : "ناقص"} | ENV: {item.envConfigured ? "مكتمل" : "ناقص"}
                </div>
                {item.health ? (
                  <div className="mt-1 text-xs text-gray-600">
                    Redis Health: {item.health.ok ? `ok (${item.health.latencyMs ?? "?"}ms)` : `fail (${item.health.status}${item.health.error ? ` - ${item.health.error}` : ""})`}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">اختبار إرسال التكاملات</h3>
        <p className="mt-1 text-sm text-gray-500">اختبار فعلي سريع للبريد أو الواتساب من نفس إعدادات التشغيل الحالية.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={testChannel}
            onChange={(e) => setTestChannel(e.target.value as "email" | "whatsapp")}
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          {testChannel === "email" ? (
            <input
              aria-label="بريد مستلم اختبار الإشعارات"
              title="بريد مستلم اختبار الإشعارات"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@email.com"
            />
          ) : (
            <input
              aria-label="رقم مستلم اختبار الإشعارات"
              title="رقم مستلم اختبار الإشعارات"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="9665xxxxxxxx"
            />
          )}
          <input
            aria-label="رسالة اختبار الإشعارات"
            title="رسالة اختبار الإشعارات"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="نص رسالة الاختبار"
          />
          <div className="md:col-span-2">
            <button
              onClick={() => void sendIntegrationTest()}
              disabled={sendingTest}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {sendingTest ? "جارٍ الإرسال..." : "إرسال اختبار"}
            </button>
          </div>
          {testResult ? (
            <div className="md:col-span-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {testResult}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="text-lg font-black text-gray-900">زر التواصل العائم</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>تفعيل الزر العائم</span>
            <input type="checkbox" aria-label="تفعيل الزر العائم" title="تفعيل الزر العائم" checked={settings.contactWidget.enabled} onChange={(e) => updateContactWidget("enabled", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>فتح في تبويب جديد</span>
            <input type="checkbox" aria-label="فتح الزر العائم في تبويب جديد" title="فتح الزر العائم في تبويب جديد" checked={settings.contactWidget.openInNewTab} onChange={(e) => updateContactWidget("openInNewTab", e.target.checked)} />
          </label>
          <select className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.contactWidget.channel} onChange={(e) => updateContactWidget("channel", e.target.value as "whatsapp" | "telegram" | "phone")}>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
            <option value="phone">Phone</option>
          </select>
          <input aria-label="رقم واتساب الزر العائم" title="رقم واتساب الزر العائم" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.contactWidget.whatsappNumber} onChange={(e) => updateContactWidget("whatsappNumber", e.target.value)} placeholder="رقم الواتساب بصيغة دولية 9665xxxxxxx" />
          <input aria-label="رسالة بداية الزر العائم" title="رسالة بداية الزر العائم" className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" value={settings.contactWidget.whatsappMessage} onChange={(e) => updateContactWidget("whatsappMessage", e.target.value)} placeholder="رسالة البداية" />
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>إظهار في الصفحات العامة</span>
            <input type="checkbox" aria-label="إظهار الزر العائم في الصفحات العامة" title="إظهار الزر العائم في الصفحات العامة" checked={settings.contactWidget.showOnPublicPages} onChange={(e) => updateContactWidget("showOnPublicPages", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
            <span>إظهار في لوحات المستخدمين</span>
            <input type="checkbox" aria-label="إظهار الزر العائم في لوحات المستخدمين" title="إظهار الزر العائم في لوحات المستخدمين" checked={settings.contactWidget.showOnDashboardPages} onChange={(e) => updateContactWidget("showOnDashboardPages", e.target.checked)} />
          </label>
        </div>
      </div>
    </div>
  )}

      {/* TAB 4: SEO & BRANDING */}
      {activeIntegrationTab === "seo-branding" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-lg font-black text-gray-900">إعدادات SEO والظهور في Google</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
              <span>تفعيل SEO</span>
              <input type="checkbox" aria-label="تفعيل SEO" title="تفعيل SEO" checked={settings.seo.enabled} onChange={(e) => updateSeo("enabled", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
              <span>السماح بالأرشفة (robots index)</span>
              <input type="checkbox" aria-label="السماح بالأرشفة" title="السماح بالأرشفة" checked={settings.seo.robotsIndexingEnabled} onChange={(e) => updateSeo("robotsIndexingEnabled", e.target.checked)} />
            </label>
            <input aria-label="اسم الموقع في SEO" title="اسم الموقع في SEO" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.siteName} onChange={(e) => updateSeo("siteName", e.target.value)} placeholder="اسم الموقع" />
            <input aria-label="العنوان الافتراضي في SEO" title="العنوان الافتراضي في SEO" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.defaultTitle} onChange={(e) => updateSeo("defaultTitle", e.target.value)} placeholder="العنوان الافتراضي" />
            <input aria-label="الوصف الافتراضي في SEO" title="الوصف الافتراضي في SEO" className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" value={settings.seo.defaultDescription} onChange={(e) => updateSeo("defaultDescription", e.target.value)} placeholder="الوصف الافتراضي" />
            <input aria-label="Canonical Base URL" title="Canonical Base URL" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.canonicalBaseUrl} onChange={(e) => updateSeo("canonicalBaseUrl", e.target.value)} placeholder="Canonical Base URL" />
            <input aria-label="OG Image URL" title="OG Image URL" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.defaultOgImage} onChange={(e) => updateSeo("defaultOgImage", e.target.value)} placeholder="OG Image URL" />
            <input aria-label="Google Site Verification" title="Google Site Verification" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleSiteVerification} onChange={(e) => updateSeo("googleSiteVerification", e.target.value)} placeholder="Google Site Verification" />
            <input aria-label="Google Analytics ID" title="Google Analytics ID" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleAnalyticsId} onChange={(e) => updateSeo("googleAnalyticsId", e.target.value)} placeholder="Google Analytics ID (G-XXXX)" />
            <input aria-label="Google Tag Manager ID" title="Google Tag Manager ID" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={settings.seo.googleTagManagerId} onChange={(e) => updateSeo("googleTagManagerId", e.target.value)} placeholder="Google Tag Manager ID (GTM-XXXX)" />
          </div>
        </div>
      )}

      {/* TAB 2: AI & EXTERNAL PLATFORMS */}
      {activeIntegrationTab === "ai-platforms" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">ربط المنصات الخارجية (Eduoma وغيرها)</h3>
          <button onClick={addExternal} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
            <Plus size={14} />
            إضافة منصة
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">
          مفاتيح الذكاء الاصطناعي تُدار من هنا عبر IDs ثابتة:
          <span className="mt-1 block font-mono">ai-gemini, ai-openrouter, ai-deepseek, ai-qwen, ai-openai, ai-ollama, ai-lmstudio</span>
          ثم تتابع النتيجة وتختبر المزود من تبويب إدارة المساعد.
        </div>
        <div className="mt-3">
          <button
            onClick={setupFreeAiStack}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
          >
            <RefreshCw size={13} />
            تهيئة مجانية تلقائية (موصى بها)
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {aiExternalTemplates.map((item) => (
            <button
              key={item.id}
              onClick={() => addExternalTemplate(item.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50"
            >
              <Plus size={12} />
              {item.id}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {aiTemplateStatus.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
              <div className="font-mono text-gray-800">{item.id}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 ${item.exists ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {item.exists ? "موجود" : "ناقص"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.enabled ? "مفعّل" : "غير مفعّل"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${item.hasKey ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"}`}>
                  {item.hasKey ? "مفتاح موجود" : "بدون مفتاح"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {settings.externalPlatforms.map((platform) => (
            <div key={platform.id} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 p-3 md:grid-cols-12">
              <input aria-label={`اسم المنصة الخارجية ${platform.name || platform.id}`} title={`اسم المنصة الخارجية ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.name} onChange={(e) => updateExternal(platform.id, { name: e.target.value })} placeholder="اسم المنصة" />
              <select className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.platformType} onChange={(e) => updateExternal(platform.id, { platformType: e.target.value as ExternalPlatform["platformType"] })}>
                <option value="lms">LMS</option>
                <option value="marketplace">Marketplace</option>
                <option value="crm">CRM</option>
                <option value="custom">Custom</option>
              </select>
              <input aria-label={`API Base URL للمنصة ${platform.name || platform.id}`} title={`API Base URL للمنصة ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.baseUrl} onChange={(e) => updateExternal(platform.id, { baseUrl: e.target.value })} placeholder="API Base URL" />
              <input aria-label={`API Key للمنصة ${platform.name || platform.id}`} title={`API Key للمنصة ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={platform.apiKey} onChange={(e) => updateExternal(platform.id, { apiKey: e.target.value })} placeholder="API Key" />
              <div className={`flex items-center justify-center rounded-lg border px-2 py-2 text-[11px] font-black md:col-span-1 ${
                settings.externalPlatformSecretState?.[platform.id.trim().toLowerCase()]?.apiKey || settings.externalPlatformSecretState?.[platform.id.trim().toLowerCase()]?.apiKeys
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}>
                {settings.externalPlatformSecretState?.[platform.id.trim().toLowerCase()]?.apiKey || settings.externalPlatformSecretState?.[platform.id.trim().toLowerCase()]?.apiKeys ? "مفتاح محفوظ" : "بدون مفتاح"}
              </div>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`تفعيل المنصة الخارجية ${platform.name || platform.id}`} title={`تفعيل المنصة الخارجية ${platform.name || platform.id}`} checked={platform.enabled} onChange={(e) => updateExternal(platform.id, { enabled: e.target.checked })} />
                active
              </label>
              <button
                onClick={() => removeExternal(platform.id)}
                aria-label={`حذف المنصة الخارجية ${platform.name || platform.id}`}
                title={`حذف المنصة الخارجية ${platform.name || platform.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-black text-rose-700 md:col-span-1"
              >
                <Trash2 size={14} />
              </button>
              <input aria-label={`Webhook URL للمنصة ${platform.name || platform.id}`} title={`Webhook URL للمنصة ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.webhookUrl} onChange={(e) => updateExternal(platform.id, { webhookUrl: e.target.value })} placeholder="Webhook URL" />
              <input aria-label={`Webhook Secret للمنصة ${platform.name || platform.id}`} title={`Webhook Secret للمنصة ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.webhookSecret} onChange={(e) => updateExternal(platform.id, { webhookSecret: e.target.value })} placeholder="Webhook Secret" />
              <input aria-label={`Sync schedule للمنصة ${platform.name || platform.id}`} title={`Sync schedule للمنصة ${platform.name || platform.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-3" value={platform.syncScheduleCron} onChange={(e) => updateExternal(platform.id, { syncScheduleCron: e.target.value })} placeholder="Sync schedule (cron)" />
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`مزامنة الطلاب للمنصة ${platform.name || platform.id}`} title={`مزامنة الطلاب للمنصة ${platform.name || platform.id}`} checked={platform.syncStudents} onChange={(e) => updateExternal(platform.id, { syncStudents: e.target.checked })} />
                طلاب
              </label>
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`مزامنة الكورسات للمنصة ${platform.name || platform.id}`} title={`مزامنة الكورسات للمنصة ${platform.name || platform.id}`} checked={platform.syncCourses} onChange={(e) => updateExternal(platform.id, { syncCourses: e.target.checked })} />
                كورسات
              </label>
              <label className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`مزامنة الطلبات للمنصة ${platform.name || platform.id}`} title={`مزامنة الطلبات للمنصة ${platform.name || platform.id}`} checked={platform.syncOrders} onChange={(e) => updateExternal(platform.id, { syncOrders: e.target.checked })} />
                طلبات
              </label>
              {platform.id.trim().toLowerCase() === "ai-global" ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs md:col-span-12">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1">
                      <span className="mb-1 block font-black text-emerald-900">طريقة تشغيل مساعد الطالب</span>
                      <select
                        className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2"
                        value={readAiNote(platform.note).mode || "manual"}
                        onChange={(event) => {
                          const mode = event.target.value;
                          const provider = mode === "auto" ? "gemini" : readAiNote(platform.note).provider || "gemini";
                          updateExternal(platform.id, {
                            note: writeAiNote(platform.note, { mode, provider }),
                            syncScheduleCron: aiProviderOrder(mode === "auto" ? "auto" : provider),
                          });
                        }}
                      >
                        <option value="auto">تلقائي: جرّب المزود التالي عند التعطل</option>
                        <option value="manual">يدوي: استخدم مزود محدد أولا</option>
                      </select>
                    </label>
                    <label className="flex-1">
                      <span className="mb-1 block font-black text-emerald-900">المزود المفضل</span>
                      <select
                        className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2"
                        value={readAiNote(platform.note).provider || "gemini"}
                        onChange={(event) => {
                          const provider = event.target.value;
                          const mode = readAiNote(platform.note).mode || "manual";
                          updateExternal(platform.id, {
                            note: writeAiNote(platform.note, { mode, provider }),
                            syncScheduleCron: aiProviderOrder(mode === "auto" ? "auto" : provider),
                          });
                        }}
                      >
                        {aiProviderOptions.filter((option) => option.id !== "auto").map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() =>
                        updateExternal(platform.id, {
                          note: writeAiNote(platform.note, { mode: "auto", provider: "gemini" }),
                          syncScheduleCron: aiProviderOrder("auto"),
                        })
                      }
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-black text-emerald-800 hover:bg-emerald-100"
                    >
                      تشغيل تلقائي آمن
                    </button>
                    <button
                      onClick={() =>
                        updateExternal(platform.id, {
                          note: writeAiNote(platform.note, { mode: "manual", provider: "gemini" }),
                          syncScheduleCron: aiProviderOrder("gemini"),
                        })
                      }
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-black text-emerald-800 hover:bg-emerald-100"
                    >
                      Gemini أولا
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-emerald-700">
                    في الوضع التلقائي سيستخدم المساعد أول مفتاح يعمل، ثم ينتقل للمزود التالي إذا انتهت الحصة أو فشل الاتصال.
                  </div>
                </div>
              ) : null}
              {isAiExternalPlatform(platform.id) && platform.id.trim().toLowerCase() !== "ai-global" ? (
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-3 text-xs md:col-span-12">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label>
                      <span className="mb-1 block font-black text-sky-900">Model</span>
                      <input
                        aria-label={`موديل AI للمنصة ${platform.name || platform.id}`}
                        title={`موديل AI للمنصة ${platform.name || platform.id}`}
                        className="w-full rounded-lg border border-sky-200 bg-white px-2 py-2"
                        value={readAiNote(platform.note).model || ""}
                        onChange={(event) => updateExternal(platform.id, { note: writeAiNote(platform.note, { model: event.target.value }) })}
                        placeholder={aiProviderFromExternalId(platform.id) === "gemini" ? "gemini-2.5-flash" : "model-name"}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block font-black text-sky-900">مفاتيح إضافية لنفس المزود</span>
                      <textarea
                        className="min-h-[86px] w-full rounded-lg border border-sky-200 bg-white px-2 py-2 font-mono text-[11px]"
                        value={(platform.apiKeys || []).join("\n")}
                        onChange={(event) =>
                          updateExternal(platform.id, {
                            apiKeys: event.target.value.split(/\r?\n/).map((key) => key.trim()).filter(Boolean),
                          })
                        }
                        placeholder="ضع كل مفتاح في سطر مستقل. المفتاح الأساسي يمكن وضعه في API Key."
                      />
                    </label>
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-sky-700">
                    عند فشل مفتاح سيجرب النظام المفتاح التالي لنفس المزود قبل الانتقال لمزود آخر.
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    )}

      {/* TAB 3: AUTH & REGISTRATION FIELDS */}
      {activeIntegrationTab === "auth-registration" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="text-lg font-black text-gray-900">إعدادات التسجيل الأساسية</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <span>السماح بالتسجيل الذاتي</span>
                <input type="checkbox" aria-label="السماح بالتسجيل الذاتي" title="السماح بالتسجيل الذاتي" checked={settings.auth.allowSelfRegistration} onChange={(e) => updateAuth("allowSelfRegistration", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <span>السماح بالبريد وكلمة المرور</span>
                <input type="checkbox" aria-label="السماح بالبريد وكلمة المرور" title="السماح بالبريد وكلمة المرور" checked={settings.auth.allowEmailPassword} onChange={(e) => updateAuth("allowEmailPassword", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <span>تفعيل تحقق البريد</span>
                <input type="checkbox" aria-label="تفعيل تحقق البريد" title="تفعيل تحقق البريد" checked={settings.auth.requireEmailVerification} onChange={(e) => updateAuth("requireEmailVerification", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <span>موافقة الإدارة قبل التفعيل</span>
                <input type="checkbox" aria-label="موافقة الإدارة قبل التفعيل" title="موافقة الإدارة قبل التفعيل" checked={settings.auth.requireAdminApproval} onChange={(e) => updateAuth("requireAdminApproval", e.target.checked)} />
              </label>
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
              <input aria-label={`مفتاح حقل التسجيل ${field.label || field.key || field.id}`} title={`مفتاح حقل التسجيل ${field.label || field.key || field.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.key} onChange={(e) => updateField(field.id, { key: e.target.value })} placeholder="key" />
              <input aria-label={`عنوان حقل التسجيل ${field.label || field.key || field.id}`} title={`عنوان حقل التسجيل ${field.label || field.key || field.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="label" />
              <select className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as RegistrationField["type"] })}>
                <option value="text">text</option>
                <option value="email">email</option>
                <option value="phone">phone</option>
                <option value="select">select</option>
                <option value="textarea">textarea</option>
              </select>
              <input aria-label={`Placeholder لحقل التسجيل ${field.label || field.key || field.id}`} title={`Placeholder لحقل التسجيل ${field.label || field.key || field.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-2" value={field.placeholder || ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} placeholder="placeholder" />
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`حقل التسجيل ${field.label || field.key || field.id} مطلوب`} title={`حقل التسجيل ${field.label || field.key || field.id} مطلوب`} checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                required
              </label>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-1">
                <input type="checkbox" aria-label={`تفعيل حقل التسجيل ${field.label || field.key || field.id}`} title={`تفعيل حقل التسجيل ${field.label || field.key || field.id}`} checked={field.enabled} onChange={(e) => updateField(field.id, { enabled: e.target.checked })} />
                active
              </label>
              <button
                onClick={() => removeField(field.id)}
                aria-label={`حذف حقل التسجيل ${field.label || field.key || field.id}`}
                title={`حذف حقل التسجيل ${field.label || field.key || field.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-black text-rose-700 md:col-span-1"
              >
                <Trash2 size={14} />
              </button>
              <input aria-label={`نص المساعدة لحقل التسجيل ${field.label || field.key || field.id}`} title={`نص المساعدة لحقل التسجيل ${field.label || field.key || field.id}`} className="rounded-lg border border-gray-200 px-2 py-2 text-xs md:col-span-12" value={field.helpText || ""} onChange={(e) => updateField(field.id, { helpText: e.target.value })} placeholder="help text" />
            </div>
          ))}
          {settings.registrationFields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">لا توجد حقول إضافية حالياً.</div>
          ) : null}
        </div>
      </div>
    </div>
  )}

      {/* TAB 5: AUDIT, TESTS & HISTORY */}
      {activeIntegrationTab === "audit-tests" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-black text-gray-900">سجل تغييرات التكاملات</h3>
          <button
            onClick={() => void loadHistory()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700"
          >
            <RefreshCw size={14} />
            تحديث السجل
          </button>
        </div>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            لا توجد لقطات محفوظة حتى الآن.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                <div className="text-xs text-gray-600">
                  <div className="font-black text-gray-800">{entry.note || "تعديل إعدادات التكاملات"}</div>
                  <div>{entry.createdAt ? new Date(entry.createdAt).toLocaleString("ar-EG") : "-"}</div>
                  <div>by: {entry.updatedBy || "-"}</div>
                </div>
                <button
                  onClick={() => void restoreSnapshot(entry._id)}
                  disabled={restoringId === entry._id}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-60"
                >
                  {restoringId === entry._id ? "جارٍ الاسترجاع..." : "استرجاع هذه النسخة"}
                </button>
              </div>
            ))}
          </div>
        )}
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
      )}
    </div>
  );
};
