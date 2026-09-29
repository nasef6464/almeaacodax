import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { projectSkillProgressRows } from "../modules/quizzes/application/skillMasteryProjection.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";
import { createNotificationDeliveries } from "../services/notificationService.js";
import { enqueueNotificationDeliveries } from "../queues/notificationQueue.js";
import { getAuthorizedStudentIdsForParent } from "../services/parentAuthorityService.js";
import { runParentWhatsappDigestBatch } from "../modules/reports/application/runParentWhatsappDigestBatch.js";

export const parentRouter = Router();

parentRouter.get(
  "/children-progress",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const parent = await UserModel.findById(req.authUser!.id)
      .select("id name email")
      .lean();
    const linkedStudentIds = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));

    if (!linkedStudentIds.length) {
      return res.json({ children: [], summary: { count: 0, weakSkills: 0 } });
    }

    const [students, weeklySummaries, latestResults, rawSkillProgress] = await Promise.all([
      UserModel.find({ $or: [{ id: { $in: linkedStudentIds } }, { _id: { $in: linkedStudentIds } }] })
        .select("id _id name enrolledCourses completedLessons")
        .lean(),
      QuizResultModel.aggregate([
        {
          $match: {
            userId: { $in: linkedStudentIds },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: "$userId",
            weeklyStudySeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } },
          },
        },
      ]),
      QuizResultModel.aggregate([
        { $match: { userId: { $in: linkedStudentIds } } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $group: {
            _id: "$userId",
            score: { $first: "$score" },
          },
        },
      ]),
      SkillProgressModel.find({ userId: { $in: linkedStudentIds } })
        .sort({ mastery: 1, lastAttemptAt: -1 })
        .limit(2000)
        .lean(),
    ]);

    const projectedSkillProgress = await projectSkillProgressRows(rawSkillProgress as any[]);
    const skillProgressByUser = new Map<string, any[]>();
    for (const row of projectedSkillProgress as any[]) {
      if (row.unresolvedTaxonomy) continue;
      const key = String(row.userId || "");
      const current = skillProgressByUser.get(key) || [];
      current.push(row);
      skillProgressByUser.set(key, current);
    }

    const weeklyByUser = new Map<string, number>(
      (weeklySummaries as any[]).map((row) => [String(row._id || ""), Number(row.weeklyStudySeconds || 0)]),
    );

    const latestByUser = new Map<string, any>(
      (latestResults as any[]).map((row) => [String(row._id || ""), row]),
    );

    const children = (students as any[]).map((student) => {
      const sid = String(student.id || student._id || "");
      const weeklyStudySeconds = weeklyByUser.get(sid) || 0;
      const latest = latestByUser.get(sid);
      const weeklyStudyMinutes = Math.round(weeklyStudySeconds / 60);
      const weakSkillRows = (skillProgressByUser.get(sid) || [])
        .filter((skill: any) => Number(skill.mastery || 0) < 75)
        .sort((a: any, b: any) => Number(a.mastery || 0) - Number(b.mastery || 0))
        .slice(0, 5);
      const weakSkillDetails = weakSkillRows.map((skill: any) => ({
        skillId: String(skill.skillId || ""),
        skill: String(skill.skill || ""),
        parentSkillId: String(skill.parentSkillId || ""),
        parentSkill: String(skill.parentSkill || ""),
        pathId: String(skill.pathId || ""),
        subjectId: String(skill.subjectId || ""),
        mastery: Number(skill.mastery || 0),
        trend: String(skill.recent?.trend || "stable"),
        evidenceCount: Number(skill.evidenceCount || 0),
      }));
      const weakSkills = weakSkillDetails.map((skill: any) => skill.skill).filter(Boolean);

      return {
        id: sid,
        name: String(student.name || "طالب"),
        weeklyStudyMinutes,
        lastQuizScore: Number(latest?.score || 0),
        weakSkills,
        weakSkillDetails,
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
    const parent = await UserModel.findById(req.authUser!.id).select("id name").lean();
    const linkedStudentIds = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));
    if (!linkedStudentIds.length) {
      return res.status(400).json({ message: "No linked students found for this parent account." });
    }

    const [latestResults, rawSkillProgress] = await Promise.all([
      QuizResultModel.find({ userId: { $in: linkedStudentIds } })
        .select("userId score createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      SkillProgressModel.find({ userId: { $in: linkedStudentIds }, mastery: { $lt: 75 } })
        .sort({ mastery: 1, lastAttemptAt: -1 })
        .limit(1000)
        .lean(),
    ]);
    const projectedSkillProgress = await projectSkillProgressRows(rawSkillProgress as any[]);
    const weakByUser = new Map<string, any[]>();
    for (const skill of projectedSkillProgress as any[]) {
      if (skill.unresolvedTaxonomy) continue;
      const key = String(skill.userId || "");
      const rows = weakByUser.get(key) || [];
      if (rows.length < 3) rows.push(skill);
      weakByUser.set(key, rows);
    }

    const latestByUser = new Map<string, any>();
    for (const row of latestResults as any[]) {
      const key = String(row.userId || "");
      if (!latestByUser.has(key)) latestByUser.set(key, row);
    }

    const rows = linkedStudentIds.map((sid: string) => {
      const row = latestByUser.get(String(sid));
      const weak = (weakByUser.get(String(sid)) || [])
        .map((skill: any) => `${String(skill.skill || "مهارة")} (${Number(skill.mastery || 0)}%)`)
        .join("، ");
      const scoreText = row ? `آخر نتيجة ${Number(row.score || 0)}%` : "لا توجد نتيجة حديثة";
      return `- الطالب ${sid}: ${scoreText}${weak ? ` — يحتاج متابعة: ${weak}` : " — لا توجد مهارات ضعيفة مؤكدة"}`;
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

parentRouter.get(
  "/approvals",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const linkedStudentIds = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));

    if (!linkedStudentIds.length) {
      return res.json([]);
    }

    const requests = await PaymentRequestModel.find({
      userId: { $in: linkedStudentIds },
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(requests);
  }),
);

parentRouter.post(
  "/approvals/:id/approve",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const request = await PaymentRequestModel.findOne({ id: req.params.id, status: "pending" });
    if (!request) return res.status(404).json({ message: "Request not found" });

    const linkedStudentIds = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));

    if (!linkedStudentIds.includes(request.userId)) {
      return res.status(403).json({ message: "Not authorized to approve this request" });
    }

    request.status = "approved";
    request.reviewedBy = req.authUser!.id;
    request.reviewedAt = Date.now();
    await request.save();

    return res.json({ ok: true, message: "Approved successfully" });
  }),
);

parentRouter.post(
  "/approvals/:id/reject",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const request = await PaymentRequestModel.findOne({ id: req.params.id, status: "pending" });
    if (!request) return res.status(404).json({ message: "Request not found" });

    const linkedStudentIds = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));

    if (!linkedStudentIds.includes(request.userId)) {
      return res.status(403).json({ message: "Not authorized to reject this request" });
    }

    request.status = "rejected";
    request.reviewedBy = req.authUser!.id;
    request.reviewedAt = Date.now();
    await request.save();

    return res.json({ ok: true, message: "Rejected successfully" });
  }),
);

parentRouter.post(
  "/settings/whatsapp",
  requireAuth,
  requireRole(["parent"]),
  asyncHandler(async (req, res) => {
    const enabled = Boolean(req.body.enabled);
    await UserModel.findByIdAndUpdate(req.authUser!.id, { whatsappDigestEnabled: enabled });
    return res.json({ ok: true, enabled });
  }),
);

parentRouter.post(
  "/weekly-report/trigger-all",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const summary = await runParentWhatsappDigestBatch(String(req.authUser!.id));
    return res.json({
      ok: true,
      ...summary,
    });
  }),
);
