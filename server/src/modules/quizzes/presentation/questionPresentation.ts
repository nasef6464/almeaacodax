const QUESTION_SUMMARY_TEXT_LIMIT = 280;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const toQuestionSummaryText = (value: unknown) => {
  const raw = typeof value === "string" ? value : "";
  const withoutDangerousBlocks = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const plain = withoutDangerousBlocks
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const summaryText = plain.length > QUESTION_SUMMARY_TEXT_LIMIT
    ? `${plain.slice(0, QUESTION_SUMMARY_TEXT_LIMIT).trim()}...`
    : plain;
  const inlineMedia = withoutDangerousBlocks.match(/<img\b[^>]*\/?>|<svg\b[\s\S]*?<\/svg>|<table\b[\s\S]*?<\/table>/i)?.[0] || "";

  if (inlineMedia) {
    return `${summaryText ? `<p>${escapeHtml(summaryText)}</p>` : ""}${inlineMedia}`.trim();
  }

  return summaryText;
};

export const sanitizeQuestionForLearner = (question: Record<string, any>) => {
  const { correctOptionIndex, explanation, __v, ...safeQuestion } = question;
  return safeQuestion;
};

export const isQuestionContentUsable = (question: any) => {
  const hasText = String(question?.text || "").trim().length > 0;
  const hasImage = String(question?.imageUrl || "").trim().length > 0;
  if (!hasText && !hasImage) return false;

  const type = String(question?.type || "mcq");
  if (type === "mcq" || type === "true_false") {
    return Array.isArray(question?.options) && question.options.length >= 2;
  }
  return true;
};
