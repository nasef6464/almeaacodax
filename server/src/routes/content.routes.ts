import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TopicModel } from "../models/Topic.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { CourseModel } from "../models/Course.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { StudyPlanModel } from "../models/StudyPlan.js";
import { AnnouncementAdModel } from "../models/AnnouncementAd.js";
import { getActivePathIds, isStaffRole } from "../services/visibility.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { contentPresentationRouter } from "../modules/content/http/contentPresentationRoutes.js";
import { contentPlatformIntegrationRouter } from "../modules/content/http/contentPlatformIntegrationRoutes.js";
import { contentPlatformIntegrationRuntimeRouter } from "../modules/content/http/contentPlatformIntegrationRuntimeRoutes.js";
import { contentStudyPlanRouter } from "../modules/content/http/contentStudyPlanRoutes.js";
import { contentLearningRouter } from "../modules/content/http/contentLearningRoutes.js";
import { contentGroupRouter } from "../modules/content/http/contentGroupRoutes.js";
import { contentSchoolCommercialRouter } from "../modules/content/http/contentSchoolCommercialRoutes.js";
import { contentSchoolReportImportRouter } from "../modules/content/http/contentSchoolReportImportRoutes.js";
import { contentSchoolRelationsRouter } from "../modules/content/http/contentSchoolRelationsRoutes.js";
import { buildPaginationMeta, escapeRegExp } from "../modules/content/http/contentQueryUtilities.js";
import { buildDocumentQuery } from "../modules/content/infrastructure/contentDocumentQuery.js";
import { resolveContentBootstrapRequest } from "../modules/content/application/contentBootstrapRequest.js";
import { buildContentBootstrapVisibilityFilters } from "../modules/content/application/contentBootstrapVisibility.js";
import { buildContentBootstrapPayload } from "../modules/content/application/contentBootstrapPayload.js";
import { resolveContentBootstrapCache } from "../modules/content/application/contentBootstrapCache.js";
import {
  getScopedContentBootstrapOperationalData,
  PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT,
} from "../modules/content/infrastructure/contentBootstrapOperationalData.js";
import {
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../services/managedContentScope.js";

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
contentRouter.use(contentStudyPlanRouter);
contentRouter.use(contentLearningRouter);
contentRouter.use(contentGroupRouter);
contentRouter.use(contentSchoolCommercialRouter);
contentRouter.use(contentSchoolReportImportRouter);
contentRouter.use(contentSchoolRelationsRouter);

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
