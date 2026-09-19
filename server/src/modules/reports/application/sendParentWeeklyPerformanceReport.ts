import mongoose from "mongoose";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { UserModel } from "../../../models/User.js";
import { getAuthorizedStudentIdsForParent } from "../../parents/application/parentAuthority.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const buildUserLookup = (ids: string[]) => {
  const normalized = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));
  const objectIds = normalized
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  return {
    $or: [
      { id: { $in: normalized } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

export async function sendParentWeeklyPerformanceReport(parentUserId: string) {
  const parentId = String(parentUserId || "").trim();
  if (!parentId) {
    throw new Error("missing_parent_user_id");
  }

  const authorizedStudentIds = await getAuthorizedStudentIdsForParent(parentId);
  if (!authorizedStudentIds.length) {
    return { ok: true as const, message: "no_linked_students", sent: 0, studentsReported: 0 };
  }

  const since = new Date(Date.now() - WEEK_MS);
  const results = await QuizResultModel.find({
    $and: [
      {
        $or: [
          { userId: { $in: authorizedStudentIds } },
          { studentId: { $in: authorizedStudentIds } },
        ],
      },
      {
        $or: [
          { createdAt: { $gte: since } },
          { date: { $gte: since.toISOString().slice(0, 10) } },
        ],
      },
    ],
  })
    .select("userId studentId score skillsAnalysis")
    .lean() as any[];

  if (!results.length) {
    return { ok: true as const, message: "no_results_this_week", sent: 0, studentsReported: 0 };
  }

  const studentMap = new Map<string, { name?: string; scores: number[]; weakSkills: string[] }>();
  for (const result of results) {
    const studentId = String(result.userId || result.studentId || "");
    if (!studentId || !authorizedStudentIds.includes(studentId)) continue;
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, { scores: [], weakSkills: [] });
    }
    const entry = studentMap.get(studentId)!;
    entry.scores.push(Number(result.score || 0));
    for (const skill of (result.skillsAnalysis || [])
      .filter((item: any) => Number(item.mastery || 0) < 70)
      .slice(0, 2)) {
      const skillName = String(skill.skill || "").trim();
      if (skillName && !entry.weakSkills.includes(skillName)) {
        entry.weakSkills.push(skillName);
      }
    }
  }

  if (!studentMap.size) {
    return { ok: true as const, message: "no_results_this_week", sent: 0, studentsReported: 0 };
  }

  const studentUsers = await UserModel.find(buildUserLookup(Array.from(studentMap.keys())))
    .select("_id id name")
    .lean() as any[];
  for (const student of studentUsers) {
    const studentId = String(student.id || student._id);
    if (studentMap.has(studentId)) {
      studentMap.get(studentId)!.name = String(student.name || "الابن/الابنة");
    }
  }

  const summaries = Array.from(studentMap.values()).map((entry) => {
    const average = entry.scores.length
      ? Math.round(entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length)
      : 0;
    const emoji = average >= 80 ? "🌟" : average >= 60 ? "📈" : "📌";
    const weakPart = entry.weakSkills.length
      ? ` · يحتاج تعزيز: ${entry.weakSkills.slice(0, 2).join("، ")}`
      : "";
    return `${emoji} ${entry.name || "الابن"}: متوسط ${average}%${weakPart}`;
  });

  await createNotificationDeliveries({
    title: "📋 تقريرك الأسبوعي عن أداء أبنائك",
    body: `هذا الأسبوع — ${summaries.join(" | ")} · استمر بالمتابعة!`.slice(0, 500),
    channels: ["in_app"],
    userIds: [parentId],
    createdBy: "system_weekly_report",
  });

  return {
    ok: true as const,
    sent: 1,
    studentsReported: studentMap.size,
  };
}
