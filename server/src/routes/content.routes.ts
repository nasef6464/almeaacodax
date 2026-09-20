import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TopicModel } from "../models/Topic.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { CourseModel } from "../models/Course.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { GroupModel } from "../models/Group.js";
import { B2BPackageModel } from "../models/B2BPackage.js";
import { AccessCodeModel } from "../models/AccessCode.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { StudyPlanModel } from "../models/StudyPlan.js";
import { AnnouncementAdModel } from "../models/AnnouncementAd.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { getActivePathIds, isStaffRole } from "../services/visibility.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { lessonSchema, librarySchema, libraryUpdateSchema, topicSchema, topicUpdateSchema } from "../modules/content/http/learningContentSchemas.js";
import { accessCodeRedemptionsListQuerySchema, accessCodeSchema, accessCodesListQuerySchema, b2bPackageSchema, groupSchema, schoolImportSchema, schoolRelationSchema } from "../modules/content/http/schoolOperationsSchemas.js";
import { interventionStudyPlanSchema, studyPlanSchema } from "../modules/content/http/studyPlanSchemas.js";
import { sanitizeLessonResourcePayload } from "../modules/content/domain/learningResourceUrl.js";
import { contentPresentationRouter } from "../modules/content/http/contentPresentationRoutes.js";
import { contentPlatformIntegrationRouter } from "../modules/content/http/contentPlatformIntegrationRoutes.js";
import { contentPlatformIntegrationRuntimeRouter } from "../modules/content/http/contentPlatformIntegrationRuntimeRoutes.js";
import { resolveContentBootstrapRequest } from "../modules/content/application/contentBootstrapRequest.js";
import { buildContentBootstrapVisibilityFilters } from "../modules/content/application/contentBootstrapVisibility.js";
import { buildContentBootstrapPayload } from "../modules/content/application/contentBootstrapPayload.js";
import { resolveContentBootstrapCache } from "../modules/content/application/contentBootstrapCache.js";
import {
  getScopedContentBootstrapOperationalData,
  PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT,
} from "../modules/content/infrastructure/contentBootstrapOperationalData.js";
import { getAuthorizedStudentIdsForSchoolStaffActor } from "../modules/schools/application/schoolStaffStudentAuthority.js";
import { ensureCanonicalParentRelationship } from "../services/parentAuthorityService.js";
import {
  assertManagedContentScope,
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../services/managedContentScope.js";

const sanitizeLessonPayload = sanitizeLessonResourcePayload;

const reviewQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  type: z.enum(["course", "lesson", "question", "quiz", "library"]).optional(),
  search: z.string().trim().max(120).optional(),
});

const reviewDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewerNotes: z.string().trim().max(2000).default(""),
  publish: z.boolean().optional(),
});

const buildDocumentQuery = (value: string) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return { $or: [{ id: value }, { _id: value }] };
  }

  return { id: value };
};

const CONTENT_BOOTSTRAP_CACHE_TTL_MS = 3 * 60 * 1000;
const CONTENT_BOOTSTRAP_MINIMAL_CACHE_TTL_MS = 3 * 60 * 1000;
type PublicContentBootstrapPayload = {
  topics: unknown[];
  lessons: unknown[];
  libraryItems: unknown[];
  groups: unknown[];
  b2bPackages: unknown[];
  accessCodes: unknown[];
  announcementAds: unknown[];
  studyPlans: unknown[];
};
type ContentBootstrapCachePayload = PublicContentBootstrapPayload;
type ContentBootstrapCacheEntry = { expiresAt: number; payload: ContentBootstrapCachePayload };
const contentBootstrapScopeSchema = z.enum(["full", "learning", "operations"]).default("full");
const contentBootstrapPhaseSchema = z.enum(["full", "core"]).default("full");
let contentBootstrapCache = new Map<string, ContentBootstrapCacheEntry>();
let contentBootstrapPromises = new Map<string, Promise<ContentBootstrapCachePayload>>();
const publicContentBootstrapPromise = contentBootstrapPromises;
let contentBootstrapMinimalCache:
  | {
      expiresAt: number;
      payload: PublicContentBootstrapPayload;
    }
  | null = null;
let contentBootstrapMinimalPromise: Promise<PublicContentBootstrapPayload> | null = null;

const clearContentBootstrapCache = () => {
  contentBootstrapCache.clear();
  contentBootstrapPromises.clear();
  contentBootstrapMinimalCache = null;
  contentBootstrapMinimalPromise = null;
};

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

const getModelDocumentId = (document: { id?: unknown; _id?: unknown }) => String(document.id || document._id || "");

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(values.map((value) => String(value || "").trim()));
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const buildOwnedDocumentQuery = (
  value: string,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const baseQuery = buildDocumentQuery(value);

  if (authUser.role === "admin") {
    return baseQuery;
  }

  const ownershipConditions: Array<Record<string, string>> = [
    { ownerId: authUser.id },
    { createdBy: authUser.id },
    { assignedTeacherId: authUser.id },
  ];

  if (authUser.schoolId) {
    ownershipConditions.push({ ownerId: authUser.schoolId }, { createdBy: authUser.schoolId });
  }

  return { $and: [baseQuery, { $or: ownershipConditions }] };
};

const getWorkflowDefaults = (authUser?: { id: string; role: string; schoolId?: string | null }) => {
  if (!authUser) {
    return {};
  }

  if (authUser.role === "admin") {
    return {
      ownerType: "platform",
      ownerId: authUser.id,
      createdBy: authUser.id,
      approvalStatus: "approved",
      approvedBy: authUser.id,
      approvedAt: Date.now(),
    };
  }

  if (authUser.role === "teacher") {
    return {
      ownerType: "teacher",
      ownerId: authUser.id,
      createdBy: authUser.id,
      assignedTeacherId: authUser.id,
      approvalStatus: "pending_review",
      approvedBy: "",
      approvedAt: null,
    };
  }

  return {
    ownerType: "school",
    ownerId: authUser.schoolId || authUser.id,
    createdBy: authUser.id,
    approvalStatus: "pending_review",
    approvedBy: "",
    approvedAt: null,
  };
};

const sanitizeWorkflowUpdate = (
  payload: Record<string, unknown>,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const nextPayload = { ...payload };

  if (authUser.role !== "admin") {
    delete nextPayload.ownerType;
    delete nextPayload.ownerId;
    delete nextPayload.createdBy;
    delete nextPayload.approvedBy;
    delete nextPayload.approvedAt;
    delete nextPayload.reviewerNotes;
    delete nextPayload.revenueSharePercentage;
    if (typeof nextPayload.approvalStatus === "string" && nextPayload.approvalStatus === "approved") {
      nextPayload.approvalStatus = "pending_review";
    }
  } else if (typeof nextPayload.approvalStatus === "string") {
    if (nextPayload.approvalStatus === "approved") {
      nextPayload.approvedBy = authUser.id;
      nextPayload.approvedAt = Date.now();
    } else if (nextPayload.approvalStatus === "rejected" || nextPayload.approvalStatus === "pending_review") {
      nextPayload.approvedBy = "";
      nextPayload.approvedAt = null;
    }
  }

  return nextPayload;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDateToTimestamp = (value?: string) => {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildPaginationMeta = (total: number, page: number, limit: number) => {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

const normalizeAccessCodeResponse = (code: any) => ({
  id: String(code.id || code._id || ""),
  code: String(code.code || ""),
  schoolId: String(code.schoolId || ""),
  packageId: String(code.packageId || ""),
  maxUses: Number(code.maxUses || 0),
  currentUses: Number(code.currentUses || 0),
  expiresAt: Number(code.expiresAt || 0),
  createdAt: Number(code.createdAt || 0),
});

type SupervisorManagementScope = {
  schoolIds: string[];
  classIds: string[];
};

const resolveSupervisorManagementScope = async (authUser: { id: string }): Promise<SupervisorManagementScope> => {
  const user = await UserModel.findById(authUser.id).select("schoolId groupIds role").lean();
  if (!user) {
    return { schoolIds: [], classIds: [] };
  }

  const managedGroupIds = uniqueStrings([...(user.groupIds || []).map(String)]);
  const [seedGroups, directlySupervisedGroups] = await Promise.all([
    managedGroupIds.length
      ? GroupModel.find(buildDocumentsByIdsQuery(managedGroupIds)).select("id _id parentId type")
      : Promise.resolve([]),
    GroupModel.find({ supervisorIds: authUser.id }).select("id _id parentId type"),
  ]);

  const schoolIds = uniqueStrings([
    String(user.schoolId || ""),
    ...directlySupervisedGroups
      .filter((group) => group.type === "SCHOOL")
      .map((group) => String(group.id || group._id)),
    ...seedGroups.filter((group) => group.type === "SCHOOL").map((group) => String(group.id || group._id)),
  ]);
  const classIds = uniqueStrings([
    ...directlySupervisedGroups
      .filter((group) => group.type === "CLASS")
      .map((group) => String(group.id || group._id)),
    ...seedGroups.filter((group) => group.type === "CLASS").map((group) => String(group.id || group._id)),
  ]);

  return {
    schoolIds: schoolIds.filter(Boolean),
    classIds: classIds.filter(Boolean),
  };
};

const assertSchoolManagementScope = async (
  authUser: { id: string; role: string },
  school: { id?: string; _id?: unknown; supervisorIds?: unknown[] },
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const schoolId = String(school.id || school._id || "");
  if (!schoolId) {
    return false;
  }

  const { schoolIds } = await resolveSupervisorManagementScope({ id: authUser.id });
  if (schoolIds.includes(schoolId)) {
    return true;
  }

  const supervisorIds = Array.isArray(school.supervisorIds) ? school.supervisorIds.map(String) : [];
  return supervisorIds.includes(String(authUser.id));
};

const hasTopicManagementScope = (
  authUser: { role: string; managedPathIds?: string[]; managedSubjectIds?: string[] },
  topic: { pathId?: unknown; subjectId?: unknown },
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const topicPathId = String(topic.pathId || "");
  const topicSubjectId = String(topic.subjectId || "");
  const managedPathIds = Array.isArray(authUser.managedPathIds) ? authUser.managedPathIds.map(String) : [];
  const managedSubjectIds = Array.isArray(authUser.managedSubjectIds) ? authUser.managedSubjectIds.map(String) : [];

  return managedPathIds.includes(topicPathId) || managedSubjectIds.includes(topicSubjectId);
};

const hasGroupManagementScope = async (
  authUser: { id: string; role: string },
  group: { id?: string; _id?: unknown; type?: unknown; parentId?: unknown; ownerId?: unknown; supervisorIds?: unknown[] },
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const groupId = String(group.id || group._id || "");
  const parentId = String(group.parentId || "");
  const ownerId = String(group.ownerId || "");
  const supervisorIds = Array.isArray(group.supervisorIds) ? group.supervisorIds.map(String) : [];

  if (ownerId && ownerId === String(authUser.id)) {
    return true;
  }

  if (supervisorIds.includes(String(authUser.id))) {
    return true;
  }

  if (authUser.role === "supervisor") {
    const { schoolIds, classIds } = await resolveSupervisorManagementScope({ id: authUser.id });
    if (String(group.type || "") === "SCHOOL" && schoolIds.includes(groupId)) {
      return true;
    }
    if (schoolIds.includes(parentId)) {
      return true;
    }
    if (classIds.includes(groupId) || classIds.includes(parentId)) {
      return true;
    }
  }

  return false;
};

const hasSchoolIdManagementScope = async (
  authUser: { id: string; role: string },
  schoolId: string,
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const { schoolIds } = await resolveSupervisorManagementScope({ id: authUser.id });
  return schoolIds.includes(String(schoolId || ""));
};

type GroupCreatePayload = z.infer<typeof groupSchema>;

type ScopedGroupCreateResult =
  | { ok: true; payload: GroupCreatePayload }
  | { ok: false; statusCode: number; message: string };

const buildScopedGroupCreatePayload = async (
  authUser: { id: string; role: string },
  payload: GroupCreatePayload,
): Promise<ScopedGroupCreateResult> => {
  if (authUser.role === "admin") {
    return { ok: true, payload };
  }

  if (payload.type === "SCHOOL") {
    return {
      ok: false,
      statusCode: StatusCodes.FORBIDDEN,
      message: "Only admins can create schools",
    };
  }

  const parentId = String(payload.parentId || "");
  if (!parentId) {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Group parent is required",
    };
  }

  const parentGroup = await GroupModel.findOne(buildDocumentQuery(parentId));
  if (!parentGroup) {
    return {
      ok: false,
      statusCode: StatusCodes.NOT_FOUND,
      message: "Parent group not found",
    };
  }

  if (payload.type === "CLASS" && parentGroup.type !== "SCHOOL") {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Classes must belong to a school",
    };
  }

  if (payload.type === "PRIVATE_GROUP" && parentGroup.type !== "SCHOOL" && parentGroup.type !== "CLASS") {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Private groups must belong to a school or class",
    };
  }

  const canManageParentGroup = await hasGroupManagementScope(authUser, parentGroup as any);
  if (!canManageParentGroup) {
    return {
      ok: false,
      statusCode: StatusCodes.FORBIDDEN,
      message: "You cannot create a group under this school",
    };
  }

  return {
    ok: true,
    payload: {
      name: payload.name,
      type: payload.type,
      parentId,
      ownerId: String(authUser.id),
      supervisorIds: uniqueStrings([String(authUser.id)]),
      studentIds: [],
      courseIds: [],
      metadata: payload.metadata || {},
    },
  };
};

export const contentRouter = Router();

contentRouter.use((req, _res, next) => {
  if (req.method !== "GET") {
    clearContentBootstrapCache();
  }
  next();
});

contentRouter.use(contentPresentationRouter);
contentRouter.use(contentPlatformIntegrationRouter);
contentRouter.use(contentPlatformIntegrationRuntimeRouter);

contentRouter.get(
  "/review-queue",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const query = reviewQueueQuerySchema.parse(req.query);
    const search = query.search ? new RegExp(escapeRegExp(query.search), "i") : null;
    const types = query.type ? [query.type] : ["course", "lesson", "question", "quiz", "library"] as const;
    const definitions: Record<string, { model: any; title: string }> = {
      course: { model: CourseModel, title: "$title" },
      lesson: { model: LessonModel, title: "$title" },
      question: { model: QuestionModel, title: "$text" },
      quiz: { model: QuizModel, title: "$title" },
      library: { model: LibraryItemModel, title: "$title" },
    } as const;
    const pending = await Promise.all(types.map(async (type) => {
      const definition = definitions[type];
      const filter: Record<string, unknown> = { approvalStatus: "pending_review" };
      if (search) filter.$or = type === "question" ? [{ text: search }] : [{ title: search }];
      const items = await definition.model.find(filter)
        .select("_id id title text ownerId createdBy assignedTeacherId pathId subjectId subject approvalStatus updatedAt")
        .lean();
      return items.map((item: any) => ({
        id: String(item.id || item._id), type, title: String(item.title || item.text || "عنصر بلا عنوان"),
        ownerId: String(item.assignedTeacherId || item.ownerId || item.createdBy || ""),
        pathId: String(item.pathId || ""), subjectId: String(item.subjectId || item.subject || ""),
        approvalStatus: "pending_review", updatedAt: item.updatedAt || null,
      }));
    }));
    const allItems = pending.flat().sort((left: any, right: any) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
    const skip = (query.page - 1) * query.limit;
    return res.json({ items: allItems.slice(skip, skip + query.limit), pagination: buildPaginationMeta(allItems.length, query.page, query.limit) });
  }),
);

contentRouter.patch(
  "/review-queue/:type/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const type = z.enum(["course", "lesson", "question", "quiz", "library"]).parse(req.params.type);
    const payload = reviewDecisionSchema.parse(req.body);
    const models: Record<string, any> = { course: CourseModel, lesson: LessonModel, question: QuestionModel, quiz: QuizModel, library: LibraryItemModel };
    const model = models[type];
    const item = await model.findOne(buildDocumentQuery(req.params.id));
    if (!item) return res.status(StatusCodes.NOT_FOUND).json({ message: "Review item not found" });
    const update: Record<string, unknown> = {
      approvalStatus: payload.decision,
      reviewerNotes: payload.reviewerNotes,
      approvedBy: req.authUser!.id,
      approvedAt: Date.now(),
    };
    if (payload.decision === "rejected") {
      update.isPublished = false;
      update.showOnPlatform = false;
    } else if (type !== "question" && payload.publish === true) {
      update.isPublished = true;
      update.showOnPlatform = true;
    }
    const updated = await model.findOneAndUpdate({ _id: item._id }, update, { new: true });
    return res.json({ item: updated, decision: payload.decision });
  }),
);

contentRouter.get(
  "/bootstrap/minimal",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    if (contentBootstrapMinimalCache && contentBootstrapMinimalCache.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=180");
      res.setHeader("X-Content-Minimal-Cache", "hit");
      return res.json(contentBootstrapMinimalCache.payload);
    }

    if (contentBootstrapMinimalPromise) {
      const payload = await contentBootstrapMinimalPromise;
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=180");
      res.setHeader("X-Content-Minimal-Cache", "shared");
      return res.json(payload);
    }

    const loadMinimalPayload = async (): Promise<PublicContentBootstrapPayload> => {
      const announcementAds = await AnnouncementAdModel.find({ isActive: true, audience: { $in: ["all", "guest"] } })
        .sort({ priority: -1, createdAt: -1 })
        .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT)
        .lean();

      return {
        topics: [],
        lessons: [],
        libraryItems: [],
        groups: [],
        b2bPackages: [],
        accessCodes: [],
        announcementAds,
        studyPlans: [],
      };
    };

    const payload = await (contentBootstrapMinimalPromise = loadMinimalPayload().finally(() => {
      contentBootstrapMinimalPromise = null;
    }));
    contentBootstrapMinimalCache = {
      expiresAt: Date.now() + CONTENT_BOOTSTRAP_MINIMAL_CACHE_TTL_MS,
      payload,
    };
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=180");
    res.setHeader("X-Content-Minimal-Cache", "miss");
    return res.json(payload);
  }),
);

contentRouter.get(
  "/bootstrap",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const requestedScope = contentBootstrapScopeSchema.parse(req.query.scope);
    const requestedPhase = contentBootstrapPhaseSchema.parse(req.query.phase);
    const canUseFullScope = isStaffRole(req.authUser?.role);
    const {
      scope,
      phase,
      isLearningCore,
      isOperationsOnly,
      includeOperationalData,
      includeStudyPlans,
      canUseSharedCache,
      cacheKey,
    } = resolveContentBootstrapRequest({
      requestedScope,
      requestedPhase,
      canUseFullScope,
      isAuthenticated: Boolean(req.authUser),
    });
    const loadBootstrapPayload = async (): Promise<PublicContentBootstrapPayload> => {
      const canSeeAllContent = isStaffRole(req.authUser?.role);
      const activePathIds = canSeeAllContent ? [] : await getActivePathIds();
      const { finalTopicFilter, finalLessonFilter, finalLibraryFilter } =
        buildContentBootstrapVisibilityFilters({ canSeeAllContent, activePathIds });
      const managedScope = await resolveManagedContentScope(req.authUser);
      const managedFilter = buildManagedContentScopeFilter(managedScope);

      const [topics, lessons, libraryItems, operationalData, studyPlans] = await Promise.all([
        isOperationsOnly ? Promise.resolve([]) : TopicModel.find(combineMongoFilters(finalTopicFilter, managedFilter)).sort({ subjectId: 1, order: 1 }).lean(),
        isOperationsOnly || isLearningCore ? Promise.resolve([]) : LessonModel.find(combineMongoFilters(finalLessonFilter, managedFilter)).sort({ createdAt: -1 }).lean(),
        isOperationsOnly || isLearningCore ? Promise.resolve([]) : LibraryItemModel.find(combineMongoFilters(finalLibraryFilter, managedFilter)).sort({ createdAt: -1 }).lean(),
        includeOperationalData
          ? getScopedContentBootstrapOperationalData(req.authUser)
          : Promise.resolve({ groups: [], b2bPackages: [], accessCodes: [], announcementAds: [] }),
        includeStudyPlans && req.authUser
          ? StudyPlanModel.find({ userId: req.authUser.id }).sort({ updatedAt: -1 }).lean()
          : Promise.resolve([]),
      ]);

      return buildContentBootstrapPayload({
        topics,
        lessons,
        libraryItems,
        operationalData,
        studyPlans,
      });
    };

    const { payload, cacheStatus } = await resolveContentBootstrapCache({
      cacheKey,
      canUseSharedCache,
      cache: contentBootstrapCache,
      pending: contentBootstrapPromises,
      ttlMs: CONTENT_BOOTSTRAP_CACHE_TTL_MS,
      load: loadBootstrapPayload,
    });

    if (cacheStatus) {
      res.setHeader("Cache-Control", req.authUser ? "private, max-age=120" : "public, max-age=120, stale-while-revalidate=180");
      res.setHeader("X-Content-Cache", cacheStatus);
    }
    res.setHeader("X-Content-Scope", scope);
    res.setHeader("X-Content-Phase", phase);
    res.json(payload);
  }),
);

contentRouter.post(
  "/study-plans/intervention",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = interventionStudyPlanSchema.parse(req.body);
    const authUser = req.authUser!;
    const studentLookup = mongoose.isValidObjectId(payload.studentId)
      ? { $or: [{ _id: payload.studentId }, { id: payload.studentId }] }
      : { id: payload.studentId };
    const student = await UserModel.findOne({
      role: "student",
      ...studentLookup,
    })
      .select("_id id name role schoolId groupIds")
      .lean();

    if (!student) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Student not found" });
    }

    const studentId = String((student as any).id || (student as any)._id);
    const authorizedStudentIds = await getAuthorizedStudentIdsForSchoolStaffActor(
      authUser,
      [student as any],
    );
    if (!authorizedStudentIds.has(studentId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this student" });
    }

    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 13);
    const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
    const now = Date.now();
    const studentName = payload.studentName || String((student as any).name || "الطالب");
    const skillName = payload.skillName || "المهارة الأضعف";
    const planId = `intervention_${studentId}_${payload.pathId}_${now}`;
    const plan = await StudyPlanModel.create({
      id: planId,
      userId: studentId,
      name: `خطة علاج ${skillName} - ${studentName}`,
      pathId: payload.pathId,
      subjectIds: payload.subjectId ? [payload.subjectId] : [],
      courseIds: [],
      startDate: toDateKey(today),
      endDate: toDateKey(end),
      skipCompletedQuizzes: true,
      offDays: [],
      dailyMinutes: payload.dailyMinutes,
      preferredStartTime: payload.preferredStartTime || "17:00",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return res.status(StatusCodes.CREATED).json({
      plan,
      message: "Intervention study plan created for the selected student.",
    });
  }),
);

contentRouter.post(
  "/study-plans",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.parse(req.body);
    const now = Date.now();
    const created = await StudyPlanModel.findOneAndUpdate(
      { id: payload.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        createdAt: payload.createdAt || now,
        updatedAt: now,
      },
      { new: true, upsert: true },
    );

    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.partial().parse(req.body);
    const updated = await StudyPlanModel.findOneAndUpdate(
      { id: req.params.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        updatedAt: Date.now(),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const deleted = await StudyPlanModel.findOneAndDelete({ id: req.params.id, userId: req.authUser!.id });

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/topics",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = topicSchema.parse(req.body);
    await assertManagedContentScope(req.authUser!, payload);
    const created = await TopicModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = topicUpdateSchema.parse(req.body);
    const existing = await TopicModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });

    const canManageTopic = hasTopicManagementScope(req.authUser!, existing as any);
    if (!canManageTopic) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this topic" });
    }

    const updated = await TopicModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await TopicModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    await assertManagedContentScope(req.authUser!, existing.toObject());

    const canManageTopic = hasTopicManagementScope(req.authUser!, existing as any);
    if (!canManageTopic) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this topic" });
    }

    const deleted = await TopicModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/lessons",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.parse(req.body));
    await assertManagedContentScope(req.authUser!, payload);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LessonModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.partial().parse(req.body));
    const existing = await LessonModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }
    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LessonModel.findOneAndUpdate({ _id: existing._id }, sanitizedPayload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await LessonModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await LessonModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ lessonIds: { $in: deletedIds } }, { $pull: { lessonIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/library-items",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = librarySchema.parse(req.body);
    await assertManagedContentScope(req.authUser!, payload);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LibraryItemModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = libraryUpdateSchema.parse(req.body);
    const existing = await LibraryItemModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }
    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LibraryItemModel.findOneAndUpdate(
      { _id: existing._id },
      sanitizedPayload,
      {
        new: true,
      },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await LibraryItemModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await LibraryItemModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ libraryItemIds: { $in: deletedIds } }, { $pull: { libraryItemIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/groups",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.parse(req.body);
    const createScope = await buildScopedGroupCreatePayload(req.authUser!, payload);
    if (createScope.ok === false) {
      return res.status(createScope.statusCode).json({ message: createScope.message });
    }

    const created = await GroupModel.create(createScope.payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.partial().parse(req.body);
    const existing = await GroupModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    const canManageGroup = await hasGroupManagementScope(req.authUser!, existing as any);
    if (!canManageGroup) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this group" });
    }

    const updated = await GroupModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await GroupModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    const canManageGroup = await hasGroupManagementScope(req.authUser!, existing as any);
    if (!canManageGroup) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this group" });
    }

    const groupId = existing.id || String(existing._id);
    const childClasses = existing.type === "SCHOOL"
      ? await GroupModel.find({ type: "CLASS", parentId: groupId }).select("id _id")
      : [];
    const deletedGroupIds = [
      groupId,
      String(existing._id),
      ...childClasses.flatMap((group: any) => [group.id, String(group._id)]),
    ].map((value) => String(value || "")).filter(Boolean);

    const deleted = await GroupModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    if (existing.type === "SCHOOL") {
      await Promise.all([
        GroupModel.deleteMany({ type: "CLASS", parentId: groupId }),
        UserModel.updateMany(
          { $or: [{ schoolId: { $in: deletedGroupIds } }, { groupIds: { $in: deletedGroupIds } }] },
          { $unset: { schoolId: "" }, $pull: { groupIds: { $in: deletedGroupIds } } },
        ),
        B2BPackageModel.deleteMany({ schoolId: { $in: deletedGroupIds } }),
        AccessCodeModel.deleteMany({ schoolId: { $in: deletedGroupIds } }),
      ]);
    } else {
      await Promise.all([
        UserModel.updateMany({ groupIds: { $in: deletedGroupIds } }, { $pull: { groupIds: { $in: deletedGroupIds } } }),
        GroupModel.updateMany({}, {
          $pull: {
            studentIds: { $in: deletedGroupIds },
            supervisorIds: { $in: deletedGroupIds },
          },
        }),
      ]);
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/b2b-packages",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.parse(req.body);
    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(payload.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }
    const created = await B2BPackageModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.partial().parse(req.body);
    const existing = await B2BPackageModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const updated = await B2BPackageModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await B2BPackageModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const deleted = await B2BPackageModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    await AccessCodeModel.deleteMany({ packageId: deleted.id || String(deleted._id) });
    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/access-codes",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.parse(req.body);
    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(payload.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }
    const created = await AccessCodeModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.partial().parse(req.body);
    const existing = await AccessCodeModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const updated = await AccessCodeModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await AccessCodeModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const deleted = await AccessCodeModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.get(
  "/schools/:id/report",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const pagination = resolvePagination(req.query, { limit: 200 });
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);
    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const schoolId = school.id || String(school._id);

    const studentFilter = { schoolId, role: "student" };
    const [classes, packages, codes, students, totalStudents, activeStudents] = await Promise.all([
      GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 }).lean(),
      B2BPackageModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      AccessCodeModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      UserModel.find(studentFilter).select("id _id groupIds isActive").sort({ createdAt: -1 }).lean(),
      UserModel.countDocuments(studentFilter),
      UserModel.countDocuments({ ...studentFilter, isActive: { $ne: false } }),
    ]);

    const studentIds = students.map(getModelDocumentId).filter(Boolean);
    const quizResultFilter = { userId: { $in: studentIds } };
    const [quizResults, quizResultTotal, quizResultStats, studentResultStats, skillResultStats] = studentIds.length
      ? await Promise.all([
          QuizResultModel.find(quizResultFilter)
            .select("userId score skillsAnalysis createdAt")
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean(),
          QuizResultModel.countDocuments(quizResultFilter),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $group: { _id: null, attempts: { $sum: 1 }, averageScore: { $avg: "$score" } } },
          ]),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $group: { _id: "$userId", attempts: { $sum: 1 }, scoreTotal: { $sum: "$score" } } },
          ]),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $unwind: "$skillsAnalysis" },
            {
              $group: {
                _id: {
                  skillId: "$skillsAnalysis.skillId",
                  skill: "$skillsAnalysis.skill",
                  subjectId: "$skillsAnalysis.subjectId",
                  sectionId: "$skillsAnalysis.sectionId",
                },
                attempts: { $sum: 1 },
                masteryTotal: { $sum: "$skillsAnalysis.mastery" },
              },
            },
          ]),
        ])
      : [[], 0, [], [], []];

    const aggregateStats = quizResultStats[0] as { attempts?: number; averageScore?: number } | undefined;
    const averageScore = aggregateStats?.attempts
      ? Math.round(Number(aggregateStats.averageScore) || 0)
      : 0;

    const weakSkillMap = new Map<
      string,
      {
        skillId?: string;
        skill: string;
        subjectId?: string;
        sectionId?: string;
        attempts: number;
        masteryTotal: number;
      }
    >();

    skillResultStats.forEach((item: any) => {
      const key = String(item?._id?.skillId || item?._id?.skill || item?._id?.sectionId || "unknown");
      weakSkillMap.set(key, {
        skillId: item?._id?.skillId,
        skill: String(item?._id?.skill || "مهارة غير مسماة"),
        subjectId: item?._id?.subjectId,
        sectionId: item?._id?.sectionId,
        attempts: Number(item?.attempts) || 0,
        masteryTotal: Number(item?.masteryTotal) || 0,
      });
    });

    const weakestSkills = Array.from(weakSkillMap.values())
      .map((item) => ({
        skillId: item.skillId,
        skill: item.skill,
        subjectId: item.subjectId,
        sectionId: item.sectionId,
        attempts: item.attempts,
        mastery: item.attempts > 0 ? Math.round(item.masteryTotal / item.attempts) : 0,
      }))
      .sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts)
      .slice(0, 8);

    const classSummaries = classes.map((group) => {
      const classId = getModelDocumentId(group);
      const classStudents = students.filter((student) => (student.groupIds || []).includes(classId));
      const classStudentIds = new Set(classStudents.map(getModelDocumentId).filter(Boolean));
      const classResults = studentResultStats.filter((result: any) => classStudentIds.has(String(result._id)));
      const classAttempts = classResults.reduce((sum: number, result: any) => sum + (Number(result.attempts) || 0), 0);
      const classScoreTotal = classResults.reduce((sum: number, result: any) => sum + (Number(result.scoreTotal) || 0), 0);
      const classAverageScore = classAttempts
        ? Math.round(classScoreTotal / classAttempts)
        : 0;

      return {
        id: classId,
        name: group.name,
        studentCount: classStudents.length,
        supervisorCount: Array.isArray(group.supervisorIds) ? group.supervisorIds.length : 0,
        quizAttempts: classAttempts,
        averageScore: classAverageScore,
      };
    });

    return res.json({
      school: {
        id: schoolId,
        name: school.name,
      },
      metrics: {
        totalStudents,
        activeStudents,
        totalClasses: classes.length,
        activePackages: packages.filter((pkg) => pkg.status === "active").length,
        activeCodes: codes.filter((code) => Number(code.expiresAt) > Date.now()).length,
        quizAttempts: quizResultTotal,
        sampledQuizAttempts: quizResults.length,
        averageScore,
      },
      classSummaries,
      weakestSkills,
      quizResultsPagination: buildPaginatedResponse([], pagination, quizResultTotal),
    });
  }),
);

contentRouter.post(
  "/schools/:id/import-students",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = schoolImportSchema.parse(req.body);
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);
    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const schoolId = school.id || String(school._id);
    const existingClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 });
    const classById = new Map(existingClasses.map((item) => [item.id || String(item._id), item]));
    const classByName = new Map(existingClasses.map((item) => [item.name.trim().toLowerCase(), item]));
    let currentSchoolClassIds = uniqueStrings(existingClasses.flatMap((item) => [item.id, String(item._id)]));
    const credentials: Array<{ name: string; email: string; password: string; className?: string }> = [];
    const importedUsers: any[] = [];

    for (const row of payload.rows) {
      let targetClass = row.classId ? classById.get(row.classId) : undefined;

      if (!targetClass && row.className?.trim()) {
        targetClass = classByName.get(row.className.trim().toLowerCase());
      }

      if (!targetClass && row.className?.trim()) {
        targetClass = await GroupModel.create({
          id: `class_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: row.className.trim(),
          type: "CLASS",
          parentId: schoolId,
          ownerId: req.authUser?.id,
          supervisorIds: [],
          studentIds: [],
          courseIds: [],
          createdAt: Date.now(),
          totalStudents: 0,
          totalSupervisors: 0,
          totalCourses: 0,
        });

        const createdClassId = targetClass.id || String(targetClass._id);
        classById.set(createdClassId, targetClass);
        classByName.set(targetClass.name.trim().toLowerCase(), targetClass);
        currentSchoolClassIds = uniqueStrings([...currentSchoolClassIds, createdClassId, String(targetClass._id)]);
      }

      const generatedPassword = row.password || `Nn@${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      const normalizedEmail = row.email.toLowerCase().trim();
      const classId = targetClass ? targetClass.id || String(targetClass._id) : undefined;
      const existingUser = await UserModel.findOne({ email: normalizedEmail }).select("groupIds").lean();
      const existingGroupIds = Array.isArray(existingUser?.groupIds) ? existingUser.groupIds.map(String) : [];
      const nextGroupIds = uniqueStrings([
        ...existingGroupIds.filter((id) => !currentSchoolClassIds.includes(id)),
        ...(classId ? [classId] : []),
      ]);

      const user = await UserModel.findOneAndUpdate(
        { email: normalizedEmail },
        {
          name: row.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "student",
          isActive: true,
          schoolId,
          groupIds: nextGroupIds,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      const studentId = user.id || String(user._id);
      const studentIdAliases = uniqueStrings([user.id, String(user._id)]);
      await GroupModel.updateMany(
        { type: "CLASS", parentId: schoolId },
        { $pull: { studentIds: { $in: studentIdAliases } } },
      );
      if (classId) {
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $addToSet: { studentIds: studentId } });
      }

      importedUsers.push(user);
      credentials.push({
        name: row.name.trim(),
        email: normalizedEmail,
        password: generatedPassword,
        className: targetClass?.name,
      });
    }

    const studentIds = importedUsers.map((user) => user.id || String(user._id));

    await GroupModel.findOneAndUpdate(
      buildDocumentQuery(schoolId),
      {
        $addToSet: { studentIds: { $each: studentIds } },
        $set: { totalStudents: await UserModel.countDocuments({ schoolId, role: "student" }) },
      },
      { new: true },
    );

    const latestClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId });
    await Promise.all(
      latestClasses.map(async (group) => {
        const classId = group.id || String(group._id);
        const count = await UserModel.countDocuments({ role: "student", groupIds: classId });
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $set: { totalStudents: count } });
      }),
    );

    const [updatedGroups, updatedUsers] = await Promise.all([
      GroupModel.find({
        $or: [{ _id: school._id }, { id: schoolId }, { parentId: schoolId }],
      }).sort({ createdAt: -1 }),
      UserModel.find({ schoolId }).select("-passwordHash").sort({ createdAt: -1 }),
    ]);

    return res.status(StatusCodes.CREATED).json({
      summary: {
        totalRows: payload.rows.length,
        imported: credentials.length,
        classesTouched: Array.from(
          new Set(credentials.map((item) => item.className).filter(Boolean)),
        ).length,
      },
      credentials,
      groups: updatedGroups,
      users: updatedUsers,
    });
  }),
);

contentRouter.get(
  "/access-codes",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const query = accessCodesListQuerySchema.parse(req.query);
    const safePage = Math.max(1, Number(query.page || 1));
    const safeLimit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const pagination = resolvePagination({ page: safePage, limit: safeLimit }, { page: safePage, limit: safeLimit });
    const authUser = req.authUser!;
    const filter: Record<string, unknown> = {};
    let scopedSchoolIds: string[] | null = null;

    if (authUser.role === "supervisor") {
      scopedSchoolIds = (await resolveSupervisorManagementScope({ id: authUser.id })).schoolIds;
      if (query.schoolId && !scopedSchoolIds.includes(query.schoolId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "School scope denied" });
      }
      filter.schoolId = query.schoolId ? query.schoolId : { $in: scopedSchoolIds };
    } else if (query.schoolId) {
      filter.schoolId = query.schoolId;
    }

    if (query.packageId) {
      filter.packageId = query.packageId;
    }

    if (query.search) {
      filter.code = { $regex: escapeRegExp(query.search), $options: "i" };
    }

    const createdAtFilter: Record<string, number> = {};
    const dateFrom = parseDateToTimestamp(query.dateFrom);
    const dateTo = parseDateToTimestamp(query.dateTo);
    if (dateFrom !== null) {
      createdAtFilter.$gte = dateFrom;
    }
    if (dateTo !== null) {
      createdAtFilter.$lte = dateTo;
    }
    if (Object.keys(createdAtFilter).length > 0) {
      filter.createdAt = createdAtFilter;
    }

    const now = Date.now();
    if (query.status === "active") {
      filter.$expr = {
        $and: [
          { $gt: ["$expiresAt", now] },
          { $lt: ["$currentUses", "$maxUses"] },
        ],
      };
    } else if (query.status === "expired") {
      filter.expiresAt = { $lte: now };
    } else if (query.status === "exhausted") {
      filter.$expr = { $gte: ["$currentUses", "$maxUses"] };
    }

    const direction = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: direction };
    if (query.sortBy !== "createdAt") {
      sort.createdAt = -1;
    }

    const [codes, total] = await Promise.all([
      AccessCodeModel.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
      AccessCodeModel.countDocuments(filter),
    ]);

    return res.json({
      data: codes.map(normalizeAccessCodeResponse),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

contentRouter.get(
  "/access-code-redemptions",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const query = accessCodeRedemptionsListQuerySchema.parse(req.query);
    const safePage = Math.max(1, Number(query.page || 1));
    const safeLimit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const pagination = resolvePagination({ page: safePage, limit: safeLimit }, { page: safePage, limit: safeLimit });
    const authUser = req.authUser!;
    const grantFilter: Record<string, unknown> = { sourceType: "access_code" };
    const accessCodeFilter: Record<string, unknown> = {};
    let shouldResolveScopedCodes = false;
    let scopedSchoolIds: string[] | null = null;

    if (authUser.role === "supervisor") {
      scopedSchoolIds = (await resolveSupervisorManagementScope({ id: authUser.id })).schoolIds;
      if (query.schoolId && !scopedSchoolIds.includes(query.schoolId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "School scope denied" });
      }
      accessCodeFilter.schoolId = query.schoolId ? query.schoolId : { $in: scopedSchoolIds };
      shouldResolveScopedCodes = true;
    } else if (query.schoolId) {
      accessCodeFilter.schoolId = query.schoolId;
      shouldResolveScopedCodes = true;
    }

    if (query.accessCodeId) {
      accessCodeFilter.$or = [
        { id: query.accessCodeId },
        { _id: mongoose.Types.ObjectId.isValid(query.accessCodeId) ? new mongoose.Types.ObjectId(query.accessCodeId) : null },
      ].filter((entry) => entry._id !== null) as Array<Record<string, unknown>>;
      if (!accessCodeFilter.$or || (accessCodeFilter.$or as unknown[]).length === 0) {
        accessCodeFilter.$or = [{ id: query.accessCodeId }];
      }
      shouldResolveScopedCodes = true;
    }

    if (query.userId) {
      grantFilter.userId = query.userId;
    }
    if (query.status) {
      grantFilter.status = query.status;
    }

    const grantedAtFilter: Record<string, number> = {};
    const dateFrom = parseDateToTimestamp(query.dateFrom);
    const dateTo = parseDateToTimestamp(query.dateTo);
    if (dateFrom !== null) {
      grantedAtFilter.$gte = dateFrom;
    }
    if (dateTo !== null) {
      grantedAtFilter.$lte = dateTo;
    }
    if (Object.keys(grantedAtFilter).length > 0) {
      grantFilter.grantedAt = grantedAtFilter;
    }

    if (shouldResolveScopedCodes) {
      const scopedCodes = await AccessCodeModel.find(accessCodeFilter).select("id _id schoolId packageId code").lean();
      const scopedAccessCodeIds = scopedCodes.map((code) => String(code._id));
      if (scopedAccessCodeIds.length === 0) {
        return res.json({
          data: [],
          pagination: buildPaginationMeta(0, pagination.page, pagination.limit),
        });
      }
      grantFilter["metadata.accessCodeId"] = { $in: scopedAccessCodeIds };
    }

    const direction = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: direction };
    if (query.sortBy !== "grantedAt") {
      sort.grantedAt = -1;
    }

    const [grants, total] = await Promise.all([
      AccessGrantModel.find(grantFilter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
      AccessGrantModel.countDocuments(grantFilter),
    ]);

    const accessCodeIds = Array.from(
      new Set(
        grants
          .map((grant) => String((grant as any)?.metadata?.accessCodeId || ""))
          .filter(Boolean),
      ),
    );
    const userIds = Array.from(new Set(grants.map((grant) => String((grant as any)?.userId || "")).filter(Boolean)));

    const [codes, users] = await Promise.all([
      accessCodeIds.length
        ? AccessCodeModel.find({ _id: { $in: accessCodeIds } }).select("id _id code schoolId packageId").lean()
        : Promise.resolve([]),
      userIds.length ? UserModel.find(buildDocumentsByIdsQuery(userIds)).select("id _id name email").lean() : Promise.resolve([]),
    ]);

    const codeById = new Map(codes.map((code) => [String(code._id), code]));
    const userById = new Map(users.map((user) => [String((user as any).id || user._id), user]));

    return res.json({
      data: grants.map((grant: any) => {
        const accessCodeId = String(grant?.metadata?.accessCodeId || "");
        const code = codeById.get(accessCodeId);
        const userItem = userById.get(String(grant.userId || ""));
        return {
          id: String(grant.id || grant._id || ""),
          userId: String(grant.userId || ""),
          userName: String(userItem?.name || ""),
          userEmail: String(userItem?.email || ""),
          accessCodeId,
          accessCode: String(code?.code || grant?.metadata?.accessCode || ""),
          schoolId: String(code?.schoolId || ""),
          packageId: String(code?.packageId || grant.packageId || ""),
          status: String(grant.status || ""),
          grantedBy: String(grant.grantedBy || ""),
          grantedAt: Number(grant.grantedAt || 0),
          expiresAt: typeof grant.expiresAt === "number" ? grant.expiresAt : null,
        };
      }),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

contentRouter.post(
  "/schools/:id/relations",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = schoolRelationSchema.parse(req.body);
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const schoolId = school.id || String(school._id);
    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);

    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const classes = await GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 });
    const classByName = new Map(classes.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
    const studentEmails = payload.rows.map((row) => row.studentEmail.trim().toLowerCase());
    const parentEmails = payload.rows.map((row) => String(row.parentEmail || "").trim().toLowerCase()).filter(Boolean);
    const supervisorEmails = payload.rows.map((row) => String(row.supervisorEmail || "").trim().toLowerCase()).filter(Boolean);
    const teacherEmails = payload.rows.map((row) => String(row.teacherEmail || "").trim().toLowerCase()).filter(Boolean);
    const allEmails = Array.from(new Set([...studentEmails, ...parentEmails, ...supervisorEmails, ...teacherEmails]));
    const users = await UserModel.find({ email: { $in: allEmails } });
    const usersByEmail = new Map(users.map((item) => [String(item.email || "").trim().toLowerCase(), item]));
    const credentials: Array<{ role: "parent" | "supervisor" | "teacher"; name: string; email: string; password: string; linkedTo: string }> = [];
    const summary = {
      rows: payload.rows.length,
      createdParents: 0,
      createdSupervisors: 0,
      createdTeachers: 0,
      linkedParents: 0,
      linkedSupervisors: 0,
      linkedTeachers: 0,
      assignedClasses: 0,
      missingStudents: 0,
      missingParents: 0,
      missingSupervisors: 0,
      missingTeachers: 0,
      missingClasses: 0,
      skippedRows: 0,
    };

    const createUserIfMissing = async (
      email: string,
      role: "parent" | "supervisor" | "teacher",
      name: string,
      linkedTo: string,
    ) => {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = usersByEmail.get(normalizedEmail);
      if (existing || !payload.createMissingUsers) return existing;

      const password = `Alm@${Math.random().toString(36).slice(2, 10)}`;
      const created = await UserModel.create({
        name,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        isActive: true,
        schoolId,
        groupIds: [],
        linkedStudentIds: [],
      });

      usersByEmail.set(normalizedEmail, created);
      credentials.push({ role, name: created.name, email: normalizedEmail, password, linkedTo });
      if (role === "parent") summary.createdParents += 1;
      if (role === "supervisor") summary.createdSupervisors += 1;
      if (role === "teacher") summary.createdTeachers += 1;
      return created;
    };

    for (const row of payload.rows) {
      const studentEmail = row.studentEmail.trim().toLowerCase();
      if (!studentEmail) {
        summary.skippedRows += 1;
        continue;
      }

      const student = usersByEmail.get(studentEmail);
      if (!student || student.role !== "student" || String(student.schoolId || "") !== schoolId) {
        summary.missingStudents += 1;
        continue;
      }

      const className = String(row.className || "").trim();
      const classroom = className ? classByName.get(className.toLowerCase()) : undefined;
      if (className && !classroom) {
        summary.missingClasses += 1;
      }

      if (classroom) {
        const classId = classroom.id || String(classroom._id);
        const studentId = student.id || String(student._id);
        const studentIdAliases = uniqueStrings([student.id, String(student._id)]);
        const currentSchoolClassIds = uniqueStrings(classes.flatMap((item) => [item.id, String(item._id)]));
        const currentGroupIds = Array.isArray(student.groupIds) ? student.groupIds.map(String) : [];
        const nextGroupIds = uniqueStrings([
          ...currentGroupIds.filter((id) => !currentSchoolClassIds.includes(id)),
          classId,
        ]);
        await GroupModel.updateMany(
          { type: "CLASS", parentId: schoolId },
          { $pull: { studentIds: { $in: studentIdAliases } } },
        );
        await Promise.all([
          UserModel.findByIdAndUpdate(student._id, { $set: { schoolId, groupIds: nextGroupIds } }),
          GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $addToSet: { studentIds: studentId } }),
          GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), { $addToSet: { studentIds: studentId } }),
        ]);
        summary.assignedClasses += 1;
      }

      await SchoolMembershipModel.findOneAndUpdate(
        { userId: String(student.id || student._id), schoolId, role: "student" },
        { $set: { status: "active" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const parentEmail = String(row.parentEmail || "").trim().toLowerCase();
      if (parentEmail) {
        const parent = await createUserIfMissing(
          parentEmail,
          "parent",
          row.parentName?.trim() || `ولي أمر ${student.name}`,
          student.name,
        );
        if (!parent) {
          summary.missingParents += 1;
        } else {
          const studentUserId = String(student.id || student._id);
          await Promise.all([
            UserModel.findByIdAndUpdate(parent._id, {
              $set: { schoolId },
              $addToSet: { linkedStudentIds: studentUserId },
            }),
            ensureCanonicalParentRelationship({
              parentUserId: String(parent.id || parent._id),
              studentUserId,
              schoolId,
              createdBy: String(req.authUser!.id),
            }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: String(parent.id || parent._id), schoolId, role: "parent" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ]);
          summary.linkedParents += 1;
        }
      }

      const supervisorEmail = String(row.supervisorEmail || "").trim().toLowerCase();
      if (supervisorEmail) {
        const supervisor = await createUserIfMissing(
          supervisorEmail,
          "supervisor",
          row.supervisorName?.trim() || `مشرف ${school.name}`,
          classroom?.name || school.name,
        );
        if (!supervisor) {
          summary.missingSupervisors += 1;
        } else {
          const targetGroupId = classroom ? classroom.id || String(classroom._id) : schoolId;
          await Promise.all([
            UserModel.findByIdAndUpdate(supervisor._id, { $set: { schoolId }, $addToSet: { groupIds: targetGroupId } }),
            GroupModel.findOneAndUpdate(buildDocumentQuery(targetGroupId), { $addToSet: { supervisorIds: supervisor.id || String(supervisor._id) } }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: String(supervisor.id || supervisor._id), schoolId, role: "supervisor" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ]);
          summary.linkedSupervisors += 1;
        }
      }

      const teacherEmail = String(row.teacherEmail || "").trim().toLowerCase();
      if (teacherEmail) {
        const teacher = await createUserIfMissing(
          teacherEmail,
          "teacher",
          row.teacherName?.trim() || `معلم ${student.name}`,
          classroom?.name || school.name,
        );
        if (!teacher || teacher.role !== "teacher") {
          summary.missingTeachers += 1;
        } else {
          const targetGroupId = classroom ? classroom.id || String(classroom._id) : schoolId;
          const teacherUserId = String(teacher.id || teacher._id);
          const canonicalWrites: Promise<unknown>[] = [
            UserModel.findByIdAndUpdate(teacher._id, { $set: { schoolId }, $addToSet: { groupIds: targetGroupId } }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: teacherUserId, schoolId, role: "teacher" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ];
          if (classroom) {
            canonicalWrites.push(
              TeachingAssignmentModel.findOneAndUpdate(
                { schoolId, teacherId: teacherUserId, classId: targetGroupId, subjectId: "" },
                { $set: { status: "active" } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
              ),
            );
          }
          await Promise.all(canonicalWrites);
          summary.linkedTeachers += 1;
        }
      }
    }

    const latestClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId });
    await Promise.all([
      GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), {
        $set: {
          totalStudents: await UserModel.countDocuments({ schoolId, role: "student" }),
          totalSupervisors: await UserModel.countDocuments({ schoolId, role: "supervisor" }),
        },
      }),
      ...latestClasses.map(async (group) => {
        const classId = group.id || String(group._id);
        const [studentCount, supervisorCount] = await Promise.all([
          UserModel.countDocuments({ role: "student", groupIds: classId }),
          UserModel.countDocuments({ role: "supervisor", groupIds: classId }),
        ]);
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), {
          $set: { totalStudents: studentCount, totalSupervisors: supervisorCount },
        });
      }),
    ]);

    const [updatedGroups, updatedUsers] = await Promise.all([
      GroupModel.find({
        $or: [{ _id: school._id }, { id: schoolId }, { parentId: schoolId }],
      }).sort({ createdAt: -1 }),
      UserModel.find({ schoolId }).select("-passwordHash").sort({ createdAt: -1 }),
    ]);

    return res.status(StatusCodes.CREATED).json({
      summary,
      credentials,
      groups: updatedGroups,
      users: updatedUsers,
    });
  }),
);
