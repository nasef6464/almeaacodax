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
import { buildSchoolTeacherWorkspace } from "../modules/schools/application/schoolTeacherWorkspace.js";
import { UserModel } from "../models/User.js";
import { GroupModel } from "../models/Group.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";
import { buildSchoolDirectorWorkspace, requireSchoolDirectorPermission } from "../modules/schools/application/schoolDirectorAccess.js";
import { defaultSchoolDirectorPermissions, schoolDirectorPermissions } from "../modules/schools/domain/schoolDirectorPermissions.js";

export const schoolAccessRouter = Router();
const contractSchema = z.object({ schoolId: z.string().min(1), status: z.enum(["active", "inactive", "expired"]), modules: z.array(z.enum(schoolModules)).min(1), validFrom: z.coerce.date().nullable().optional(), validUntil: z.coerce.date().nullable().optional() });
const membershipSchema = z.object({ userId: z.string().min(1), schoolId: z.string().min(1), role: z.enum(["student", "teacher", "supervisor", "parent"]), status: z.enum(["active", "inactive"]).default("active") });
const directorMembershipSchema = z.object({
  status: z.enum(["active", "inactive"]).default("active"),
  permissions: z.array(z.enum(schoolDirectorPermissions)).default(defaultSchoolDirectorPermissions),
});
const assignmentSchema = z.object({ schoolId: z.string().min(1), teacherId: z.string().min(1), classId: z.string().min(1), subjectId: z.string().default(""), status: z.enum(["active", "inactive"]).default("active") });

schoolAccessRouter.get("/context", requireAuth, asyncHandler(async (req, res) => res.json({ contexts: await resolveSchoolContexts(req.authUser!) })));
schoolAccessRouter.get("/teacher-workspace", requireAuth, requireRole(["teacher"]), asyncHandler(async (req, res) => {
  res.json(await buildSchoolTeacherWorkspace(req.authUser!));
}));
schoolAccessRouter.get("/director-workspace", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  res.json(await buildSchoolDirectorWorkspace(req.authUser!.id));
}));
schoolAccessRouter.get("/director/schools/:schoolId/overview-access", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const membership = await requireSchoolDirectorPermission(req.authUser!.id, req.params.schoolId, "SCHOOL_OVERVIEW_VIEW");
  if (!membership) return res.status(StatusCodes.FORBIDDEN).json({ message: "School permission denied" });
  return res.json({ allowed: true, schoolId: req.params.schoolId });
}));
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
schoolAccessRouter.get("/directors/:schoolId", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const memberships = await SchoolMembershipModel.find({ schoolId: req.params.schoolId, role: "school_admin" }).sort({ updatedAt: -1 }).lean();
  const userIds = memberships.map((membership: any) => String(membership.userId));
  const users = userIds.length ? await UserModel.find({ $or: [{ id: { $in: userIds } }, { _id: { $in: userIds.filter((id) => /^[a-f\d]{24}$/i.test(id)) } }] }).select("id name email role isActive").lean() : [];
  const usersById = new Map(users.map((user: any) => [String(user.id || user._id), user]));
  res.json({
    permissions: schoolDirectorPermissions,
    defaults: defaultSchoolDirectorPermissions,
    directors: memberships.map((membership: any) => ({
      userId: String(membership.userId),
      schoolId: String(membership.schoolId),
      status: String(membership.status),
      permissions: Array.isArray(membership.permissions) ? membership.permissions.map(String) : [],
      user: usersById.get(String(membership.userId)) || null,
    })),
  });
}));
schoolAccessRouter.put("/directors/:schoolId/:userId", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = directorMembershipSchema.parse(req.body);
  const schoolId = String(req.params.schoolId || "").trim();
  const userId = String(req.params.userId || "").trim();
  const [school, targetUser] = await Promise.all([
    GroupModel.findOne({ type: "SCHOOL", $or: [{ id: schoolId }, ...(/^[a-f\d]{24}$/i.test(schoolId) ? [{ _id: schoolId }] : [])] }).select("id name").lean(),
    UserModel.findOne({ $or: [{ id: userId }, ...(/^[a-f\d]{24}$/i.test(userId) ? [{ _id: userId }] : [])] }).select("id name email role isActive").lean(),
  ]);
  if (!school) return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
  if (!targetUser) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  if (String(targetUser.role) !== "school_admin") return res.status(StatusCodes.BAD_REQUEST).json({ message: "User must have the School Director role" });
  const membership = await SchoolMembershipModel.findOneAndUpdate(
    { userId: String((targetUser as any).id || (targetUser as any)._id), schoolId, role: "school_admin" },
    { $set: { userId: String((targetUser as any).id || (targetUser as any)._id), schoolId, role: "school_admin", status: payload.status, permissions: payload.permissions } },
    { new: true, upsert: true, runValidators: true },
  );
  await recordAdminAuditLog(req, {
    action: payload.status === "active" ? "schools.director_access.grant" : "schools.director_access.revoke",
    resourceType: "school_membership",
    resourceId: String(membership.id || membership._id),
    metadata: { schoolId, userId: String((targetUser as any).id || (targetUser as any)._id), permissions: payload.permissions },
  });
  res.json({ membership });
}));
schoolAccessRouter.put("/assignments", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = assignmentSchema.parse(req.body);
  const assignment = await TeachingAssignmentModel.findOneAndUpdate({ schoolId: payload.schoolId, teacherId: payload.teacherId, classId: payload.classId, subjectId: payload.subjectId }, { $set: payload }, { new: true, upsert: true, runValidators: true });
  res.status(StatusCodes.OK).json({ assignment });
}));
