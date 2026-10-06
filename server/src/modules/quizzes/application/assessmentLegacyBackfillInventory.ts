import { createHash } from "node:crypto";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";

type InventoryOptions = {
  afterId?: string;
  limit?: number;
};

/**
 * Read-only inventory for a future backfill. It intentionally has no model
 * writes: the returned cursor and checksum are evidence, not a migration.
 */
export async function inventoryLegacyAssessmentResults({ afterId, limit = 100 }: InventoryOptions = {}) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const filter: Record<string, unknown> = {};
  if (afterId) filter._id = { $gt: afterId };
  const legacyResults = await QuizResultModel.find(filter)
    .sort({ _id: 1 })
    .limit(boundedLimit)
    .select("_id userId quizId attemptNumber submissionKey score totalQuestions correctAnswers wrongAnswers unanswered passed createdAt")
    .lean();
  const legacyIds = legacyResults.map((result) => String(result._id));
  const projected = legacyIds.length
    ? await AssessmentResultModel.find({ legacyQuizResultId: { $in: legacyIds } })
      .select("legacyQuizResultId")
      .lean()
    : [];
  const projectedIds = new Set(projected.map((result) => String(result.legacyQuizResultId)));
  const checksum = createHash("sha256");
  let alreadyProjected = 0;
  for (const result of legacyResults) {
    const id = String(result._id);
    if (projectedIds.has(id)) alreadyProjected += 1;
    checksum.update([
      id,
      String(result.userId || ""),
      String(result.quizId || ""),
      String(result.attemptNumber || ""),
      String(result.submissionKey || ""),
      String(result.score || ""),
      String(result.totalQuestions || ""),
      String(result.createdAt?.toISOString?.() || result.createdAt || ""),
    ].join("\u001f"));
    checksum.update("\n");
  }
  return {
    mode: "dry-run" as const,
    processed: legacyResults.length,
    alreadyProjected,
    pendingProjection: legacyResults.length - alreadyProjected,
    checksum: checksum.digest("hex"),
    nextAfterId: legacyResults.length === boundedLimit ? String(legacyResults[legacyResults.length - 1]._id) : null,
  };
}
