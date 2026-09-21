import { randomUUID } from "node:crypto";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { MasteryGoalModel } from "../../../models/MasteryGoal.js";
import { PathModel } from "../../../models/Path.js";
import { SkillProgressModel } from "../../../models/SkillProgress.js";
import { SubjectModel } from "../../../models/Subject.js";
import { requireAuth } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildScopedMasteryReadiness } from "../analytics/masteryReadiness.js";
import { buildServerNextBestAction } from "../analytics/nextBestAction.js";
import { resolveScopedStudents } from "../application/quizReportScope.js";
import { createMasteryGoalSchema, updateMasteryGoalSchema } from "./masteryGoalSchemas.js";

export const adaptiveMasteryRouter = Router();

const STAFF_ROLES = new Set(["admin", "school_admin", "supervisor", "teacher"]);

const assertMasteryTaxonomyScope = async (pathId: string, subjectId?: string) => {
  const path = await PathModel.findById(pathId).select("_id").lean();
  if (!path) return { ok: false as const, message: "Learning path not found" };
  if (subjectId) {
    const subject = await SubjectModel.findById(subjectId).select("_id pathId").lean();
    if (!subject || String((subject as any).pathId || "") !== pathId) {
      return { ok: false as const, message: "Subject does not belong to the selected path" };
    }
  }
  return { ok: true as const };
};

const resolveMasteryGoalTargetUserId = async (authUser: any, requestedUserId?: string) => {
  const ownId = String(authUser?.id || "");
  const requested = String(requestedUserId || ownId).trim();
  if (!requested || requested === ownId) return ownId;
  if (!STAFF_ROLES.has(String(authUser?.role || ""))) return "";
  const scope = await resolveScopedStudents(authUser, { limit: 1000 });
  const allowed = scope.students.some((student: any) =>
    [student?.id, student?._id].map((value) => String(value || "")).includes(requested),
  );
  return allowed ? requested : "";
};

adaptiveMasteryRouter.get(
  "/mastery-goals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetUserId = await resolveMasteryGoalTargetUserId(req.authUser, String(req.query.userId || ""));
    if (!targetUserId) return res.status(StatusCodes.FORBIDDEN).json({ message: "Goal scope is not allowed" });
    const pathId = String(req.query.pathId || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();
    const status = String(req.query.status || "active").trim();
    const goals = await MasteryGoalModel.find({
      userId: targetUserId,
      ...(pathId ? { pathId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(status ? { status } : {}),
    }).sort({ dueDate: 1, createdAt: -1 }).limit(100).lean();
    return res.json({ goals });
  }),
);

adaptiveMasteryRouter.post(
  "/mastery-goals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = createMasteryGoalSchema.parse(req.body);
    const targetUserId = await resolveMasteryGoalTargetUserId(req.authUser, payload.userId);
    if (!targetUserId) return res.status(StatusCodes.FORBIDDEN).json({ message: "Goal scope is not allowed" });
    const taxonomyScope = await assertMasteryTaxonomyScope(payload.pathId, payload.subjectId);
    if (!taxonomyScope.ok) return res.status(StatusCodes.BAD_REQUEST).json({ message: taxonomyScope.message });
    const created = await MasteryGoalModel.create({
      id: randomUUID(),
      userId: targetUserId,
      createdByUserId: req.authUser!.id,
      createdByRole: String(req.authUser!.role || "student"),
      pathId: payload.pathId,
      subjectId: payload.subjectId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      title: payload.title,
      targetMastery: payload.targetMastery,
      horizon: payload.horizon,
      dueDate: payload.dueDate,
      status: "active",
    });
    return res.status(StatusCodes.CREATED).json(created);
  }),
);

adaptiveMasteryRouter.patch(
  "/mastery-goals/:goalId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = updateMasteryGoalSchema.parse(req.body);
    const existing = await MasteryGoalModel.findOne({ id: String(req.params.goalId || "") });
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ message: "Mastery goal not found" });
    const targetUserId = await resolveMasteryGoalTargetUserId(req.authUser, String(existing.userId || ""));
    if (!targetUserId) return res.status(StatusCodes.FORBIDDEN).json({ message: "Goal scope is not allowed" });
    Object.assign(existing, payload);
    await existing.save();
    return res.json(existing);
  }),
);

adaptiveMasteryRouter.get(
  "/mastery-readiness",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pathId = String(req.query.pathId || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();
    if (!pathId) return res.status(StatusCodes.BAD_REQUEST).json({ message: "pathId is required" });
    const taxonomyScope = await assertMasteryTaxonomyScope(pathId, subjectId);
    if (!taxonomyScope.ok) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: taxonomyScope.message });
    }
    const rows = await SkillProgressModel.find({
      userId: req.authUser!.id,
      pathId,
      ...(subjectId ? { subjectId } : {}),
    }).select("mastery evidenceCount attempts lastAttemptAt").limit(500).lean();
    return res.json({
      scope: { pathId, ...(subjectId ? { subjectId } : {}) },
      readiness: buildScopedMasteryReadiness(rows as any[]),
    });
  }),
);

adaptiveMasteryRouter.get(
  "/next-best-action",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pathId = String(req.query.pathId || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();
    if (!pathId) return res.status(StatusCodes.BAD_REQUEST).json({ message: "pathId is required" });
    const rows = await SkillProgressModel.find({
      userId: req.authUser!.id,
      pathId,
      ...(subjectId ? { subjectId } : {}),
    })
      .select("skillId skill pathId subjectId sectionId mastery status attempts evidenceCount lastAttemptAt recentEvidence")
      .sort({ mastery: 1, lastAttemptAt: -1 })
      .limit(100)
      .lean();
    const payload = buildServerNextBestAction(rows as any[], { pathId, ...(subjectId ? { subjectId } : {}) });
    const etag = `"${payload.fingerprint}"`;
    if (String(req.headers["if-none-match"] || "") === etag) {
      return res.status(StatusCodes.NOT_MODIFIED).end();
    }
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=30");
    return res.json(payload);
  }),
);
