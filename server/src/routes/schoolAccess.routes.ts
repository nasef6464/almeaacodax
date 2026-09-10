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
import { buildSchoolDirectorWorkspace, requireSchoolDirectorCapability, requireSchoolDirectorPermission } from "../modules/schools/application/schoolDirectorAccess.js";
import { defaultSchoolDirectorPermissions, schoolDirectorPermissions } from "../modules/schools/domain/schoolDirectorPermissions.js";
import {
  addSchoolDirectorStudent,
  buildSchoolDirectorOverview,
  listSchoolDirectorStudents,
  moveSchoolDirectorStudent,
  updateSchoolDirectorStudentBasic,
  setSchoolDirectorStudentActive,
  createSchoolDirectorClass,
  updateSchoolDirectorClass,
  listSchoolDirectorTeachers,
  upsertSchoolDirectorTeachingAssignment,
  buildSchoolDirectorDetailedReport,
  buildSchoolDirectorStudentExport,
  buildSchoolDirectorAcademicWorkspace,
  buildSchoolDirectorClassOptions,
  createSchoolDirectorAssessment,
  createSchoolDirectorIntervention,
  transferSchoolDirectorStudent,
  SchoolDirectorOperationError,
} from "../modules/schools/application/schoolDirectorWorkspace.js";

export const schoolAccessRouter = Router();
const contractSchema = z.object({ schoolId: z.string().min(1), status: z.enum(["active", "inactive", "expired"]), modules: z.array(z.enum(schoolModules)).min(1), validFrom: z.coerce.date().nullable().optional(), validUntil: z.coerce.date().nullable().optional() });
const membershipSchema = z.object({ userId: z.string().min(1), schoolId: z.string().min(1), role: z.enum(["student", "teacher", "supervisor", "parent"]), status: z.enum(["active", "inactive"]).default("active") });
const directorMembershipSchema = z.object({
  status: z.enum(["active", "inactive"]).default("active"),
  permissions: z.array(z.enum(schoolDirectorPermissions)).default(defaultSchoolDirectorPermissions),
});
const directorStudentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(160).refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Password must include a letter and number"),
  classId: z.string().min(1),
});
const directorStudentMoveSchema = z.object({ classId: z.string().min(1) });
const directorStudentBasicSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(40).optional() }).refine((payload) => payload.name !== undefined || payload.phone !== undefined, "At least one field is required");
const directorStudentActiveSchema = z.object({ isActive: z.boolean() });
const directorClassSchema = z.object({ name: z.string().trim().min(2).max(120) });
const directorAssignmentSchema = z.object({ teacherId: z.string().min(1), classId: z.string().min(1), subjectId: z.string().trim().max(120).optional().default(""), status: z.enum(["active", "inactive"]).default("active") });
const directorAssessmentSchema = z.object({ title: z.string().trim().min(3).max(180), classId: z.string().min(1), pathId: z.string().trim().max(120).optional().default(""), subjectId: z.string().trim().max(120).optional().default(""), questionIds: z.array(z.string().min(1)).min(1).max(100) });
const directorInterventionSchema = z.object({ classId: z.string().min(1), studentId: z.string().min(1), skillId: z.string().min(1), pathId: z.string().min(1) });
const directorTransferSchema = z.object({ targetSchoolId: z.string().min(1), targetClassId: z.string().min(1), confirmation: z.literal("TRANSFER") });
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
schoolAccessRouter.get("/director/schools/:schoolId/overview", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const membership = await requireSchoolDirectorPermission(req.authUser!.id, req.params.schoolId, "SCHOOL_OVERVIEW_VIEW");
  if (!membership) return res.status(StatusCodes.FORBIDDEN).json({ message: "School permission denied" });
  try {
    return res.json(await buildSchoolDirectorOverview(req.params.schoolId));
  } catch (error) {
    if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message });
    throw error;
  }
}));
schoolAccessRouter.get("/director/schools/:schoolId/students", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const membership = await requireSchoolDirectorPermission(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_VIEW");
  if (!membership) return res.status(StatusCodes.FORBIDDEN).json({ message: "School permission denied" });
  try {
    return res.json(await listSchoolDirectorStudents(req.params.schoolId, String(req.query.search || "")));
  } catch (error) {
    if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message });
    throw error;
  }
}));
schoolAccessRouter.post("/director/schools/:schoolId/students", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const membership = await requireSchoolDirectorPermission(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_ADD");
  if (!membership) return res.status(StatusCodes.FORBIDDEN).json({ message: "School permission denied" });
  const payload = directorStudentSchema.parse(req.body);
  try {
    const result = await addSchoolDirectorStudent(req.params.schoolId, payload as { name: string; email: string; password: string; classId: string });
    await recordAdminAuditLog(req, { action: "schools.director.student.add", resourceType: "student", resourceId: result.student.studentId, metadata: { schoolId: req.params.schoolId, classId: payload.classId, created: result.created } });
    return res.status(result.created ? StatusCodes.CREATED : StatusCodes.OK).json(result);
  } catch (error) {
    if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message });
    throw error;
  }
}));
schoolAccessRouter.put("/director/schools/:schoolId/students/:studentId/class", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const membership = await requireSchoolDirectorPermission(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_MOVE_CLASS");
  if (!membership) return res.status(StatusCodes.FORBIDDEN).json({ message: "School permission denied" });
  const payload = directorStudentMoveSchema.parse(req.body);
  try {
    const result = await moveSchoolDirectorStudent(req.params.schoolId, req.params.studentId, payload.classId);
    await recordAdminAuditLog(req, { action: "schools.director.student.move_class", resourceType: "student", resourceId: result.student.studentId, metadata: { schoolId: req.params.schoolId, classId: payload.classId, idempotent: result.idempotent } });
    return res.json(result);
  } catch (error) {
    if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message });
    throw error;
  }
}));
schoolAccessRouter.patch("/director/schools/:schoolId/students/:studentId", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_UPDATE_BASIC", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorStudentBasicSchema.parse(req.body);
  try {
    const result = await updateSchoolDirectorStudentBasic(req.params.schoolId, req.params.studentId, payload);
    await recordAdminAuditLog(req, { action: "schools.director.student.update_basic", resourceType: "student", resourceId: result.student.studentId, metadata: { schoolId: req.params.schoolId, fields: Object.keys(payload) } });
    return res.json(result);
  } catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.patch("/director/schools/:schoolId/students/:studentId/active", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_DEACTIVATE", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorStudentActiveSchema.parse(req.body);
  try {
    const result = await setSchoolDirectorStudentActive(req.params.schoolId, req.params.studentId, payload.isActive);
    await recordAdminAuditLog(req, { action: payload.isActive ? "schools.director.student.reactivate" : "schools.director.student.deactivate", resourceType: "student", resourceId: result.student.studentId, metadata: { schoolId: req.params.schoolId } });
    return res.json(result);
  } catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.post("/director/schools/:schoolId/classes", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_CLASSES_MANAGE", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorClassSchema.parse(req.body);
  try {
    const result = await createSchoolDirectorClass(req.params.schoolId, req.authUser!.id, payload.name);
    await recordAdminAuditLog(req, { action: "schools.director.class.create", resourceType: "group", resourceId: result.classroom.classId, metadata: { schoolId: req.params.schoolId } });
    return res.status(StatusCodes.CREATED).json(result);
  } catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.patch("/director/schools/:schoolId/classes/:classId", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_CLASSES_MANAGE", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorClassSchema.parse(req.body);
  try {
    const result = await updateSchoolDirectorClass(req.params.schoolId, req.params.classId, payload.name);
    await recordAdminAuditLog(req, { action: "schools.director.class.update", resourceType: "group", resourceId: result.classroom.classId, metadata: { schoolId: req.params.schoolId } });
    return res.json(result);
  } catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.get("/director/schools/:schoolId/teachers", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_TEACHERS_ASSIGN", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  return res.json(await listSchoolDirectorTeachers(req.params.schoolId));
}));
schoolAccessRouter.put("/director/schools/:schoolId/assignments", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_TEACHERS_ASSIGN", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorAssignmentSchema.parse(req.body);
  try {
    const result = await upsertSchoolDirectorTeachingAssignment(req.params.schoolId, payload as { teacherId: string; classId: string; subjectId?: string; status: "active" | "inactive" });
    await recordAdminAuditLog(req, { action: "schools.director.teacher.assign", resourceType: "teaching_assignment", resourceId: result.assignment.assignmentId, metadata: { schoolId: req.params.schoolId, classId: payload.classId, teacherId: payload.teacherId, status: payload.status } });
    return res.json(result);
  } catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.get("/director/schools/:schoolId/reports/detailed", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_REPORTS_DETAILED_VIEW", "SCHOOL_INTELLIGENCE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  return res.json(await buildSchoolDirectorDetailedReport(req.params.schoolId));
}));
schoolAccessRouter.get("/director/schools/:schoolId/reports/students.csv", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_REPORTS_EXPORT", "EXECUTIVE_ANALYTICS");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const result = await buildSchoolDirectorStudentExport(req.params.schoolId);
  await recordAdminAuditLog(req, { action: "schools.director.report.export_students", resourceType: "school", resourceId: req.params.schoolId, metadata: { schoolId: req.params.schoolId, format: "csv" } });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  return res.send(result.csv);
}));
schoolAccessRouter.get("/director/schools/:schoolId/academic/assessments", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_ASSESSMENTS");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  return res.json(await buildSchoolDirectorAcademicWorkspace(req.params.schoolId, { assessments: true }));
}));
schoolAccessRouter.post("/director/schools/:schoolId/academic/assessments", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_ASSESSMENTS");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorAssessmentSchema.parse(req.body);
  try { const result = await createSchoolDirectorAssessment(req.params.schoolId, req.authUser!.id, payload as any); await recordAdminAuditLog(req, { action: "schools.director.assessment.create", resourceType: "quiz", resourceId: result.assessment.assessmentId, metadata: { schoolId: req.params.schoolId, classId: payload.classId } }); return res.status(StatusCodes.CREATED).json(result); }
  catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.get("/director/schools/:schoolId/academic/smart-classrooms", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_SMART_CLASSROOM_VIEW", "SMART_CLASSROOM");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  return res.json(await buildSchoolDirectorAcademicWorkspace(req.params.schoolId, { sessions: true }));
}));
schoolAccessRouter.get("/director/schools/:schoolId/academic/interventions", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_INTERVENTIONS_VIEW", "INTERVENTION_CENTER");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  return res.json(await buildSchoolDirectorAcademicWorkspace(req.params.schoolId, { interventions: true }));
}));
schoolAccessRouter.post("/director/schools/:schoolId/academic/interventions", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_INTERVENTIONS_MANAGE", "INTERVENTION_CENTER");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School capability or contract module denied" });
  const payload = directorInterventionSchema.parse(req.body);
  try { const result = await createSchoolDirectorIntervention(req.params.schoolId, req.authUser!.id, payload as any); await recordAdminAuditLog(req, { action: "schools.director.intervention.create", resourceType: "school_intervention", resourceId: result.intervention.interventionId, metadata: { schoolId: req.params.schoolId, classId: payload.classId, studentId: payload.studentId } }); return res.status(StatusCodes.CREATED).json(result); }
  catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.post("/director/schools/:schoolId/students/:studentId/transfer", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const payload = directorTransferSchema.parse(req.body);
  const [sourceCapability, targetCapability] = await Promise.all([
    requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_TRANSFER_SCHOOL", "SCHOOL_CORE"),
    requireSchoolDirectorCapability(req.authUser!.id, payload.targetSchoolId, "SCHOOL_STUDENTS_TRANSFER_SCHOOL", "SCHOOL_CORE"),
  ]);
  if (!sourceCapability || !targetCapability) return res.status(StatusCodes.FORBIDDEN).json({ message: "Transfer requires active permission and contract in both schools" });
  try { const result = await transferSchoolDirectorStudent(req.params.schoolId, payload.targetSchoolId, req.params.studentId, payload.targetClassId); await recordAdminAuditLog(req, { action: "schools.director.student.transfer_school", resourceType: "student", resourceId: result.studentId, metadata: result }); return res.json(result); }
  catch (error) { if (error instanceof SchoolDirectorOperationError) return res.status(error.status).json({ message: error.message }); throw error; }
}));
schoolAccessRouter.get("/director/schools/:schoolId/transfer-target-classes", requireAuth, requireRole(["school_admin"]), asyncHandler(async (req, res) => {
  const capability = await requireSchoolDirectorCapability(req.authUser!.id, req.params.schoolId, "SCHOOL_STUDENTS_TRANSFER_SCHOOL", "SCHOOL_CORE");
  if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School transfer capability or contract module denied" });
  return res.json(await buildSchoolDirectorClassOptions(req.params.schoolId));
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
