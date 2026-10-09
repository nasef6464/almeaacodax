// QuizResult owns the authoritative score. Draft answer changes must never
// create QuestionAttempt/SkillProgress evidence; persist final answers once
// from the accepted result, without reapplying mastery/review side effects.
type FinalAnswer = { questionId: string; selectedOptionIndex?: number; isCorrect?: boolean };
type FinalizedQuestionAttemptInput = {
  userId: string;
  quizResultId: string;
  questionReview: FinalAnswer[];
  questionById: Map<string, any>;
  source?: string;
  date?: string;
};

const canonicalIds = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

type EvidenceType = "assessment" | "remediation" | "recheck" | "mastery_review";
const acceptedEvidenceTypes: ReadonlySet<string> = new Set(["assessment", "remediation", "recheck", "mastery_review"]);

export function buildFinalizedQuizQuestionAttemptOperations(args: FinalizedQuestionAttemptInput) {
  const userId = String(args.userId || "").trim();
  const quizResultId = String(args.quizResultId || "").trim();
  if (!userId || !quizResultId) return [];
  const seen = new Set<string>();
  const source = String(args.source || "").trim();
  const evidenceType: EvidenceType = acceptedEvidenceTypes.has(source) ? (source as EvidenceType) : "assessment";
  const date = String(args.date || "").trim() || new Date().toISOString();

  return (args.questionReview || []).flatMap((item) => {
    const questionId = String(item?.questionId || "").trim();
    const selectedOptionIndex = item?.selectedOptionIndex;
    // An unanswered item is accounted for by the QuizResult, not an answer attempt.
    if (!questionId || seen.has(questionId) ||
        typeof selectedOptionIndex !== "number" ||
        !Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0) return [];
    const question = args.questionById.get(questionId);
    if (!question) return [];
    seen.add(questionId);
    const filter = { userId, quizResultId, questionId };
    const skillIds = canonicalIds([
      question.skillId, question.subSkillId,
      ...(Array.isArray(question.subSkillIds) ? question.subSkillIds : []),
      ...(Array.isArray(question.skillIds) ? question.skillIds : []),
    ]);
    return [{
      updateOne: {
        filter,
        update: {
          $setOnInsert: {
            ...filter,
            selectedOptionIndex,
            isCorrect: Boolean(item.isCorrect),
            timeSpentSeconds: 0,
            date,
            pathId: String(question.pathId || ""),
            subjectId: String(question.subjectId || question.subject || ""),
            sectionId: String(question.sectionId || ""),
            skillIds,
            evidenceType,
          },
        },
        upsert: true,
      },
    }];
  });
}
