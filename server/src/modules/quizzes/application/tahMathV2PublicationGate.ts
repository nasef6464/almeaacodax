/**
 * Fail-closed publication requirements for the 2026 Yellow Tahsili Mathematics V2 import.
 * Publisher answer-key parity and image metadata are NOT independent math, visual or
 * licensing approval. This policy must not affect other subjects.
 */
export const TAH_MATH_V2_SUBJECT_ID = "sub_1777784609152";

export function isTahMathV2QuestionPublishReady(question: any): boolean {
  if (String(question?.subjectId || "") !== TAH_MATH_V2_SUBJECT_ID) return false;
  if (question?.approvalStatus !== "approved" || !String(question?.approvedBy || "").trim()) return false;
  const meta = question?.sourceMeta;
  if (!["TAHMATHV2_COL26", "TAHMATHV2_COL26OLD"].includes(String(meta?.documentCode || ""))) return false;
  // Only independently recorded reviews qualify. Never infer them from book-key
  // parity, a SHA hash, crop dimensions or import metadata.
  if (meta?.mathQaStatus !== "verified" || meta?.visualQaStatus !== "verified") return false;
  if (meta?.licenseStatus !== "permission_granted") return false;
  if (!String(meta?.sourceItemId || "").trim()) return false;
  const hash = String(meta?.imageHash || "").trim();
  const code = String(question?.questionCode || "").trim();
  const imageUrl = String(question?.imageUrl || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(hash) || !code || Number(meta?.imageVersion) < 2) return false;
  if (!imageUrl.startsWith("https://") || !imageUrl.includes(code) || !imageUrl.includes(hash)) return false;
  const optionTexts = question?.aiContext?.optionTexts;
  if (question?.aiContext?.optionTextsVerified !== true ||
      !Array.isArray(optionTexts) || optionTexts.length !== 4 ||
      optionTexts.some((value: unknown) => typeof value !== "string" || !value.trim())) return false;
  if (!Array.isArray(question?.options) || question.options.length !== 4) return false;
  if (!Number.isInteger(question?.correctOptionIndex) ||
      question.correctOptionIndex < 0 || question.correctOptionIndex > 3) return false;
  if (String(question?.explanation || "").trim().length < 20) return false;
  const skillId = String(question?.skillId || "");
  const subSkillId = String(question?.subSkillId || "");
  if (!skillId || !subSkillId || !Array.isArray(question?.skillIds) ||
      !question.skillIds.includes(skillId) || !question.skillIds.includes(subSkillId)) return false;
  if (String(question?.reviewerNotes || "").includes("DO_NOT_PUBLISH")) return false;
  return true;
}
