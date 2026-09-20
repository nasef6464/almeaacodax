import { buildQuizReportAttemptGaps } from "./quizReportAttemptGaps.js";
import { matchesManagedContentScope } from "./quizManagedContentScope.js";

export const MIN_ANALYTICS_SKILL_EVIDENCE_COUNT = 3;

const idOf = (item: any) => String(item?.id || item?._id || "");

const toSafeDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const buildWeakestStudentSummaries = ({
  scopedStudents,
  resultsByStudent,
  attemptsByStudent,
  authUserRole,
  managedPathIds,
  managedSubjectIds,
  groupNameById,
  skillById,
  subjectNameById,
  sectionNameById,
}: {
  scopedStudents: any[];
  resultsByStudent: Map<string, any[]>;
  attemptsByStudent: Map<string, any[]>;
  authUserRole: string;
  managedPathIds: Set<string>;
  managedSubjectIds: Set<string>;
  groupNameById: Map<string, string>;
  skillById: Map<string, any>;
  subjectNameById: Map<string, string>;
  sectionNameById: Map<string, string>;
}) =>
  scopedStudents
    .map((student) => {
      const studentId = idOf(student);
      const results = resultsByStudent.get(studentId) || [];
      const granularAttempts = attemptsByStudent.get(studentId) || [];
      const attempts = results.length;
      const granularAnswered = granularAttempts.filter((attempt) => Number(attempt.selectedOptionIndex ?? -1) >= 0);
      const granularAverage = granularAnswered.length
        ? Math.round((granularAnswered.filter((attempt) => Boolean(attempt.isCorrect)).length / granularAnswered.length) * 100)
        : 0;
      const averageScore = attempts
        ? Math.round(results.reduce((sum, result) => sum + (Number(result.score) || 0), 0) / attempts)
        : granularAverage;

      const weakSkillMap = new Map<string, { skill: string; masterySum: number; count: number }>();

      results.forEach((result) => {
        const skills = (Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : []).filter((gap: any) =>
          authUserRole === "teacher"
            ? matchesManagedContentScope(gap, managedPathIds, managedSubjectIds)
            : true,
        );
        skills.forEach((gap: any) => {
          const mastery = Number(gap?.mastery || 0);
          if (mastery >= 75) return;
          const key = String(gap?.skillId || gap?.skill || gap?.sectionId || "unknown");
          const current = weakSkillMap.get(key) || {
            skill: String(gap?.skill || "مهارة غير مسماة"),
            masterySum: 0,
            count: 0,
          };
          current.masterySum += mastery;
          current.count += 1;
          weakSkillMap.set(key, current);
        });
      });

      granularAttempts.forEach((attempt) => {
        buildQuizReportAttemptGaps(attempt, skillById, subjectNameById, sectionNameById).forEach((gap) => {
          const mastery = Number(gap?.mastery || 0);
          if (mastery >= 75) return;
          const key = String(gap?.skillId || gap?.skill || gap?.sectionId || "unknown");
          const current = weakSkillMap.get(key) || {
            skill: String(gap?.skill || "مهارة غير مسماة"),
            masterySum: 0,
            count: 0,
          };
          current.masterySum += mastery;
          current.count += 1;
          weakSkillMap.set(key, current);
        });
      });

      const reliableWeakSkillItems = Array.from(weakSkillMap.values()).filter(
        (item) => item.count >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT,
      );
      const earlyWeakSignalCount = Array.from(weakSkillMap.values()).filter(
        (item) => item.count < MIN_ANALYTICS_SKILL_EVIDENCE_COUNT,
      ).length;
      const weakestSkills = reliableWeakSkillItems
        .map((item) => ({
          skill: item.skill,
          mastery: Math.round(item.masterySum / Math.max(item.count, 1)),
          attempts: item.count,
          isReliable: true,
          evidenceThreshold: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT,
        }))
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 3);

      return {
        id: studentId,
        name: student.name,
        email: student.email,
        schoolId: student.schoolId || undefined,
        schoolName: student.schoolId ? groupNameById.get(String(student.schoolId)) : undefined,
        groupIds: (student.groupIds || []).map(String),
        groupNames: (student.groupIds || []).map((groupId: string) => groupNameById.get(String(groupId))).filter(Boolean),
        attempts,
        questionAttempts: granularAttempts.length,
        averageScore,
        weakSkillCount: reliableWeakSkillItems.length,
        earlyWeakSignalCount,
        weakestSkills,
        latestAttemptAt: toSafeDate(results[0]?.createdAt),
        recommendedAction:
          attempts === 0
            ? "ابدأ باختبار تشخيصي موجه لهذه الحالة"
            : averageScore < 50
              ? "أرسل خطة علاج عاجلة واختبار متابعة موجه"
              : averageScore < 70
                ? "أضف تدريبات علاجية واختبار ساهر مخصص"
                : "استمر في التثبيت والمتابعة الدورية",
      };
    })
    .sort((a, b) => a.averageScore - b.averageScore || b.weakSkillCount - a.weakSkillCount)
    .slice(0, 12);
