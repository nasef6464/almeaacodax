import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { createNotificationDeliveries } from "../services/notificationService.js";
import { enqueueNotificationDeliveries } from "../queues/notificationQueue.js";

export const parentRouter = Router();

parentRouter.get(
  "/children-progress",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const parent = await UserModel.findById(req.authUser!.id)
      .select("id linkedStudentIds name email")
      .lean();
    const linkedStudentIds = Array.isArray((parent as any)?.linkedStudentIds)
      ? (parent as any).linkedStudentIds.map(String).filter(Boolean)
      : [];

    if (!linkedStudentIds.length) {
      return res.json({ children: [], summary: { count: 0, weakSkills: 0 } });
    }

    const [students, weeklyResults, latestResults] = await Promise.all([
      UserModel.find({ $or: [{ id: { $in: linkedStudentIds } }, { _id: { $in: linkedStudentIds } }] })
        .select("id _id name enrolledCourses completedLessons")
        .lean(),
      QuizResultModel.find({
        userId: { $in: linkedStudentIds },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .select("userId timeSpentSeconds score skillsAnalysis createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      QuizResultModel.find({ userId: { $in: linkedStudentIds } })
        .select("userId score skillsAnalysis createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const weeklyByUser = new Map<string, any[]>();
    for (const row of weeklyResults as any[]) {
      const key = String(row.userId || "");
      const current = weeklyByUser.get(key) || [];
      current.push(row);
      weeklyByUser.set(key, current);
    }

    const latestByUser = new Map<string, any>();
    for (const row of latestResults as any[]) {
      const key = String(row.userId || "");
      if (!latestByUser.has(key)) latestByUser.set(key, row);
    }

    const children = (students as any[]).map((student) => {
      const sid = String(student.id || student._id || "");
      const weekly = weeklyByUser.get(sid) || [];
      const latest = latestByUser.get(sid);
      const weeklyStudyMinutes = Math.round(
        weekly.reduce((sum, item) => sum + Number(item.timeSpentSeconds || 0), 0) / 60,
      );
      const weakSkills = Array.from(
        new Set(
          (latest?.skillsAnalysis || [])
            .filter((skill: any) => Number(skill.mastery || 0) < 75 || String(skill.status || "") === "weak")
            .map((skill: any) => String(skill.skill || skill.skillId || "").trim())
            .filter(Boolean),
        ),
      ).slice(0, 5);

      return {
        id: sid,
        name: String(student.name || "طالب"),
        weeklyStudyMinutes,
        lastQuizScore: Number(latest?.score || 0),
        weakSkills,
        coursesInProgress: Array.isArray(student.enrolledCourses)
          ? student.enrolledCourses.map(String).filter(Boolean)
          : [],
      };
    });

    return res.json({
      children,
      summary: {
        count: children.length,
        weakSkills: children.reduce((sum, child) => sum + child.weakSkills.length, 0),
      },
    });
  }),
);

parentRouter.post(
  "/weekly-report/send",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const parent = await UserModel.findById(req.authUser!.id).select("id name linkedStudentIds").lean();
    const linkedStudentIds = Array.isArray((parent as any)?.linkedStudentIds)
      ? (parent as any).linkedStudentIds.map(String).filter(Boolean)
      : [];
    if (!linkedStudentIds.length) {
      return res.status(400).json({ message: "No linked students found for this parent account." });
    }

    const latestResults = await QuizResultModel.find({ userId: { $in: linkedStudentIds } })
      .select("userId score createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const latestByUser = new Map<string, any>();
    for (const row of latestResults as any[]) {
      const key = String(row.userId || "");
      if (!latestByUser.has(key)) latestByUser.set(key, row);
    }

    const rows = linkedStudentIds.map((sid: string) => {
      const row = latestByUser.get(String(sid));
      return row ? `- الطالب ${sid}: آخر نتيجة ${Number(row.score || 0)}%` : `- الطالب ${sid}: لا توجد نتيجة حديثة`;
    });
    const body = `تقرير أسبوعي مبسط:\n${rows.join("\n")}`;

    const delivery = await createNotificationDeliveries({
      title: "تقرير أسبوعي للأبناء",
      subject: "تقرير منصة المئة الأسبوعي",
      body,
      channels: ["in_app", "email"],
      userIds: [String((parent as any).id || req.authUser!.id)],
      createdBy: String(req.authUser!.id),
    });
    await enqueueNotificationDeliveries(delivery.deliveryIds || []);

    return res.json({
      ok: true,
      campaignId: delivery.campaignId,
      recipients: delivery.recipients,
      created: delivery.created,
    });
  }),
);
