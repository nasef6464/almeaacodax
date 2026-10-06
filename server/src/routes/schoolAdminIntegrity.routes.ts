import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GroupModel } from "../models/Group.js";
import { SchoolContractModel, schoolModules } from "../models/SchoolContract.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { UserModel } from "../models/User.js";

export const schoolAdminIntegrityRouter = Router();

const contractSchema = z.object({
  status: z.enum(["active", "inactive", "expired"]),
  modules: z.array(z.enum(schoolModules)).min(1),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
});
const membershipSchema = z.object({
  userId: z.string().min(1),
  schoolId: z.string().min(1),
  role: z.enum(["student", "teacher", "supervisor", "parent"]),
  status: z.enum(["active", "inactive"]).default("active"),
});
const assignmentSchema = z.object({
  schoolId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

const objectIdOrImpossible = (id: string) => Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

const loadSchool = async (schoolId: string) => {
  const objectId = objectIdOrImpossible(schoolId);
  if (!objectId) return null;
  return GroupModel.findOne({ _id: objectId, type: "SCHOOL" }).lean();
};

const loadUser = async (userId: string) => {
  const objectId = objectIdOrImpossible(userId);
  if (!objectId) return null;
  return UserModel.findById(objectId).select("_id role isActive").lean() as any;
};

schoolAdminIntegrityRouter.put("/contracts/:schoolId", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = contractSchema.parse(req.body);
  const school = await loadSchool(req.params.schoolId);
  if (!school) return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
  const schoolId = String((school as any)._id);
  const contract = await SchoolContractModel.findOneAndUpdate(
    { schoolId },
    { $set: { schoolId, ...payload } },
    { new: true, upsert: true, runValidators: true },
  );
  res.json({ contract });
}));

schoolAdminIntegrityRouter.put("/memberships", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = membershipSchema.parse(req.body);
  const [school, targetUser] = await Promise.all([loadSchool(payload.schoolId), loadUser(payload.userId)]);
  if (!school) return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
  if (!targetUser) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  if (String(targetUser.role) !== payload.role) {
    return res.status(StatusCodes.CONFLICT).json({ message: "Membership role must match the user's platform role" });
  }
  if (payload.status === "active" && targetUser.isActive === false) {
    return res.status(StatusCodes.CONFLICT).json({ message: "Inactive users cannot receive an active school membership" });
  }
  const schoolId = String((school as any)._id);
  const userId = String(targetUser._id);
  const membership = await SchoolMembershipModel.findOneAndUpdate(
    { userId, schoolId, role: payload.role },
    { $set: { userId, schoolId, role: payload.role, status: payload.status } },
    { new: true, upsert: true, runValidators: true },
  );
  res.json({ membership });
}));

schoolAdminIntegrityRouter.put("/assignments", requireAuth, requireRole(["admin"]), asyncHandler(async (req, res) => {
  const payload = assignmentSchema.parse(req.body);
  const [school, classroom, teacher] = await Promise.all([
    loadSchool(payload.schoolId),
    Types.ObjectId.isValid(payload.classId)
      ? GroupModel.findOne({ _id: payload.classId, type: "CLASS" }).lean()
      : null,
    loadUser(payload.teacherId),
  ]);
  if (!school) return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
  if (!classroom) return res.status(StatusCodes.NOT_FOUND).json({ message: "Class not found" });
  if (!teacher) return res.status(StatusCodes.NOT_FOUND).json({ message: "Teacher not found" });

  const schoolId = String((school as any)._id);
  const classId = String((classroom as any)._id);
  const teacherId = String(teacher._id);
  if (String((classroom as any).parentId || "") !== schoolId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Class does not belong to this school" });
  }
  if (String(teacher.role) !== "teacher" || teacher.isActive === false) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Assignment target must be an active teacher" });
  }
  const membership = await SchoolMembershipModel.exists({ userId: teacherId, schoolId, role: "teacher", status: "active" });
  if (!membership) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Teacher must have an active membership in this school" });

  const assignment = await TeachingAssignmentModel.findOneAndUpdate(
    { schoolId, teacherId, classId, subjectId: payload.subjectId },
    { $set: { schoolId, teacherId, classId, subjectId: payload.subjectId, status: payload.status } },
    { new: true, upsert: true, runValidators: true },
  );
  res.json({ assignment });
}));
