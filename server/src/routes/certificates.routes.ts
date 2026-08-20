import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CertificateModel } from "../models/Certificate.js";
import { CourseModel } from "../models/Course.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { UserModel } from "../models/User.js";
import { createNotificationDeliveries } from "../services/notificationService.js";
import { enqueueNotificationDeliveries } from "../queues/notificationQueue.js";

export const certificateRouter = Router();

const generateSchema = z.object({
  courseId: z.string().min(1),
});

const normalizeStringList = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];

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

certificateRouter.post(
  "/generate",
  requireAuth,
  requireRole(["student"]),
  asyncHandler(async (req, res) => {
    const { courseId } = generateSchema.parse(req.body);
    const userId = req.authUser!.id;

    const [user, course, activeGrants] = await Promise.all([
      UserModel.findById(userId).select("id name role completedLessons enrolledCourses subscription"),
      CourseModel.findOne({ $or: [{ id: courseId }, { _id: courseId }] }).select("id title modules pathId category subjectId subject certificateEnabled"),
      AccessGrantModel.find({ userId, status: "active" }).select("courseIds contentTypes pathIds subjectIds status expiresAt").lean(),
    ]);
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    if (!course) return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    if (course.certificateEnabled !== true) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Certificates are not enabled for this course" });
    }

    const normalizedCourseId = String(course.id || course._id);
    const enrolledCourseIds = new Set([
      ...normalizeStringList(user.enrolledCourses),
      ...normalizeStringList((user as any).subscription?.purchasedCourses),
    ]);
    const hasCourseEntitlement = enrolledCourseIds.has(normalizedCourseId) || activeGrants.some((grant) => grantAllowsCourse(grant, course));
    if (!hasCourseEntitlement) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Course access is required before issuing a certificate" });
    }

    const moduleLessons = Array.isArray(course.modules)
      ? course.modules.flatMap((mod: any) => (Array.isArray(mod?.lessons) ? mod.lessons : []))
      : [];
    const totalLessons = moduleLessons.length;
    if (totalLessons === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Course has no certifiable lessons" });
    }
    const completedLessons = new Set((user.completedLessons || []).map(String));
    const completedInCourse = moduleLessons.filter((lesson: any) => completedLessons.has(String(lesson?.id || lesson?._id))).length;
    const completionPercentage = Math.round((completedInCourse / totalLessons) * 100);

    if (completionPercentage < 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Course completion is below 100%",
        completionPercentage,
      });
    }

    const existing = await CertificateModel.findOne({ userId, courseId: normalizedCourseId });
    if (existing) return res.json(existing);

    const created = await CertificateModel.create({
      userId,
      courseId: normalizedCourseId,
      pathId: String(course.pathId || course.category || ""),
      issuedAt: new Date(),
      verificationCode: randomUUID(),
      studentName: String(user.name || "Student"),
      courseName: String(course.title || "Course"),
      completionPercentage,
    });

    const linkedParents = await UserModel.find({
      role: "parent",
      linkedStudentIds: { $in: [String(userId)] },
      isActive: { $ne: false },
    })
      .select("id _id")
      .lean();
    const parentUserIds = linkedParents.map((parent: any) => String(parent.id || parent._id)).filter(Boolean);
    if (parentUserIds.length > 0) {
      const delivery = await createNotificationDeliveries({
        title: "إشعار إنجاز جديد",
        subject: "إصدار شهادة جديدة لأحد الأبناء",
        body: `تم إصدار شهادة جديدة للطالب ${String(user.name || "طالب")} في دورة ${String(course.title || "دورة")} بنسبة إنجاز ${completionPercentage}%.`,
        channels: ["in_app", "email"],
        userIds: parentUserIds,
        createdBy: String(req.authUser!.id),
      });
      await enqueueNotificationDeliveries(delivery.deliveryIds || []);
    }

    return res.status(StatusCodes.CREATED).json(created);
  }),
);

certificateRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await CertificateModel.find({ userId: req.authUser!.id }).sort({ issuedAt: -1 }).lean();
    res.json({ certificates: items });
  }),
);

certificateRouter.get(
  "/:verificationCode",
  asyncHandler(async (req, res) => {
    const item = await CertificateModel.findOne({ verificationCode: String(req.params.verificationCode || "").trim() }).lean();
    if (!item) return res.status(StatusCodes.NOT_FOUND).json({ message: "Certificate not found" });
    res.json(item);
  }),
);
