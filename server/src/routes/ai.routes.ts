import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { AiInteractionModel } from "../models/AiInteraction.js";
import { PlatformIntegrationSettingsModel } from "../models/PlatformIntegrationSettings.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { UserModel } from "../models/User.js";
import { QuizModel } from "../models/Quiz.js";
import { QuestionModel } from "../models/Question.js";
import { createOperationsAudit } from "../services/operationsAudit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decryptIntegrationSecretsForRuntime } from "../utils/integrationSecretsCrypto.js";

const imageInputSchema = z.object({
  data: z.string().min(1),
  mimeType: z.string().regex(/^image\/(png|jpeg|webp|gif|svg\+xml)$/),
}).optional();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  image: imageInputSchema,
});

const adminAssistantSchema = z.object({
  message: z.string().min(1).max(2000),
});

const providerTestSchema = z.object({
  provider: z.enum(["gemini", "openrouter", "deepseek", "qwen", "openai", "ollama", "lmstudio"]),
});

const studyPlanSchema = z.object({
  weaknesses: z.array(z.string()).default([]),
});

const learningPathSchema = z.object({
  skills: z.array(z.record(z.any())).default([]),
});

const remediationPlanSchema = z.object({
  skills: z.array(z.record(z.any())).default([]),
  ageBand: z.enum(["primary", "middle", "secondary", "general"]).default("general"),
});

const questionSchema = z.object({
  topic: z.string().min(1).max(500),
});

const courseSummarySchema = z.object({
  courseTitle: z.string().min(1).max(500),
});

const generateMockExamSchema = z.object({
  studentId: z.string().optional(),
  examType: z.enum(["qudurat", "tahsili"]).default("qudurat"),
  weakSkills: z.array(z.string().min(1).max(120)).default([]),
});

type AiResponseMimeType = "application/json";
type AiProvider = "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";

type StudentAiContext = {
  summary: string;
  weaknesses: Array<{ skill: string; mastery: number; status: string; action: string }>;
  recentResults: Array<{ title: string; score: number; totalQuestions: number; wrongAnswers: number }>;
};

type ProviderDescriptor = {
  id: AiProvider;
  label: string;
  model: string;
  configured: boolean;
  source: "env" | "admin" | "runtime-local" | "fallback";
  category: "free-friendly" | "paid" | "local" | "fallback";
  envKeys: string[];
  note: string;
};

type AiCallResult = {
  text: string;
  provider: AiProvider;
  model: string;
  usedFallback: boolean;
  errors: string[];
};

const redactAiDiagnostic = (value: unknown) =>
  String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-google-key]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

const compactProviderErrors = (errors: string[]) => errors.slice(0, 3).map(redactAiDiagnostic).filter(Boolean);

const fallbackReasonFromErrors = (errors: string[], fallback = "لم يرجع أي مزود AI نصا صالحا، لذلك تم استخدام الرد الاحتياطي.") =>
  compactProviderErrors(errors).join(" | ") || fallback;

type ProviderRuntime = {
  apiKey?: string;
  apiKeys?: string[];
  model: string;
  baseUrl?: string;
  enabled?: boolean;
  source: "env" | "admin";
};

type AiRuntimeConfig = {
  provider?: AiProvider;
  providerOrder: string;
  providerOrderSource: "env" | "admin";
  routingMode: "manual" | "auto";
  providers: Record<Exclude<AiProvider, "none">, ProviderRuntime>;
};

const readModelHint = (rawValue: unknown, fallback: string) => {
  const value = String(rawValue || "").trim();
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as { model?: string };
    if (parsed?.model && typeof parsed.model === "string") {
      return parsed.model.trim() || fallback;
    }
  } catch {
    // fallback to key-value parsing
  }
  const modelMatch = value.match(/(?:^|[,\s;])model\s*[:=]\s*([A-Za-z0-9_.:/-]+)/i);
  return modelMatch?.[1]?.trim() || fallback;
};

const normalizeProviderModel = (provider: AiProvider, model: string) => {
  const cleanModel = String(model || "").trim();
  if (provider === "gemini" && cleanModel === "gemini-1.5-flash") {
    return env.GEMINI_MODEL || "gemini-2.5-flash";
  }
  return cleanModel;
};

const uniqueNonEmpty = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const readJsonObject = (rawValue: unknown): Record<string, unknown> => {
  const value = String(rawValue || "").trim();
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const readProviderKeyHints = (item: Record<string, unknown>) => {
  const note = readJsonObject(item.note);
  const noteKeys = Array.isArray(note.apiKeys) ? note.apiKeys : [];
  const directKeys = Array.isArray(item.apiKeys) ? item.apiKeys : [];
  const commaKeys = String(note.apiKeys || item.apiKeys || "")
    .split(/[\n,]/)
    .map((value) => value.trim());
  return uniqueNonEmpty([item.apiKey, item.apiSecret, ...directKeys, ...noteKeys, ...commaKeys]);
};

const defaultAiRuntimeConfig = (): AiRuntimeConfig => ({
  provider: env.AI_PROVIDER,
  providerOrder: env.AI_PROVIDER_ORDER,
  providerOrderSource: "env",
  routingMode: "manual",
  providers: {
    gemini: { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, source: "env" },
    openrouter: { apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL, baseUrl: "https://openrouter.ai/api/v1", source: "env" },
    deepseek: { apiKey: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL, baseUrl: "https://api.deepseek.com", source: "env" },
    qwen: { apiKey: env.QWEN_API_KEY, model: env.QWEN_MODEL, baseUrl: env.QWEN_BASE_URL, source: "env" },
    openai: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, baseUrl: "https://api.openai.com/v1", source: "env" },
    ollama: { model: env.OLLAMA_MODEL, baseUrl: env.OLLAMA_BASE_URL, source: "env" },
    lmstudio: { model: env.LM_STUDIO_MODEL, baseUrl: env.LM_STUDIO_BASE_URL, source: "env" },
  },
});

let runtimeAiConfig: AiRuntimeConfig = defaultAiRuntimeConfig();

const loadRuntimeAiConfig = async () => {
  const next = defaultAiRuntimeConfig();
  const settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
  const runtimeSettings = settings
    ? decryptIntegrationSecretsForRuntime(settings as unknown as Record<string, unknown>)
    : null;
  const externalPlatforms = Array.isArray(runtimeSettings?.externalPlatforms)
    ? (runtimeSettings?.externalPlatforms as Array<Record<string, unknown>>)
    : [];

  const byId = new Map<string, Record<string, unknown>>();
  externalPlatforms.forEach((item) => {
    const id = String(item?.id || "").trim().toLowerCase();
    if (id) byId.set(id, item);
  });

  const applyExternal = (provider: Exclude<AiProvider, "none">, externalId: string, fallbackModel: string) => {
    const item = byId.get(externalId);
    if (!item || item.enabled !== true) return;
    const apiKeys = readProviderKeyHints(item);
    const apiKey = apiKeys[0] || "";
    const baseUrl = String(item.baseUrl || "").trim();
    const model = normalizeProviderModel(provider, readModelHint(item.note, fallbackModel));
    next.providers[provider] = {
      ...next.providers[provider],
      ...(apiKey ? { apiKey } : {}),
      ...(apiKeys.length ? { apiKeys } : {}),
      ...(baseUrl ? { baseUrl } : {}),
      model,
      enabled: true,
      source: "admin",
    };
  };

  const global = byId.get("ai-global");
  if (global) {
    const globalNote = readJsonObject(global.note);
    const rawPreferredProvider = String(globalNote.provider || global.note || "").trim().toLowerCase();
    const routingMode = String(globalNote.mode || (rawPreferredProvider === "auto" ? "auto" : "manual")).trim().toLowerCase();
    if (routingMode === "auto") {
      next.provider = undefined;
      next.routingMode = "auto";
    } else if (["gemini", "openrouter", "deepseek", "qwen", "openai", "ollama", "lmstudio"].includes(rawPreferredProvider)) {
      const preferredProvider = rawPreferredProvider;
      next.provider = preferredProvider as AiProvider;
      next.routingMode = "manual";
    }
    const order = String(global.syncScheduleCron || "").trim();
    if (order) {
      next.providerOrder = order;
      next.providerOrderSource = "admin";
    }
  }

  applyExternal("gemini", "ai-gemini", next.providers.gemini.model);
  applyExternal("openrouter", "ai-openrouter", next.providers.openrouter.model);
  applyExternal("deepseek", "ai-deepseek", next.providers.deepseek.model);
  applyExternal("qwen", "ai-qwen", next.providers.qwen.model);
  applyExternal("openai", "ai-openai", next.providers.openai.model);
  applyExternal("ollama", "ai-ollama", next.providers.ollama.model);
  applyExternal("lmstudio", "ai-lmstudio", next.providers.lmstudio.model);

  runtimeAiConfig = next;
  return runtimeAiConfig;
};

const isOllamaExplicitlyConfigured = () =>
  Boolean(runtimeAiConfig.provider === "ollama" || runtimeAiConfig.providers.ollama.baseUrl || runtimeAiConfig.providers.ollama.model);
const isLmStudioExplicitlyConfigured = () =>
  Boolean(runtimeAiConfig.provider === "lmstudio" || runtimeAiConfig.providers.lmstudio.baseUrl || runtimeAiConfig.providers.lmstudio.model);

const configuredProviders = (): ProviderDescriptor[] => [
  {
    id: "gemini",
    label: "Google Gemini",
    model: runtimeAiConfig.providers.gemini.model,
    configured: Boolean(runtimeAiConfig.providers.gemini.apiKey || runtimeAiConfig.providers.gemini.apiKeys?.length),
    source: runtimeAiConfig.providers.gemini.source,
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "GEMINI_API_KEY", "GEMINI_MODEL"],
    note: "مناسب كبداية مجانية أو منخفضة التكلفة حسب حدود حساب Google AI Studio.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: runtimeAiConfig.providers.openrouter.model,
    configured: Boolean(runtimeAiConfig.providers.openrouter.apiKey || runtimeAiConfig.providers.openrouter.apiKeys?.length),
    source: runtimeAiConfig.providers.openrouter.source,
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"],
    note: "يدعم موديلات كثيرة ومنها Qwen وDeepSeek وبعض النماذج المجانية عند توفرها.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: runtimeAiConfig.providers.deepseek.model,
    configured: Boolean(runtimeAiConfig.providers.deepseek.apiKey || runtimeAiConfig.providers.deepseek.apiKeys?.length),
    source: runtimeAiConfig.providers.deepseek.source,
    category: "paid",
    envKeys: ["AI_PROVIDER_ORDER", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL"],
    note: "قوي ورخيص عادة، مناسب لمساعد المدير والتحليلات الطويلة.",
  },
  {
    id: "qwen",
    label: "Qwen / Alibaba Model Studio",
    model: runtimeAiConfig.providers.qwen.model,
    configured: Boolean(runtimeAiConfig.providers.qwen.apiKey || runtimeAiConfig.providers.qwen.apiKeys?.length),
    source: runtimeAiConfig.providers.qwen.source,
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "QWEN_API_KEY", "QWEN_MODEL", "QWEN_BASE_URL"],
    note: "خيار صيني ممتاز، وغالبا مناسب للتجارب والحصص المجانية حسب الحساب.",
  },
  {
    id: "openai",
    label: "OpenAI",
    model: runtimeAiConfig.providers.openai.model,
    configured: Boolean(runtimeAiConfig.providers.openai.apiKey || runtimeAiConfig.providers.openai.apiKeys?.length),
    source: runtimeAiConfig.providers.openai.source,
    category: "paid",
    envKeys: ["AI_PROVIDER_ORDER", "OPENAI_API_KEY", "OPENAI_MODEL"],
    note: "مناسب عند الحاجة لجودة واستقرار أعلى، وغالبا يكون مدفوعا حسب الاستهلاك.",
  },
  {
    id: "ollama",
    label: "Ollama محلي",
    model: runtimeAiConfig.providers.ollama.model,
    configured: isOllamaExplicitlyConfigured() && Boolean(runtimeAiConfig.providers.ollama.baseUrl && runtimeAiConfig.providers.ollama.model),
    source: runtimeAiConfig.providers.ollama.source,
    category: "local",
    envKeys: ["AI_PROVIDER_ORDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"],
    note: "مجاني محليا، لكنه يحتاج جهاز أو خادم دائم متاح للسيرفر.",
  },
  {
    id: "lmstudio",
    label: "LM Studio محلي",
    model: runtimeAiConfig.providers.lmstudio.model,
    configured: isLmStudioExplicitlyConfigured() && Boolean(runtimeAiConfig.providers.lmstudio.baseUrl && runtimeAiConfig.providers.lmstudio.model),
    source: runtimeAiConfig.providers.lmstudio.source,
    category: "local",
    envKeys: ["AI_PROVIDER_ORDER", "LM_STUDIO_BASE_URL", "LM_STUDIO_MODEL"],
    note: "مجاني محليا للتجارب، وليس مثاليا لإنتاج Render المجاني.",
  },
  {
    id: "none",
    label: "ردود احتياطية داخلية",
    model: "local-fallback",
    configured: true,
    source: "fallback",
    category: "fallback",
    envKeys: [],
    note: "يضمن أن المساعد لا يتوقف حتى لو تعطلت كل المفاتيح.",
  },
];

const providerPriority = () => {
  const fromEnv = runtimeAiConfig.providerOrder.split(",")
    .map((value) => value.trim().toLowerCase() as AiProvider)
    .filter(Boolean);
  const preferred = runtimeAiConfig.provider ? [runtimeAiConfig.provider] : [];
  const defaults: AiProvider[] = ["gemini", "openrouter", "qwen", "deepseek", "openai", "ollama", "lmstudio", "none"];
  return [...new Set([...preferred, ...fromEnv, ...defaults])].filter((provider) =>
    configuredProviders().some((candidate) => candidate.id === provider),
  );
};

const ARABIC_TUTOR_RULES = `
أنت مساعد تعليمي عربي داخل منصة تعليمية للقدرات والتحصيلي.
اكتب بلغة عربية بسيطة ومشجعة ومناسبة للطلاب من المرحلة الابتدائية حتى الثانوية.
اجعل كل إجابة عملية ومختصرة، وركز دائمًا على: التشخيص، خطوة علاجية، تدريب قصير، ثم تحقق من الإتقان.
لا تذكر أنك نموذج ذكاء اصطناعي، ولا تقدم وعودًا طبية أو قانونية، ولا تطلب بيانات حساسة من الطالب.
عند الحديث عن المهارات استخدم الصيغة: المادة - المهارة الرئيسية - المهارة الفرعية متى توفرت البيانات.
`;

const safeJsonParse = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  const trimmed = value.trim();
  const starts = [trimmed.indexOf("["), trimmed.indexOf("{")].filter((index) => index >= 0);
  const jsonStart = starts.length ? Math.min(...starts) : -1;
  const jsonEnd = Math.max(trimmed.lastIndexOf("]"), trimmed.lastIndexOf("}"));
  const jsonCandidate = jsonStart >= 0 && jsonEnd > jsonStart ? trimmed.slice(jsonStart, jsonEnd + 1) : trimmed;

  try {
    return JSON.parse(jsonCandidate) as T;
  } catch {
    return fallback;
  }
};

const formatSkillContext = (skill: Record<string, unknown>) =>
  [skill.subjectName, skill.sectionName || skill.section, skill.skill || skill.name]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" - ") || "مهارة تحتاج متابعة";

const buildTutorFallback = (message: string) => {
  const normalized = message.trim().toLowerCase();
  const isQuant = /كمي|رياض|معادل|كسور|نسبة|نسب|مسائل|حساب|جبر/.test(normalized);
  const isVerbal = /لفظ|قراءة|نص|معنى|مرادف|استيعاب|سياق/.test(normalized);
  const isStudy = /أذاكر|اذاكر|مذاكر|خطة|جدول|اليوم|ابدأ|ابدا/.test(normalized);

  if (isStudy) {
    return [
      "خطة قصيرة لليوم:",
      "1. راجع فكرة واحدة فقط لمدة 10 دقائق.",
      "2. حل 5 أسئلة سهلة لتثبيت الفكرة.",
      "3. حل 5 أسئلة متوسطة وسجل الأخطاء.",
      "4. أعد سؤالين أخطأت فيهما بدون النظر للحل.",
      isQuant ? "ابدأ في الكمي بالكسور والنسب أو المعادلات لأنها أكثر تكرارا." : "",
      isVerbal ? "ابدأ في اللفظي بفهم الفكرة الرئيسة ومعاني الكلمات من السياق." : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (isQuant) {
    return [
      "خلينا نمسكها كمي خطوة بخطوة:",
      "1. حدد المطلوب في السؤال قبل الحساب.",
      "2. اكتب المعطيات كأرقام أو علاقة بسيطة.",
      "3. جرّب طريقة مباشرة: تعويض، تبسيط كسر، أو تكوين معادلة.",
      "4. بعد الحل راجع هل الإجابة منطقية مقارنة بالاختيارات.",
      "اكتب لي نص السؤال أو فكرته، وسأرتبه لك كخطوات حل.",
    ].join("\n");
  }

  if (isVerbal) {
    return [
      "في اللفظي ركز على الفكرة قبل الاختيارات:",
      "1. اقرأ الجملة أو الفقرة مرة للفهم العام.",
      "2. حدد الكلمة المفتاحية أو علاقة السبب والنتيجة.",
      "3. احذف الاختيارات البعيدة عن السياق.",
      "4. اختر الإجابة التي تخدم معنى الجملة بالكامل.",
      "اكتب لي النص أو السؤال، وسأساعدك في تفكيكه.",
    ].join("\n");
  }

  return [
    "أنا معك. اكتب السؤال أو المهارة التي تريد فهمها، وسأقسمها لك إلى:",
    "1. الفكرة الأساسية.",
    "2. مثال سريع.",
    "3. تدريب قصير.",
    "4. طريقة تتأكد بها أنك أتقنتها.",
  ].join("\n");
};

const buildStudentAiContext = async (userId?: string | null): Promise<StudentAiContext | null> => {
  if (!userId) return null;
  const normalizedUserId = String(userId);

  const [user, weaknesses, recentResults] = await Promise.all([
    (mongoose.isValidObjectId(normalizedUserId)
      ? UserModel.findById(normalizedUserId)
      : UserModel.findOne({ id: normalizedUserId }))
      .select("id name role subscription completedLessons enrolledPaths")
      .lean(),
    SkillProgressModel.find({ userId: normalizedUserId, status: { $in: ["weak", "average"] } })
      .sort({ mastery: 1, lastAttemptAt: -1 })
      .limit(6)
      .lean(),
    QuizResultModel.find({ userId: normalizedUserId }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  if (!user || user.role !== "student") return null;

  const progressWeakSkillRows = weaknesses.map((item) => ({
    skill: String(item.skill || "مهارة تحتاج مراجعة"),
    mastery: Number(item.mastery || 0),
    status: String(item.status || "weak"),
    action: String(item.recommendedAction || "راجع شرحا قصيرا ثم حل تدريبا متدرجا."),
  }));
  const resultRows = recentResults.map((item) => ({
    title: String(item.quizTitle || "اختبار سابق"),
    score: Number(item.score || 0),
    totalQuestions: Number(item.totalQuestions || 0),
    wrongAnswers: Number(item.wrongAnswers || 0),
  }));
  const resultWeakSkillRows = recentResults
    .flatMap((item) => (Array.isArray(item.skillsAnalysis) ? item.skillsAnalysis : []))
    .filter((item) => String(item?.status || "") === "weak" || String(item?.status || "") === "average" || Number(item?.mastery || 0) < 75)
    .map((item) => ({
      skill: String(item.skill || item.name || "مهارة تحتاج مراجعة"),
      mastery: Number(item.mastery || 0),
      status: String(item.status || "weak"),
      action: String(item.recommendation || "راجع شرحا قصيرا ثم حل تدريبا متدرجا."),
    }));
  const weakSkillRows = progressWeakSkillRows.length ? progressWeakSkillRows : resultWeakSkillRows;

  const summaryLines = [
    `اسم الطالب: ${String(user.name || "طالب")}`,
    weakSkillRows.length
      ? `أضعف المهارات الحالية: ${weakSkillRows
          .map((item) => `${item.skill} (${item.mastery}%)`)
          .join("، ")}`
      : "لا توجد مهارات ضعيفة مسجلة حتى الآن.",
    resultRows.length
      ? `آخر النتائج: ${resultRows.map((item) => `${item.title}: ${item.score}%`).join("، ")}`
      : "لا توجد نتائج اختبارات حديثة.",
    `الدروس المكتملة: ${Array.isArray(user.completedLessons) ? user.completedLessons.length : 0}`,
  ];

  return {
    summary: summaryLines.join("\n"),
    weaknesses: weakSkillRows,
    recentResults: resultRows,
  };
};

const buildPersonalizedTutorFallback = (message: string, context: StudentAiContext | null) => {
  const base = buildTutorFallback(message);
  if (!context) return base;

  const asksAboutWeakness =
    /ضعيف|ضعفي|مستواي|ابدأ|ابدا|خطة|أذاكر|اذاكر|ماذا أراجع|ايه اراجع|إيه أراجع/.test(message.trim().toLowerCase());
  if (context.weaknesses.length === 0) return base;

  const topWeakness = context.weaknesses[0];
  const nextWeakness = context.weaknesses[1];
  const advisorIntro = [
    `حسب أدائك الحالي، ابدأ بمهارة: ${topWeakness.skill} لأنها عند ${topWeakness.mastery}%.`,
    nextWeakness ? `بعدها راجع: ${nextWeakness.skill} (${nextWeakness.mastery}%).` : "",
    asksAboutWeakness ? "خطة عملية:" : "ملاحظة سريعة قبل الإجابة:",
    "1. شاهد شرحا قصيرا للمهارة الأولى.",
    "2. حل 5 أسئلة سهلة ثم 5 أسئلة متوسطة.",
    "3. سجل سبب كل خطأ: فهم قانون، استعجال، أو اختيار طريقة غير مناسبة.",
    "4. أعد اختبارا قصيرا، ولو وصلت 75% انتقل للمهارة التالية.",
    topWeakness.action ? `توجيه المنصة لك: ${topWeakness.action}` : "",
  ].filter(Boolean);

  return [
    ...advisorIntro,
    "",
    base,
  ]
    .filter(Boolean)
    .join("\n");
};

const preview = (value: unknown, maxLength = 260) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const modelForProvider = (provider: AiProvider) =>
  configuredProviders().find((candidate) => candidate.id === provider)?.model || "local-fallback";

const recordAiInteraction = async (payload: {
  req: any;
  endpoint: string;
  audience?: string;
  message: string;
  responseText: string;
  provider: AiProvider;
  model?: string;
  usedFallback: boolean;
  personalized?: boolean;
  latencyMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    const role = String(payload.req.authUser?.role || payload.audience || "guest");
    await AiInteractionModel.create({
      audience: payload.audience || role || "guest",
      endpoint: payload.endpoint,
      provider: payload.provider,
      model: payload.model || modelForProvider(payload.provider),
      status: payload.error ? "error" : payload.usedFallback ? "fallback" : "success",
      usedFallback: payload.usedFallback,
      personalized: Boolean(payload.personalized),
      latencyMs: payload.latencyMs,
      messagePreview: preview(payload.message),
      responsePreview: preview(payload.responseText),
      responseLength: String(payload.responseText || "").length,
      error: preview(payload.error, 500),
      userId: payload.req.authUser?.id || "",
      userEmail: payload.req.authUser?.email || "",
      role,
      metadata: payload.metadata || {},
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Failed to record AI interaction", error);
    }
  }
};

const resolveProvider = (): AiProvider =>
  providerPriority().find((provider) => provider !== "none" && configuredProviders().find((candidate) => candidate.id === provider)?.configured) ||
  "none";

type AiCallOptions = {
  timeoutMs?: number;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = env.AI_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const responseFailureMessage = async (provider: string, response: Response) => {
  const body = await response.text().catch(() => "");
  return `${provider} request failed with status ${response.status}${body ? `: ${redactAiDiagnostic(body)}` : ""}`;
};

const providerKeys = (provider: Exclude<AiProvider, "none">) =>
  uniqueNonEmpty([runtimeAiConfig.providers[provider].apiKey, ...(runtimeAiConfig.providers[provider].apiKeys || [])]);

const callGemini = async (prompt: string, responseMimeType?: AiResponseMimeType, image?: { data: string; mimeType: string }, options: AiCallOptions = {}) => {
  const apiKeys = providerKeys("gemini");
  const model = runtimeAiConfig.providers.gemini.model;
  if (apiKeys.length === 0) return "";

  const parts: Array<Record<string, unknown>> = image
    ? [
        { inlineData: { mimeType: image.mimeType, data: image.data } },
        { text: prompt },
      ]
    : [{ text: prompt }];

  const errors: string[] = [];
  for (const apiKey of apiKeys) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: responseMimeType ? { responseMimeType } : undefined,
          }),
        },
        options.timeoutMs,
      );

      if (!response.ok) {
        throw new Error(await responseFailureMessage("Gemini", response));
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
      if (text) return text;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Gemini request failed");
    }
  }

  if (errors.length) throw new Error(errors.join(" | "));
  return "";
};

const callOllama = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiCallOptions = {}) => {
  const baseUrl = String(runtimeAiConfig.providers.ollama.baseUrl || "").trim();
  const model = runtimeAiConfig.providers.ollama.model;
  if (!baseUrl || !model) return "";
  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, "")}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: responseMimeType === "application/json" ? "json" : undefined,
      }),
    },
    options.timeoutMs,
  );

  if (!response.ok) {
    throw new Error(await responseFailureMessage("Ollama", response));
  }

  const payload = (await response.json()) as { response?: string };
  return payload.response?.trim() || "";
};

const callLmStudio = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiCallOptions = {}) => {
  const baseUrl = String(runtimeAiConfig.providers.lmstudio.baseUrl || "").trim();
  const model = runtimeAiConfig.providers.lmstudio.model;
  if (!baseUrl || !model) return "";
  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
      }),
    },
    options.timeoutMs,
  );

  if (!response.ok) {
    throw new Error(await responseFailureMessage("LM Studio", response));
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || "";
};

const callOpenAiCompatible = async (
  provider: Exclude<AiProvider, "gemini" | "ollama" | "lmstudio" | "none">,
  prompt: string,
  responseMimeType?: AiResponseMimeType,
  options: AiCallOptions = {},
) => {
  const settings: Record<typeof provider, { baseUrl: string; apiKeys: string[]; model: string; headers?: Record<string, string> }> = {
    openrouter: {
      baseUrl: runtimeAiConfig.providers.openrouter.baseUrl || "https://openrouter.ai/api/v1",
      apiKeys: providerKeys("openrouter"),
      model: runtimeAiConfig.providers.openrouter.model,
      headers: {
        "HTTP-Referer": env.CLIENT_URL,
        "X-Title": "Almeaa Educational Platform",
      },
    },
    deepseek: {
      baseUrl: runtimeAiConfig.providers.deepseek.baseUrl || "https://api.deepseek.com",
      apiKeys: providerKeys("deepseek"),
      model: runtimeAiConfig.providers.deepseek.model,
    },
    qwen: {
      baseUrl: runtimeAiConfig.providers.qwen.baseUrl || env.QWEN_BASE_URL,
      apiKeys: providerKeys("qwen"),
      model: runtimeAiConfig.providers.qwen.model,
    },
    openai: {
      baseUrl: runtimeAiConfig.providers.openai.baseUrl || "https://api.openai.com/v1",
      apiKeys: providerKeys("openai"),
      model: runtimeAiConfig.providers.openai.model,
    },
  };
  const selected = settings[provider];
  if (selected.apiKeys.length === 0) return "";

  const errors: string[] = [];
  for (const apiKey of selected.apiKeys) {
    try {
      const response = await fetchWithTimeout(
        `${selected.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(selected.headers || {}),
          },
          body: JSON.stringify({
            model: selected.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.25,
            response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
          }),
        },
        options.timeoutMs,
      );

      if (!response.ok) {
        throw new Error(await responseFailureMessage(provider, response));
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = payload.choices?.[0]?.message?.content?.trim() || "";
      if (text) return text;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${provider} request failed`);
    }
  }

  if (errors.length) throw new Error(errors.join(" | "));
  return "";
};

const callAiWithMeta = async (prompt: string, responseMimeType?: AiResponseMimeType, image?: { data: string; mimeType: string }): Promise<AiCallResult> => {
  await loadRuntimeAiConfig();
  const errors: string[] = [];

  for (const provider of providerPriority()) {
    const descriptor = configuredProviders().find((candidate) => candidate.id === provider);
    if (!descriptor?.configured || provider === "none") {
      continue;
    }

    try {
      let text = "";
      if (provider === "gemini") {
        text = await callGemini(prompt, responseMimeType, image);
      }
      if (provider === "ollama") {
        text = await callOllama(prompt, responseMimeType);
      }
      if (provider === "lmstudio") {
        text = await callLmStudio(prompt, responseMimeType);
      }
      if (provider === "openrouter" || provider === "deepseek" || provider === "qwen" || provider === "openai") {
        text = await callOpenAiCompatible(provider, prompt, responseMimeType);
      }
      if (text) {
        return {
          text,
          provider,
          model: descriptor.model,
          usedFallback: false,
          errors,
        };
      }
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (errors.length && process.env.NODE_ENV !== "test") {
    console.warn("AI providers failed, using fallback:", errors.join(" | "));
  }

  return {
    text: "",
    provider: "none",
    model: "local-fallback",
    usedFallback: true,
    errors,
  };
};

const callAi = async (prompt: string, responseMimeType?: AiResponseMimeType, image?: { data: string; mimeType: string }) => (await callAiWithMeta(prompt, responseMimeType, image)).text;

const callSingleProvider = async (
  provider: Exclude<AiProvider, "none">,
  prompt: string,
  image?: { data: string; mimeType: string },
  options: AiCallOptions = { timeoutMs: Math.max(env.AI_REQUEST_TIMEOUT_MS, 30000) },
) => {
  if (provider === "gemini") return callGemini(prompt, undefined, image, options);
  if (provider === "ollama") return callOllama(prompt, undefined, options);
  if (provider === "lmstudio") return callLmStudio(prompt, undefined, options);
  return callOpenAiCompatible(provider, prompt, undefined, options);
};

const withinAiBudget = async (userId?: string) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyLimit = Math.max(1, Number(env.AI_DAILY_LIMIT || 800));
  const perUserLimit = Math.max(1, Number(env.AI_PER_USER_DAILY_LIMIT || 80));
  const [globalCount, userCount] = await Promise.all([
    AiInteractionModel.countDocuments({ createdAt: { $gte: since } }),
    userId ? AiInteractionModel.countDocuments({ createdAt: { $gte: since }, userId }) : Promise.resolve(0),
  ]);

  return {
    allowed: globalCount < dailyLimit && (!userId || userCount < perUserLimit),
    globalCount,
    userCount,
    dailyLimit,
    perUserLimit,
  };
};

export const aiRouter = Router();

aiRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    await loadRuntimeAiConfig();
    const providers = configuredProviders();
    const activeProvider = resolveProvider();
    res.json({
      provider: activeProvider,
      ollamaConfigured: isOllamaExplicitlyConfigured() && Boolean(runtimeAiConfig.providers.ollama.baseUrl && runtimeAiConfig.providers.ollama.model),
      lmStudioConfigured: isLmStudioExplicitlyConfigured() && Boolean(runtimeAiConfig.providers.lmstudio.baseUrl && runtimeAiConfig.providers.lmstudio.model),
      geminiConfigured: Boolean(runtimeAiConfig.providers.gemini.apiKey || runtimeAiConfig.providers.gemini.apiKeys?.length),
      providers,
      providerOrder: providerPriority(),
      providerOrderSource: runtimeAiConfig.providerOrderSource,
      routingMode: runtimeAiConfig.routingMode,
      model: providers.find((provider) => provider.id === activeProvider)?.model || "local-fallback",
      timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    });
  }),
);

aiRouter.get(
  "/readiness",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    await loadRuntimeAiConfig();
    const providers = configuredProviders();
    const activeProvider = resolveProvider();
    const configuredRealProviders = providers.filter((provider) => provider.id !== "none" && provider.configured);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      studentCount,
      studentsWithResults,
      weakSkillSignals,
      studentChats24h,
      personalizedStudentChats7d,
      fallbackStudentChats24h,
      adminChats24h,
      aiErrors24h,
    ] = await Promise.all([
      UserModel.countDocuments({ role: "student" }),
      QuizResultModel.distinct("userId").then((ids) => ids.length),
      SkillProgressModel.countDocuments({ status: { $in: ["weak", "average"] } }),
      AiInteractionModel.countDocuments({ endpoint: "/ai/chat", audience: "student", createdAt: { $gte: since24h } }),
      AiInteractionModel.countDocuments({
        endpoint: "/ai/chat",
        audience: "student",
        personalized: true,
        createdAt: { $gte: since7d },
      }),
      AiInteractionModel.countDocuments({
        endpoint: "/ai/chat",
        audience: "student",
        usedFallback: true,
        createdAt: { $gte: since24h },
      }),
      AiInteractionModel.countDocuments({ endpoint: "/ai/admin-assistant", audience: "admin", createdAt: { $gte: since24h } }),
      AiInteractionModel.countDocuments({ status: "error", createdAt: { $gte: since24h } }),
    ]);

    const providerScore = configuredRealProviders.length > 0 ? 30 : 12;
    const dataScore = studentCount > 0 && studentsWithResults > 0 ? 25 : studentCount > 0 ? 12 : 0;
    const guidanceScore = weakSkillSignals > 0 ? 25 : 8;
    const monitoringScore = aiErrors24h === 0 ? 20 : Math.max(0, 20 - Math.min(aiErrors24h * 5, 20));
    // Penalize readiness when runtime still falls back for real student chats.
    const fallbackPenalty =
      configuredRealProviders.length > 0 && fallbackStudentChats24h > 0
        ? Math.min(30, 10 + fallbackStudentChats24h * 2)
        : 0;
    const score = Math.max(0, Math.min(100, providerScore + dataScore + guidanceScore + monitoringScore - fallbackPenalty));

    const nextActions = [
      configuredRealProviders.length === 0
        ? "أضف مفتاح مزود ذكاء واحد على الأقل من لوحة الإدارة (التكاملات/المنصات الخارجية) أو من Render حتى ينتقل المساعد من الرد الاحتياطي إلى ذكاء توليدي حقيقي."
        : "",
      studentsWithResults === 0
        ? "اجعل طالبا يجري اختبارا قصيرا حتى يمتلك المساعد بيانات أداء يبني عليها خطة شخصية."
        : "",
      weakSkillSignals === 0
        ? "اربط الأسئلة والنتائج بالمهارات حتى يعرف المساعد نقاط الضعف بدقة."
        : "",
      fallbackStudentChats24h > 0 && configuredRealProviders.length > 0
        ? "راجع ترتيب AI_PROVIDER_ORDER أو اختبر المزودين لأن بعض محادثات الطالب استخدمت الرد الاحتياطي."
        : "",
      aiErrors24h > 0
        ? "راجع سجل استخدام المساعد لأن هناك أخطاء في آخر 24 ساعة."
        : "",
    ].filter(Boolean);

    res.json({
      checkedAt: new Date().toISOString(),
      score,
      activeProvider,
      configuredProviders: configuredRealProviders.map((provider) => ({
        id: provider.id,
        label: provider.label,
        model: provider.model,
      })),
      recommendedProviderOrder: providerPriority().join(","),
      studentAdvisor: {
        ready: studentCount > 0 && (studentsWithResults > 0 || weakSkillSignals > 0),
        studentCount,
        studentsWithResults,
        weakSkillSignals,
        studentChats24h,
        personalizedStudentChats7d,
        fallbackStudentChats24h,
      },
      adminAssistant: {
        ready: true,
        chats24h: adminChats24h,
      },
      monitoring: {
        aiErrors24h,
        fallbackStudentChats24h,
      },
      nextActions,
    });
  }),
);

aiRouter.get(
  "/interactions",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [items, total, last24h, fallbackCount, errorCount, byAudience, byProvider] = await Promise.all([
      AiInteractionModel.find().sort({ createdAt: -1 }).limit(limit).lean(),
      AiInteractionModel.countDocuments(),
      AiInteractionModel.countDocuments({ createdAt: { $gte: since } }),
      AiInteractionModel.countDocuments({ usedFallback: true }),
      AiInteractionModel.countDocuments({ status: "error" }),
      AiInteractionModel.aggregate([
        { $group: { _id: "$audience", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AiInteractionModel.aggregate([
        { $group: { _id: "$provider", count: { $sum: 1 }, avgLatencyMs: { $avg: "$latencyMs" } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      summary: {
        total,
        last24h,
        fallbackCount,
        errorCount,
        byAudience: byAudience.map((item) => ({ audience: item._id || "unknown", count: item.count })),
        byProvider: byProvider.map((item) => ({
          provider: item._id || "none",
          count: item.count,
          avgLatencyMs: Math.round(Number(item.avgLatencyMs || 0)),
        })),
      },
      items,
    });
  }),
);

aiRouter.post(
  "/providers/test",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await loadRuntimeAiConfig();
    const { provider } = providerTestSchema.parse(req.body);
    const descriptor = configuredProviders().find((candidate) => candidate.id === provider);
    if (!descriptor?.configured) {
      return res.json({
        ok: false,
        provider,
        message: "المزود غير مفعل. أضف مفاتيحه من لوحة الإدارة (التكاملات/المنصات الخارجية) أو من Render ثم أعد الاختبار.",
      });
    }

    try {
      const startedAt = Date.now();
      const text = await callSingleProvider(provider, "اكتب جملة عربية قصيرة تؤكد أن مزود الذكاء الاصطناعي يعمل.");
      return res.json({
        ok: Boolean(text),
        provider,
        model: descriptor.model,
        latencyMs: Date.now() - startedAt,
        sample: text.slice(0, 240),
      });
    } catch (error) {
      return res.json({
        ok: false,
        provider,
        model: descriptor.model,
        message: error instanceof Error ? error.message : "تعذر اختبار المزود.",
      });
    }
  }),
);

aiRouter.post(
  "/chat",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = chatSchema.parse(req.body);
    const { message } = parsed;
    const image = parsed.image?.data && parsed.image?.mimeType
      ? { data: parsed.image.data, mimeType: parsed.image.mimeType }
      : undefined;
    const startedAt = Date.now();
    const studentContext = await buildStudentAiContext(req.authUser?.id);
    const fallback = buildPersonalizedTutorFallback(message, studentContext);

    const hasImage = Boolean(image);
    const prompt = `
${ARABIC_TUTOR_RULES}
بيانات الطالب من المنصة إن وجدت:
${studentContext?.summary || "الطالب غير مسجل أو لا توجد بيانات أداء متاحة."}

تعليمات مهمة:
- إذا سأل الطالب عن ضعفه أو ماذا يذاكر، استخدم بيانات أدائه أولا.
- لا تعرض بيانات حساسة، واجعل الرد كمرشد أكاديمي بسيط.
- اقترح خطوة واحدة واضحة ثم تدريب قصير.
${hasImage ? "- الصورة المرفقة: حلل محتواها إن كانت سؤالاً أو شرحاً أو رسمة، وأجب بناء عليها مع ربطها بخطة الطالب." : ""}

سؤال الطالب:
${message}
`;

    const budget = await withinAiBudget(req.authUser?.id);
    if (!budget.allowed) {
      const fallbackReason = "تم استخدام الرد الاحتياطي لأن حد استخدام المساعد اليومي وصل إلى الحد المسموح.";
      await recordAiInteraction({
        req,
        endpoint: "/ai/chat",
        audience: req.authUser?.role || "guest",
        message,
        responseText: fallback,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        personalized: Boolean(studentContext?.weaknesses.length),
        latencyMs: Date.now() - startedAt,
        metadata: {
          budgetExceeded: true,
          globalCount: budget.globalCount,
          userCount: budget.userCount,
          dailyLimit: budget.dailyLimit,
          perUserLimit: budget.perUserLimit,
          hasImage,
          fallbackReason,
        },
      });
      return res.json({
        text: fallback,
        personalized: Boolean(studentContext?.weaknesses.length),
        weaknessesCount: studentContext?.weaknesses.length || 0,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        fallbackReason,
      });
    }

    try {
      const result = await callAiWithMeta(prompt, undefined, image);
      const responseText = result.text || fallback;
      const providerErrors = compactProviderErrors(result.errors);
      const fallbackReason = result.text ? undefined : fallbackReasonFromErrors(result.errors);
      await recordAiInteraction({
        req,
        endpoint: "/ai/chat",
        audience: req.authUser?.role || "guest",
        message,
        responseText,
        provider: result.text ? result.provider : "none",
        model: result.text ? result.model : "local-fallback",
        usedFallback: !result.text,
        personalized: Boolean(studentContext?.weaknesses.length),
        latencyMs: Date.now() - startedAt,
        metadata: {
          weaknessesCount: studentContext?.weaknesses.length || 0,
          recentResultsCount: studentContext?.recentResults.length || 0,
          providerErrors,
          fallbackReason,
          hasImage,
        },
      });
      return res.json({
        text: responseText,
        personalized: Boolean(studentContext?.weaknesses.length),
        weaknessesCount: studentContext?.weaknesses.length || 0,
        provider: result.text ? result.provider : "none",
        model: result.text ? result.model : "local-fallback",
        usedFallback: !result.text,
        providerErrors,
        fallbackReason,
      });
    } catch (error) {
      const fallbackReason = fallbackReasonFromErrors([error instanceof Error ? error.message : "AI chat failed"]);
      await recordAiInteraction({
        req,
        endpoint: "/ai/chat",
        audience: req.authUser?.role || "guest",
        message,
        responseText: fallback,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        personalized: Boolean(studentContext?.weaknesses.length),
        latencyMs: Date.now() - startedAt,
        error: fallbackReason,
        metadata: { hasImage, fallbackReason },
      });
      return res.json({
        text: fallback,
        personalized: Boolean(studentContext?.weaknesses.length),
        weaknessesCount: studentContext?.weaknesses.length || 0,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        fallbackReason,
      });
    }
  }),
);

aiRouter.post(
  "/admin-assistant",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { message } = adminAssistantSchema.parse(req.body);
    const startedAt = Date.now();
    const audit = await createOperationsAudit();
    const priorities = audit.priorities
      .slice(0, 6)
      .map((item) => `- ${item.title}: ${item.count} (${item.severity}) - ${item.action}`)
      .join("\n");
    const fallback = [
      `حالة المنصة الآن: ${audit.score}/100.`,
      audit.totals.critical > 0
        ? `ابدأ بالمشكلات الحرجة وعددها ${audit.totals.critical}.`
        : "لا توجد مشكلات حرجة حاليا.",
      priorities ? `الأولويات:\n${priorities}` : "لا توجد أولويات تشغيلية ظاهرة الآن.",
      "اقتراحي: عالج أول عنصر في القائمة، ثم اضغط فحص الآن من مركز مراقبة النظام.",
    ].join("\n\n");

    const prompt = `
أنت مساعد مدير منصة تعليمية عربية اسمها منصة المئة.
دورك مساعدة المدير غير البرمجي على فهم حالة الموقع واتخاذ قرار عملي واضح.
اكتب بالعربية، اختصر، ولا تذكر أسرار أو مفاتيح API أو كلمات مرور.
لا تنفذ أوامر بنفسك في الرد. أعط خطوات إدارة واضحة.

بيانات الفحص الحالية:
${JSON.stringify({
  score: audit.score,
  totals: audit.totals,
  priorities: audit.priorities.slice(0, 6).map((item) => ({
    title: item.title,
    severity: item.severity,
    count: item.count,
    action: item.action,
  })),
})}

سؤال المدير:
${message}
`;

    const budget = await withinAiBudget(req.authUser?.id);
    if (!budget.allowed) {
      await recordAiInteraction({
        req,
        endpoint: "/ai/admin-assistant",
        audience: "admin",
        message,
        responseText: fallback,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        latencyMs: Date.now() - startedAt,
        metadata: {
          budgetExceeded: true,
          globalCount: budget.globalCount,
          userCount: budget.userCount,
          dailyLimit: budget.dailyLimit,
          perUserLimit: budget.perUserLimit,
          auditScore: audit.score,
        },
      });
      return res.json({
        text: fallback,
        audit: {
          score: audit.score,
          totals: audit.totals,
          priorities: audit.priorities.slice(0, 6),
        },
        provider: "none",
      });
    }

    try {
      const result = await callAiWithMeta(prompt);
      const responseText = result.text || fallback;
      await recordAiInteraction({
        req,
        endpoint: "/ai/admin-assistant",
        audience: "admin",
        message,
        responseText,
        provider: result.text ? result.provider : "none",
        model: result.text ? result.model : "local-fallback",
        usedFallback: !result.text,
        latencyMs: Date.now() - startedAt,
        metadata: {
          auditScore: audit.score,
          critical: audit.totals.critical,
          warnings: audit.totals.warnings,
          providerErrors: result.errors.slice(0, 3),
        },
      });
      return res.json({
        text: responseText,
        audit: {
          score: audit.score,
          totals: audit.totals,
          priorities: audit.priorities.slice(0, 6),
        },
        provider: result.text ? result.provider : "none",
      });
    } catch (error) {
      await recordAiInteraction({
        req,
        endpoint: "/ai/admin-assistant",
        audience: "admin",
        message,
        responseText: fallback,
        provider: "none",
        model: "local-fallback",
        usedFallback: true,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "AI admin assistant failed",
        metadata: {
          auditScore: audit.score,
          critical: audit.totals.critical,
          warnings: audit.totals.warnings,
        },
      });
      return res.json({
        text: fallback,
        audit: {
          score: audit.score,
          totals: audit.totals,
          priorities: audit.priorities.slice(0, 6),
        },
        provider: "none",
      });
    }
  }),
);

aiRouter.post(
  "/generate-mock-exam",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = generateMockExamSchema.parse(req.body || {});
    const authUser = req.authUser!;
    const targetStudentId = String(payload.studentId || authUser.id);

    if (authUser.role === "student" && targetStudentId !== String(authUser.id)) {
      return res.status(403).json({ message: "Students can only generate exams for themselves." });
    }

    const student = await UserModel.findById(targetStudentId).select("id name role").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    const sourceResults = await QuizResultModel.find({ userId: targetStudentId })
      .select("skillsAnalysis createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const detectedWeakSkillIds = Array.from(
      new Set(
        sourceResults
          .flatMap((result: any) => (Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : []))
          .filter((row: any) => Number(row.mastery || 0) < 75 || String(row.status || "") === "weak")
          .map((row: any) => String(row.skillId || "").trim())
          .filter(Boolean),
      ),
    );

    const requestedWeakSkills = payload.weakSkills.map((skill) => String(skill).trim()).filter(Boolean);
    const weakSkills = Array.from(new Set([...requestedWeakSkills, ...detectedWeakSkillIds])).slice(0, 12);

    const examPathId = payload.examType === "tahsili" ? "p_tahsili" : "p_qudrat";
    const defaultSubjects = payload.examType === "tahsili" ? ["sub_math"] : ["sub_quant", "sub_verbal"];

    const skillQuery =
      weakSkills.length > 0
        ? {
            $or: [{ skillIds: { $in: weakSkills } }, { id: { $in: weakSkills } }],
          }
        : {};

    const candidateQuestions = await QuestionModel.find({
      approvalStatus: "approved",
      pathId: examPathId,
      ...skillQuery,
    })
      .select("id skillIds subject")
      .limit(400)
      .lean();

    const fallbackQuestions =
      candidateQuestions.length >= 20
        ? candidateQuestions
        : await QuestionModel.find({
            approvalStatus: "approved",
            pathId: examPathId,
            subject: { $in: defaultSubjects },
          })
            .select("id skillIds subject")
            .limit(500)
            .lean();

    if (fallbackQuestions.length < 12) {
      return res.status(400).json({ message: "Not enough approved questions to build a mock exam yet." });
    }

    const weighted = [...fallbackQuestions].sort((a: any, b: any) => {
      const aBoost = Array.isArray(a.skillIds) && a.skillIds.some((sid: string) => weakSkills.includes(String(sid))) ? 1 : 0;
      const bBoost = Array.isArray(b.skillIds) && b.skillIds.some((sid: string) => weakSkills.includes(String(sid))) ? 1 : 0;
      return bBoost - aBoost;
    });

    const selectedQuestionIds = Array.from(
      new Set(
        weighted
          .slice(0, 80)
          .sort(() => Math.random() - 0.5)
          .slice(0, 40)
          .map((question: any) => String(question.id || question._id))
          .filter(Boolean),
      ),
    );

    const now = Date.now();
    const quizId = `quiz_ai_mock_${now}`;
    const title =
      payload.examType === "tahsili"
        ? `اختبار مخصص لي - تحصيلي ${now}`
        : `اختبار مخصص لي - قدرات ${now}`;

    const generatedQuiz = await QuizModel.create({
      id: quizId,
      title,
      description: "اختبار مولد آليًا بناءً على المهارات الأضعف وأحدث نتائج الطالب.",
      pathId: examPathId,
      subjectId: defaultSubjects[0] || "",
      sectionId: "",
      type: "quiz",
      placement: "mock",
      showInTraining: false,
      showInMock: true,
      mode: "regular",
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        returnToSourceOnFinish: true,
        maxAttempts: 3,
        passingScore: 60,
        timeLimit: 60,
        randomizeQuestions: true,
        showProgressBar: true,
        requireAnswerBeforeNext: false,
        allowQuestionReview: true,
        optionLayout: "auto",
      },
      access: { type: "free", price: 0, allowedGroupIds: [] },
      questionIds: selectedQuestionIds,
      skillIds: weakSkills,
      targetGroupIds: [],
      targetUserIds: [targetStudentId],
      dueDate: null,
      isPublished: true,
      showOnPlatform: true,
      ownerType: "platform",
      ownerId: "",
      createdBy: String(authUser.id),
      approvalStatus: "approved",
      approvedBy: String(authUser.id),
      approvedAt: now,
      reviewerNotes: "AI personalized mock exam generation",
    });

    return res.status(201).json({
      ok: true,
      quizId: String(generatedQuiz.id || generatedQuiz._id),
      title: generatedQuiz.title,
      examType: payload.examType,
      questionCount: selectedQuestionIds.length,
      weakSkillsUsed: weakSkills,
      targetStudentId,
    });
  }),
);

aiRouter.post(
  "/study-plan",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { weaknesses } = studyPlanSchema.parse(req.body);
    const fallback = {
      steps: [
        "راجع شرح المهارة الأساسية في فيديو قصير.",
        "حل 10 أسئلة متدرجة من السهل إلى المتوسط.",
        "أعد اختبارًا قصيرًا للتأكد من التحسن.",
      ],
    };

    const prompt = `
${ARABIC_TUTOR_RULES}
ضع خطة مذاكرة قصيرة من 3 خطوات لطالب لديه ضعف في:
${weaknesses.join(", ") || "مهارات عامة"}
أعد JSON فقط بالشكل التالي:
{"steps":["...","...","..."]}
`;

    try {
      const text = await callAi(prompt, "application/json");
      return res.json(safeJsonParse(text, fallback));
    } catch {
      return res.json(fallback);
    }
  }),
);

aiRouter.post(
  "/learning-path",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { skills } = learningPathSchema.parse(req.body);
    const targetSkills = skills.filter((skill) => skill.status === "weak" || skill.status === "average").slice(0, 5);
    const fallback = targetSkills.slice(0, 3).map((skill, index) => ({
      id: `rec_${index + 1}`,
      type: index === 1 ? "quiz" : "lesson",
      title: `مراجعة ${skill.skill || skill.name || "مهارة مهمة"}`,
      duration: index === 1 ? "10 دقائق" : "15 دقيقة",
      reason: `لأن مستوى الإتقان يحتاج دعمًا في ${skill.skill || skill.name || "هذه المهارة"}.`,
      skillTargeted: skill.skill || skill.name || "مهارة مستهدفة",
      priority: skill.status === "weak" ? "high" : "medium",
      actionLabel: index === 1 ? "ابدأ التدريب" : "ابدأ الدرس",
      link: "/dashboard",
    }));

    if (targetSkills.length === 0) {
      return res.json([]);
    }

    const prompt = `
${ARABIC_TUTOR_RULES}
حلل فجوات المهارات التالية لطالب عربي:
${JSON.stringify(targetSkills)}
اقترح 3 خطوات تعلم عملية. أعد JSON array فقط بهذه المفاتيح:
id,type,title,duration,reason,skillTargeted,priority,actionLabel,link
type واحد من lesson أو quiz أو flashcard. priority واحد من high أو medium أو low.
`;

    try {
      const text = await callAi(prompt, "application/json");
      const parsed = safeJsonParse(text, fallback);
      return res.json(Array.isArray(parsed) ? parsed : fallback);
    } catch {
      return res.json(fallback);
    }
  }),
);

aiRouter.post(
  "/remediation-plan",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { skills, ageBand } = remediationPlanSchema.parse(req.body);
    const targetSkills = skills
      .filter((skill) => skill.status === "weak" || skill.status === "average" || Number(skill.mastery || 0) < 75)
      .slice(0, 3);
    const fallback = {
      title: "خطة علاجية قصيرة",
      summary: "ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.",
      steps: targetSkills.length
        ? targetSkills.map((skill, index) => ({
            day: `اليوم ${index + 1}`,
            skill: formatSkillContext(skill),
            action: index === 0 ? "راجع شرحًا قصيرًا ثم حل 5 أسئلة سهلة." : "حل تدريبًا متدرجًا ثم راجع الأخطاء.",
            check: "أعد اختبارًا مصغرًا من 5 أسئلة على نفس المهارة.",
          }))
        : [
            {
              day: "اليوم 1",
              skill: "مراجعة عامة",
              action: "حل اختبار تشخيصي قصير لتحديد أول مهارة تحتاج علاجًا.",
              check: "راجع نتيجة الاختبار وحدد أضعف مهارة.",
            },
          ],
      parentNote: "تابع التقدم بهدوء. المطلوب الآن خطوة صغيرة يوميًا وليس ضغطًا زائدًا.",
    };

    const prompt = `
${ARABIC_TUTOR_RULES}
ابن خطة علاجية تعليمية قصيرة للطالب حسب الفئة العمرية: ${ageBand}.
المهارات الضعيفة أو المتوسطة:
${JSON.stringify(targetSkills)}
أعد JSON فقط بالشكل التالي:
{"title":"...","summary":"...","steps":[{"day":"...","skill":"...","action":"...","check":"..."}],"parentNote":"..."}
`;

    try {
      const text = await callAi(prompt, "application/json");
      const parsed = safeJsonParse(text, fallback);
      return res.json(parsed);
    } catch {
      return res.json(fallback);
    }
  }),
);

aiRouter.post(
  "/question",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const { topic } = questionSchema.parse(req.body);
    const fallback = {
      question: `سؤال تدريبي في ${topic}: أي اختيار يمثل الفكرة الصحيحة؟`,
      options: ["الاختيار الأول", "الاختيار الثاني", "الاختيار الثالث", "الاختيار الرابع"],
      correctIndex: 0,
      explanation: "هذا سؤال مبدئي. راجع السؤال قبل نشره للطلاب.",
    };

    const prompt = `
${ARABIC_TUTOR_RULES}
أنشئ سؤال اختيار من متعدد باللغة العربية عن:
${topic}
يفضل أن يكون مناسبًا لمنصة قدرات/تحصيلي.
أعد JSON فقط:
{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}
`;

    try {
      const text = await callAi(prompt, "application/json");
      return res.json(safeJsonParse(text, fallback));
    } catch {
      return res.json(fallback);
    }
  }),
);

aiRouter.post(
  "/course-summary",
  asyncHandler(async (req, res) => {
    const { courseTitle } = courseSummarySchema.parse(req.body);
    const fallback = `هذه الدورة تساعدك على فهم ${courseTitle} بخطوات منظمة وتدريبات تدريجية حتى تصل للإتقان.`;

    const prompt = `
${ARABIC_TUTOR_RULES}
اكتب ملخصًا عربيًا قصيرًا جدًا من جملتين لدورة تعليمية عنوانها:
${courseTitle}
اجعله بسيطًا ومشجعًا للطالب.
`;

    try {
      const text = await callAi(prompt);
      return res.json({ text: text || fallback });
    } catch {
      return res.json({ text: fallback });
    }
  }),
);
