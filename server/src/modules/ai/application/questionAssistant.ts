import { createHash } from "node:crypto";

export type QuestionHelpLevel = "hint" | "stronger_hint" | "concept" | "steps" | "follow_up";

const levelInstruction: Record<QuestionHelpLevel, string> = {
  hint: "أعط تلميحًا واحدًا قصيرًا دون كشف الحل مباشرة.",
  stronger_hint: "أعط تلميحًا أقوى يقرب الطالب من الخطوة التالية دون سرد الحل كاملًا.",
  concept: "اشرح المفهوم أو القانون المرتبط بالسؤال باختصار ثم اربطه بالسؤال.",
  steps: "اشرح خطوات الحل بوضوح وبترتيب، ويمكن كشف الإجابة لأن هذا سياق مراجعة بعد الاختبار.",
  follow_up: "أجب عن سؤال الطالب المحدد مع البقاء داخل سياق هذا السؤال فقط.",
};

export const buildQuestionAssistantCacheKey = (input: {
  userId: string;
  resultId: string;
  questionId: string;
  level: QuestionHelpLevel;
  message?: string;
  contextVersion?: string;
}) =>
  createHash("sha256")
    .update([
      input.userId,
      input.resultId,
      input.questionId,
      input.level,
      String(input.message || "").trim().toLowerCase(),
      String(input.contextVersion || ""),
    ].join("::"))
    .digest("hex");

export const buildQuestionAssistantPrompt = (input: {
  level: QuestionHelpLevel;
  questionText: string;
  options: string[];
  selectedOptionIndex?: number;
  correctOptionIndex?: number;
  explanation: string;
  skillLabels: string[];
  studentMessage?: string;
  hasImage: boolean;
}) => {
  const selected = Number.isInteger(input.selectedOptionIndex)
    ? input.options[input.selectedOptionIndex as number] || "غير محدد"
    : "لم يختر إجابة";
  const correct = Number.isInteger(input.correctOptionIndex)
    ? input.options[input.correctOptionIndex as number] || "غير محدد"
    : "غير متاح";

  const prompt = [
    "أنت مساعد سؤال تعليمي عربي داخل منصة ALMEAA. هذا سياق مراجعة بعد الاختبار فقط.",
    "ممنوع تعديل الدرجة أو الإتقان أو الادعاء بأنك صححت النتيجة؛ النتيجة محسوبة مسبقًا من الخادم.",
    levelInstruction[input.level],
    "استخدم الشرح الموثوق كسياق أساسي. لا تطلب تاريخ الطالب أو أي بيانات إضافية.",
    input.hasImage
      ? "السؤال يحتوي صورة، لكن الصورة نفسها غير مرسلة لك. اعتمد على النص والشرح الموثوق، واذكر بوضوح إذا كان جزء بصري ضروري غير موصوف نصيًا."
      : "",
    `المهارات: ${input.skillLabels.join("، ") || "غير محددة"}`,
    `نص السؤال: ${input.questionText}`,
    input.options.length ? `الاختيارات: ${input.options.map((option, index) => `${index + 1}) ${option}`).join(" | ")}` : "",
    `اختيار الطالب: ${selected}`,
    `الإجابة الصحيحة الموثوقة: ${correct}`,
    `الشرح الموثوق: ${input.explanation || "لا يوجد شرح نصي موثوق متاح."}`,
    input.studentMessage ? `سؤال الطالب الآن: ${input.studentMessage}` : "",
    "اجعل الرد بالعربية، عمليًا ومختصرًا، وبحد أقصى نحو 180 كلمة.",
  ].filter(Boolean).join("\n");

  return prompt.slice(0, 8_000);
};

export const buildQuestionAssistantFallback = (input: {
  level: QuestionHelpLevel;
  explanation: string;
  hasImage: boolean;
}) => {
  const explanation = String(input.explanation || "").trim();
  if (explanation) {
    if (input.level === "hint") return `تلميح: ركّز على الفكرة الأساسية في الشرح: ${explanation.slice(0, 260)}`;
    if (input.level === "stronger_hint") return `تلميح أقوى: حوّل المعطيات إلى خطوة مباشرة، واستفد من هذا الجزء: ${explanation.slice(0, 360)}`;
    if (input.level === "concept") return `المفهوم المرتبط بالسؤال: ${explanation.slice(0, 520)}`;
    return explanation.slice(0, 900);
  }
  return input.hasImage
    ? "هذا السؤال يعتمد على صورة، ولا يوجد وصف نصي موثوق كافٍ لمناقشته بأمان الآن. راجع الصورة والشرح المعتمد أو اطلب من المعلم إضافة شرح نصي."
    : "لا يوجد شرح نصي موثوق كافٍ لهذا السؤال حاليًا. راجع الحل المعتمد أو اطلب شرحًا من المعلم.";
};


const inFlight = new Map<string, Promise<unknown>>();

export const withQuestionAssistantInflight = async <T>(cacheKey: string, factory: () => Promise<T>): Promise<T> => {
  const existing = inFlight.get(cacheKey);
  if (existing) return existing as Promise<T>;
  const pending = factory();
  inFlight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    if (inFlight.get(cacheKey) === pending) inFlight.delete(cacheKey);
  }
};
