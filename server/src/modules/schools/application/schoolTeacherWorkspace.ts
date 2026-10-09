import { Types } from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { QuizModel } from "../../../models/Quiz.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { resolveSchoolContexts, type LegacySchoolUser } from "./schoolContextResolver.js";
import { resolveSchoolEntitlement } from "./schoolEntitlementResolver.js";
import { teacherAssessmentClassIds } from "./teacherAssessmentClassIds.js";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const idsQuery = (ids: string[]): Record<string, unknown> => {
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  return { $or: [{ _id: { $in: ids } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])] };
};

type WorkspaceAssessment = { assessmentId: string; title: string; subjectId: string; classIds: string[]; dueDate: string | null; quizKind: string; approvalStatus?: string; isPublished: boolean; ownedByTeacher: boolean };
type WorkspaceStudent = { studentId: string; name: string; isActive: boolean };
type WorkspaceAssignment = {
  assignmentId: string;
  classId: string;
  className: string;
  subjectId: string;
  studentCount: number;
  students: WorkspaceStudent[];
};
type WorkspaceSchool = {
  schoolId: string;
  schoolName: string;
  source: "membership" | "legacy";
  smartClassroomEnabled: boolean;
  assignments: WorkspaceAssignment[];
  assessments: WorkspaceAssessment[];
};
export type SchoolTeacherWorkspace = {
  personas: { platformTrainer: boolean; schoolTeacher: boolean };
  schools: WorkspaceSchool[];
};

export const buildSchoolTeacherWorkspace = async (actor: LegacySchoolUser): Promise<SchoolTeacherWorkspace> => {
  const [contexts, storedUser] = await Promise.all([
    resolveSchoolContexts(actor),
    UserModel.findById(actor.id).select("managedPathIds managedSubjectIds isActive").lean(),
  ]);
  const teacherContexts = contexts.filter((context) => context.role === "teacher");
  const schoolIds = unique(teacherContexts.map((context) => context.schoolId));
  const assignments = schoolIds.length
    ? await TeachingAssignmentModel.find({
        teacherId: actor.id,
        schoolId: { $in: schoolIds },
        status: "active",
      }).lean()
    : [];
  const assignedClassIds = unique(assignments.map((assignment) => String(assignment.classId)));
  const [schools, classes] = await Promise.all([
    schoolIds.length
      ? GroupModel.find({ $and: [idsQuery(schoolIds), { type: "SCHOOL" }] }).select("name").lean()
      : [],
    assignedClassIds.length
      ? GroupModel.find({ $and: [idsQuery(assignedClassIds), { type: "CLASS", parentId: { $in: schoolIds } }] })
          .select("name parentId studentIds")
          .lean()
      : [],
  ]);
  const schoolById = new Map<string, any>(schools.map((school: any): [string, any] => [String(school._id), school]));
  const classById = new Map<string, any>(classes.map((classroom: any): [string, any] => [String(classroom._id), classroom]));
  const validAssignments = assignments.filter((assignment) => {
    const classroom: any = classById.get(String(assignment.classId));
    return classroom && String(classroom.parentId) === String(assignment.schoolId);
  });
  const validClassIds = unique(validAssignments.map((assignment) => String(assignment.classId)));
  const rosterIds = unique(
    validClassIds.flatMap((classId) => {
      const classroom: any = classById.get(classId);
      return (classroom?.studentIds || []).map(String);
    }),
  );
  const rosterStudents = validClassIds.length
      ? await UserModel.find({
          role: "student",
          schoolId: { $in: schoolIds },
          $or: [
            { groupIds: { $in: validClassIds } },
            ...(rosterIds.length ? [{ _id: { $in: rosterIds } }] : []),
          ],
        })
          .select("name isActive schoolId groupIds")
          .lean()
      : [];
  const assignedSchoolIds = unique(validAssignments.map((assignment) => String(assignment.schoolId)));
  const assignedStudentIds = rosterStudents.map((student) => String(student._id));
  const assessments = validClassIds.length
    ? await QuizModel.find({
        $and: [
          { $or: [
            { targetGroupIds: { $in: [...assignedSchoolIds, ...validClassIds] } },
            { targetUserIds: { $in: assignedStudentIds } },
          ] },
          { $or: [
            { isPublished: true },
            { ownerId: actor.id },
            { createdBy: actor.id },
          ] },
        ],
      })
        .select("id title subjectId targetGroupIds targetUserIds dueDate quizKind approvalStatus isPublished ownerId createdBy")
        .sort({ dueDate: 1, updatedAt: -1 })
        .limit(100)
        .lean()
    : [];

  const schoolRows: Array<WorkspaceSchool | null> = await Promise.all(schoolIds.map(async (schoolId): Promise<WorkspaceSchool | null> => {
    const school: any = schoolById.get(schoolId);
    if (!school) return null;
    const context = teacherContexts.find((entry) => entry.schoolId === schoolId)!;
    const schoolAssignments = validAssignments
      .filter((assignment) => String(assignment.schoolId) === schoolId)
      .map((assignment: any) => {
        const classroom: any = classById.get(String(assignment.classId));
        const classId = String(assignment.classId);
        const students = rosterStudents
          .filter((student: any) =>
            String(student.schoolId || "") === schoolId &&
            ((student.groupIds || []).map(String).includes(classId) || (classroom.studentIds || []).map(String).includes(String(student._id))),
          )
          .map((student: any): WorkspaceStudent => ({
            studentId: String(student._id),
            name: String(student.name || "طالب بدون اسم"),
            isActive: student.isActive !== false,
          }))
          .sort((left, right) => left.name.localeCompare(right.name, "ar"));
        return {
          assignmentId: String(assignment._id),
          classId,
          className: String(classroom.name || ""),
          subjectId: String(assignment.subjectId || ""),
          studentCount: students.length,
          students,
        };
      });
    if (schoolAssignments.length === 0) return null;
    const smartClassroom = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
    return {
      schoolId,
      schoolName: String(school.name || ""),
      source: context.source,
      smartClassroomEnabled: smartClassroom.allowed,
      assignments: schoolAssignments,
      assessments: assessments
        .filter((assessment: any) => teacherAssessmentClassIds(assessment, schoolId, schoolAssignments).length > 0)
        .map((assessment: any) => ({
          assessmentId: String(assessment.id || assessment._id),
          title: String(assessment.title || ""),
          subjectId: String(assessment.subjectId || ""),
          classIds: teacherAssessmentClassIds(assessment, schoolId, schoolAssignments),
          dueDate: assessment.dueDate || null,
          quizKind: assessment.quizKind || "test",
          approvalStatus: assessment.approvalStatus || undefined,
          isPublished: assessment.isPublished === true,
          ownedByTeacher: [assessment.ownerId, assessment.createdBy].some((id: unknown) => String(id || "") === String(actor.id)),
        })),
    };
  }));
  const availableSchools = schoolRows.filter((school): school is WorkspaceSchool => school !== null);

  return {
    personas: {
      platformTrainer: Boolean(
        storedUser?.isActive !== false &&
        ((storedUser?.managedPathIds || []).length > 0 || (storedUser?.managedSubjectIds || []).length > 0),
      ),
      schoolTeacher: availableSchools.length > 0,
    },
    schools: availableSchools,
  };
};
