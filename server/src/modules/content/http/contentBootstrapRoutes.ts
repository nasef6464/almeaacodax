import { Router } from "express";
import { z } from "zod";
import { optionalAuth } from "../../../middleware/auth.js";
import { AnnouncementAdModel } from "../../../models/AnnouncementAd.js";
import { LessonModel } from "../../../models/Lesson.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { StudyPlanModel } from "../../../models/StudyPlan.js";
import { TopicModel } from "../../../models/Topic.js";
import { isStaffRole, getActivePathIds } from "../../../services/visibility.js";
import {
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../../../services/managedContentScope.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { resolveContentBootstrapRequest } from "../application/contentBootstrapRequest.js";
import { buildContentBootstrapVisibilityFilters } from "../application/contentBootstrapVisibility.js";
import { buildContentBootstrapPayload } from "../application/contentBootstrapPayload.js";
import { resolveContentBootstrapCache } from "../application/contentBootstrapCache.js";
import {
  getScopedContentBootstrapOperationalData,
  PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT,
} from "../infrastructure/contentBootstrapOperationalData.js";

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
type ContentBootstrapCacheEntry = {
  expiresAt: number;
  payload: ContentBootstrapCachePayload;
};

const contentBootstrapScopeSchema = z.enum(["full", "learning", "operations"]).default("full");
const contentBootstrapPhaseSchema = z.enum(["full", "core"]).default("full");

let contentBootstrapCache = new Map<string, ContentBootstrapCacheEntry>();
let contentBootstrapPromises = new Map<string, Promise<ContentBootstrapCachePayload>>();
export const publicContentBootstrapPromise = contentBootstrapPromises;

let contentBootstrapMinimalCache:
  | {
      expiresAt: number;
      payload: PublicContentBootstrapPayload;
    }
  | null = null;

let contentBootstrapMinimalPromise: Promise<PublicContentBootstrapPayload> | null = null;

export const clearContentBootstrapCache = () => {
  contentBootstrapCache.clear();
  contentBootstrapPromises.clear();
  contentBootstrapMinimalCache = null;
  contentBootstrapMinimalPromise = null;
};

export const contentBootstrapRouter = Router();

contentBootstrapRouter.get(
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
      const announcementAds = await AnnouncementAdModel.find({
        isActive: true,
        audience: { $in: ["all", "guest"] },
      })
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

contentBootstrapRouter.get(
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
        isOperationsOnly
          ? Promise.resolve([])
          : TopicModel.find(combineMongoFilters(finalTopicFilter, managedFilter))
              .sort({ subjectId: 1, order: 1 })
              .lean(),
        isOperationsOnly || isLearningCore
          ? Promise.resolve([])
          : LessonModel.find(combineMongoFilters(finalLessonFilter, managedFilter))
              .sort({ createdAt: -1 })
              .lean(),
        isOperationsOnly || isLearningCore
          ? Promise.resolve([])
          : LibraryItemModel.find(combineMongoFilters(finalLibraryFilter, managedFilter))
              .sort({ createdAt: -1 })
              .lean(),
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
      res.setHeader(
        "Cache-Control",
        req.authUser
          ? "private, max-age=120"
          : "public, max-age=120, stale-while-revalidate=180",
      );
      res.setHeader("X-Content-Cache", cacheStatus);
    }

    res.setHeader("X-Content-Scope", scope);
    res.setHeader("X-Content-Phase", phase);
    return res.json(payload);
  }),
);
