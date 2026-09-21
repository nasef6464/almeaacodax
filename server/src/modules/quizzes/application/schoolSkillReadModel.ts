import { SchoolSkillAggregateModel } from "../../../models/SchoolSkillAggregate.js";
import { SchoolSkillEvidenceModel } from "../../../models/SchoolSkillEvidence.js";

type ScopeKey = {
  schoolId: string;
  classId: string;
  userId: string;
  pathId: string;
  subjectId: string;
  skillId: string;
};

const keyOf = (value: ScopeKey) =>
  [value.schoolId, value.classId, value.userId, value.pathId, value.subjectId, value.skillId].join("::");

const clampPercent = (value: unknown) => Math.max(0, Math.min(100, Number(value || 0)));

const resolveOccurredAt = (result: any) => {
  const candidate = result?.createdAt || result?.date;
  const parsed = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const normalizeResultSkillEvidence = (result: any, userId: string) => {
  const schoolId = String(result?.schoolId || "").trim();
  const classId = String(result?.classId || "").trim();
  const resultId = String(result?.submissionKey || result?.id || result?._id || "").trim();
  if (!schoolId || !resultId || !userId) return [];

  const bySkill = new Map<string, any>();
  for (const raw of Array.isArray(result?.skillsAnalysis) ? result.skillsAnalysis : []) {
    const skillId = String(raw?.skillId || "").trim();
    const pathId = String(raw?.pathId || result?.quizSnapshot?.pathId || "").trim();
    const subjectId = String(raw?.subjectId || result?.quizSnapshot?.subjectId || "").trim();
    if (!skillId || !pathId || !subjectId) continue;

    const questionCount = Math.max(1, Number(raw?.questionCount || raw?.total || 1));
    const derivedCorrect = Math.round((clampPercent(raw?.mastery) / 100) * questionCount);
    const correctCount = Math.max(
      0,
      Math.min(questionCount, Number.isFinite(Number(raw?.correctCount)) ? Number(raw.correctCount) : derivedCorrect),
    );
    const scope = { schoolId, classId, userId, pathId, subjectId, skillId };
    const mapKey = keyOf(scope);
    const current = bySkill.get(mapKey) || {
      ...scope,
      sectionId: String(raw?.sectionId || "").trim(),
      skill: String(raw?.skill || "مهارة غير مسماة"),
      questionCount: 0,
      correctCount: 0,
    };
    current.questionCount += questionCount;
    current.correctCount += correctCount;
    bySkill.set(mapKey, current);
  }

  const occurredAt = resolveOccurredAt(result);
  const source = String(result?.source || result?.quizSnapshot?.quizKind || "assessment");
  return [...bySkill.values()].map((item) => ({
    ...item,
    resultId,
    evidenceKey: [resultId, item.pathId, item.subjectId, item.skillId].join("::"),
    source,
    occurredAt,
  }));
};

const buildScopeFilter = (item: ScopeKey) => ({
  schoolId: item.schoolId,
  classId: item.classId,
  userId: item.userId,
  pathId: item.pathId,
  subjectId: item.subjectId,
  skillId: item.skillId,
});

const groupId = {
  schoolId: "$schoolId",
  classId: "$classId",
  userId: "$userId",
  pathId: "$pathId",
  subjectId: "$subjectId",
  skillId: "$skillId",
};

export async function updateSchoolSkillReadModelFromResult(result: any, userId: string) {
  const normalized = normalizeResultSkillEvidence(result, userId);
  if (normalized.length === 0) return;

  await SchoolSkillEvidenceModel.bulkWrite(
    normalized.map((item) => ({
      updateOne: {
        filter: { evidenceKey: item.evidenceKey },
        update: {
          $setOnInsert: {
            evidenceKey: item.evidenceKey,
            resultId: item.resultId,
            schoolId: item.schoolId,
            classId: item.classId,
            userId: item.userId,
            pathId: item.pathId,
            subjectId: item.subjectId,
            sectionId: item.sectionId,
            skillId: item.skillId,
            skill: item.skill,
            questionCount: item.questionCount,
            correctCount: item.correctCount,
            source: item.source,
            occurredAt: item.occurredAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const scopeFilters = normalized.map(buildScopeFilter);
  const [cumulativeRows, recentRows] = await Promise.all([
    SchoolSkillEvidenceModel.aggregate([
      { $match: { $or: scopeFilters } },
      {
        $group: {
          _id: groupId,
          skill: { $last: "$skill" },
          sectionId: { $last: "$sectionId" },
          totalEvidence: { $sum: "$questionCount" },
          totalCorrect: { $sum: "$correctCount" },
          attemptCount: { $sum: 1 },
          lastEvidenceAt: { $max: "$occurredAt" },
        },
      },
    ]),
    SchoolSkillEvidenceModel.aggregate([
      { $match: { $or: scopeFilters } },
      {
        $set: {
          scopeKey: {
            $concat: ["$schoolId", "::", "$classId", "::", "$userId", "::", "$pathId", "::", "$subjectId", "::", "$skillId"],
          },
          eventMastery: {
            $cond: [
              { $gt: ["$questionCount", 0] },
              { $multiply: [{ $divide: ["$correctCount", "$questionCount"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $setWindowFields: {
          partitionBy: "$scopeKey",
          sortBy: { occurredAt: -1 },
          output: { recentRank: { $documentNumber: {} } },
        },
      },
      { $match: { recentRank: { $lte: 5 } } },
      {
        $group: {
          _id: groupId,
          recentEvidence: { $sum: "$questionCount" },
          recentCorrect: { $sum: "$correctCount" },
          latestMastery: { $first: "$eventMastery" },
          oldestMastery: { $last: "$eventMastery" },
        },
      },
    ]),
  ]);

  const recentByKey = new Map(
    recentRows.map((row: any) => [keyOf(row._id as ScopeKey), row]),
  );

  const aggregateOps = cumulativeRows.map((row: any) => {
    const scope = row._id as ScopeKey;
    const recent = recentByKey.get(keyOf(scope)) as any;
    const totalEvidence = Math.max(0, Number(row.totalEvidence || 0));
    const totalCorrect = Math.max(0, Number(row.totalCorrect || 0));
    const recentEvidence = Math.max(0, Number(recent?.recentEvidence || 0));
    const recentCorrect = Math.max(0, Number(recent?.recentCorrect || 0));
    const mastery = totalEvidence > 0 ? Math.round((totalCorrect / totalEvidence) * 100) : 0;
    const recentMastery = recentEvidence > 0 ? Math.round((recentCorrect / recentEvidence) * 100) : mastery;
    const delta = Number(recent?.latestMastery || 0) - Number(recent?.oldestMastery || 0);
    const trend = delta >= 5 ? "improving" : delta <= -5 ? "declining" : "stable";
    const confidence = Math.min(100, totalEvidence * 10);

    return {
      updateOne: {
        filter: scope,
        update: {
          $set: {
            ...scope,
            sectionId: String(row.sectionId || ""),
            skill: String(row.skill || "مهارة غير مسماة"),
            totalEvidence,
            totalCorrect,
            attemptCount: Math.max(0, Number(row.attemptCount || 0)),
            mastery,
            recentMastery,
            trend,
            confidence,
            lastEvidenceAt: row.lastEvidenceAt,
          },
        },
        upsert: true,
      },
    };
  });

  if (aggregateOps.length > 0) {
    await SchoolSkillAggregateModel.bulkWrite(aggregateOps as any[], { ordered: false });
  }
}
