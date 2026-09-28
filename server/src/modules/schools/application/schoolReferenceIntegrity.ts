import { Types } from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { UserModel } from "../../../models/User.js";

export type SchoolMembershipRole = "student" | "teacher" | "supervisor" | "school_admin" | "parent";
type MembershipWrite = {
  userId: string;
  schoolId: string;
  role: SchoolMembershipRole;
  status: "active" | "inactive";
};
type AssignmentWrite = {
  schoolId: string;
  teacherId: string;
  classId: string;
  subjectId?: string;
  status: "active" | "inactive";
};

class SchoolReferenceIntegrityError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SchoolReferenceIntegrityError";
    this.status = status;
    this.code = code;
  }
}

const requiredObjectId = (value: unknown, label: string) => {
  const id = String(value || "").trim();
  if (!Types.ObjectId.isValid(id)) {
    throw new SchoolReferenceIntegrityError(400, "invalid_reference_id", `${label} must be a valid canonical id`);
  }
  return id;
};

const loadSchool = async (schoolId: string) => {
  const id = requiredObjectId(schoolId, "schoolId");
  const school = await GroupModel.findOne({ _id: id, type: "SCHOOL" }).select("_id").lean();
  if (!school) throw new SchoolReferenceIntegrityError(404, "school_not_found", "School not found");
  return String(school._id);
};

const loadUser = async (userId: string) => {
  const id = requiredObjectId(userId, "userId");
  const user = await UserModel.findById(id).select("_id role isActive").lean() as any;
  if (!user) throw new SchoolReferenceIntegrityError(404, "user_not_found", "User not found");
  return user;
};

export const assertSchoolContractReference = async (schoolId: string) => loadSchool(schoolId);

export const assertSchoolMembershipReference = async (payload: MembershipWrite) => {
  const [schoolId, user] = await Promise.all([loadSchool(payload.schoolId), loadUser(payload.userId)]);
  const userId = String(user._id);
  if (String(user.role) !== payload.role) {
    throw new SchoolReferenceIntegrityError(409, "membership_role_mismatch", "Membership role must match the user's platform role");
  }
  if (payload.status === "active" && user.isActive === false) {
    throw new SchoolReferenceIntegrityError(409, "inactive_user_membership", "Inactive users cannot receive an active school membership");
  }
  return { userId, schoolId, role: payload.role, status: payload.status };
};

export const assertTeachingAssignmentReference = async (payload: AssignmentWrite) => {
  const schoolId = await loadSchool(payload.schoolId);
  const teacherId = requiredObjectId(payload.teacherId, "teacherId");
  const classId = requiredObjectId(payload.classId, "classId");
  const [teacher, classroom] = await Promise.all([
    UserModel.findById(teacherId).select("_id role isActive").lean() as any,
    GroupModel.findOne({ _id: classId, type: "CLASS" }).select("_id parentId").lean() as any,
  ]);
  if (!teacher) throw new SchoolReferenceIntegrityError(404, "teacher_not_found", "Teacher not found");
  if (!classroom) throw new SchoolReferenceIntegrityError(404, "class_not_found", "Class not found");
  if (String(classroom.parentId || "") !== schoolId) {
    throw new SchoolReferenceIntegrityError(400, "class_school_mismatch", "Class does not belong to this school");
  }
  if (String(teacher.role) !== "teacher") {
    throw new SchoolReferenceIntegrityError(400, "assignment_requires_teacher", "Assignment target must have the teacher role");
  }
  if (payload.status === "active" && teacher.isActive === false) {
    throw new SchoolReferenceIntegrityError(409, "inactive_teacher_assignment", "Inactive teachers cannot receive an active assignment");
  }
  if (payload.status === "active") {
    const membership = await SchoolMembershipModel.exists({ userId: teacherId, schoolId, role: "teacher", status: "active" });
    if (!membership) {
      throw new SchoolReferenceIntegrityError(409, "teacher_membership_required", "Teacher must have an active membership in this school");
    }
  }
  return {
    schoolId,
    teacherId,
    classId: String(classroom._id),
    subjectId: String(payload.subjectId || "").trim(),
    status: payload.status,
  };
};
