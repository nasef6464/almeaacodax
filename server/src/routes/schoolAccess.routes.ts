import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SchoolContractModel, schoolModules } from "../models/SchoolContract.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { resolveSchoolContexts } from "../modules/schools/application/schoolContextResolver.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";

export const schoolAccessRouter = Router();
const contractSchema = z.object({ schoolId: z.string().min(1), status: z.enum(["active", "inactive", "expired"]), modules: z.array(z.enum(schoolModules)).min(1), validFrom: z.coerce.date().nullable().optional(), validUntil: z.coerce.date().nullable().optional() });
const membershipSchema = z.object({ userId: z.string().min(1), schoolId: z.string().min(1), role: z.enum(["student", "teacher", "supervisor", "parent"]), status: z.enum(["active", "inactive"]).default("active") });
const assignmentSchema = z.object({ schoolId: z.string().min(1), teacherId: z.string().min(1), classId: z.string().min(1), subjectId: z.string().default(""), status: z.enum(["active", "inactive"]).default("active") });

schoolAccessRouter.get("/context", requireAuth, asyncHandler(async (req, res) => res.json({ contexts: await resolveSchoolContexts(req.authUser!) })));
schoolAccessRouter.get("/entitlements/:schoolId/:module", requireAuth, asyncHandler(async (req, res) => {
  const contexts = await resolveSchoolContexts(req.authUser!);
  if (req.authUser!.role !== "admin" && !contexts.some((context) => context.schoolId === req.params.schoolId)) return res.status(StatusCodes.FORBIDDEN).json({ message: "School access denied" });
  return res.json(await resolveSchoolEntitlement(req.params.schoolId, req.params.module));
}));
schoolAccessRouter.get("/contracts/:schoolId", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => res.json({ contract: await SchoolContractModel.findOne({ schoolId: req.params.schoolId }).lean() })));
schoolAccessRouter.put("/contracts/:schoolId", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = contractSchema.parse({ ...req.body, schoolId: req.params.schoolId });
  const contract = await SchoolContractModel.findOneAndUpdate({ schoolId: payload.schoolId }, { $set: payload }, { new: true, upsert: true, runValidators: true });
  res.json({ contract });
}));
schoolAccessRouter.put("/memberships", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = membershipSchema.parse(req.body);
  const membership = await SchoolMembershipModel.findOneAndUpdate({ userId: payload.userId, schoolId: payload.schoolId, role: payload.role }, { $set: payload }, { new: true, upsert: true, runValidators: true });
  res.status(StatusCodes.OK).json({ membership });
}));
schoolAccessRouter.put("/assignments", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = assignmentSchema.parse(req.body);
  const assignment = await TeachingAssignmentModel.findOneAndUpdate({ schoolId: payload.schoolId, teacherId: payload.teacherId, classId: payload.classId, subjectId: payload.subjectId }, { $set: payload }, { new: true, upsert: true, runValidators: true });
  res.status(StatusCodes.OK).json({ assignment });
}));
