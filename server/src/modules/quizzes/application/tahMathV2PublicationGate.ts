/**
 * Scoped fail-closed publication gate for the isolated TAH-MATH V2 subject.
 * Does not change the approval policy of other subjects or legacy banks.
 * Scientific review and rights clearance must precede approval of a question.
 */
export const TAH_MATH_V2_SUBJECT_ID = "sub_1777784609152";

export const isTahMathV2QuestionBlockedForPublication = (question: {
  subjectId?: unknown;
  approvalStatus?: unknown;
} | null | undefined): boolean => {
  if (!question || String(question.subjectId || "") !== TAH_MATH_V2_SUBJECT_ID) return false;
  return String(question.approvalStatus || "") !== "approved";
};
