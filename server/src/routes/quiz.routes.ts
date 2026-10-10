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
import { serializeQuizResultForLearner } from "../utils/quizResultSerialization.js";
import { getActivePathIds, isStaffRole, withLearnerVisiblePaths } from "../services/visibility.js";
import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";
import { validateQuizWindow, getQuizAvailability } from "../modules/quizzes/application/quizAvailability.js";
import { applyQuizViewerPolicy } from "../modules/quizzes/application/quizViewerPolicy.js";
import { quizRetakeRouter } from "../modules/quizzes/http/quizRetakeRoutes.js";
import { quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";
import { sanitizeQuestionForLearner } from "../modules/quizzes/presentation/questionPresentation.js";
import { hydrateQuestionPassages } from "../modules/quizzes/application/questionPassageHydration.js";
import { clearQuestionBankSummaryCache, questionBankRouter } from "../modules/quizzes/http/questionBankRoutes.js";
import { quizAnalyticsRouter } from "../modules/quizzes/http/quizAnalyticsRoutes.js";
import { quizResultsRouter } from "../modules/quizzes/http/quizResultsRoutes.js";
import { resolveScopedStudents, resolveSupervisorSchoolReportScope } from "../modules/quizzes/application/quizReportScope.js";
import { resolveAuthUserByAuthId } from "../modules/quizzes/application/quizUserLookup.js";
import { loadLearnerSafeQuizCatalogPage } from "../modules/quizzes/application/learnerQuizCatalog.js";
import { adaptiveTelemetryRouter } from "../modules/quizzes/http/adaptiveTelemetryRoutes.js";
import { adaptiveMasteryRouter } from "../modules/quizzes/http/adaptiveMasteryRoutes.js";
import { buildDocumentQuery, buildDocumentsByIdsQuery, buildOwnedDocumentQuery, uniqueStrings } from "../modules/quizzes/infrastructure/quizDocumentQuery.js";
import { clearQuizResultsCache } from "../modules/quizzes/infrastructure/quizResultsCache.js";
import { runQuizSubmissionSideEffects } from "../modules/quizzes/application/quizSubmissionSideEffects.js";
import { validateQuizQuestionIntegrity } from "../modules/quizzes/application/quizQuestionIntegrity.js";
import { normalizeQuizPlacementPayload } from "../modules/quizzes/application/quizPlacement.js";
import { getQuizQuestionIds, resolveQuizSkillIds } from "../modules/quizzes/application/quizQuestionSelection.js";
import { getWorkflowDefaults, sanitizeWorkflowUpdate } from "../modules/quizzes/application/quizWorkflow.js";
import { resolveQuizPublicationState } from "../modules/quizzes/application/quizPublicationPolicy.js";
import { applyQuizCreatorRolePolicy, hasDirectedQuizTargets } from "../modules/quizzes/application/quizCreatorRolePolicy.js";
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
import { matchesManagedContentScope } from "../modules/quizzes/application/quizManagedContentScope.js";
import { resolveAssessmentDefinitionRead } from "../modules/quizzes/application/assessmentDefinitionReadAdapter.js";
import { findLatestPublishedAssessmentVersion, publishAssessmentVersion } from "../modules/quizzes/infrastructure/assessmentVersionRepository.js";
import { mirrorAssessmentSubmissionAfterLegacyResult } from "../modules/quizzes/application/assessmentSubmissionMirror.js";
import { ensureQuestionRevisions } from "../services/questionRevision.js";
import { assertSupervisorDirectedQuizScope, assertTeacherDirectedQuizScope, canSubmitQuiz, resolveDirectedQuizReadAccess } from "../modules/quizzes/application/quizAccessPolicy.js";
import {
  assertManagedContentScope,
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../services/managedContentScope.js";

const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;
let publicQuizListCache:
  | {
      key: string;
      expiresAt: number;
      payload: unknown;
    }
  | null = null;
const clearPublicQuizListCache = () => {
  publicQuizListCache = null;
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
quizRouter.use(quizResultsRouter);
quizRouter.use(adaptiveTelemetryRouter);
quizRouter.use(adaptiveMasteryRouter);
quizRouter.use(quizRetakeRouter);

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
    const staffViewer = isStaffRole(req.authUser?.role);
    let safeItems: any[] = [];
    let total = 0;
    let hasMore = false;

    if (staffViewer) {
      const rawItems = await QuizModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(noTotal ? pagination.limit + 1 : pagination.limit)
        .lean();
      hasMore = noTotal && rawItems.length > pagination.limit;
      safeItems = noTotal ? rawItems.slice(0, pagination.limit) : rawItems;
      total = noTotal
        ? pagination.skip + safeItems.length + (hasMore ? 1 : 0)
        : await QuizModel.countDocuments(filter);
    } else {
      const learnerPage = await loadLearnerSafeQuizCatalogPage({
        filter,
        page: pagination.page,
        limit: pagination.limit,
        noTotal,
        learnerAudience: learnerAudienceForCatalog,
      });
      safeItems = learnerPage.items;
      total = learnerPage.total;
      hasMore = learnerPage.hasMore;
    }

    const payload = {
      quizzes: await applyQuizViewerPolicy(safeItems, req.authUser),
      pagination: buildPaginatedResponse([], pagination, total),
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
    const [quiz] = await applyQuizViewerPolicy([resolveAssessmentDefinitionRead(legacyQuiz, version)], req.authUser);
    if (!isStaffRole(req.authUser?.role) && getQuizAvailability(quiz) !== "available") {
      return res.json({ ...quiz, questions: [] });
    }

    const questionIds = getQuizQuestionIds(quiz);
    let questions: any[] = [];
    if (questionIds.length > 0 && req.query.includeQuestions !== "false") {
      const rawQuestions = await QuestionModel.find(buildDocumentsByIdsQuery(questionIds)).lean();
      const hydratedQuestions = await hydrateQuestionPassages(rawQuestions as Array<Record<string, any>>);
      const isLearner = req.authUser?.role === "student" || !req.authUser;
      questions = questionIds
        .map((qid) => hydratedQuestions.find((q: any) => String(q.id || q._id) === qid || String(q._id) === qid))
        .filter(Boolean)
        .map((q: any) => (isLearner ? sanitizeQuestionForLearner(q) : q));
    }

    return res.json({
      ...quiz,
      questions,
    });
  }),
);

quizRouter.post(
  "/",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    let payload = normalizeQuizPlacementPayload(quizSchema.parse(req.body));
    validateQuizWindow(payload);
    
    // Auto-fill supervisor defaults if needed
    if (req.authUser?.role === "supervisor") {
      if (!payload.mode) payload.mode = "central";
      if ((!payload.targetGroupIds || payload.targetGroupIds.length === 0) && (!payload.targetUserIds || payload.targetUserIds.length === 0)) {
        const scope = await resolveSupervisorSchoolReportScope(req.authUser);
        payload.targetGroupIds = uniqueStrings([...scope.groupIds, ...scope.schoolIds]);
      }
    }

    payload = applyQuizCreatorRolePolicy(req.authUser!, payload);

    const isTeacherDirectedAssessment =
      req.authUser?.role === "teacher" && hasDirectedQuizTargets(payload);
    if (!isTeacherDirectedAssessment) {
      await assertManagedContentScope(req.authUser!, payload);
    }
    await assertSupervisorDirectedQuizScope(req.authUser!, payload);
    await assertTeacherDirectedQuizScope(req.authUser!, payload);

    if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
      const inlineQuestionIds = await processInlineQuestions(req.body.questions, payload.pathId, payload.subjectId, req.authUser, (document) => QuestionModel.create(document));
      payload.questionIds = uniqueStrings([...(payload.questionIds || []), ...inlineQuestionIds]);
    }
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
  let payload = quizSchema.partial().parse(req.body);
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

  const proposedState = {
    ...existing.toObject(),
    ...payload,
  };
  validateQuizWindow(proposedState);
  const isTeacherDirectedAssessment =
    req.authUser?.role === "teacher" && hasDirectedQuizTargets(proposedState);

  if (!isTeacherDirectedAssessment) {
    await assertManagedContentScope(req.authUser!, proposedState);
  }
  await assertSupervisorDirectedQuizScope(req.authUser!, proposedState);
  await assertTeacherDirectedQuizScope(req.authUser!, proposedState);

  if (Array.isArray(req.body.questions) && req.body.questions.length > 0) {
    const nextPathId = String(payload.pathId || existing.pathId || "").trim();
    const nextSubjectId = String(payload.subjectId || existing.subjectId || "").trim();
    const inlineQuestionIds = await processInlineQuestions(req.body.questions, nextPathId, nextSubjectId, req.authUser, (document) => QuestionModel.create(document));
    const existingQuestionIds = Array.isArray(existing.questionIds) ? existing.questionIds : [];
    payload.questionIds = uniqueStrings([...existingQuestionIds, ...(payload.questionIds || []), ...inlineQuestionIds]);
  }

  const resolvedSkillIds = payload.questionIds || payload.mockExam
    ? await resolveQuizSkillIds(getQuizQuestionIds({ ...existing.toObject(), ...payload }))
    : undefined;
  const normalizedPayload = normalizeQuizPlacementPayload(payload, String(existing.type || "quiz"));
  const roleScopedPayload = applyQuizCreatorRolePolicy(req.authUser!, {
    ...normalizedPayload,
    ...(isTeacherDirectedAssessment
      ? {
          targetGroupIds: proposedState.targetGroupIds || [],
          targetUserIds: proposedState.targetUserIds || [],
        }
      : {}),
  });
  const sanitizedPayload = sanitizeWorkflowUpdate(
    buildQuizUpdateDocument(roleScopedPayload as Record<string, unknown>, resolvedSkillIds),
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

    const existingState = existing.toObject();
    const isTeacherDirectedAssessment =
      req.authUser?.role === "teacher" && hasDirectedQuizTargets(existingState);
    if (!isTeacherDirectedAssessment) {
      await assertManagedContentScope(req.authUser!, existingState);
    }
    await assertSupervisorDirectedQuizScope(req.authUser!, existingState);
    await assertTeacherDirectedQuizScope(req.authUser!, existingState);

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

    const [viewerQuiz] = await applyQuizViewerPolicy([quiz.toObject()], req.authUser);
    const quizWindow = assertQuizSubmissionWindow({
      quiz: viewerQuiz,
      timeSpentSeconds: payload.timeSpentSeconds,
    });
    if (quizWindow.ok === false) {
      return res.status(quizWindow.status).json({ message: quizWindow.message });
    }

    const quizId = String(quiz.id || quiz._id);
    const maxAttempts = getQuizMaxAttempts(viewerQuiz);
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
    const skillDocumentQuery = buildDocumentsByIdsQuery(skillIds);
    const [skills, subjects, sections] = await Promise.all([
      skillIds.length
        ? SkillModel.find({
            $or: [
              ...(Array.isArray((skillDocumentQuery as any).$or) ? (skillDocumentQuery as any).$or : []),
              { "subSkills.id": { $in: skillIds } },
            ],
          })
        : [],
      SubjectModel.find(),
      SectionModel.find(),
    ]);
    const { skillById, subjectNameById, sectionNameById } = buildQuizSubmissionReadModelContext({
      skills,
      subjects,
      sections,
    });

    const { correctAnswers, wrongAnswers, unanswered, skillStats, questionReview: rawQuestionReview } =
      buildQuizSubmissionAnswerReview({ orderedQuestions, answers: payload.answers });
    const questionRevisions = await ensureQuestionRevisions(orderedQuestions).catch((error) => {
      console.warn("[quiz-submit] question revision mirror failed; preserving legacy result path", {
        requestId: req.requestId || "",
        quizId,
        reason: error instanceof Error ? error.message : String(error || "unknown"),
      });
      return new Map<string, { revisionId: string; revisionHash: string }>();
    });
    const questionReview = rawQuestionReview.map((item) => ({
      ...item,
      ...(questionRevisions.get(String(item.questionId || "")) || {}),
    }));

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
    const quizSnapshot = buildQuizSubmissionSnapshot({ quiz: viewerQuiz, passingScore, totalQuestions });

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
