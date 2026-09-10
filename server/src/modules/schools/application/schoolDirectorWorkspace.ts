import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizModel } from "../../../models/Quiz.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";

const idOf = (value: any) => String(value?.id || value?._id || value || "");
const uniqueStrings = (values: unknown[]) => Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
const documentQuery = (id: string) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

export class SchoolDirectorOperationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const loadSchoolScope = async (schoolId: string) => {
  const school = await GroupModel.findOne({ type: "SCHOOL", ...documentQuery(schoolId) }).lean() as any;
  if (!school) throw new SchoolDirectorOperationError("School not found", 404);
  const canonicalSchoolId = idOf(school);
  const classes = await GroupModel.find({ type: "CLASS", parentId: canonicalSchoolId }).select("id name parentId studentIds supervisorIds").sort({ name: 1 }).lean() as any[];
  return { school, schoolId: canonicalSchoolId, classes };
};

const schoolStudentFilter = (school: any, schoolId: string, classes: any[]) => {
  const studentIds = uniqueStrings(school.studentIds || []);
  const classIds = uniqueStrings(classes.flatMap((classroom) => [classroom.id, classroom._id]));
  const or: Record<string, unknown>[] = [{ schoolId }];
  if (studentIds.length) or.push({ _id: { $in: studentIds.filter((id) => mongoose.isValidObjectId(id)) } }, { id: { $in: studentIds } });
  if (classIds.length) or.push({ groupIds: { $in: classIds } });
  return { role: "student", $or: or };
};

const projectStudent = (student: any, classes: any[]) => {
  const groupIds = uniqueStrings(student.groupIds || []);
  const classroom = classes.find((candidate) => groupIds.includes(idOf(candidate)) || (candidate.id && groupIds.includes(String(candidate.id))));
  return {
    studentId: idOf(student),
    name: String(student.name || "طالب"),
    email: String(student.email || ""),
    isActive: student.isActive !== false,
    classId: classroom ? idOf(classroom) : null,
    className: classroom ? String(classroom.name || "فصل") : null,
  };
};

export const buildSchoolDirectorOverview = async (schoolId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const classIds = scope.classes.map(idOf);
  const supervisorIds = uniqueStrings([...(scope.school.supervisorIds || []), ...scope.classes.flatMap((classroom) => classroom.supervisorIds || [])]);
  const [studentCount, teacherIds, assessmentCount, completedSmartClasses] = await Promise.all([
    UserModel.countDocuments(schoolStudentFilter(scope.school, scope.schoolId, scope.classes)),
    TeachingAssignmentModel.distinct("teacherId", { schoolId: scope.schoolId, classId: { $in: classIds }, status: "active" }),
    classIds.length ? QuizModel.countDocuments({ targetGroupIds: { $in: classIds }, isPublished: true }) : 0,
    ClassroomSessionModel.countDocuments({ schoolId: scope.schoolId, status: "ended" }),
  ]);
  return {
    school: { schoolId: scope.schoolId, schoolName: String(scope.school.name || "مدرسة") },
    metrics: {
      students: studentCount,
      classes: scope.classes.length,
      teachers: uniqueStrings(teacherIds).length,
      supervisors: supervisorIds.length,
      schoolAssessments: assessmentCount,
      completedSmartClasses,
    },
    classes: scope.classes.map((classroom) => ({ classId: idOf(classroom), className: String(classroom.name || "فصل") })),
  };
};

export const listSchoolDirectorStudents = async (schoolId: string, search = "") => {
  const scope = await loadSchoolScope(schoolId);
  const filter: Record<string, unknown> = schoolStudentFilter(scope.school, scope.schoolId, scope.classes);
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [{ $or: [{ name: { $regex: escaped, $options: "i" } }, { email: { $regex: escaped, $options: "i" } }] }];
  }
  const students = await UserModel.find(filter).select("id name email isActive schoolId groupIds").sort({ name: 1 }).limit(500).lean();
  return { students: students.map((student) => projectStudent(student, scope.classes)), total: students.length };
};

export const addSchoolDirectorStudent = async (schoolId: string, payload: { name: string; email: string; password: string; classId: string }) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((candidate) => idOf(candidate) === payload.classId || String(candidate.id || "") === payload.classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 400);
  const email = payload.email.trim().toLowerCase();
  let student = await UserModel.findOne({ email }).select("id name email role isActive schoolId groupIds");
  const created = !student;
  if (student && String(student.role) !== "student") throw new SchoolDirectorOperationError("This email belongs to a non-student account", 409);
  if (student && student.schoolId && String(student.schoolId) !== scope.schoolId) throw new SchoolDirectorOperationError("Student already belongs to another school", 409);
  if (student) {
    const outsideMembership = await SchoolMembershipModel.exists({ userId: idOf(student), role: "student", status: "active", schoolId: { $ne: scope.schoolId } });
    if (outsideMembership) throw new SchoolDirectorOperationError("Student already belongs to another school", 409);
  } else {
    student = await UserModel.create({ name: payload.name.trim(), email, passwordHash: await bcrypt.hash(payload.password, 10), role: "student", isActive: true, schoolId: scope.schoolId, groupIds: [] });
  }
  const studentId = idOf(student);
  const schoolClassIds = uniqueStrings(scope.classes.flatMap((candidate) => [candidate.id, candidate._id]));
  const nextGroupIds = uniqueStrings([...(student.groupIds || []).filter((id: string) => !schoolClassIds.includes(String(id))), idOf(classroom)]);
  await Promise.all([
    UserModel.updateOne({ _id: student._id }, { $set: { schoolId: scope.schoolId, groupIds: nextGroupIds, isActive: true } }),
    SchoolMembershipModel.findOneAndUpdate({ userId: studentId, schoolId: scope.schoolId, role: "student" }, { $set: { status: "active" } }, { upsert: true, runValidators: true }),
    GroupModel.updateOne({ _id: scope.school._id }, { $addToSet: { studentIds: studentId } }),
  ]);
  await GroupModel.updateMany({ type: "CLASS", parentId: scope.schoolId }, { $pull: { studentIds: studentId } });
  await GroupModel.updateOne({ _id: classroom._id }, { $addToSet: { studentIds: studentId } });
  const updated = await UserModel.findById(student._id).select("id name email isActive schoolId groupIds").lean();
  return { student: projectStudent(updated, scope.classes), created };
};

export const moveSchoolDirectorStudent = async (schoolId: string, studentId: string, classId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((candidate) => idOf(candidate) === classId || String(candidate.id || "") === classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 400);
  const student = await UserModel.findOne({ $and: [documentQuery(studentId), schoolStudentFilter(scope.school, scope.schoolId, scope.classes)] }).select("id name email isActive schoolId groupIds");
  if (!student) throw new SchoolDirectorOperationError("Student is outside this school", 404);
  const schoolClassIds = uniqueStrings(scope.classes.flatMap((candidate) => [candidate.id, candidate._id]));
  const destinationId = idOf(classroom);
  const nextGroupIds = uniqueStrings([...(student.groupIds || []).filter((id: string) => !schoolClassIds.includes(String(id))), destinationId]);
  const alreadyAssigned = (student.groupIds || []).map(String).includes(destinationId);
  await UserModel.updateOne({ _id: student._id }, { $set: { groupIds: nextGroupIds, schoolId: scope.schoolId } });
  await GroupModel.updateMany({ type: "CLASS", parentId: scope.schoolId }, { $pull: { studentIds: idOf(student) } });
  await Promise.all([
    GroupModel.updateOne({ _id: classroom._id }, { $addToSet: { studentIds: idOf(student) } }),
    GroupModel.updateOne({ _id: scope.school._id }, { $addToSet: { studentIds: idOf(student) } }),
    SchoolMembershipModel.findOneAndUpdate({ userId: idOf(student), schoolId: scope.schoolId, role: "student" }, { $set: { status: "active" } }, { upsert: true, runValidators: true }),
  ]);
  const updated = await UserModel.findById(student._id).select("id name email isActive schoolId groupIds").lean();
  return { student: projectStudent(updated, scope.classes), idempotent: alreadyAssigned };
};
