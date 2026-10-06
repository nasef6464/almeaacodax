import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomTemplateModel } from "../../models/ClassroomTemplate.js";
import { normalizeQuestionIds } from "../../modules/schools/application/classroomQuestionAccess.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ensureTeacherSchoolAccess, loadApprovedVisibleQuestions } from "./classroomRouteSupport.js";

const templateSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  questionIds: z.array(z.string().min(1)).min(1).max(30),
  challengeIds: z.array(z.string().min(1)).max(30).optional().default([]),
});

const smartClassroomEnabled = async (schoolId: string) =>
  (await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM")).allowed;

export function registerClassroomTemplateRoutes(classroomRouter: Router) {
  classroomRouter.get("/templates", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const schoolId = z.string().min(1).parse(req.query.schoolId);
    if (!(await ensureTeacherSchoolAccess(req.authUser!, schoolId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
    }
    if (req.authUser!.role !== "admin" && !(await smartClassroomEnabled(schoolId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    const templates = await ClassroomTemplateModel.find({ schoolId, teacherId: req.authUser!.id }).sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ templates: templates.map((template: any) => ({
      id: String(template._id), title: template.title, schoolId: template.schoolId,
      questionIds: template.questionIds || [], challengeIds: template.challengeIds || [],
      badge: template.badge || "حزمة مخصصة للمعلم", createdAt: template.createdAt, updatedAt: template.updatedAt,
    })) });
  }));

  classroomRouter.post("/templates", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const payload = templateSchema.parse(req.body);
    if (!(await ensureTeacherSchoolAccess(req.authUser!, payload.schoolId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
    }
    if (req.authUser!.role !== "admin" && !(await smartClassroomEnabled(payload.schoolId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    const questionIds = normalizeQuestionIds(payload.questionIds);
    const challengeIds = normalizeQuestionIds(payload.challengeIds).filter((id) => questionIds.includes(id));
    const snapshots = await loadApprovedVisibleQuestions(questionIds, payload.schoolId, req.authUser!.id);
    if (!snapshots || snapshots.length !== questionIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Template contains unavailable or unauthorized questions" });
    }
    const canonicalIds = snapshots.map((question) => question.questionId);
    const canonicalChallengeIds = challengeIds
      .map((id) => { const index = questionIds.indexOf(id); return index >= 0 ? canonicalIds[index] : null; })
      .filter((id): id is string => Boolean(id));
    const template = await ClassroomTemplateModel.findOneAndUpdate(
      { schoolId: payload.schoolId, teacherId: req.authUser!.id, title: payload.title },
      { $set: { questionIds: canonicalIds, challengeIds: canonicalChallengeIds, badge: "حزمة مخصصة للمعلم" } },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(StatusCodes.CREATED).json({ template: {
      id: String(template._id), title: template.title, schoolId: template.schoolId,
      questionIds: template.questionIds, challengeIds: template.challengeIds, badge: template.badge,
      createdAt: template.createdAt, updatedAt: template.updatedAt,
    } });
  }));

  classroomRouter.post("/templates/:id/delete", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const template = await ClassroomTemplateModel.findById(req.params.id).lean() as any;
    if (!template) return res.status(StatusCodes.NOT_FOUND).json({ message: "Template not found" });
    if (req.authUser!.role !== "admin") {
      if (String(template.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Template access denied" });
      if (!(await ensureTeacherSchoolAccess(req.authUser!, String(template.schoolId)))) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Template school access denied" });
      }
      if (!(await smartClassroomEnabled(String(template.schoolId)))) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
      }
    }
    await ClassroomTemplateModel.deleteOne({ _id: template._id });
    res.json({ deleted: true });
  }));
}
