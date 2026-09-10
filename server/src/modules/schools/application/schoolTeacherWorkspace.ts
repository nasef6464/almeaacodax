import { Types } from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { QuizModel } from "../../../models/Quiz.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { resolveSchoolContexts, type LegacySchoolUser } from "./schoolContextResolver.js";
import { resolveSchoolEntitlement } from "./schoolEntitlementResolver.js";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const idsQuery = (ids: string[]): Record<string, unknown> => {
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  return { $or: [{ _id: { $in: ids } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])] };
};

type WorkspaceAssessment = { assessmentId: string; title: string; subjectId: string; classIds: string[]; dueDate: string | null; quizKind: string };
type WorkspaceAssignment = { assignmentId: string; classId: string; className: string; subjectId: string };
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
          .select("name parentId")
          .lean()
      : [],
  ]);
  const schoolById = new Map(schools.map((school: any) => [String(school._id), school]));
  const classById = new Map(classes.map((classroom: any) => [String(classroom._id), classroom]));
  const validAssignments = assignments.filter((assignment) => {
    const classroom: any = classById.get(String(assignment.classId));
    return classroom && String(classroom.parentId) === String(assignment.schoolId);
  });
  const validClassIds = unique(validAssignments.map((assignment) => String(assignment.classId)));
  const assessments = validClassIds.length
    ? await QuizModel.find({ targetGroupIds: { $in: validClassIds }, isPublished: true })
        .select("id title subjectId targetGroupIds dueDate quizKind")
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
        return {
          assignmentId: String(assignment._id),
          classId: String(assignment.classId),
          className: String(classroom.name || ""),
          subjectId: String(assignment.subjectId || ""),
        };
      });
    if (schoolAssignments.length === 0) return null;
    const classIds = new Set(schoolAssignments.map((assignment) => assignment.classId));
    const smartClassroom = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
    return {
      schoolId,
      schoolName: String(school.name || ""),
      source: context.source,
      smartClassroomEnabled: smartClassroom.allowed,
      assignments: schoolAssignments,
      assessments: assessments
        .filter((assessment: any) => (assessment.targetGroupIds || []).some((id: unknown) => classIds.has(String(id))))
        .map((assessment: any) => ({
          assessmentId: String(assessment.id || assessment._id),
          title: String(assessment.title || ""),
          subjectId: String(assessment.subjectId || ""),
          classIds: (assessment.targetGroupIds || []).map(String).filter((id: string) => classIds.has(id)),
          dueDate: assessment.dueDate || null,
          quizKind: assessment.quizKind || "test",
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
