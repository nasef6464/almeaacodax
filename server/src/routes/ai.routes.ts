import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { UserModel } from "../models/User.js";
import { createOperationsAudit } from "../services/operationsAudit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
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
  category: "free-friendly" | "paid" | "local" | "fallback";
  envKeys: string[];
  note: string;
};

const isOllamaExplicitlyConfigured = () =>
  Boolean(process.env.AI_PROVIDER === "ollama" || process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
const isLmStudioExplicitlyConfigured = () =>
  Boolean(process.env.AI_PROVIDER === "lmstudio" || process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_MODEL);

const configuredProviders = (): ProviderDescriptor[] => [
  {
    id: "gemini",
    label: "Google Gemini",
    model: env.GEMINI_MODEL,
    configured: Boolean(env.GEMINI_API_KEY),
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "GEMINI_API_KEY", "GEMINI_MODEL"],
    note: "مناسب كبداية مجانية أو منخفضة التكلفة حسب حدود حساب Google AI Studio.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: env.OPENROUTER_MODEL,
    configured: Boolean(env.OPENROUTER_API_KEY),
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"],
    note: "يدعم موديلات كثيرة ومنها Qwen وDeepSeek وبعض النماذج المجانية عند توفرها.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: env.DEEPSEEK_MODEL,
    configured: Boolean(env.DEEPSEEK_API_KEY),
    category: "paid",
    envKeys: ["AI_PROVIDER_ORDER", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL"],
    note: "قوي ورخيص عادة، مناسب لمساعد المدير والتحليلات الطويلة.",
  },
  {
    id: "qwen",
    label: "Qwen / Alibaba Model Studio",
    model: env.QWEN_MODEL,
    configured: Boolean(env.QWEN_API_KEY),
    category: "free-friendly",
    envKeys: ["AI_PROVIDER_ORDER", "QWEN_API_KEY", "QWEN_MODEL", "QWEN_BASE_URL"],
    note: "خيار صيني ممتاز، وغالبا مناسب للتجارب والحصص المجانية حسب الحساب.",
  },
  {
    id: "openai",
    label: "OpenAI",
    model: env.OPENAI_MODEL,
    configured: Boolean(env.OPENAI_API_KEY),
    category: "paid",
    envKeys: ["AI_PROVIDER_ORDER", "OPENAI_API_KEY", "OPENAI_MODEL"],
    note: "مناسب عند الحاجة لجودة واستقرار أعلى، وغالبا يكون مدفوعا حسب الاستهلاك.",
  },
  {
    id: "ollama",
    label: "Ollama محلي",
    model: env.OLLAMA_MODEL,
    configured: isOllamaExplicitlyConfigured() && Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_MODEL),
    category: "local",
    envKeys: ["AI_PROVIDER_ORDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"],
    note: "مجاني محليا، لكنه يحتاج جهاز أو خادم دائم متاح للسيرفر.",
  },
  {
    id: "lmstudio",
    label: "LM Studio محلي",
    model: env.LM_STUDIO_MODEL,
    configured: isLmStudioExplicitlyConfigured() && Boolean(env.LM_STUDIO_BASE_URL && env.LM_STUDIO_MODEL),
    category: "local",
    envKeys: ["AI_PROVIDER_ORDER", "LM_STUDIO_BASE_URL", "LM_STUDIO_MODEL"],
    note: "مجاني محليا للتجارب، وليس مثاليا لإنتاج Render المجاني.",
  },
  {
    id: "none",
    label: "ردود احتياطية داخلية",
    model: "local-fallback",
    configured: true,
    category: "fallback",
    envKeys: [],
    note: "يضمن أن المساعد لا يتوقف حتى لو تعطلت كل المفاتيح.",
  },
];

const providerPriority = () => {
  const fromEnv = env.AI_PROVIDER_ORDER.split(",")
    .map((value) => value.trim().toLowerCase() as AiProvider)
    .filter(Boolean);
  const preferred = env.AI_PROVIDER ? [env.AI_PROVIDER] : [];
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

  const [user, weaknesses, recentResults] = await Promise.all([
    UserModel.findById(userId).select("name role subscription completedLessons enrolledPaths").lean(),
    SkillProgressModel.find({ userId, status: { $in: ["weak", "average"] } })
      .sort({ mastery: 1, lastAttemptAt: -1 })
      .limit(6)
      .lean(),
    QuizResultModel.find({ userId }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  if (!user || user.role !== "student") return null;

  const weakSkillRows = weaknesses.map((item) => ({
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
  if (!asksAboutWeakness || context.weaknesses.length === 0) return base;

  const topWeakness = context.weaknesses[0];
  const nextWeakness = context.weaknesses[1];
  return [
    `حسب أدائك الحالي، ابدأ بمهارة: ${topWeakness.skill} لأنها عند ${topWeakness.mastery}%.`,
    nextWeakness ? `بعدها راجع: ${nextWeakness.skill} (${nextWeakness.mastery}%).` : "",
    "خطة عملية:",
    "1. شاهد شرحا قصيرا للمهارة الأولى.",
    "2. حل 5 أسئلة سهلة ثم 5 أسئلة متوسطة.",
    "3. سجل سبب كل خطأ: فهم قانون، استعجال، أو اختيار طريقة غير مناسبة.",
    "4. أعد اختبارا قصيرا، ولو وصلت 75% انتقل للمهارة التالية.",
    topWeakness.action ? `توجيه المنصة لك: ${topWeakness.action}` : "",
    "",
    base,
  ]
    .filter(Boolean)
    .join("\n");
};

const resolveProvider = (): AiProvider =>
  providerPriority().find((provider) => provider !== "none" && configuredProviders().find((candidate) => candidate.id === provider)?.configured) ||
  "none";

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const callGemini = async (prompt: string, responseMimeType?: AiResponseMimeType) => {
  if (!env.GEMINI_API_KEY) return "";

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: responseMimeType ? { responseMimeType } : undefined,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
};

const callOllama = async (prompt: string, responseMimeType?: AiResponseMimeType) => {
  const response = await fetchWithTimeout(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      prompt,
      stream: false,
      format: responseMimeType === "application/json" ? "json" : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { response?: string };
  return payload.response?.trim() || "";
};

const callLmStudio = async (prompt: string, responseMimeType?: AiResponseMimeType) => {
  const response = await fetchWithTimeout(`${env.LM_STUDIO_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.LM_STUDIO_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio request failed with status ${response.status}`);
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
) => {
  const settings: Record<typeof provider, { baseUrl: string; apiKey?: string; model: string; headers?: Record<string, string> }> = {
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL,
      headers: {
        "HTTP-Referer": env.CLIENT_URL,
        "X-Title": "Almeaa Educational Platform",
      },
    },
    deepseek: {
      baseUrl: "https://api.deepseek.com",
      apiKey: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL,
    },
    qwen: {
      baseUrl: env.QWEN_BASE_URL,
      apiKey: env.QWEN_API_KEY,
      model: env.QWEN_MODEL,
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
    },
  };
  const selected = settings[provider];
  if (!selected.apiKey) return "";

  const response = await fetchWithTimeout(`${selected.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${selected.apiKey}`,
      ...(selected.headers || {}),
    },
    body: JSON.stringify({
      model: selected.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || "";
};

const callAi = async (prompt: string, responseMimeType?: AiResponseMimeType) => {
  const errors: string[] = [];

  for (const provider of providerPriority()) {
    if (!configuredProviders().find((candidate) => candidate.id === provider)?.configured || provider === "none") {
      continue;
    }

    try {
      if (provider === "gemini") {
        return await callGemini(prompt, responseMimeType);
      }
      if (provider === "ollama") {
        return await callOllama(prompt, responseMimeType);
      }
      if (provider === "lmstudio") {
        return await callLmStudio(prompt, responseMimeType);
      }
      if (provider === "openrouter" || provider === "deepseek" || provider === "qwen" || provider === "openai") {
        return await callOpenAiCompatible(provider, prompt, responseMimeType);
      }
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (errors.length && process.env.NODE_ENV !== "test") {
    console.warn("AI providers failed, using fallback:", errors.join(" | "));
  }

  return "";
};

const callSingleProvider = async (provider: Exclude<AiProvider, "none">, prompt: string) => {
  if (provider === "gemini") return callGemini(prompt);
  if (provider === "ollama") return callOllama(prompt);
  if (provider === "lmstudio") return callLmStudio(prompt);
  return callOpenAiCompatible(provider, prompt);
};

export const aiRouter = Router();

aiRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const providers = configuredProviders();
    const activeProvider = resolveProvider();
    res.json({
      provider: activeProvider,
      ollamaConfigured: isOllamaExplicitlyConfigured() && Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_MODEL),
      lmStudioConfigured: isLmStudioExplicitlyConfigured() && Boolean(env.LM_STUDIO_BASE_URL && env.LM_STUDIO_MODEL),
      geminiConfigured: Boolean(env.GEMINI_API_KEY),
      providers,
      providerOrder: providerPriority(),
      model: providers.find((provider) => provider.id === activeProvider)?.model || "local-fallback",
      timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    });
  }),
);

aiRouter.post(
  "/providers/test",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { provider } = providerTestSchema.parse(req.body);
    const descriptor = configuredProviders().find((candidate) => candidate.id === provider);
    if (!descriptor?.configured) {
      return res.json({
        ok: false,
        provider,
        message: "المزود غير مفعل. أضف مفاتيحه في Render Environment Variables ثم أعد النشر.",
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
    const { message } = chatSchema.parse(req.body);
    const studentContext = await buildStudentAiContext(req.authUser?.id);
    const fallback = buildPersonalizedTutorFallback(message, studentContext);

    const prompt = `
${ARABIC_TUTOR_RULES}
بيانات الطالب من المنصة إن وجدت:
${studentContext?.summary || "الطالب غير مسجل أو لا توجد بيانات أداء متاحة."}

تعليمات مهمة:
- إذا سأل الطالب عن ضعفه أو ماذا يذاكر، استخدم بيانات أدائه أولا.
- لا تعرض بيانات حساسة، واجعل الرد كمرشد أكاديمي بسيط.
- اقترح خطوة واحدة واضحة ثم تدريب قصير.

سؤال الطالب:
${message}
`;

    try {
      const answer = await callAi(prompt);
      return res.json({ text: answer || fallback });
    } catch {
      return res.json({ text: fallback });
    }
  }),
);

aiRouter.post(
  "/admin-assistant",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { message } = adminAssistantSchema.parse(req.body);
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

    try {
      const answer = await callAi(prompt);
      return res.json({
        text: answer || fallback,
        audit: {
          score: audit.score,
          totals: audit.totals,
          priorities: audit.priorities.slice(0, 6),
        },
        provider: resolveProvider(),
      });
    } catch {
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
  "/study-plan",
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
