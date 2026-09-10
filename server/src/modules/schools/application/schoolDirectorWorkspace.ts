import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ClassroomSessionModel } from "../../../models/ClassroomSession.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizModel } from "../../../models/Quiz.js";
import { QuestionModel } from "../../../models/Question.js";
import { SchoolInterventionModel } from "../../../models/SchoolIntervention.js";
import { StudyPlanModel } from "../../../models/StudyPlan.js";
import { PathModel } from "../../../models/Path.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { buildClassroomSchoolIntelligence } from "./classroomSchoolIntelligence.js";
import { buildClassroomSkillEvidence } from "./classroomSchoolIntelligence.js";

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
    phone: String(student.phone || ""),
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
  const students = await UserModel.find(filter).select("id name email phone isActive schoolId groupIds").sort({ name: 1 }).limit(500).lean();
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
  const updated = await UserModel.findById(student._id).select("id name email phone isActive schoolId groupIds").lean();
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
  const updated = await UserModel.findById(student._id).select("id name email phone isActive schoolId groupIds").lean();
  return { student: projectStudent(updated, scope.classes), idempotent: alreadyAssigned };
};

const loadScopedStudent = async (schoolId: string, studentId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const student = await UserModel.findOne({ $and: [documentQuery(studentId), schoolStudentFilter(scope.school, scope.schoolId, scope.classes)] }).select("id name email phone role isActive schoolId groupIds");
  if (!student) throw new SchoolDirectorOperationError("Student is outside this school", 404);
  return { scope, student };
};

export const updateSchoolDirectorStudentBasic = async (schoolId: string, studentId: string, payload: { name?: string; phone?: string }) => {
  const { scope, student } = await loadScopedStudent(schoolId, studentId);
  const update: Record<string, string> = {};
  if (payload.name !== undefined) update.name = payload.name.trim();
  if (payload.phone !== undefined) update.phone = payload.phone.trim();
  const updated = await UserModel.findByIdAndUpdate(student._id, { $set: update }, { new: true, runValidators: true }).select("id name email phone isActive schoolId groupIds").lean();
  return { student: { ...projectStudent(updated, scope.classes), phone: String((updated as any)?.phone || "") } };
};

export const setSchoolDirectorStudentActive = async (schoolId: string, studentId: string, isActive: boolean) => {
  const { scope, student } = await loadScopedStudent(schoolId, studentId);
  await Promise.all([
    UserModel.updateOne({ _id: student._id }, { $set: { isActive } }),
    SchoolMembershipModel.updateOne({ userId: idOf(student), schoolId: scope.schoolId, role: "student" }, { $set: { status: isActive ? "active" : "inactive" } }),
  ]);
  const updated = await UserModel.findById(student._id).select("id name email phone isActive schoolId groupIds").lean();
  return { student: { ...projectStudent(updated, scope.classes), phone: String((updated as any)?.phone || "") } };
};

export const createSchoolDirectorClass = async (schoolId: string, ownerId: string, name: string) => {
  const scope = await loadSchoolScope(schoolId);
  const duplicate = scope.classes.some((classroom) => String(classroom.name || "").trim().toLowerCase() === name.trim().toLowerCase());
  if (duplicate) throw new SchoolDirectorOperationError("A class with this name already exists", 409);
  const classroom = await GroupModel.create({ name: name.trim(), type: "CLASS", parentId: scope.schoolId, ownerId, supervisorIds: [], studentIds: [], courseIds: [] });
  return { classroom: { classId: idOf(classroom), className: classroom.name } };
};

export const updateSchoolDirectorClass = async (schoolId: string, classId: string, name: string) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((candidate) => idOf(candidate) === classId || String(candidate.id || "") === classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 404);
  const duplicate = scope.classes.some((candidate) => idOf(candidate) !== idOf(classroom) && String(candidate.name || "").trim().toLowerCase() === name.trim().toLowerCase());
  if (duplicate) throw new SchoolDirectorOperationError("A class with this name already exists", 409);
  const updated = await GroupModel.findByIdAndUpdate(classroom._id, { $set: { name: name.trim() } }, { new: true, runValidators: true }).select("id name").lean();
  return { classroom: { classId: idOf(updated), className: String((updated as any)?.name || name.trim()) } };
};

export const listSchoolDirectorTeachers = async (schoolId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const memberships = await SchoolMembershipModel.find({ schoolId: scope.schoolId, role: "teacher", status: "active" }).select("userId").limit(500).lean();
  const teacherIds = uniqueStrings(memberships.map((membership: any) => membership.userId));
  const teachers = teacherIds.length ? await UserModel.find({ role: "teacher", $or: [{ id: { $in: teacherIds } }, { _id: { $in: teacherIds.filter((id) => mongoose.isValidObjectId(id)) } }] }).select("id name email isActive").limit(500).lean() : [];
  const assignments = await TeachingAssignmentModel.find({ schoolId: scope.schoolId }).select("teacherId classId subjectId status").limit(1_000).lean();
  return {
    teachers: teachers.map((teacher: any) => ({ teacherId: idOf(teacher), name: String(teacher.name || "معلم"), email: String(teacher.email || ""), isActive: teacher.isActive !== false })),
    assignments: assignments.map((assignment: any) => ({ assignmentId: idOf(assignment), teacherId: String(assignment.teacherId), classId: String(assignment.classId), subjectId: String(assignment.subjectId || ""), status: String(assignment.status) })),
  };
};

export const upsertSchoolDirectorTeachingAssignment = async (schoolId: string, payload: { teacherId: string; classId: string; subjectId?: string; status: "active" | "inactive" }) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((candidate) => idOf(candidate) === payload.classId || String(candidate.id || "") === payload.classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 400);
  const teacherMembership = await SchoolMembershipModel.exists({ schoolId: scope.schoolId, userId: payload.teacherId, role: "teacher", status: "active" });
  if (!teacherMembership) throw new SchoolDirectorOperationError("Teacher is not active in this school", 400);
  const assignment = await TeachingAssignmentModel.findOneAndUpdate(
    { schoolId: scope.schoolId, teacherId: payload.teacherId, classId: idOf(classroom), subjectId: payload.subjectId || "" },
    { $set: { status: payload.status } },
    { new: true, upsert: true, runValidators: true },
  );
  return { assignment: { assignmentId: idOf(assignment), teacherId: String(assignment.teacherId), classId: String(assignment.classId), subjectId: String(assignment.subjectId || ""), status: String(assignment.status) } };
};

export const buildSchoolDirectorDetailedReport = async (schoolId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const intelligence = await buildClassroomSchoolIntelligence({ all: false as const, schoolIds: [scope.schoolId], classIds: [] });
  return { school: { schoolId: scope.schoolId, schoolName: String(scope.school.name || "مدرسة") }, intelligence };
};

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const buildSchoolDirectorStudentExport = async (schoolId: string) => {
  const scope = await loadSchoolScope(schoolId);
  const roster = await listSchoolDirectorStudents(scope.schoolId);
  const rows = [
    ["student_id", "name", "email", "status", "class_id", "class_name"],
    ...roster.students.map((student) => [student.studentId, student.name, student.email, student.isActive ? "active" : "inactive", student.classId || "", student.className || ""]),
  ];
  return { fileName: `school-students-${scope.schoolId}.csv`, csv: `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}` };
};

export const buildSchoolDirectorAcademicWorkspace = async (schoolId: string, include: { assessments?: boolean; sessions?: boolean; interventions?: boolean }) => {
  const scope = await loadSchoolScope(schoolId);
  const classIds = scope.classes.map(idOf);
  const [assessments, sessions, interventions] = await Promise.all([
    include.assessments && classIds.length ? QuizModel.find({ targetGroupIds: { $in: classIds } }).select("id title subjectId targetGroupIds isPublished dueDate").sort({ createdAt: -1 }).limit(100).lean() : [],
    include.sessions ? ClassroomSessionModel.find({ schoolId: scope.schoolId }).select("_id schoolId classId teacherId status createdAt endedAt").sort({ createdAt: -1 }).limit(100).lean() : [],
    include.interventions ? SchoolInterventionModel.find({ schoolId: scope.schoolId }).select("_id classId skillId targetStudentIds actionRef status baseline outcomeSnapshot createdAt").sort({ createdAt: -1 }).limit(100).lean() : [],
  ]);
  return { assessments, sessions, interventions, classes: scope.classes.map((item) => ({ classId: idOf(item), className: String(item.name || "فصل") })) };
};

export const buildSchoolDirectorClassOptions = async (schoolId: string) => {
  const scope = await loadSchoolScope(schoolId);
  return { classes: scope.classes.map((item) => ({ classId: idOf(item), className: String(item.name || "فصل") })) };
};

export const createSchoolDirectorAssessment = async (schoolId: string, actorId: string, payload: { title: string; classId: string; subjectId?: string; questionIds: string[] }) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((item) => idOf(item) === payload.classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 400);
  const questionIds = uniqueStrings(payload.questionIds);
  const questions = await QuestionModel.find({ approvalStatus: "approved", $or: [{ id: { $in: questionIds } }, { _id: { $in: questionIds.filter((id) => mongoose.isValidObjectId(id)) } }] }).select("id _id").lean();
  if (questions.length !== questionIds.length) throw new SchoolDirectorOperationError("Approved questions not found", 400);
  const assessmentId = new mongoose.Types.ObjectId().toString();
  const assessment = await QuizModel.create({ id: assessmentId, title: payload.title.trim(), subjectId: payload.subjectId || "", questionIds, targetGroupIds: [idOf(classroom)], ownerType: "school", ownerId: scope.schoolId, createdBy: actorId, isPublished: true, approvalStatus: "approved", quizKind: "test" });
  return { assessment: { assessmentId: idOf(assessment), title: String(assessment.title), classId: idOf(classroom) } };
};

export const createSchoolDirectorIntervention = async (schoolId: string, actorId: string, payload: { classId: string; studentId: string; skillId: string; pathId: string }) => {
  const scope = await loadSchoolScope(schoolId);
  const classroom = scope.classes.find((item) => idOf(item) === payload.classId);
  if (!classroom) throw new SchoolDirectorOperationError("Class does not belong to this school", 400);
  const { student } = await loadScopedStudent(scope.schoolId, payload.studentId);
  if (!(student.groupIds || []).map(String).includes(idOf(classroom))) throw new SchoolDirectorOperationError("Student does not belong to this class", 400);
  const path = await PathModel.findOne(documentQuery(payload.pathId)).select("id _id").lean();
  if (!path) throw new SchoolDirectorOperationError("Learning path not found", 400);
  const targetStudentId = idOf(student);
  const baseline = await buildClassroomSkillEvidence({ schoolId: scope.schoolId, classId: idOf(classroom), skillId: payload.skillId, studentIds: [targetStudentId] });
  const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 13); const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const plan = await StudyPlanModel.create({ id: `school_intervention_${targetStudentId}_${Date.now()}`, userId: targetStudentId, name: `خطة علاج مهارة ${payload.skillId}`, pathId: idOf(path), subjectIds: [], courseIds: [], startDate: dateKey(now), endDate: dateKey(end), skipCompletedQuizzes: true, offDays: [], dailyMinutes: 30, preferredStartTime: "17:00", status: "active" });
  const intervention = await SchoolInterventionModel.create({ schoolId: scope.schoolId, classId: idOf(classroom), skillId: payload.skillId, targetStudentIds: [targetStudentId], actionType: "study_plan", actionRef: idOf(path), assignedBy: actorId, baseline });
  return { intervention: { interventionId: idOf(intervention), status: String(intervention.status) }, studyPlanId: idOf(plan) };
};

export const transferSchoolDirectorStudent = async (sourceSchoolId: string, targetSchoolId: string, studentId: string, targetClassId: string) => {
  if (sourceSchoolId === targetSchoolId) throw new SchoolDirectorOperationError("Use class move inside the same school", 400);
  const [{ scope: source, student }, target] = await Promise.all([loadScopedStudent(sourceSchoolId, studentId), loadSchoolScope(targetSchoolId)]);
  const targetClass = target.classes.find((item) => idOf(item) === targetClassId);
  if (!targetClass) throw new SchoolDirectorOperationError("Target class does not belong to target school", 400);
  const sourceClassIds = uniqueStrings(source.classes.flatMap((item) => [item.id, item._id]));
  const targetClassIds = uniqueStrings(target.classes.flatMap((item) => [item.id, item._id]));
  const nextGroupIds = uniqueStrings([...(student.groupIds || []).filter((id: string) => !sourceClassIds.includes(String(id)) && !targetClassIds.includes(String(id))), idOf(targetClass)]);
  await UserModel.updateOne({ _id: student._id }, { $set: { schoolId: target.schoolId, groupIds: nextGroupIds } });
  await Promise.all([
    GroupModel.updateOne({ _id: source.school._id }, { $pull: { studentIds: idOf(student) } }),
    GroupModel.updateMany({ type: "CLASS", parentId: source.schoolId }, { $pull: { studentIds: idOf(student) } }),
    SchoolMembershipModel.updateOne({ userId: idOf(student), schoolId: source.schoolId, role: "student" }, { $set: { status: "inactive" } }),
  ]);
  await Promise.all([
    GroupModel.updateOne({ _id: target.school._id }, { $addToSet: { studentIds: idOf(student) } }),
    GroupModel.updateOne({ _id: targetClass._id }, { $addToSet: { studentIds: idOf(student) } }),
    SchoolMembershipModel.findOneAndUpdate({ userId: idOf(student), schoolId: target.schoolId, role: "student" }, { $set: { status: "active" } }, { upsert: true, runValidators: true }),
  ]);
  return { studentId: idOf(student), sourceSchoolId: source.schoolId, targetSchoolId: target.schoolId, targetClassId: idOf(targetClass) };
};
