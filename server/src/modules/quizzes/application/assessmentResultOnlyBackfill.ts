import { QuizResultModel } from "../../../models/QuizResult.js";
import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";

export async function backfillHistoricalAssessmentResults({ afterId, limit = 100, execute = false }: { afterId?: string; limit?: number; execute?: boolean } = {}) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 100, 100));
  const filter: Record<string, unknown> = afterId ? { _id: { $gt: afterId } } : {};
  const legacyResults = await QuizResultModel.find(filter).sort({ _id: 1 }).limit(boundedLimit).lean();
  let created = 0;
  let skipped = 0;
  for (const legacy of legacyResults) {
    const legacyQuizResultId = String(legacy._id);
    if (await AssessmentResultModel.exists({ legacyQuizResultId })) { skipped += 1; continue; }
    if (!execute) continue;
    await AssessmentResultModel.findOneAndUpdate(
      { legacyQuizResultId },
      { $setOnInsert: {
        studentId: String(legacy.userId), legacyQuizResultId,
        score: legacy.score, totalQuestions: legacy.totalQuestions, correctAnswers: legacy.correctAnswers,
        wrongAnswers: legacy.wrongAnswers, unanswered: legacy.unanswered, passed: legacy.passed,
        sectionResults: legacy.sectionResults || [], compatibilityProjection: legacy,
        dataCompleteness: "result_only", source: "legacy_backfill", finalizedAt: legacy.createdAt || new Date(),
      } },
      { upsert: true, new: true },
    );
    created += 1;
  }
  return { mode: execute ? "execute" as const : "dry-run" as const, processed: legacyResults.length, created, skipped, pending: legacyResults.length - skipped, nextAfterId: legacyResults.length === boundedLimit ? String(legacyResults.at(-1)!._id) : null };
}
