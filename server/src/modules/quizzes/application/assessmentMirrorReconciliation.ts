import { QuizResultModel } from "../../../models/QuizResult.js";
import { AssessmentMirrorAuditModel } from "../infrastructure/assessmentMirrorAuditModel.js";
import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";
import { reconcileAssessmentResult, repairAssessmentResultFromLegacy } from "./assessmentResultReconciliation.js";

type ReconciliationOptions = {
  afterId?: string;
  limit?: number;
  repair?: boolean;
};

export type AssessmentMirrorReconciliationItem = {
  auditId: string;
  legacyQuizResultId: string;
  status: "consistent" | "missing_legacy" | "missing_assessment_result" | "mismatch" | "repaired";
  differences: string[];
};

/**
 * Bounded, cursor-based reconciliation for post-legacy mirror audit rows.
 * `repair` is explicit and touches only additive result projections; dry-runs
 * never write either legacy or additive records.
 */
export async function reconcileAssessmentMirrorAudits({
  afterId,
  limit = 50,
  repair = false,
}: ReconciliationOptions = {}) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const filter: Record<string, unknown> = {};
  if (afterId) filter._id = { $gt: afterId };

  const audits = await AssessmentMirrorAuditModel.find(filter)
    .sort({ _id: 1 })
    .limit(boundedLimit)
    .lean();
  const items: AssessmentMirrorReconciliationItem[] = [];

  for (const audit of audits) {
    const legacyQuizResultId = String(audit.legacyQuizResultId || "");
    const [legacyResult, assessmentResult] = await Promise.all([
      QuizResultModel.findById(legacyQuizResultId).lean(),
      AssessmentResultModel.findOne({ legacyQuizResultId }).lean(),
    ]);
    const base = { auditId: String(audit._id), legacyQuizResultId, differences: [] as string[] };
    if (!legacyResult) {
      items.push({ ...base, status: "missing_legacy" });
      continue;
    }
    if (!assessmentResult) {
      items.push({ ...base, status: "missing_assessment_result" });
      continue;
    }

    const differences = reconcileAssessmentResult(legacyResult, assessmentResult);
    if (differences.length === 0) {
      items.push({ ...base, status: "consistent" });
      continue;
    }
    if (!repair) {
      items.push({ ...base, status: "mismatch", differences });
      continue;
    }

    const repaired = await repairAssessmentResultFromLegacy(legacyResult, assessmentResult);
    if (!repaired || reconcileAssessmentResult(legacyResult, repaired.toObject()).length > 0) {
      items.push({ ...base, status: "mismatch", differences });
      continue;
    }
    await AssessmentMirrorAuditModel.findByIdAndUpdate(audit._id, {
      $set: { status: "completed", failureCode: "", failureMessage: "", completedAt: new Date() },
    });
    items.push({ ...base, status: "repaired", differences });
  }

  return {
    items,
    nextAfterId: audits.length === boundedLimit ? String(audits[audits.length - 1]._id) : null,
    processed: audits.length,
    repair,
  };
}
