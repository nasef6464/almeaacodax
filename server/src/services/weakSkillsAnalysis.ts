import { LessonModel } from "../models/Lesson.js";
import { QuestionModel } from "../models/Question.js";
import { SkillModel } from "../models/Skill.js";

type AnalysisSkillItem = {
  skillId: string;
  skill: string;
  accuracy: number;
  attempts: number;
  correct: number;
  lessonIds: string[];
};

type AnalysisResult = {
  weakSkills: AnalysisSkillItem[];
  strongSkills: AnalysisSkillItem[];
  recommendations: Array<{
    lessonId: string;
    lessonTitle: string;
    reason: string;
    skillId: string;
    skill: string;
    accuracy: number;
  }>;
};

const normalizeQuestionId = (value: string) => String(value || "").trim().replace(/_copy(?:_\d+)?$/i, "");

export const analyzeWeakSkillsFromQuizResult = async (quizResult: any): Promise<AnalysisResult> => {
  const reviewRows = Array.isArray(quizResult?.questionReview) ? quizResult.questionReview : [];
  const normalizedIds = Array.from(
    new Set(
      reviewRows
        .map((row: any) => normalizeQuestionId(String(row?.questionId || "")))
        .filter(Boolean),
    ),
  );

  if (normalizedIds.length === 0) {
    return { weakSkills: [], strongSkills: [], recommendations: [] };
  }

  const questions = await QuestionModel.find({ id: { $in: normalizedIds } })
    .select("id skillIds")
    .lean();
  const questionById = new Map(questions.map((question: any) => [normalizeQuestionId(String(question.id || question._id)), question]));

  const skillStats = new Map<string, { attempts: number; correct: number }>();
  for (const row of reviewRows) {
    const normalizedId = normalizeQuestionId(String(row?.questionId || ""));
    if (!normalizedId) continue;
    const question = questionById.get(normalizedId);
    const skillIds = Array.isArray(question?.skillIds) ? question.skillIds.map(String).filter(Boolean) : [];
    if (skillIds.length === 0) continue;
    const isCorrect = Boolean(row?.isCorrect);
    for (const skillId of skillIds) {
      const current = skillStats.get(skillId) || { attempts: 0, correct: 0 };
      current.attempts += 1;
      if (isCorrect) current.correct += 1;
      skillStats.set(skillId, current);
    }
  }

  const skillIds = Array.from(skillStats.keys());
  if (skillIds.length === 0) {
    return { weakSkills: [], strongSkills: [], recommendations: [] };
  }

  const skills = await SkillModel.find({ _id: { $in: skillIds } })
    .select("_id name lessonIds")
    .lean();
  const skillById = new Map(skills.map((skill: any) => [String(skill._id), skill]));

  const computed = skillIds
    .map((skillId) => {
      const stats = skillStats.get(skillId)!;
      const accuracy = Math.round((stats.correct / Math.max(1, stats.attempts)) * 100);
      const skillDoc = skillById.get(skillId);
      return {
        skillId,
        skill: String(skillDoc?.name || "مهارة غير مسماة"),
        accuracy,
        attempts: stats.attempts,
        correct: stats.correct,
        lessonIds: Array.isArray(skillDoc?.lessonIds) ? skillDoc.lessonIds.map(String).filter(Boolean) : [],
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakSkills = computed.filter((item) => item.accuracy < 60);
  const strongSkills = computed.filter((item) => item.accuracy >= 80);

  const recommendedLessonIds = Array.from(new Set(weakSkills.flatMap((skill) => skill.lessonIds).filter(Boolean)));
  const lessons = recommendedLessonIds.length
    ? await LessonModel.find({ id: { $in: recommendedLessonIds } })
        .select("id title")
        .lean()
    : [];
  const lessonById = new Map(lessons.map((lesson: any) => [String(lesson.id || lesson._id), lesson]));

  const recommendations = weakSkills
    .flatMap((skill) =>
      skill.lessonIds.slice(0, 2).map((lessonId: string) => {
        const lesson = lessonById.get(lessonId);
        return lesson
          ? {
              lessonId,
              lessonTitle: String(lesson.title || "درس علاجي"),
              reason: `دعم مهارة ${skill.skill} (دقة ${skill.accuracy}%)`,
              skillId: skill.skillId,
              skill: skill.skill,
              accuracy: skill.accuracy,
            }
          : null;
      }),
    )
    .filter(Boolean) as AnalysisResult["recommendations"];

  return { weakSkills, strongSkills, recommendations };
};
