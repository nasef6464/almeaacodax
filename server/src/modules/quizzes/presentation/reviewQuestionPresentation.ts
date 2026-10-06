const optionLetters = ["أ", "ب", "ج", "د"] as const;
const latinOptionLetters = ["A", "B", "C", "D"] as const;

const normalizeLearnerOption = (value: unknown, index: number, isLatin = false) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    for (const key of ["text", "label", "value", "content", "html", "option", "answer", "displayText"]) {
      const resolved = candidate[key];
      if (typeof resolved === "string" || typeof resolved === "number") return String(resolved);
    }
  }
  return isLatin ? (latinOptionLetters[index] || String.fromCharCode(65 + index)) : (optionLetters[index] || String(index + 1));
};

export const normalizeQuestionOptions = (question: {
  options?: unknown[];
  optionsEmbeddedInImage?: boolean;
  examType?: string;
}) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const isLatin = question?.examType === "tahsili" ||
    options.some((opt) => typeof opt === "string" && /^[A-D]$/i.test(opt.trim()));

  if (Boolean(question?.optionsEmbeddedInImage)) {
    if (isLatin) {
      return options.map((opt, index) => {
        if (typeof opt === "string" && /^[A-D]$/i.test(opt.trim())) return opt.trim().toUpperCase();
        return latinOptionLetters[index] || String.fromCharCode(65 + index);
      });
    }
    return options.map((_, index) => optionLetters[index] || String(index + 1));
  }
  return options.map((value, index) => normalizeLearnerOption(value, index, isLatin));
};
