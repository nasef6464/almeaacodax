export type QuestionExamDomain = "qudurat_quantitative" | "tahsili_math";

export const QUESTION_CODE_REGEX = /^(QDR-QNT|TAH-MATH)-[A-Z0-9_-]+-P\d{3}-Q\d{2,}$/;
export const QUDURAT_QUESTION_CODE_REGEX = /^QDR-QNT-[A-Z0-9_-]+-P\d{3}-Q\d{2,}$/;
export const TAHSILI_MATH_QUESTION_CODE_REGEX = /^TAH-MATH-[A-Z0-9_-]+-P\d{3}-Q\d{2,}$/;

export interface ParsedQuestionCode {
  valid: boolean;
  prefix?: "QDR-QNT" | "TAH-MATH";
  documentCode?: string;
  pageNumber?: number;
  questionNumber?: number;
  domain?: QuestionExamDomain;
}

export function parseQuestionCode(code: string): ParsedQuestionCode {
  const normalized = String(code || "").trim().toUpperCase();
  const match = normalized.match(/^(QDR-QNT|TAH-MATH)-([A-Z0-9_-]+)-P(\d{3})-Q(\d{2,})$/);
  if (!match) {
    return { valid: false };
  }

  const prefix = match[1] as "QDR-QNT" | "TAH-MATH";
  const documentCode = match[2];
  const pageNumber = parseInt(match[3], 10);
  const questionNumber = parseInt(match[4], 10);
  const domain: QuestionExamDomain = prefix === "QDR-QNT" ? "qudurat_quantitative" : "tahsili_math";

  return {
    valid: true,
    prefix,
    documentCode,
    pageNumber,
    questionNumber,
    domain,
  };
}

export function validateQuestionCode(code: string): boolean {
  return QUESTION_CODE_REGEX.test(String(code || "").trim().toUpperCase());
}

export function buildExpectedSourceItemId(params: {
  documentCode: string;
  pdfPageIndex?: number;
  pageNumber: number;
  questionNumber: number;
}): string {
  const doc = String(params.documentCode || "").trim().toUpperCase();
  const pdfPart = typeof params.pdfPageIndex === "number"
    ? `PDF${String(params.pdfPageIndex).padStart(3, "0")}-`
    : "";
  const pagePart = `P${String(params.pageNumber).padStart(3, "0")}`;
  const numPart = `N${String(params.questionNumber).padStart(2, "0")}`;

  return `${doc}-${pdfPart}${pagePart}-${numPart}`;
}

export function buildExpectedImagePath(questionCode: string, imageHash: string): string {
  const normalizedCode = String(questionCode || "").trim().toUpperCase();
  const normalizedHash = String(imageHash || "").trim().toLowerCase();
  return `questions/v2/${normalizedCode}/${normalizedHash}.webp`;
}

export function buildExpectedPublicImageUrl(
  questionCode: string,
  imageHash: string,
  publicBaseUrl: string,
): string {
  const cleanBase = String(publicBaseUrl || "").replace(/\/+$/, "");
  const imagePath = buildExpectedImagePath(questionCode, imageHash);
  return `${cleanBase}/${imagePath}`;
}
