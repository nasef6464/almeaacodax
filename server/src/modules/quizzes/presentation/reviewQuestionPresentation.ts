const optionLetters = ["أ", "ب", "ج", "د"] as const;

const normalizeLearnerOption = (value: unknown, index: number) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    for (const key of ["text", "label", "value", "content", "html", "option", "answer", "displayText"]) {
      const resolved = candidate[key];
      if (typeof resolved === "string" || typeof resolved === "number") return String(resolved);
    }
  }
  return optionLetters[index] || String(index + 1);
};

export const normalizeQuestionOptions = (question: {
  options?: unknown[];
  optionsEmbeddedInImage?: boolean;
}) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  if (Boolean(question?.optionsEmbeddedInImage)) {
    return options.map((_, index) => optionLetters[index] || String(index + 1));
  }
  return options.map((value, index) => normalizeLearnerOption(value, index));
};
