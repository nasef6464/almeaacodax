export type ExamReadinessConfidence = "insufficient" | "low" | "medium" | "high";

export type ExamReadinessEstimate = {
  status: "insufficient_evidence" | "available";
  expectedPerformancePercent: number | null;
  range: { min: number; max: number } | null;
  confidence: ExamReadinessConfidence;
  recentAssessments: number;
  totalQuestions: number;
  weightedRecentScore: number | null;
  readinessScore: number;
  calibratedToQiyas: false;
  qiyasScoreEstimate: null;
  note: string;
};

type ReadinessInput = {
  score?: unknown;
  coverage?: unknown;
  reliableSkills?: unknown;
  totalEvidence?: unknown;
};

type AssessmentInput = {
  score?: unknown;
  totalQuestions?: unknown;
  createdAt?: unknown;
};

const asPercent = (value: unknown) => Math.max(0, Math.min(100, Number(value || 0)));

export const buildExamReadinessEstimate = (
  readiness: ReadinessInput,
  results: AssessmentInput[],
): ExamReadinessEstimate => {
  const usable = (results || [])
    .map((row) => ({
      score: asPercent(row.score),
      totalQuestions: Math.max(0, Number(row.totalQuestions || 0)),
      createdAt: row.createdAt,
    }))
    .filter((row) => row.totalQuestions >= 10)
    .slice(0, 6);

  const totalQuestions = usable.reduce((sum, row) => sum + row.totalQuestions, 0);
  const recentAssessments = usable.length;
  const readinessScore = asPercent(readiness.score);
  const coverage = Math.max(0, Math.min(1, Number(readiness.coverage || 0)));
  const reliableSkills = Math.max(0, Number(readiness.reliableSkills || 0));
  const totalEvidence = Math.max(0, Number(readiness.totalEvidence || 0));

  const weightedRecentScore = totalQuestions
    ? Math.round(usable.reduce((sum, row) => sum + row.score * row.totalQuestions, 0) / totalQuestions)
    : null;

  const sufficient =
    recentAssessments >= 3 &&
    totalQuestions >= 30 &&
    reliableSkills >= 3 &&
    coverage >= 0.3 &&
    totalEvidence >= 9 &&
    weightedRecentScore !== null;

  if (!sufficient) {
    return {
      status: "insufficient_evidence",
      expectedPerformancePercent: null,
      range: null,
      confidence: "insufficient",
      recentAssessments,
      totalQuestions,
      weightedRecentScore,
      readinessScore,
      calibratedToQiyas: false,
      qiyasScoreEstimate: null,
      note: "نحتاج على الأقل 3 قياسات كافية وتغطية مهارية موثوقة قبل عرض تقدير أداء.",
    };
  }

  const expectedPerformancePercent = Math.round(weightedRecentScore! * 0.6 + readinessScore * 0.4);
  const confidence: ExamReadinessConfidence =
    recentAssessments >= 5 && totalQuestions >= 100 && coverage >= 0.7 && totalEvidence >= 30
      ? "high"
      : recentAssessments >= 4 && totalQuestions >= 60 && coverage >= 0.5 && totalEvidence >= 18
        ? "medium"
        : "low";
  const margin = confidence === "high" ? 6 : confidence === "medium" ? 8 : 12;

  return {
    status: "available",
    expectedPerformancePercent,
    range: {
      min: Math.max(0, expectedPerformancePercent - margin),
      max: Math.min(100, expectedPerformancePercent + margin),
    },
    confidence,
    recentAssessments,
    totalQuestions,
    weightedRecentScore,
    readinessScore,
    calibratedToQiyas: false,
    qiyasScoreEstimate: null,
    note: "هذا تقدير أداء داخلي من أدلة المنصة، وليس توقعًا رسميًا لدرجة قياس. تفعيل تقدير قياس يتطلب معايرة ببيانات نتائج فعلية.",
  };
};
