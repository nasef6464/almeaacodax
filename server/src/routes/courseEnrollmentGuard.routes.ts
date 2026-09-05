import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isStaffRole } from "../services/visibility.js";

export const courseEnrollmentGuardRouter = Router();

const buildCourseIdentityQuery = (id: string) => {
  const normalizedId = String(id || "").trim();
  return { $or: [{ _id: normalizedId }, { id: normalizedId }] };
};

const guardDirectCourseEnrollment = asyncHandler(async (req, res, next) => {
  const requestedCourseId = String(req.params.id || "").trim();
  const course = await CourseModel.findOne(buildCourseIdentityQuery(requestedCourseId)).lean();

  if (!course) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
  }

  if (!isStaffRole(req.authUser?.role)) {
    const approvalStatus = String((course as { approvalStatus?: string }).approvalStatus || "").trim();
    const isLearnerVisible =
      (course as { isPublished?: boolean }).isPublished === true &&
      (course as { showOnPlatform?: boolean }).showOnPlatform !== false &&
      (!approvalStatus || approvalStatus === "approved");

    if (!isLearnerVisible) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }
  }

  const user = await UserModel.findById(req.authUser!.id).select("subscription").lean();
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User account not found" });
  }

  const normalizedCourseId = String((course as { id?: string; _id?: unknown }).id || (course as { _id?: unknown })._id || requestedCourseId);
  const purchasedCourses = Array.isArray(user.subscription?.purchasedCourses)
    ? user.subscription.purchasedCourses.map(String)
    : [];

  if (purchasedCourses.includes(normalizedCourseId) || purchasedCourses.includes(requestedCourseId)) {
    return res.status(StatusCodes.OK).json({
      success: true,
      enrolled: true,
      alreadyEnrolled: true,
      courseId: normalizedCourseId,
      message: "Already enrolled in course",
    });
  }

  if (Number((course as { price?: number }).price || 0) > 0) {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      enrolled: false,
      code: "COURSE_PURCHASE_REQUIRED",
      courseId: normalizedCourseId,
      message: "Paid course requires verified purchase or package access",
    });
  }

  return next();
});

courseEnrollmentGuardRouter.post("/:id/enroll", requireAuth, guardDirectCourseEnrollment);
courseEnrollmentGuardRouter.post("/:id/join", requireAuth, guardDirectCourseEnrollment);
