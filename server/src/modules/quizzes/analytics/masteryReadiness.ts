export const SERVER_MASTERY_THRESHOLDS = {
  foundation: 50,
  proficient: 75,
  mastered: 90,
  minEvidence: 3,
} as const;

type ProgressRow = {
  mastery?: unknown;
  evidenceCount?: unknown;
  attempts?: unknown;
  lastAttemptAt?: unknown;
};

const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

const recencyFactor = (value: unknown) => {
  if (!value) return 0.5;
  const timestamp = new Date(String(value)).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0.5;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (ageDays <= 14) return 1;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 60) return 0.6;
  return 0.4;
};

export const buildScopedMasteryReadiness = (rows: ProgressRow[]) => {
  const normalized = rows.map((row) => ({
    mastery: Math.max(0, Math.min(100, asNumber(row.mastery))),
    evidenceCount: Math.max(0, asNumber(row.evidenceCount || row.attempts)),
    lastAttemptAt: row.lastAttemptAt,
  }));
  const totalSkills = normalized.length;
  const reliableSkills = normalized.filter((row) => row.evidenceCount >= SERVER_MASTERY_THRESHOLDS.minEvidence).length;
  const coverage = totalSkills ? reliableSkills / totalSkills : 0;
  const totalEvidence = normalized.reduce((sum, row) => sum + row.evidenceCount, 0);
  const mastery = totalEvidence
    ? Math.round(normalized.reduce((sum, row) => sum + row.mastery * row.evidenceCount, 0) / totalEvidence)
    : 0;
  const latestAttempt = normalized
    .map((row) => row.lastAttemptAt ? new Date(String(row.lastAttemptAt)).getTime() || 0 : 0)
    .reduce((max, value) => Math.max(max, value), 0);
  const evidenceConfidence = Math.max(0, Math.min(1, totalEvidence / Math.max(totalSkills * SERVER_MASTERY_THRESHOLDS.minEvidence, 1)));
  const recency = recencyFactor(latestAttempt || undefined);
  const score = Math.round(
    mastery * 0.55 +
    coverage * 100 * 0.2 +
    evidenceConfidence * 100 * 0.15 +
    recency * 100 * 0.1,
  );
  const status = totalSkills === 0 || reliableSkills === 0
    ? "needs_measurement"
    : score >= 80 && coverage >= 0.7
      ? "ready_to_advance"
      : score >= 60
        ? "ready_for_recheck"
        : "building";

  return {
    score,
    status,
    mastery,
    coverage,
    evidenceConfidence,
    recency,
    totalSkills,
    reliableSkills,
    totalEvidence,
    explanation:
      status === "needs_measurement"
        ? "نحتاج أدلة أكثر قبل اتخاذ قرار انتقال."
        : status === "ready_to_advance"
          ? "الإتقان والتغطية والأدلة الحديثة تسمح بالانتقال بعد تثبيت قصير."
          : status === "ready_for_recheck"
            ? "المستوى قريب من الجاهزية؛ أعد القياس بعد تدريب قصير."
            : "استمر في العلاج والتدريب قبل إعادة القياس.",
  };
};
