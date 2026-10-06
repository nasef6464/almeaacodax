import { createHash } from "node:crypto";
import { QuestionRevisionModel } from "../models/QuestionRevision.js";

const canonicalSnapshot = (question: any) => ({
  questionId: String(question.id || question._id || ""),
  questionCode: String(question.questionCode || ""),
  text: String(question.text || ""),
  options: Array.isArray(question.options) ? question.options.map(String) : [],
  correctOptionIndex: Number(question.correctOptionIndex ?? 0),
  explanation: String(question.explanation || ""),
  videoUrl: String(question.videoUrl || ""),
  imageUrl: String(question.imageUrl || ""),
  imageAlt: String(question.imageAlt || ""),
  optionsEmbeddedInImage: Boolean(question.optionsEmbeddedInImage),
  voiceExplanation: question.voiceExplanation || undefined,
  skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
  pathId: String(question.pathId || ""),
  subjectId: String(question.subjectId || question.subject || ""),
  sectionId: String(question.sectionId || ""),
});

export const questionRevisionHash = (question: any) =>
  createHash("sha256").update(JSON.stringify(canonicalSnapshot(question))).digest("hex");

export async function ensureQuestionRevisions(questions: any[]) {
  const revisions = await Promise.all(
    questions.map(async (question) => {
      const snapshot = canonicalSnapshot(question);
      const revisionHash = questionRevisionHash(question);
      const revision = await QuestionRevisionModel.findOneAndUpdate(
        { revisionHash },
        {
          $setOnInsert: {
            questionId: snapshot.questionId,
            revisionHash,
            snapshot,
            sourceUpdatedAt: question.updatedAt || undefined,
          },
        },
        { upsert: true, new: true },
      ).lean();
      return [snapshot.questionId, { revisionId: String(revision?._id || ""), revisionHash }] as const;
    }),
  );
  return new Map(revisions);
}
