import { buildResultSkillStatus, buildSkillRecommendation } from "../analytics/skillAnalytics.js";

type QuizSubmissionSkillsAnalysisInput = {
  skillStats: Map<string, { total: number; correct: number }>;
  skillById: Map<string, any>;
  quiz: any;
  subjectNameById: Map<string, string>;
  sectionNameById: Map<string, string>;
};

export const buildQuizSubmissionSkillsAnalysis = ({
  skillStats,
  skillById,
  quiz,
  subjectNameById,
  sectionNameById,
}: QuizSubmissionSkillsAnalysisInput) =>
  Array.from(skillStats.entries()).flatMap(([skillId, stats]) => {
    const skill = skillById.get(skillId);

    // A result must never invent a label for an unresolved taxonomy id.
    // Canonical question linkage is authoritative; unresolved ids are omitted
    // and caught by the regression/integrity gates instead of being presented
    // to the learner as an unrelated or "unnamed" skill.
    if (!skill) return [];

    const mastery = Math.round((stats.correct / Math.max(stats.total, 1)) * 100);
    const status = buildResultSkillStatus(mastery);
    const subjectId = String(skill.subjectId || quiz.subjectId || "");
    const sectionId = String(skill.sectionId || quiz.sectionId || "");

    return [{
      skillId,
      level: skill.level === "sub" ? "sub" : "main",
      parentSkillId: String(skill.parentSkillId || ""),
      parentSkill: String(skill.parentSkill || ""),
      pathId: String(skill.pathId || quiz.pathId || ""),
      subjectId,
      sectionId,
      skill: String(skill.name || ""),
      mastery,
      questionCount: stats.total,
      correctCount: stats.correct,
      status,
      recommendation: buildSkillRecommendation(mastery),
      section: sectionNameById.get(sectionId) || subjectNameById.get(subjectId) || "",
    }];
  });
