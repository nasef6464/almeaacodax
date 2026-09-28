import { StatusCodes } from "http-status-codes";
import { AccessGrantModel } from "../../../models/AccessGrant.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { CourseModel } from "../../../models/Course.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { getActivePathIds, isStaffRole } from "../../../services/visibility.js";
import { resolveSupervisorSchoolReportScope } from "../application/quizReportScope.js";
import { resolveAuthUserByAuthId } from "../application/quizUserLookup.js";
import { buildDocumentsByIdsQuery, uniqueStrings } from "../infrastructure/quizDocumentQuery.js";

export const assertSupervisorDirectedQuizScope = async (
  authUser: any,
  payload: { mode?: unknown; targetGroupIds?: unknown; targetUserIds?: unknown },
) => {
  if (authUser.role !== "supervisor") return;
  if (!payload.mode || payload.mode === "regular") payload.mode = "central";

  const supervisorScope = await resolveSupervisorSchoolReportScope(authUser);
  const allowedGroupIds = new Set(uniqueStrings([...supervisorScope.groupIds, ...supervisorScope.schoolIds]));
  let targetGroupIds = uniqueStrings(Array.isArray(payload.targetGroupIds) ? payload.targetGroupIds.map(String) : []);
  const targetUserIds = uniqueStrings(Array.isArray(payload.targetUserIds) ? payload.targetUserIds.map(String) : []);

  if (targetGroupIds.length === 0 && targetUserIds.length === 0 && allowedGroupIds.size > 0) {
    targetGroupIds = Array.from(allowedGroupIds);
    payload.targetGroupIds = targetGroupIds;
  }
  if (targetGroupIds.length > 0 && allowedGroupIds.size > 0) {
    payload.targetGroupIds = targetGroupIds.filter((groupId) => allowedGroupIds.has(groupId));
  }

  if (targetUserIds.length > 0) {
    const students = await UserModel.find(buildDocumentsByIdsQuery(targetUserIds))
      .select("id _id role schoolId groupIds").lean();
    const foundStudentIds = new Set(students.map((student: any) => String(student.id || student._id || "")));
    const missingStudentIds = targetUserIds.filter((studentId) => !foundStudentIds.has(studentId));
    const outsideStudents = students.filter((student: any) => {
      if (student.role !== "student") return true;
      const schoolId = String(student.schoolId || "");
      const groupIds = (student.groupIds || []).map(String);
      return !supervisorScope.schoolIds.includes(schoolId) && !groupIds.some((groupId: string) => allowedGroupIds.has(groupId));
    });
    if (missingStudentIds.length > 0 || outsideStudents.length > 0) {
      const error = new Error("Directed quiz targets students outside supervisor scope") as Error & { statusCode?: number };
      error.statusCode = StatusCodes.FORBIDDEN;
      throw error;
    }
  }
};

const matchesContentScope = (
  item: { contentTypes?: string[]; pathIds?: string[]; subjectIds?: string[] },
  contentType: string,
  pathId?: string,
  subjectId?: string,
) => {
  const contentTypes = Array.isArray(item.contentTypes) && item.contentTypes.length ? item.contentTypes : ["all"];
  const pathIds = Array.isArray(item.pathIds) ? item.pathIds.map(String).filter(Boolean) : [];
  const subjectIds = Array.isArray(item.subjectIds) ? item.subjectIds.map(String).filter(Boolean) : [];
  return (contentTypes.includes("all") || contentTypes.includes(contentType))
    && (pathIds.length === 0 || (!!pathId && pathIds.includes(pathId)))
    && (subjectIds.length === 0 || (!!subjectId && subjectIds.includes(subjectId)));
};

const hasPurchasedPackageAccess = async (ids: string[], contentType: string, pathId?: string, subjectId?: string) => {
  if (!ids.length) return false;
  const packages = await CourseModel.find({
    _id: { $in: ids }, isPackage: true, isPublished: true, showOnPlatform: { $ne: false },
  }).select("_id pathId subjectId packageContentTypes includedCourses");
  return packages.some((pkg: any) => matchesContentScope({
    contentTypes: Array.isArray(pkg.packageContentTypes) && pkg.packageContentTypes.length ? pkg.packageContentTypes : ["courses"],
    pathIds: pkg.pathId ? [String(pkg.pathId)] : [],
    subjectIds: pkg.subjectId ? [String(pkg.subjectId)] : [],
  }, contentType, pathId, subjectId));
};

const hasSchoolPackageAccess = async (user: any, contentType: string, pathId?: string, subjectId?: string) => {
  const schoolId = String(user.schoolId || "");
  const userId = String(user.id || user._id || "");
  if (!schoolId || !userId) return false;
  const packages = await B2BPackageModel.find({ schoolId, status: "active" });
  const packageIds = packages.map((pkg: any) => String(pkg.id || pkg._id || "")).filter(Boolean);
  if (!packageIds.length) return false;
  const grants = await AccessGrantModel.find({
    userId, packageId: { $in: packageIds }, status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: Date.now() } }],
  }).select("contentTypes pathIds subjectIds").lean();
  return grants.some((grant: any) => matchesContentScope(grant, contentType, pathId, subjectId));
};

const sourceContentType = (source?: string) =>
  source === "mock-exam" ? "mockExams"
  : source === "training" ? "banks"
  : source === "tests" ? "tests"
  : source === "foundation" ? "foundation"
  : source === "course" ? "courses" : "";

const sourceSlot = (source?: string) =>
  source === "training" ? "training"
  : source === "tests" ? "tests"
  : source === "foundation" ? "foundation"
  : source === "course" ? "course" : "";

const placementAccessType = (quiz: any, source?: string) => {
  const slot = sourceSlot(source);
  if (!slot) return "inherit";
  const placement = (Array.isArray(quiz.learningPlacements) ? quiz.learningPlacements : [])
    .find((item: any) => item?.slot === slot && item?.isVisible !== false);
  return placement?.accessType || "inherit";
};

const paidContentTypes = (quiz: any, source?: string) => {
  if (quiz?.mockExam?.enabled === true) return ["mockExams"];
  const direct = sourceContentType(source);
  if (direct) return [direct];
  const visibleSlots = new Set((Array.isArray(quiz.learningPlacements) ? quiz.learningPlacements : [])
    .filter((p: any) => p?.isVisible !== false)
    .filter((p: any) => !p?.accessType || p.accessType === "inherit" || p.accessType === "paid")
    .map((p: any) => String(p?.slot || "")).filter(Boolean));
  const training = visibleSlots.has("training") || quiz.showInTraining === true || quiz.placement === "training" || quiz.placement === "both" || quiz.type === "bank";
  const tests = visibleSlots.has("tests") || quiz.showInMock === true || quiz.placement === "mock" || quiz.placement === "both" || !training;
  return [...(training ? ["banks"] : []), ...(tests ? ["tests"] : [])];
};

const isTargeted = (quiz: any, user?: any) => {
  const users = new Set((quiz.targetUserIds || []).map(String));
  const groups = new Set((quiz.targetGroupIds || []).map(String));
  if (!users.size && !groups.size) return true;
  if (!user) return false;
  const userGroups = uniqueStrings([...(user.groupIds || []).map(String), ...(user.schoolId ? [String(user.schoolId)] : [])]);
  return users.has(String(user.id || user._id)) || userGroups.some((id) => groups.has(id));
};

export const resolveDirectedQuizReadAccess = async (quiz: any, authUser?: any) => {
  const targetUserIds = uniqueStrings(quiz.targetUserIds || []);
  const targetGroupIds = uniqueStrings(quiz.targetGroupIds || []);
  if (!targetUserIds.length && !targetGroupIds.length) return { allowed: true as const };
  if (!authUser) return { allowed: false as const, status: StatusCodes.UNAUTHORIZED };
  const user = await resolveAuthUserByAuthId(String(authUser.id || ""));
  if (!user) return { allowed: false as const, status: StatusCodes.UNAUTHORIZED };
  if (isStaffRole(user.role)) return { allowed: true as const };
  const userId = String(user.id || user._id || "");
  if (targetUserIds.includes(userId)) return { allowed: true as const };
  if (!targetGroupIds.length) return { allowed: false as const, status: StatusCodes.FORBIDDEN };
  const matchingGroup = await GroupModel.findOne({
    $and: [buildDocumentsByIdsQuery(targetGroupIds), { studentIds: userId }],
  }).select("_id").lean();
  return matchingGroup ? { allowed: true as const } : { allowed: false as const, status: StatusCodes.FORBIDDEN };
};

export const canSubmitQuiz = async (quiz: any, user: any, source?: string) => {
  if (isStaffRole(user.role)) return true;
  const approved = quiz.approvalStatus === "approved" || !quiz.approvalStatus;
  const targeted = isTargeted(quiz, user);
  if (!(quiz.isPublished && approved && (quiz.showOnPlatform !== false || targeted))) return false;
  const pathId = String(quiz.pathId || "");
  if (pathId && !(await getActivePathIds()).includes(pathId)) return false;
  if (!targeted) return false;

  const userGroupIds = uniqueStrings([...(user.groupIds || []).map(String), ...(user.schoolId ? [String(user.schoolId)] : [])]);
  const hasTarget = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
  const placement = placementAccessType(quiz, source);
  const accessType = placement !== "inherit" ? placement : quiz.access?.type || "free";
  if (accessType === "free" || user.subscription?.plan === "premium") return true;
  if (accessType === "private") {
    const allowed = new Set((quiz.access?.allowedGroupIds || []).map(String));
    return hasTarget || allowed.size === 0 || userGroupIds.some((id: string) => allowed.has(id));
  }

  const subjectId = String(quiz.subjectId || "");
  const purchased = (user.subscription?.purchasedPackages || []).map(String);
  const types = accessType === "course_only" ? ["courses"] : paidContentTypes(quiz, source);
  for (const type of types) {
    if ((await hasPurchasedPackageAccess(purchased, type, pathId, subjectId))
      || (await hasSchoolPackageAccess(user, type, pathId, subjectId))) return true;
  }
  return false;
};
