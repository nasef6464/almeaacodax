import { privateLessonAllowed, stripCanonicalMeetingLinks } from '../liveSessions/sessionPolicy.js';
import { UserModel } from '../../../models/User.js';
import { CourseModel } from "../../../models/Course.js";
import { getEffectivePurchaseIds, grantMatchesContent, hasActivePremium, isActiveGrant, loadEntitlementState } from "../../../services/entitlementPolicy.js";

const privateLessonFields = new Set(["content", "videoUrl", "fileUrl", "assignmentDetails", "meetingUrl", "recordingUrl", "joinInstructions", "interactiveQuestions", "attendedStudentIds", "allowedGroupIds"]);

export const projectBootstrapLearningAccess = async (lessons: any[], libraryItems: any[], userId?: string, role?: string, staff = false) => {
  const hasPrivate = lessons.some(lesson=>lesson.bookingId || lesson.privateStudentId || String(lesson.id||'').startsWith('live_conv_'));
  const privateUser = hasPrivate && userId && /^[a-f0-9]{24}$/i.test(userId) ? await UserModel.findOne({_id:userId,isActive:{$ne:false}}).select('role').lean() : null;
  const privateActor = privateUser && userId ? {id:userId,role:privateUser.role} : undefined;
  const state = userId && !staff ? await loadEntitlementState(userId) : { user: null, grants: [] };
  const packageIds = getEffectivePurchaseIds(state.user, state.grants).purchasedPackages;
  const packages = packageIds.length ? await CourseModel.find({ _id: { $in: packageIds }, isPackage: true, isPublished: true, showOnPlatform: { $ne: false } }).select("packageContentTypes pathId subjectId").lean() : [];
  const allowed = (item: any, type: string) => !item.isLocked || hasActivePremium(state.user)
    || state.grants.some(g => isActiveGrant(g) && (!(g.courseIds || []).length || (g.contentTypes || []).some(contentType => contentType === type)) && grantMatchesContent(g, type, item.pathId, item.subjectId))
    || packages.some(p => grantMatchesContent({ contentTypes: p.packageContentTypes?.length ? p.packageContentTypes : ["courses"], pathIds: p.pathId ? [p.pathId] : [], subjectIds: p.subjectId ? [p.subjectId] : [] }, type, item.pathId, item.subjectId));
  return {
    lessons: lessons.map(stripCanonicalMeetingLinks).filter(lesson => privateLessonAllowed(lesson, privateActor)).map(lesson => (staff || allowed(lesson, "foundation")) ? lesson : Object.fromEntries(Object.entries(lesson).filter(([key]) => !privateLessonFields.has(key)))),
    libraryItems: libraryItems.map(item => (staff || allowed(item, "library")) ? item : { ...item, url: "" }),
  };
};
