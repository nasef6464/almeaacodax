import { ClassroomAnswerModel } from "../models/ClassroomAnswer.js";
import { ClassroomReportModel } from "../models/ClassroomReport.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { GroupModel } from "../models/Group.js";
import { QuestionModel } from "../models/Question.js";
import { SkillModel } from "../models/Skill.js";
import { UserModel } from "../models/User.js";

/**
 * Builds and persists the post-session report: class accuracy, weak/strong
 * skills (reusing the same skillIds tagging already on QuestionModel, same
 * approach as weakSkillsAnalysis.ts), and a per-student breakdown so the
 * teacher can see exactly who needs help with what.
 */
export async function generateClassroomReport(sessionId: string) {
  const session = await ClassroomSessionModel.findById(sessionId).lean();
  if (!session) throw new Error("Session not found");

  const [answers, group] = await Promise.all([
    ClassroomAnswerModel.find({ sessionId }).lean(),
    GroupModel.findOne({ _id: session.groupId }).select("studentIds").lean(),
  ]);

  const questions = await QuestionModel.find({ id: { $in: session.questionIds } })
    .select("id skillIds")
    .lean();
  const questionById = new Map(questions.map((q: any) => [String(q.id || q._id), q]));

  // --- per-skill accuracy (class-wide) ---
  const skillStats = new Map<string, { attempts: number; correct: number }>();
  for (const answer of answers) {
    const question = questionById.get(String(answer.questionId));
    const skillIds: string[] = Array.isArray(question?.skillIds) ? question.skillIds : [];
    for (const skillId of skillIds) {
      const current = skillStats.get(skillId) || { attempts: 0, correct: 0 };
      current.attempts += 1;
      if (answer.isCorrect) current.correct += 1;
      skillStats.set(skillId, current);
    }
  }
  const skillDocs = skillStats.size
    ? await SkillModel.find({ _id: { $in: Array.from(skillStats.keys()) } }).select("_id name").lean()
    : [];
  const skillNameById = new Map(skillDocs.map((s: any) => [String(s._id), s.name]));
  const skillRows = Array.from(skillStats.entries()).map(([skillId, stats]) => ({
    skillId,
    skill: String(skillNameById.get(skillId) || "مهارة غير مسماة"),
    accuracy: Math.round((stats.correct / Math.max(1, stats.attempts)) * 100),
    attempts: stats.attempts,
  }));
  const weakSkills = skillRows.filter((s) => s.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const strongSkills = skillRows.filter((s) => s.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy);

  // --- per-student breakdown ---
  const studentIds: string[] = Array.isArray(group?.studentIds) ? group.studentIds.map(String) : [];
  const students = studentIds.length
    ? await UserModel.find({ _id: { $in: studentIds } }).select("_id name").lean()
    : [];
  const studentNameById = new Map(students.map((s: any) => [String(s._id), s.name]));

  const byStudent = new Map<string, { answered: number; correct: number; totalTimeMs: number }>();
  for (const answer of answers) {
    const key = String(answer.studentId);
    const current = byStudent.get(key) || { answered: 0, correct: 0, totalTimeMs: 0 };
    current.answered += 1;
    if (answer.isCorrect) current.correct += 1;
    current.totalTimeMs += Number(answer.timeTakenMs || 0);
    byStudent.set(key, current);
  }

  const perStudent = studentIds.map((studentId) => {
    const stats = byStudent.get(studentId) || { answered: 0, correct: 0, totalTimeMs: 0 };
    const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    return {
      studentId,
      name: String(studentNameById.get(studentId) || "طالب"),
      answered: stats.answered,
      correct: stats.correct,
      accuracy,
      avgTimeMs: stats.answered ? Math.round(stats.totalTimeMs / stats.answered) : 0,
      needsSupport: stats.answered > 0 && accuracy < 50,
    };
  });

  const respondedStudents = perStudent.filter((s) => s.answered > 0).length;
  const totalCorrect = answers.filter((a) => a.isCorrect).length;
  const classAccuracy = answers.length ? Math.round((totalCorrect / answers.length) * 100) : 0;

  const report = await ClassroomReportModel.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        totalStudents: studentIds.length,
        respondedStudents,
        totalQuestions: session.questionIds.length,
        classAccuracy,
        weakSkills,
        strongSkills,
        perStudent,
      },
    },
    { new: true, upsert: true },
  );

  return report;
}
