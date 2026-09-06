import { Router } from "express";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";
import { optionalAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isStaffRole, withLearnerVisiblePaths } from "../services/visibility.js";

const normalizeStringList = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];

const buildCourseIdentityQuery = (id: string) => {
  const normalizedId = String(id || "").trim();
  return { $or: [{ _id: normalizedId }, { id: normalizedId }] };
};

const buildCourseVisibilityFilter = (authUser?: { role?: string; id?: string }) => {
  if (isStaffRole(authUser?.role)) return {};
  return {
    isPublished: true,
    showOnPlatform: { $ne: false },
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
  };
};

const grantAllowsCourse = (grant: any, course: any) => {
  if (!grant || grant.status !== "active") return false;
  const expiresAt = Number(grant.expiresAt || 0);
  if (expiresAt > 0 && expiresAt <= Date.now()) return false;

  const courseId = String(course.id || course._id || "").trim();
  const coursePathId = String(course.pathId || course.category || "").trim();
  const courseSubjectId = String(course.subjectId || course.subject || "").trim();
  const courseIds = normalizeStringList(grant.courseIds);
  if (courseIds.length > 0) return courseIds.includes(courseId);

  const contentTypes = normalizeStringList(grant.contentTypes);
  if (!contentTypes.includes("all") && !contentTypes.includes("courses")) return false;

  const pathIds = normalizeStringList(grant.pathIds);
  const subjectIds = normalizeStringList(grant.subjectIds);
  const matchesPath = pathIds.length === 0 || (!!coursePathId && pathIds.includes(coursePathId));
  const matchesSubject = subjectIds.length === 0 || (!!courseSubjectId && subjectIds.includes(courseSubjectId));
  return matchesPath && matchesSubject;
};

const hasCourseEntitlement = async (userId: string, course: any) => {
  const [user, activeGrants] = await Promise.all([
    UserModel.findById(userId).select("enrolledCourses subscription").lean(),
    AccessGrantModel.find({ userId, status: "active" })
      .select("courseIds contentTypes pathIds subjectIds status expiresAt")
      .lean(),
  ]);
  if (!user) return false;

  const courseId = String(course.id || course._id || "").trim();
  const enrolledCourseIds = new Set([
    ...normalizeStringList((user as any).enrolledCourses),
    ...normalizeStringList((user as any).subscription?.purchasedCourses),
  ]);
  const isPremiumSubscription = String((user as any).subscription?.plan || "free") === "premium";

  return (
    isPremiumSubscription ||
    enrolledCourseIds.has(courseId) ||
    activeGrants.some((grant) => grantAllowsCourse(grant, course))
  );
};

const redactRestrictedLessonPayload = (lesson: any) => {
  if (!lesson || typeof lesson !== "object" || lesson.accessControl === "public") return lesson;

  const {
    content: _content,
    videoUrl: _videoUrl,
    fileUrl: _fileUrl,
    assignmentDetails: _assignmentDetails,
    meetingUrl: _meetingUrl,
    recordingUrl: _recordingUrl,
    joinInstructions: _joinInstructions,
    interactiveQuestions: _interactiveQuestions,
    attendedStudentIds: _attendedStudentIds,
    allowedGroupIds: _allowedGroupIds,
    ...safeLesson
  } = lesson;

  return { ...safeLesson, isLocked: true };
};

const projectRestrictedCoursePayload = (course: any) => ({
  ...course,
  modules: Array.isArray(course?.modules)
    ? course.modules.map((moduleItem: any) => ({
        ...moduleItem,
        lessons: Array.isArray(moduleItem?.lessons)
          ? moduleItem.lessons.map(redactRestrictedLessonPayload)
          : [],
      }))
    : [],
  files: Array.isArray(course?.files)
    ? course.files.map((file: any) => (file?.access === "free_preview" ? file : { ...file, url: "" }))
    : [],
});

export const freeCourseContentGuardRouter = Router();

freeCourseContentGuardRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    if (isStaffRole(req.authUser?.role)) return next();

    const visibilityFilter = await withLearnerVisiblePaths(buildCourseVisibilityFilter(req.authUser), req.authUser);
    const item = await CourseModel.findOne({
      $and: [buildCourseIdentityQuery(req.params.id), visibilityFilter],
    }).lean();

    if (!item || Number((item as any).price || 0) > 0) return next();

    const entitled = req.authUser?.id
      ? await hasCourseEntitlement(req.authUser.id, item)
      : false;

    return res.json(entitled ? item : projectRestrictedCoursePayload(item));
  }),
);
