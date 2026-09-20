import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { QuizModel } from "../models/Quiz.js";
import { QuestionModel } from "../models/Question.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { UserModel } from "../models/User.js";
import { GroupModel } from "../models/Group.js";
import { B2BPackageModel } from "../models/B2BPackage.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { CourseModel } from "../models/Course.js";
import { QuestionAttemptModel } from "../models/QuestionAttempt.js";
import { SkillModel } from "../models/Skill.js";
import { SubjectModel } from "../models/Subject.js";
import { SectionModel } from "../models/Section.js";
import { TopicModel } from "../models/Topic.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { serializeQuizResultForLearner, serializeQuizResultsForLearner } from "../utils/quizResultSerialization.js";
import { getActivePathIds, isStaffRole, withLearnerVisiblePaths } from "../services/visibility.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";
import { quizResultsListQuerySchema } from "../modules/quizzes/http/questionQuerySchemas.js";
import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";
import { quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";
import { isQuestionContentUsable, sanitizeQuestionForLearner } from "../modules/quizzes/presentation/questionPresentation.js";
import { buildQuizResultsCacheKey, escapeRegex, parseDateFilter } from "../modules/quizzes/http/queryUtilities.js";
import { clearQuestionBankSummaryCache, questionBankRouter } from "../modules/quizzes/http/questionBankRoutes.js";
import { quizAnalyticsRouter } from "../modules/quizzes/http/quizAnalyticsRoutes.js";
import { resolveScopedStudents, resolveSupervisorSchoolReportScope } from "../modules/quizzes/application/quizReportScope.js";
import { resolveAuthUserByAuthId } from "../modules/quizzes/application/quizUserLookup.js";
import { adaptiveTelemetryRouter } from "../modules/quizzes/http/adaptiveTelemetryRoutes.js";
import { buildDocumentQuery, buildDocumentsByIdsQuery, buildOwnedDocumentQuery, uniqueStrings } from "../modules/quizzes/infrastructure/quizDocumentQuery.js";
import { runQuizSubmissionSideEffects } from "../modules/quizzes/application/quizSubmissionSideEffects.js";
import { validateQuizQuestionIntegrity } from "../modules/quizzes/application/quizQuestionIntegrity.js";
import { normalizeQuizPlacementPayload } from "../modules/quizzes/application/quizPlacement.js";
import { getQuizQuestionIds, resolveQuizSkillIds } from "../modules/quizzes/application/quizQuestionSelection.js";
import { getWorkflowDefaults, sanitizeWorkflowUpdate } from "../modules/quizzes/application/quizWorkflow.js";
import { resolveQuizPublicationState } from "../modules/quizzes/application/quizPublicationPolicy.js";
import { processInlineQuestions } from "../modules/quizzes/application/quizInlineQuestions.js";
import { buildQuizCreateDocument } from "../modules/quizzes/application/quizDefinitionDocument.js";
import { buildQuizUpdateDocument } from "../modules/quizzes/application/quizUpdateDocument.js";
import { buildQuizValidationState } from "../modules/quizzes/application/quizValidationState.js";
import { buildQuizSubmissionAttemptState, getQuizMaxAttempts, getQuizPassingScore } from "../modules/quizzes/application/quizAttemptContext.js";
import { buildQuizQuestionLookup, resolveOrderedQuizQuestions } from "../modules/quizzes/application/quizSubmissionQuestions.js";
import { buildQuizSubmissionScoreSummary } from "../modules/quizzes/application/quizSubmissionScoreSummary.js";
import { buildQuizSubmissionSectionResults } from "../modules/quizzes/application/quizSubmissionSectionResults.js";
import { buildQuizSubmissionSnapshot } from "../modules/quizzes/application/quizSubmissionSnapshot.js";
import { buildQuizSubmissionAnswerReview } from "../modules/quizzes/application/quizSubmissionAnswerReview.js";
import { buildQuizSubmissionSkillsAnalysis } from "../modules/quizzes/application/quizSubmissionSkillsAnalysis.js";
import { buildQuizSubmissionResultDocument } from "../modules/quizzes/application/quizSubmissionResultDocument.js";
import { resolveQuizSubmissionLearningContext } from "../modules/quizzes/application/quizSubmissionLearningContext.js";
import { buildQuizSubmissionDirectedScope } from "../modules/quizzes/application/quizSubmissionDirectedScope.js";
import { buildQuizSubmissionReadModelContext, getQuizSubmissionSkillIds } from "../modules/quizzes/application/quizSubmissionReadModelContext.js";
import { assertQuizSubmissionWindow } from "../modules/quizzes/application/quizSubmissionWindow.js";
import { filterResultsByManagedContentScope, matchesManagedContentScope } from "../modules/quizzes/application/quizManagedContentScope.js";
import { resolveAssessmentDefinitionRead } from "../modules/quizzes/application/assessmentDefinitionReadAdapter.js";
import { findLatestPublishedAssessmentVersion, publishAssessmentVersion } from "../modules/quizzes/infrastructure/assessmentVersionRepository.js";
import { mirrorAssessmentSubmissionAfterLegacyResult } from "../modules/quizzes/application/assessmentSubmissionMirror.js";
import { resolveAssessmentResultRead, resolveAssessmentResultReads } from "../modules/quizzes/application/assessmentResultReadAdapter.js";
import { shouldReadAssessmentCompatibilityProjection } from "../modules/quizzes/application/assessmentResultReaderPolicy.js";
import { findAssessmentResultByLegacyId, findAssessmentResultsByLegacyIds } from "../modules/quizzes/infrastructure/assessmentResultRepository.js";
import { findAssessmentResultReaderMode, findAssessmentResultReaderModes } from "../modules/quizzes/infrastructure/assessmentResultReaderRepository.js";
import {
  assertManagedContentScope,
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../services/managedContentScope.js";

const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;
const QUIZ_RESULTS_CACHE_TTL_MS = 5 * 1000;
const QUIZ_RESULTS_CACHE_MAX_ENTRIES = 300;

const resolveCompatibleQuizResultList = async (results: Record<string, unknown>[]) => {
  const legacyIds = results.map((result) => String(result.id || result._id || "")).filter(Boolean);
  const quizIds = results.map((result) => String(result.quizId || "")).filter(Boolean);
  const [assessmentResultsByLegacyId, readerModesByQuizId] = await Promise.all([
    findAssessmentResultsByLegacyIds(legacyIds),
    findAssessmentResultReaderModes(quizIds),
  ]);
  return resolveAssessmentResultReads(results, assessmentResultsByLegacyId, readerModesByQuizId);
};

let publicQuizListCache:
  | {
      key: string;
      expiresAt: number;
      payload: unknown;
    }
  | null = null;
let quizResultsCache = new Map<
  string,
  {
    expiresAt: number;
    payload: unknown;
  }
>();

const clearPublicQuizListCache = () => {
  publicQuizListCache = null;
};

const clearQuizResultsCache = () => {
  quizResultsCache.clear();
};

const trimQuizResultsCacheIfNeeded = () => {
  if (quizResultsCache.size <= QUIZ_RESULTS_CACHE_MAX_ENTRIES) return;
  const firstKey = quizResultsCache.keys().next().value;
  if (firstKey) {
    quizResultsCache.delete(firstKey);
  }
};

const DIRECT_RESULT_DISABLED_MESSAGE =
  "Direct quiz result creation is disabled. Submit quiz answers through /api/quizzes/:id/submit.";

const assertSupervisorDirectedQuizScope = async (
  authUser: any,
  payload: { mode?: unknown; targetGroupIds?: unknown; targetUserIds?: unknown },
) => {
  if (authUser.role !== "supervisor") {
    return;
  }

  // Force central mode for supervisor directed quizzes
  if (!payload.mode || payload.mode === "regular") {
    payload.mode = "central";
  }

  const supervisorScope = await resolveSupervisorSchoolReportScope(authUser);
  const allowedGroupIds = new Set(uniqueStrings([...supervisorScope.groupIds, ...supervisorScope.schoolIds]));

  let targetGroupIds = uniqueStrings(Array.isArray(payload.targetGroupIds) ? payload.targetGroupIds.map(String) : []);
  let targetUserIds = uniqueStrings(Array.isArray(payload.targetUserIds) ? payload.targetUserIds.map(String) : []);

  // If no target specified, auto-fill with supervisor's allowed scope
  if (targetGroupIds.length === 0 && targetUserIds.length === 0 && allowedGroupIds.size > 0) {
    targetGroupIds = Array.from(allowedGroupIds);
    payload.targetGroupIds = targetGroupIds;
  }

  if (targetGroupIds.length > 0 && allowedGroupIds.size > 0) {
    const outsideGroups = targetGroupIds.filter((groupId) => !allowedGroupIds.has(groupId));
    if (outsideGroups.length > 0) {
      payload.targetGroupIds = targetGroupIds.filter((groupId) => allowedGroupIds.has(groupId));
    }
  }

  if (targetUserIds.length > 0) {
    const students = await UserModel.find(buildDocumentsByIdsQuery(targetUserIds)).select("id _id role schoolId groupIds").lean();
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

const idOf = (item: any) => String(item?.id || item?._id || "");

const matchesContentScope = (
  item: { contentTypes?: string[]; pathIds?: string[]; subjectIds?: string[] },
  contentType: string,
  pathId?: string,
  subjectId?: string,
) => {
  const contentTypes = Array.isArray(item.contentTypes) && item.contentTypes.length ? item.contentTypes : ["all"];
  const pathIds = Array.isArray(item.pathIds) ? item.pathIds.map(String).filter(Boolean) : [];
  const subjectIds = Array.isArray(item.subjectIds) ? item.subjectIds.map(String).filter(Boolean) : [];
  const matchesType = contentTypes.includes("all") || contentTypes.includes(contentType);
  const matchesPath = pathIds.length === 0 || (!!pathId && pathIds.includes(pathId));
  const matchesSubject = subjectIds.length === 0 || (!!subjectId && subjectIds.includes(subjectId));
  return matchesType && matchesPath && matchesSubject;
};

const hasPurchasedPackageAccess = async (
  purchasedPackageIds: string[],
  contentType: string,
  pathId?: string,
  subjectId?: string,
) => {
  if (purchasedPackageIds.length === 0) {
    return false;
  }

  const packages = await CourseModel.find({
    _id: { $in: purchasedPackageIds },
    isPackage: true,
    isPublished: true,
    showOnPlatform: { $ne: false },
  }).select("_id pathId subjectId packageContentTypes includedCourses");

  return packages.some((pkg: any) => {
    const contentTypes = Array.isArray(pkg.packageContentTypes) && pkg.packageContentTypes.length
      ? pkg.packageContentTypes
      : ["courses"];
    return matchesContentScope(
      {
        contentTypes,
        pathIds: pkg.pathId ? [String(pkg.pathId)] : [],
        subjectIds: pkg.subjectId ? [String(pkg.subjectId)] : [],
      },
      contentType,
      pathId,
      subjectId,
    );
  });
};

const hasSchoolPackageAccess = async (
  user: any,
  contentType: string,
  pathId?: string,
  subjectId?: string,
) => {
  const schoolId = String(user.schoolId || "");
  const userId = String(user.id || user._id || "");
  if (!schoolId || !userId) {
    return false;
  }

  const packages = await B2BPackageModel.find({ schoolId, status: "active" });
  const packageIds = packages.map((pkg: any) => String(pkg.id || pkg._id || "")).filter(Boolean);
  if (packageIds.length === 0) return false;

  const grants = await AccessGrantModel.find({
    userId,
    packageId: { $in: packageIds },
    status: "active",
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: Date.now() } }],
  }).select("contentTypes pathIds subjectIds").lean();

  return grants.some((grant: any) => matchesContentScope(grant, contentType, pathId, subjectId));
};

const getPackageContentTypeForQuizSource = (source?: string) => {
  if (source === "mock-exam") return "mockExams";
  if (source === "training") return "banks";
  if (source === "tests") return "tests";
  if (source === "foundation") return "foundation";
  if (source === "course") return "courses";
  return "";
};

const getLearningSlotForQuizSource = (source?: string) => {
  if (source === "training") return "training";
  if (source === "tests") return "tests";
  if (source === "foundation") return "foundation";
  if (source === "course") return "course";
  return "";
};

const getQuizPlacementAccessType = (quiz: any, source?: string) => {
  const slot = getLearningSlotForQuizSource(source);
  if (!slot) return "inherit";

  const placement = (Array.isArray(quiz.learningPlacements) ? quiz.learningPlacements : []).find(
    (item: any) => item?.slot === slot && item?.isVisible !== false,
  );

  return placement?.accessType || "inherit";
};

const getPaidQuizPackageContentTypes = (quiz: any, source?: string) => {
  if (quiz?.mockExam?.enabled === true) {
    return ["mockExams"];
  }

  const sourceContentType = getPackageContentTypeForQuizSource(source);
  if (sourceContentType) {
    return [sourceContentType];
  }

  const visibleSlots = new Set(
    (Array.isArray(quiz.learningPlacements) ? quiz.learningPlacements : [])
      .filter((placement: any) => placement?.isVisible !== false)
      .filter((placement: any) => !placement?.accessType || placement.accessType === "inherit" || placement.accessType === "paid")
      .map((placement: any) => String(placement?.slot || ""))
      .filter(Boolean),
  );
  const hasTrainingSlot =
    visibleSlots.has("training") ||
    quiz.showInTraining === true ||
    quiz.placement === "training" ||
    quiz.placement === "both" ||
    quiz.type === "bank";
  const hasTestSlot =
    visibleSlots.has("tests") ||
    quiz.showInMock === true ||
    quiz.placement === "mock" ||
    quiz.placement === "both" ||
    !hasTrainingSlot;

  const contentTypes = [];
  if (hasTrainingSlot) contentTypes.push("banks");
  if (hasTestSlot) contentTypes.push("tests");
  return contentTypes.length ? contentTypes : ["tests"];
};

const isQuizTargetedToLearner = (quiz: any, user?: any) => {
  const targetUserIds = new Set((quiz.targetUserIds || []).map(String));
  const targetGroupIds = new Set((quiz.targetGroupIds || []).map(String));
  const hasExplicitTarget = targetUserIds.size > 0 || targetGroupIds.size > 0;

  if (!hasExplicitTarget) {
    return true;
  }
  if (!user) {
    return false;
  }

  const userGroupIds = uniqueStrings([
    ...(user.groupIds || []).map(String),
    ...(user.schoolId ? [String(user.schoolId)] : []),
  ]);
  return (
    targetUserIds.has(String(user.id || user._id)) ||
    userGroupIds.some((groupId: string) => targetGroupIds.has(groupId))
  );
};

/**
 * Directed assessments must protect their definition as well as submission.
 * The client-side catalog is only a convenience layer; this check reloads the
 * learner and verifies group membership from the database before questions
 * can be returned from a direct URL.
 */
const resolveDirectedQuizReadAccess = async (quiz: any, authUser?: any) => {
  const targetUserIds = uniqueStrings(quiz.targetUserIds || []);
  const targetGroupIds = uniqueStrings(quiz.targetGroupIds || []);
  if (targetUserIds.length === 0 && targetGroupIds.length === 0) {
    return { allowed: true as const };
  }

  if (!authUser) {
    return { allowed: false as const, status: StatusCodes.UNAUTHORIZED };
  }

  const user = await resolveAuthUserByAuthId(String(authUser.id || ""));
  if (!user) {
    return { allowed: false as const, status: StatusCodes.UNAUTHORIZED };
  }
  if (isStaffRole(user.role)) {
    return { allowed: true as const };
  }

  const userId = String(user.id || user._id || "");
  if (targetUserIds.includes(userId)) {
    return { allowed: true as const };
  }
  if (targetGroupIds.length === 0) {
    return { allowed: false as const, status: StatusCodes.FORBIDDEN };
  }

  const matchingGroup = await GroupModel.findOne({
    $and: [buildDocumentsByIdsQuery(targetGroupIds), { studentIds: userId }],
  }).select("_id").lean();
  return matchingGroup
    ? { allowed: true as const }
    : { allowed: false as const, status: StatusCodes.FORBIDDEN };
};

const canSubmitQuiz = async (quiz: any, user: any, source?: string) => {
  if (isStaffRole(user.role)) {
    return true;
  }

  const isApproved = quiz.approvalStatus === "approved" || !quiz.approvalStatus;
  const isDirectedToLearner = isQuizTargetedToLearner(quiz, user);
  // A school-directed assessment is intentionally excluded from the public
  // catalogue. It remains available to its verified audience only.
  const isVisible = quiz.isPublished && isApproved && (quiz.showOnPlatform !== false || isDirectedToLearner);
  if (!isVisible) {
    return false;
  }

  const pathId = String(quiz.pathId || "");
  if (pathId) {
    const activePathIds = await getActivePathIds();
    if (!activePathIds.includes(pathId)) {
      return false;
    }
  }

  if (!isDirectedToLearner) {
    return false;
  }

  const userGroupIds = uniqueStrings([
    ...(user.groupIds || []).map(String),
    ...(user.schoolId ? [String(user.schoolId)] : []),
  ]);
  const hasExplicitTarget = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;

  const placementAccessType = getQuizPlacementAccessType(quiz, source);
  const accessType = placementAccessType !== "inherit" ? placementAccessType : quiz.access?.type || "free";
  if (accessType === "free") {
    return true;
  }

  if (user.subscription?.plan === "premium") {
    return true;
  }

  if (accessType === "private") {
    const allowedGroupIds = new Set((quiz.access?.allowedGroupIds || []).map(String));
    const matchesAllowedGroup =
      allowedGroupIds.size === 0 || userGroupIds.some((groupId: string) => allowedGroupIds.has(groupId));
    return hasExplicitTarget || matchesAllowedGroup;
  }

  const subjectId = String(quiz.subjectId || "");
  const purchasedPackageIds = (user.subscription?.purchasedPackages || []).map(String);

  if (accessType === "course_only") {
    return (
      (await hasPurchasedPackageAccess(purchasedPackageIds, "courses", pathId, subjectId)) ||
      (await hasSchoolPackageAccess(user, "courses", pathId, subjectId))
    );
  }

  const packageContentTypes = getPaidQuizPackageContentTypes(quiz, source);
  for (const contentType of packageContentTypes) {
    if (
      (await hasPurchasedPackageAccess(purchasedPackageIds, contentType, pathId, subjectId)) ||
      (await hasSchoolPackageAccess(user, contentType, pathId, subjectId))
    ) {
      return true;
    }
  }

  return false;
};

export const quizRouter = Router();

quizRouter.use((req, _res, next) => {
  if (req.method !== "GET") {
    clearPublicQuizListCache();
    clearQuestionBankSummaryCache();
  }
  next();
});

quizRouter.use(questionBankRouter);
quizRouter.use(quizAnalyticsRouter);
quizRouter.use(adaptiveTelemetryRouter);

quizRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const canUsePublicCache = !req.authUser;
    const learnerAudienceUser =
      req.authUser && !isStaffRole(req.authUser.role)
        ? await resolveAuthUserByAuthId(String(req.authUser.id || ""))
        : req.authUser;
    // Group membership is authoritative in Group.studentIds for legacy and
    // school-managed users; hydrate it before applying directed catalog
    // filtering so an assigned learner is not hidden from the UI.
    let learnerAudienceForCatalog = learnerAudienceUser;
    if (learnerAudienceUser && !isStaffRole(learnerAudienceUser.role)) {
      const learnerRecord = learnerAudienceUser as any;
      const learnerId = String(learnerRecord.id || learnerRecord._id || "");
      if (learnerId) {
        const learnerGroups = await GroupModel.find({ studentIds: learnerId }).select("id _id").lean();
        const membershipGroupIds = learnerGroups.flatMap((group: any) => [group.id, group._id].filter(Boolean).map(String));
        learnerAudienceForCatalog = {
          ...(typeof learnerRecord.toObject === "function" ? learnerRecord.toObject() : learnerRecord),
          groupIds: uniqueStrings([...(learnerRecord.groupIds || []), ...membershipGroupIds]),
        };
      }
    }
    const requestedPathId = typeof req.query.pathId === "string" ? req.query.pathId.trim() : "";
    const requestedSubjectId = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
    const requestedPage = typeof req.query.page === "string" ? req.query.page.trim() : "1";
    const requestedLimit = typeof req.query.limit === "string" ? req.query.limit.trim() : "200";
    const noTotal = ["true", "1", "yes", "on"].includes(String(req.query.noTotal || "").trim().toLowerCase());
    const publicQuizListCacheKey = [
      requestedPage || "1",
      requestedLimit || "200",
      requestedPathId || "all-paths",
      requestedSubjectId || "all-subjects",
      noTotal ? "no-total" : "with-total",
    ].join(":");

    if (
      canUsePublicCache &&
      publicQuizListCache &&
      publicQuizListCache.key === publicQuizListCacheKey &&
      publicQuizListCache.expiresAt > Date.now()
    ) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.setHeader("X-Quiz-List-Cache", "hit");
      return res.json(publicQuizListCache.payload);
    }

    const learnerAudienceRecord = learnerAudienceForCatalog as any;
    const learnerAudienceIds = uniqueStrings([
      ...(learnerAudienceRecord?.groupIds || []).map(String),
      ...(learnerAudienceRecord?.schoolId ? [String(learnerAudienceRecord.schoolId)] : []),
    ]);
    const learnerId = learnerAudienceRecord
      ? String(learnerAudienceRecord.id || learnerAudienceRecord._id || "")
      : "";
    const directedAudienceFilter = learnerId
      ? {
          $or: [
            { targetUserIds: learnerId },
            ...(learnerAudienceIds.length ? [{ targetGroupIds: { $in: learnerAudienceIds } }] : []),
          ],
        }
      : null;
    let baseFilter: Record<string, any> = isStaffRole(req.authUser?.role)
      ? {}
      : {
          isPublished: true,
          $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
          $and: [
            {
              $or: [
                { showOnPlatform: { $ne: false } },
                ...(directedAudienceFilter ? [directedAudienceFilter] : []),
              ],
            },
          ],
        };
    if (req.authUser?.role === "supervisor") {
      const supervisorScope = await resolveSupervisorSchoolReportScope(req.authUser);
      const { students: scopedStudents } = await resolveScopedStudents(req.authUser, { limit: 5000 });
      const scopedStudentIds = scopedStudents.map((student: any) => String(student.id || student._id || ""));
      const scopedGroupIds = uniqueStrings([...supervisorScope.groupIds, ...supervisorScope.schoolIds]);
      const authUserId = String(req.authUser.id || "");
      baseFilter = {
        $or: [
          { createdBy: authUserId },
          { ownerId: authUserId },
          ...(supervisorScope.schoolIds.length ? [{ ownerId: { $in: supervisorScope.schoolIds } }] : []),
          ...(scopedGroupIds.length ? [{ targetGroupIds: { $in: scopedGroupIds } }] : []),
          ...(scopedStudentIds.length ? [{ targetUserIds: { $in: scopedStudentIds } }] : []),
        ],
      };
    }
    const managedScope = await resolveManagedContentScope(req.authUser);
    const scopeFilter: Record<string, unknown> = {};
    if (requestedPathId) scopeFilter.pathId = requestedPathId;
    if (requestedSubjectId) scopeFilter.subjectId = requestedSubjectId;
    const visibleFilter = await withLearnerVisiblePaths(baseFilter, req.authUser);
    const filter = combineMongoFilters(
      visibleFilter,
      scopeFilter,
      buildManagedContentScopeFilter(managedScope),
    );
    const pagination = resolvePagination(req.query, { limit: 200 });
    const rawItems = await QuizModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(noTotal ? pagination.limit + 1 : pagination.limit)
      .lean();
    const hasMore = noTotal && rawItems.length > pagination.limit;
    const items = noTotal ? rawItems.slice(0, pagination.limit) : rawItems;
    const total = noTotal
      ? pagination.skip + items.length + (hasMore ? 1 : 0)
      : await QuizModel.countDocuments(filter);
    let safeItems = items;

    if (!isStaffRole(req.authUser?.role) && items.length > 0) {
      const allQuestionIds = uniqueStrings(items.flatMap((quiz: any) => getQuizQuestionIds(quiz).map(String)));
      const questions = allQuestionIds.length
        ? await QuestionModel.find(buildDocumentsByIdsQuery(allQuestionIds)).select("id text imageUrl options type").lean()
        : [];
      const usableById = new Map<string, boolean>();
      questions.forEach((question: any) => {
        const canonicalId = String(question.id || question._id);
        const usable = isQuestionContentUsable(question);
        usableById.set(canonicalId, usable);
        const withoutCopySuffix = canonicalId.replace(/_copy(?:_\d+)?$/i, "");
        if (withoutCopySuffix && withoutCopySuffix !== canonicalId) {
          usableById.set(withoutCopySuffix, usable);
        }
      });

      safeItems = items
        .filter(
          (quiz: any) =>
            isQuizTargetedToLearner(quiz, learnerAudienceForCatalog) &&
            getQuizQuestionIds(quiz).some((questionId: string) => usableById.get(String(questionId)) === true),
        )
        .map((quiz: any) => {
          const hasExplicitTarget = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
          return hasExplicitTarget ? { ...quiz, viewerAudienceVerified: true } : quiz;
        });
    }

    const payload = {
      quizzes: safeItems,
      pagination: buildPaginatedResponse(
        [],
        pagination,
        isStaffRole(req.authUser?.role)
          ? total
          : (noTotal ? pagination.skip + safeItems.length + (hasMore ? 1 : 0) : safeItems.length),
      ),
    };
    res.setHeader("X-Has-More", String(hasMore));
    if (canUsePublicCache) {
      publicQuizListCache = {
        key: publicQuizListCacheKey,
        expiresAt: Date.now() + PUBLIC_QUIZ_LIST_CACHE_TTL_MS,
        payload,
      };
      res.setHeader("Cache-Control", "private, max-age=30");
      res.setHeader("X-Quiz-List-Cache", "miss");
    }
    res.json(payload);
  }),
);

quizRouter.get(
  "/results",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = quizResultsListQuerySchema.parse(req.query);
    const includeReview = String(req.query.includeReview || "").toLowerCase() === "true";
    const canUseShortCache = !includeReview && query.noTotal;
    const cacheKey = buildQuizResultsCacheKey(req.authUser!.id, req.originalUrl || req.url || "/results", includeReview);
    if (canUseShortCache) {
      const cached = quizResultsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.setHeader("X-Quiz-Results-Cache", "hit");
        return res.json(cached.payload);
      }
      if (cached) {
        quizResultsCache.delete(cacheKey);
      }
      res.setHeader("X-Quiz-Results-Cache", "miss");
    }
    const pagination = resolvePagination(query, { page: query.page, limit: query.limit });
    const filter: Record<string, unknown> = { userId: req.authUser!.id };
    if (query.quizId) {
      filter.quizId = query.quizId;
    }
    if (query.status) {
      filter.passed = query.status === "passed";
    }
    if (query.search) {
      filter.quizTitle = { $regex: escapeRegex(query.search), $options: "i" };
    }
    const createdAtRange: Record<string, Date> = {};
    const dateFrom = parseDateFilter(query.dateFrom);
    const dateTo = parseDateFilter(query.dateTo);
    if (dateFrom) {
      createdAtRange.$gte = dateFrom;
    }
    if (dateTo) {
      createdAtRange.$lte = dateTo;
    }
    if (Object.keys(createdAtRange).length > 0) {
      filter.createdAt = createdAtRange;
    }
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: sortDirection };
    if (query.sortBy !== "createdAt") {
      sort.createdAt = -1;
    }
    const projection = includeReview
      ? null
      : "id userId quizId quizTitle score passed attemptNumber source totalQuestions correctAnswers wrongAnswers unanswered timeSpentSeconds timeSpent date skillsAnalysis sectionResults createdAt updatedAt";
    const resultsQuery = QuizResultModel.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit);
    if (projection) {
      resultsQuery.select(projection);
    }
    const items = serializeQuizResultsForLearner(await resolveCompatibleQuizResultList(await resultsQuery.lean() as Record<string, unknown>[]));
    const total = query.noTotal
      ? pagination.skip + items.length + (items.length === pagination.limit ? 1 : 0)
      : await QuizResultModel.countDocuments(filter);
    const payload = {
      results: items,
      pagination: buildPaginatedResponse([], pagination, total),
    };
    if (canUseShortCache) {
      quizResultsCache.set(cacheKey, {
        expiresAt: Date.now() + QUIZ_RESULTS_CACHE_TTL_MS,
        payload,
      });
      trimQuizResultsCacheIfNeeded();
    }
    res.json(payload);
  }),
);

quizRouter.get(
  "/results/scoped",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = quizResultsListQuerySchema.parse(req.query);
    const authUser = await resolveAuthUserByAuthId(String(req.authUser!.id || ""));

    if (!authUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const pagination = resolvePagination(query, { page: query.page, limit: query.limit });
    const includeReview = String(req.query.includeReview || "").toLowerCase() === "true";
    const projection = includeReview
      ? null
      : "id userId quizId quizTitle score passed attemptNumber source totalQuestions correctAnswers wrongAnswers unanswered timeSpentSeconds timeSpent date skillsAnalysis sectionResults createdAt updatedAt pathId subjectId sectionId";
    const { students, totalStudents, managedPathIds, managedSubjectIds } = await resolveScopedStudents(authUser, {
      limit: Math.max(pagination.limit, 200),
    });
    const studentIds = students.map((student) => idOf(student));
    const studentById = new Map(students.map((student) => [idOf(student), student]));

    const scopedFilter: Record<string, unknown> = {};
    if (query.quizId) {
      scopedFilter.quizId = query.quizId;
    }
    if (query.status) {
      scopedFilter.passed = query.status === "passed";
    }
    if (query.search) {
      scopedFilter.quizTitle = { $regex: escapeRegex(query.search), $options: "i" };
    }
    const scopedCreatedAtRange: Record<string, Date> = {};
    const scopedDateFrom = parseDateFilter(query.dateFrom);
    const scopedDateTo = parseDateFilter(query.dateTo);
    if (scopedDateFrom) {
      scopedCreatedAtRange.$gte = scopedDateFrom;
    }
    if (scopedDateTo) {
      scopedCreatedAtRange.$lte = scopedDateTo;
    }
    if (Object.keys(scopedCreatedAtRange).length > 0) {
      scopedFilter.createdAt = scopedCreatedAtRange;
    }
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: sortDirection };
    if (query.sortBy !== "createdAt") {
      sort.createdAt = -1;
    }

    let results: any[] = [];
    let selectedStudentIds = studentIds;
    if (query.studentId) {
      selectedStudentIds = studentIds.includes(query.studentId) ? [query.studentId] : [];
    }
    if (selectedStudentIds.length) {
      const scopedResultsQuery = QuizResultModel.find({
        userId: { $in: selectedStudentIds },
        ...scopedFilter,
      })
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit);
      if (projection) {
        scopedResultsQuery.select(projection);
      }
      results = serializeQuizResultsForLearner(await resolveCompatibleQuizResultList(await scopedResultsQuery.lean() as Record<string, unknown>[]));
    }
    const total = selectedStudentIds.length
      ? (query.noTotal
        ? pagination.skip + results.length + (results.length === pagination.limit ? 1 : 0)
        : await QuizResultModel.countDocuments({
            userId: { $in: selectedStudentIds },
            ...scopedFilter,
          }))
      : 0;
    results = filterResultsByManagedContentScope(results, authUser.role, managedPathIds, managedSubjectIds);

    return res.json({
      scope: {
        role: authUser.role,
        studentCount: totalStudents,
        sampledStudentCount: students.length,
        resultCount: results.length,
      },
      pagination: buildPaginatedResponse([], pagination, total),
      results: results.map((result) => {
        const student = studentById.get(String(result.userId || ""));
        return {
          ...result,
          studentName: student?.name || "",
          studentEmail: student?.email || "",
          studentSchoolId: student?.schoolId || undefined,
          studentGroupIds: student?.groupIds || [],
        };
      }),
    });
  }),
);

quizRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const documentQuery = buildDocumentQuery(req.params.id);
    const legacyQuiz = await QuizModel.findOne(documentQuery).lean();

    if (!legacyQuiz) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    const directedReadAccess = await resolveDirectedQuizReadAccess(legacyQuiz, req.authUser);
    if (!directedReadAccess.allowed) {
      return res.status(directedReadAccess.status).json({
        message: directedReadAccess.status === StatusCodes.UNAUTHORIZED
          ? "Authentication required"
          : "This quiz is not assigned to you",
      });
    }

    const assessmentId = String(legacyQuiz.id || legacyQuiz._id || "");
    const version = assessmentId ? await findLatestPublishedAssessmentVersion(assessmentId) : null;
    const quiz = resolveAssessmentDefinitionRead(legacyQuiz, version);

    const questionIds = getQuizQuestionIds(quiz);
    let questions: any[] = [];
    if (questionIds.length > 0) {
      const rawQuestions = await QuestionModel.find(buildDocumentsByIdsQuery(questionIds)).lean();
      const isLearner = req.authUser?.role === "student" || !req.authUser;
      questions = questionIds
        .map((qid) => rawQuestions.find((q: any) => String(q.id || q._id) === qid || String(q._id) === qid))
        .filter(Boolean)
        .map((q: any) => (isLearner ? sanitizeQuestionForLearner(q) : q));
    }

    return res.json({
      ...quiz,
      questions,
    });
  }),
);

quizRouter.get(
  "/results/latest",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await QuizResultModel.findOne({ userId: req.authUser!.id }).sort({ createdAt: -1 }).lean();

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No quiz results found" });
    }

    const readerMode = await findAssessmentResultReaderMode(String(item.quizId || ""));
    const assessmentResult = shouldReadAssessmentCompatibilityProjection(readerMode)
      ? await findAssessmentResultByLegacyId(String(item._id))
      : null;
    return res.json(serializeQuizResultForLearner(resolveAssessmentResultRead(item as Record<string, unknown>, assessmentResult)));
  }),
);

/**
 * GET /api/quizzes/results/section-analytics/:quizId
 * ─────────────────────────────────────────────────────────────────────────────
 * تقرير إجمالي لأداء جميع الطلاب في كل قسم من أقسام محاكٍ معين.
 * للمدير والمشرف فقط.
 *
 * الاستجابة:
 *   {
 *     quizId, quizTitle,
 *     totalAttempts,
 *     sections: [{ sectionId, sectionName, avgScore, passRate, attempts }]
 *   }
 */
quizRouter.get(
  "/results/section-analytics/:quizId",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const quizId = String(req.params.quizId || "").trim();
    if (!quizId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "quizId is required" });
    }

    const quiz = await QuizModel.findOne(buildDocumentQuery(quizId))
      .select("id title mockExam")
      .lean();

    if (!quiz) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    if (!(quiz as any).mockExam?.enabled) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Section analytics are only available for mock exams",
      });
    }

    const authUser = await resolveAuthUserByAuthId(String(req.authUser!.id || ""));
    if (!authUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const { students } = authUser.role === "admin"
      ? { students: [] as any[] }
      : await resolveScopedStudents(authUser, { limit: 1000 });
    const scopedStudentIds = students.map((student) => idOf(student));

    // Scope aggregate input to the same authoritative student relationship used
    // by school reports; never aggregate every attempt for a supervisor request.
    const results = authUser.role === "admin" || scopedStudentIds.length
      ? await QuizResultModel.find({
      quizId,
      ...(authUser.role === "admin" ? {} : { userId: { $in: scopedStudentIds } }),
      sectionResults: { $exists: true, $ne: [] },
    })
      .select("sectionResults score passed")
      .lean()
      : [];

    const totalAttempts = results.length;

    // بناء خريطة إحصائيات لكل قسم
    const sectionMap = new Map<
      string,
      { name: string; scoreSum: number; passCount: number; count: number }
    >();

    for (const result of results) {
      const sections = (result as any).sectionResults || [];
      for (const sec of sections) {
        const id = String(sec.sectionId);
        if (!sectionMap.has(id)) {
          sectionMap.set(id, { name: sec.sectionName || id, scoreSum: 0, passCount: 0, count: 0 });
        }
        const entry = sectionMap.get(id)!;
        entry.scoreSum += Number(sec.score || 0);
        entry.passCount += sec.score >= 60 ? 1 : 0;
        entry.count += 1;
      }
    }

    const sections = Array.from(sectionMap.entries()).map(([sectionId, data]) => ({
      sectionId,
      sectionName: data.name,
      attempts: data.count,
      avgScore: data.count > 0 ? Math.round(data.scoreSum / data.count) : 0,
      passRate: data.count > 0 ? Math.round((data.passCount / data.count) * 100) : 0,
    }));

    return res.json({
      quizId,
      quizTitle: String((quiz as any).title || ""),
      totalAttempts,
      sections,
    });
  }),
);


quizRouter.post(
  "/",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = normalizeQuizPlacementPayload(quizSchema.parse(req.body));
    
    // Auto-fill supervisor defaults if needed
    if (req.authUser?.role === "supervisor") {
      if (!payload.mode) payload.mode = "central";
      if ((!payload.targetGroupIds || payload.targetGroupIds.length === 0) && (!payload.targetUserIds || payload.targetUserIds.length === 0)) {
        const scope = await resolveSupervisorSchoolReportScope(req.authUser);
        payload.targetGroupIds = uniqueStrings([...scope.groupIds, ...scope.schoolIds]);
      }
    }

    if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
      const inlineQuestionIds = await processInlineQuestions(req.body.questions, payload.pathId, payload.subjectId, req.authUser, (document) => QuestionModel.create(document));
      payload.questionIds = uniqueStrings([...(payload.questionIds || []), ...inlineQuestionIds]);
    }

    await assertManagedContentScope(req.authUser!, payload);
    await assertSupervisorDirectedQuizScope(req.authUser!, payload);
    const resolvedSkillIds = await resolveQuizSkillIds(getQuizQuestionIds(payload));
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const hasQuestions = getQuizQuestionIds(payload).length > 0;
    const willBePublished = resolveQuizPublicationState({
      role: req.authUser?.role,
      requestedPublished: payload.isPublished,
      hasQuestions,
    });
    
    if (willBePublished) {
      const integrity = await validateQuizQuestionIntegrity(payload);
      if (!integrity.ok) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: integrity.message,
          integrity: {
            totalReferenced: integrity.totalReferenced,
            resolved: integrity.resolved,
            missingIds: integrity.missingIds.slice(0, 20),
            invalidContentIds: integrity.invalidContentIds.slice(0, 20),
          },
        });
      }
    }

    const quizId = String(payload.id || `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
    const created = await QuizModel.create(buildQuizCreateDocument({
      payload,
      quizId,
      workflowDefaults,
      isPowerRole: req.authUser?.role === "admin" || req.authUser?.role === "supervisor",
      resolvedSkillIds,
      willBePublished,
    }));
    if (created.isPublished) {
      await publishAssessmentVersion({
        assessmentId: String(created.id || created._id),
        definition: created.toObject(),
        publishedBy: String(req.authUser!.id),
      });
    }
    res.status(StatusCodes.CREATED).json(created);
  }),
);

const handleQuizUpdate = asyncHandler(async (req, res) => {
  const payload = quizSchema.partial().parse(req.body);
  const documentQuery = buildOwnedDocumentQuery(req.params.id, req.authUser!);
  const existing = await QuizModel.findOne(documentQuery);

  if (!existing) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
  }

  // `assessmentData` contains independent rollout controls. PATCHing one must
  // not silently reset another (for example, reader cutover must not disable
  // an already-approved post-legacy mirror).
  if (payload.assessmentData) {
    payload.assessmentData = {
      ...((existing.toObject() as Record<string, any>).assessmentData || {}),
      ...payload.assessmentData,
    };
  }

  if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
    const nextPathId = String(payload.pathId || existing.pathId || "").trim();
    const nextSubjectId = String(payload.subjectId || existing.subjectId || "").trim();
    const inlineQuestionIds = await processInlineQuestions(req.body.questions, nextPathId, nextSubjectId, req.authUser, (document) => QuestionModel.create(document));
    const existingQuestionIds = Array.isArray(existing.questionIds) ? existing.questionIds : [];
    payload.questionIds = uniqueStrings([...existingQuestionIds, ...(payload.questionIds || []), ...inlineQuestionIds]);
  }

  await assertManagedContentScope(req.authUser!, {
    ...existing.toObject(),
    ...payload,
  });
  await assertSupervisorDirectedQuizScope(req.authUser!, {
    ...existing.toObject(),
    ...payload,
  });
  const resolvedSkillIds = payload.questionIds || payload.mockExam
    ? await resolveQuizSkillIds(getQuizQuestionIds({ ...existing.toObject(), ...payload }))
    : undefined;
  const normalizedPayload = normalizeQuizPlacementPayload(payload, String(existing.type || "quiz"));
  const sanitizedPayload = sanitizeWorkflowUpdate(
    buildQuizUpdateDocument(normalizedPayload as Record<string, unknown>, resolvedSkillIds),
    req.authUser!,
    { respectPublished: true },
  );
  const nextQuizState = buildQuizValidationState(
    existing.toObject() as Record<string, unknown>,
    normalizedPayload as Record<string, unknown>,
    sanitizedPayload,
  );
  if (nextQuizState.isPublished === true) {
    const integrity = await validateQuizQuestionIntegrity(nextQuizState);
    if (!integrity.ok) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: integrity.message,
        integrity: {
          totalReferenced: integrity.totalReferenced,
          resolved: integrity.resolved,
          missingIds: integrity.missingIds.slice(0, 20),
          invalidContentIds: integrity.invalidContentIds.slice(0, 20),
        },
      });
    }
  }
  const updated = await QuizModel.findOneAndUpdate(documentQuery, sanitizedPayload, { new: true });
  if (updated?.isPublished) {
    await publishAssessmentVersion({
      assessmentId: String(updated.id || updated._id),
      definition: updated.toObject(),
      publishedBy: String(req.authUser!.id),
    });
  }
  return res.json(updated);
});

quizRouter.patch("/:id", requireAuth, requireRole(["admin", "teacher", "supervisor"]), handleQuizUpdate);
quizRouter.put("/:id", requireAuth, requireRole(["admin", "teacher", "supervisor"]), handleQuizUpdate);

quizRouter.post(
  "/:id/questions",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const documentQuery = buildOwnedDocumentQuery(req.params.id, req.authUser!);
    const existing = await QuizModel.findOne(documentQuery);
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    await assertManagedContentScope(req.authUser!, existing.toObject());

    const rawQuestions = Array.isArray(req.body.questions) ? req.body.questions : [req.body];
    const newQuestionIds = await processInlineQuestions(
      rawQuestions,
      String(existing.pathId || ""),
      String(existing.subjectId || ""),
      req.authUser,
      (document) => QuestionModel.create(document),
    );

    const existingQuestionIds = Array.isArray(existing.questionIds) ? existing.questionIds : [];
    const updatedQuestionIds = uniqueStrings([...existingQuestionIds, ...newQuestionIds]);

    const updated = await QuizModel.findOneAndUpdate(
      documentQuery,
      { questionIds: updatedQuestionIds },
      { new: true },
    );
    return res.json(updated);
  }),
);

quizRouter.post(
  "/:id/submit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = quizSubmitSchema.parse(req.body);
    const quiz = await QuizModel.findOne(buildDocumentQuery(req.params.id));

    if (!quiz) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    const authUser = await resolveAuthUserByAuthId(String(req.authUser!.id || ""));
    if (!authUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    // ── Security: re-validate group membership from DB for directed quizzes ──
    // JWT claims (authUser.groupIds) could be stale or spoofed, so we
    // look up actual group membership directly from GroupModel.
    const userId = String(authUser.id || authUser._id || "");
    const directedScope = buildQuizSubmissionDirectedScope({
      quiz,
      userId,
      isStaff: isStaffRole(authUser.role),
    });
    if (directedScope.requiresGroupMembershipCheck) {
      // Verify the student genuinely belongs to at least one targeted group from DB
      // Use $and to combine: group must be in targetGroupIds AND student must be in its studentIds
      const matchingGroup = await GroupModel.findOne({
        $and: [
          buildDocumentsByIdsQuery(directedScope.targetGroupIds),
          { studentIds: userId },
        ],
      }).select("_id").lean();
      if (!matchingGroup) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "This quiz is not assigned to you",
        });
      }
    }


    if (!(await canSubmitQuiz(quiz, authUser, payload.source))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot submit this quiz" });
    }

    const quizWindow = assertQuizSubmissionWindow({
      quiz,
      timeSpentSeconds: payload.timeSpentSeconds,
    });
    if (quizWindow.ok === false) {
      return res.status(quizWindow.status).json({ message: quizWindow.message });
    }

    const quizId = String(quiz.id || quiz._id);
    const maxAttempts = getQuizMaxAttempts(quiz);
    const previousAttempts = await QuizResultModel.countDocuments({
      userId: req.authUser!.id,
      quizId,
    });

    const attemptState = buildQuizSubmissionAttemptState({
      userId: req.authUser!.id,
      quizId,
      previousAttempts,
      maxAttempts,
    });
    if (attemptState.isLimitReached) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Quiz attempt limit reached",
        maxAttempts,
        attemptsUsed: previousAttempts,
      });
    }

    const { attemptNumber, submissionKey } = attemptState;
    const learningContext = await resolveQuizSubmissionLearningContext({
      quiz,
      learnerId: userId,
      learnerSchoolId: authUser.schoolId,
    });
    const questionIds = getQuizQuestionIds(quiz);
    const questions = questionIds.length ? await QuestionModel.find(buildDocumentsByIdsQuery(questionIds)) : [];
    const questionById = buildQuizQuestionLookup(questions);
    const orderedQuestions = resolveOrderedQuizQuestions(questionIds, questions);

    if (orderedQuestions.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Quiz has no valid questions" });
    }

    const skillIds = getQuizSubmissionSkillIds(orderedQuestions);
    const [skills, subjects, sections] = await Promise.all([
      skillIds.length
        ? SkillModel.find(buildDocumentsByIdsQuery(skillIds))
        : [],
      SubjectModel.find(),
      SectionModel.find(),
    ]);
    const { skillById, subjectNameById, sectionNameById } = buildQuizSubmissionReadModelContext({
      skills,
      subjects,
      sections,
    });

    const { correctAnswers, wrongAnswers, unanswered, skillStats, questionReview } =
      buildQuizSubmissionAnswerReview({ orderedQuestions, answers: payload.answers });

    const skillsAnalysis = buildQuizSubmissionSkillsAnalysis({
      skillStats,
      skillById,
      quiz,
      subjectNameById,
      sectionNameById,
    });

    const passingScore = getQuizPassingScore(quiz);
    const scoreSummary = buildQuizSubmissionScoreSummary({
      correctAnswers,
      wrongAnswers,
      unanswered,
      totalQuestions: orderedQuestions.length,
      passingScore,
    });
    const { totalQuestions, score, passed } = scoreSummary;
    // ── تحليل الأداء لكل قسم (للمحاكيات فقط) ─────────────────────────────
    const sectionResults = buildQuizSubmissionSectionResults({
      quiz,
      orderedQuestions,
      answers: payload.answers,
    });

    // ── بناء لقطة الاختبار ─────────────────────────────────────────────────
    // تُحفظ مع كل نتيجة لحماية بيانات التقارير إذا عُدِّل الاختبار لاحقاً
    const quizSnapshot = buildQuizSubmissionSnapshot({ quiz, passingScore, totalQuestions });

    let result;
    try {
      result = await QuizResultModel.create({
        ...buildQuizSubmissionResultDocument({
          userId: req.authUser!.id,
          quizId,
          quizTitle: String(quiz.title || "اختبار"),
          score,
          passed,
          attemptNumber,
          source: payload.source || "",
          ...learningContext,
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          unanswered,
          timeSpentSeconds: payload.timeSpentSeconds,
          skillsAnalysis,
          questionReview,
          sectionResults,
          submissionKey,
          quizSnapshot,
        }),
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "Quiz submission already processed",
          maxAttempts,
          attemptsUsed: attemptNumber,
        });
      }
      throw error;
    }

    // Legacy QuizResult is committed first and stays authoritative. The
    // mirror is opt-in and failure-contained, so this cannot turn an accepted
    // legacy submission into a failed HTTP response.
    await mirrorAssessmentSubmissionAfterLegacyResult({
      quiz,
      legacyResult: result,
      answers: payload.answers,
    });

    await runQuizSubmissionSideEffects({
      requestId: req.requestId,
      result,
      userId: req.authUser!.id,
      questionReview: questionReview.map((item) => ({
        questionId: String(item.questionId || ""),
        selectedOptionIndex:
          typeof item.selectedOptionIndex === "number" ? Number(item.selectedOptionIndex) : undefined,
        isCorrect: Boolean(item.isCorrect),
      })),
      questionById,
    });
    clearQuizResultsCache();
    return res.status(StatusCodes.CREATED).json(serializeQuizResultForLearner(result));
  }),
);

// ── Smart Question Suggest ─────────────────────────────────────────────────
// الاختيار الذكي التلقائي للأسئلة بناءً على المهارات والصعوبة
// يُستخدم من UnifiedQuizBuilder / MockExamManager لتوليد الأسئلة تلقائياً
quizRouter.get(
  "/smart-suggest",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const skillIds = String(req.query.skillIds || "").split(",").map(s => s.trim()).filter(Boolean);
    const pathId   = String(req.query.pathId || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();
    const count    = Math.min(Math.max(Number(req.query.count || 10), 1), 100);
    const mode     = String(req.query.mode || "balanced"); // balanced | easy | hard

    if (!pathId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "pathId is required" });
    }

    // بناء الاستعلام الأساسي
    const baseQuery: Record<string, any> = {
      pathId,
      approvalStatus: "approved",
    };
    if (subjectId) baseQuery.subject = subjectId;
    if (skillIds.length > 0) baseQuery.skillIds = { $in: skillIds };

    // توزيع الصعوبة حسب mode
    const getDifficultyDistribution = (total: number, mode: string) => {
      if (mode === "easy") return { Easy: Math.ceil(total * 0.6), Medium: Math.ceil(total * 0.3), Hard: Math.floor(total * 0.1) };
      if (mode === "hard") return { Easy: Math.floor(total * 0.1), Medium: Math.ceil(total * 0.3), Hard: Math.ceil(total * 0.6) };
      // balanced (default): سهل 30% / متوسط 50% / صعب 20%
      return { Easy: Math.ceil(total * 0.3), Medium: Math.ceil(total * 0.5), Hard: Math.floor(total * 0.2) };
    };

    const dist = getDifficultyDistribution(count, mode);

    // جلب الأسئلة لكل مستوى صعوبة بالتوازي
    const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
      QuestionModel.find({ ...baseQuery, difficulty: "Easy" })
        .select("id text imageUrl options type difficulty skillIds subject sectionId")
        .limit(dist.Easy * 3) // نجلب أكثر ثم نختار عشوائياً
        .lean(),
      QuestionModel.find({ ...baseQuery, difficulty: "Medium" })
        .select("id text imageUrl options type difficulty skillIds subject sectionId")
        .limit(dist.Medium * 3)
        .lean(),
      QuestionModel.find({ ...baseQuery, difficulty: "Hard" })
        .select("id text imageUrl options type difficulty skillIds subject sectionId")
        .limit(dist.Hard * 3)
        .lean(),
    ]);

    // اختيار عشوائي من كل مجموعة
    const shuffleAndTake = (arr: any[], n: number) => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    };

    const selected = [
      ...shuffleAndTake(easyQuestions, dist.Easy),
      ...shuffleAndTake(mediumQuestions, dist.Medium),
      ...shuffleAndTake(hardQuestions, dist.Hard),
    ].sort(() => Math.random() - 0.5); // خلط نهائي

    return res.status(StatusCodes.OK).json({
      questions: selected,
      meta: {
        requested: count,
        returned: selected.length,
        distribution: {
          Easy: selected.filter((q: any) => q.difficulty === "Easy").length,
          Medium: selected.filter((q: any) => q.difficulty === "Medium").length,
          Hard: selected.filter((q: any) => q.difficulty === "Hard").length,
        },
        skillIds,
        mode,
      },
    });
  }),
);

quizRouter.get(
  "/integrity-report",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 50), 200));
    const quizzes = await QuizModel.find({ isPublished: true }).sort({ updatedAt: -1 }).limit(limit).lean();
    const issues: Array<Record<string, unknown>> = [];

    for (const quiz of quizzes) {
      const integrity = await validateQuizQuestionIntegrity(quiz);
      if (!integrity.ok) {
        issues.push({
          quizId: String(quiz.id || quiz._id || ""),
          title: String(quiz.title || ""),
          pathId: String(quiz.pathId || ""),
          subjectId: String(quiz.subjectId || ""),
          totalReferenced: integrity.totalReferenced,
          resolved: integrity.resolved,
          missingIds: integrity.missingIds,
          invalidContentIds: integrity.invalidContentIds,
        });
      }
    }

    res.json({
      scanned: quizzes.length,
      affected: issues.length,
      issues,
    });
  }),
);

quizRouter.post(
  "/integrity-repair",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const dryRun = req.query.dryRun !== "false";
    const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 1000));
    const quizzes = await QuizModel.find({ isPublished: true }).sort({ updatedAt: -1 }).limit(limit).lean();

    const actions: Array<Record<string, unknown>> = [];
    let scanned = 0;
    let affected = 0;
    let unpublished = 0;

    for (const quiz of quizzes) {
      scanned += 1;
      const integrity = await validateQuizQuestionIntegrity(quiz);
      if (integrity.ok) continue;
      affected += 1;

      const action = {
        quizId: String(quiz.id || quiz._id || ""),
        title: String(quiz.title || ""),
        pathId: String(quiz.pathId || ""),
        subjectId: String(quiz.subjectId || ""),
        totalReferenced: integrity.totalReferenced,
        resolved: integrity.resolved,
        missingIds: integrity.missingIds,
        invalidContentIds: integrity.invalidContentIds,
      };
      actions.push(action);

      if (!dryRun) {
        await QuizModel.updateOne(
          { _id: quiz._id },
          {
            $set: {
              isPublished: false,
              approvalStatus: "pending_review",
              reviewerNotes: [
                String(quiz.reviewerNotes || "").trim(),
                "Auto-unpublished by integrity-repair: missing/invalid question references.",
              ]
                .filter(Boolean)
                .join(" | "),
            },
          },
        );
        unpublished += 1;
      }
    }

    clearPublicQuizListCache();
    clearQuestionBankSummaryCache();

    res.json({
      dryRun,
      scanned,
      affected,
      unpublished,
      actions,
    });
  }),
);

quizRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await QuizModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await QuizModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ quizIds: { $in: deletedIds } }, { $pull: { quizIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

quizRouter.post(
  "/results",
  requireAuth,
  asyncHandler(async (req, res) => {
    await recordAdminAuditLog(req, {
      action: "quiz.direct_result.blocked",
      resourceType: "quiz-result",
      status: "blocked",
      metadata: { bodyKeys: Object.keys(req.body || {}) },
    });

    return res.status(StatusCodes.GONE).json({
      message: DIRECT_RESULT_DISABLED_MESSAGE,
    });
  }),
);
