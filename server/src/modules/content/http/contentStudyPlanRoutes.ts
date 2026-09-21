import { Router } from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { StudyPlanModel } from "../../../models/StudyPlan.js";
import { UserModel } from "../../../models/User.js";
import { getAuthorizedStudentIdsForSchoolStaffActor } from "../../schools/application/schoolStaffStudentAuthority.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { interventionStudyPlanSchema, studyPlanSchema } from "./studyPlanSchemas.js";

export const contentStudyPlanRouter = Router();

contentStudyPlanRouter.post(
  "/study-plans/intervention",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = interventionStudyPlanSchema.parse(req.body);
    const authUser = req.authUser!;
    const studentLookup = mongoose.isValidObjectId(payload.studentId)
      ? { $or: [{ _id: payload.studentId }, { id: payload.studentId }] }
      : { id: payload.studentId };
    const student = await UserModel.findOne({
      role: "student",
      ...studentLookup,
    })
      .select("_id id name role schoolId groupIds")
      .lean();

    if (!student) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Student not found" });
    }

    const studentId = String((student as any).id || (student as any)._id);
    const authorizedStudentIds = await getAuthorizedStudentIdsForSchoolStaffActor(
      authUser,
      [student as any],
    );
    if (!authorizedStudentIds.has(studentId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this student" });
    }

    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 13);
    const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
    const now = Date.now();
    const studentName = payload.studentName || String((student as any).name || "الطالب");
    const skillName = payload.skillName || "المهارة الأضعف";
    const planId = `intervention_${studentId}_${payload.pathId}_${now}`;
    const plan = await StudyPlanModel.create({
      id: planId,
      userId: studentId,
      name: `خطة علاج ${skillName} - ${studentName}`,
      pathId: payload.pathId,
      subjectIds: payload.subjectId ? [payload.subjectId] : [],
      courseIds: [],
      startDate: toDateKey(today),
      endDate: toDateKey(end),
      skipCompletedQuizzes: true,
      offDays: [],
      dailyMinutes: payload.dailyMinutes,
      preferredStartTime: payload.preferredStartTime || "17:00",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return res.status(StatusCodes.CREATED).json({
      plan,
      message: "Intervention study plan created for the selected student.",
    });
  }),
);

contentStudyPlanRouter.post(
  "/study-plans",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.parse(req.body);
    const now = Date.now();
    const created = await StudyPlanModel.findOneAndUpdate(
      { id: payload.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        createdAt: payload.createdAt || now,
        updatedAt: now,
      },
      { new: true, upsert: true },
    );

    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentStudyPlanRouter.patch(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.partial().parse(req.body);
    const updated = await StudyPlanModel.findOneAndUpdate(
      { id: req.params.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        updatedAt: Date.now(),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json(updated);
  }),
);

contentStudyPlanRouter.delete(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const deleted = await StudyPlanModel.findOneAndDelete({ id: req.params.id, userId: req.authUser!.id });

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json({ success: true });
  }),
);
