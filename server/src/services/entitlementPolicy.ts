import { AccessGrantModel } from "../models/AccessGrant.js";
import { UserModel } from "../models/User.js";
import { CourseModel } from "../models/Course.js";
import { hasActivePremium } from "../utils/premiumAccess.js";
export { hasActivePremium } from "../utils/premiumAccess.js";

const ids = (value: unknown): string[] => Array.isArray(value) ? value.map(String).filter(Boolean) : [];
export const isActiveGrant = (grant: any, now = Date.now()) =>
  grant?.status === "active" && (grant.expiresAt == null || Number(grant.expiresAt) > now);

export const grantMatchesContent = (grant: any, type: string, pathId?: string, subjectId?: string) => {
  const types = ids(grant.contentTypes);
  const paths = ids(grant.pathIds);
  const subjects = ids(grant.subjectIds);
  return (types.includes("all") || types.includes(type))
    && (!paths.length || (!!pathId && paths.includes(pathId)))
    && (!subjects.length || (!!subjectId && subjects.includes(subjectId)));
};

export const grantAllowsCourse = (grant: any, course: any, now = Date.now()) => {
  if (!isActiveGrant(grant, now)) return false;
  const courseIds = ids(grant.courseIds);
  const identities = [String(course.id || ""), String(course._id || "")].filter(Boolean);
  if (courseIds.length) return courseIds.some(id => identities.includes(id));
  return grantMatchesContent(grant, "courses", String(course.pathId || course.category || ""), String(course.subjectId || course.subject || ""));
};

// Always provide ALL historical grants. Active-only queries lose the provenance
// required to distinguish permanent legacy ownership from a stale grant mirror.
export const getEffectivePurchaseIds = (user: any, grants: any[], now = Date.now()) => {
  const valid = (id: string, field: "courseIds" | "packageId") => {
    const provenance = grants.filter(g => field === "courseIds" ? ids(g.courseIds).includes(id) : String(g.packageId || "") === id);
    return !provenance.length || provenance.some(g => isActiveGrant(g, now));
  };
  return {
    enrolledCourses: ids(user?.enrolledCourses).filter(id => valid(id, "courseIds")),
    purchasedCourses: ids(user?.subscription?.purchasedCourses).filter(id => valid(id, "courseIds")),
    purchasedPackages: ids(user?.subscription?.purchasedPackages).filter(id => valid(id, "packageId")),
  };
};

export const hasCourseEntitlementFromState = (user: any, course: any, grants: any[], now = Date.now()) => {
  if (!user) return false;
  const identities = [String(course.id || ""), String(course._id || "")].filter(Boolean);
  // A real free enrollment remains valid if an unrelated historical grant ends.
  if (Number(course.price || 0) <= 0 && ids(user.enrolledCourses).some(id => identities.includes(id))) return true;
  const effective = getEffectivePurchaseIds(user, grants, now);
  return hasActivePremium(user, now)
    || [...effective.enrolledCourses, ...effective.purchasedCourses, ...effective.purchasedPackages].some(id => identities.includes(id))
    || grants.some(grant => grantAllowsCourse(grant, course, now));
};

export const loadEntitlementState = async (userId: string) => {
  const [user, grants] = await Promise.all([
    UserModel.findById(userId).select("enrolledCourses subscription").lean(),
    AccessGrantModel.find({ userId }).select("courseIds packageId contentTypes pathIds subjectIds status expiresAt sourceType").lean(),
  ]);
  return { user, grants };
};

export const hasCourseEntitlement = async (userId: string, course: any) => {
  const { user, grants } = await loadEntitlementState(userId);
  return hasCourseEntitlementFromState(user, course, grants);
};

/** Read response only: preserve original history and expiry in Mongo. */
export const projectEffectiveUserAccess = async (user: any, allGrants?: any[]) => {
  const grants = allGrants || await AccessGrantModel.find({ userId: String(user._id || user.id || "") }).select("courseIds packageId status expiresAt").lean();
  const effective = getEffectivePurchaseIds(user, grants);
  const removedEnrollments = ids(user.enrolledCourses).filter(id => !effective.enrolledCourses.includes(id));
  if (removedEnrollments.length) {
    const freeCourses = await CourseModel.find({ $or: [{ _id: { $in: removedEnrollments } }, { id: { $in: removedEnrollments } }], price: { $lte: 0 }, isPublished: true, showOnPlatform: { $ne: false } }).select("id _id").lean();
    const freeIds = new Set(freeCourses.flatMap(course => [String((course as any).id || ""), String(course._id)]));
    effective.enrolledCourses.push(...removedEnrollments.filter(id => freeIds.has(id)));
  }
  return { ...user, enrolledCourses: effective.enrolledCourses, subscription: { ...user.subscription, plan: hasActivePremium(user) ? "premium" : "free", purchasedCourses: effective.purchasedCourses, purchasedPackages: effective.purchasedPackages } };
};
