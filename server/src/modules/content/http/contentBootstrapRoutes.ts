import { Router, type Request, type Response } from "express";
import { gzipSync } from "node:zlib";
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
const contentBootstrapIdSchema = z.string().trim().min(1).max(160).optional();

let contentBootstrapCache = new Map<string, ContentBootstrapCacheEntry>();
let contentBootstrapPromises = new Map<string, Promise<ContentBootstrapCachePayload>>();
let contentBootstrapSerializedCache = new Map<string, {
  payload: ContentBootstrapCachePayload;
  json: string;
  gzip: Buffer;
}>();
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
  contentBootstrapSerializedCache.clear();
  contentBootstrapMinimalCache = null;
  contentBootstrapMinimalPromise = null;
};

const sendSharedBootstrapPayload = (
  req: Request,
  res: Response,
  cacheKey: string,
  payload: ContentBootstrapCachePayload,
) => {
  let serialized = contentBootstrapSerializedCache.get(cacheKey);
  if (!serialized || serialized.payload !== payload) {
    const json = JSON.stringify(payload);
    serialized = {
      payload,
      json,
      gzip: gzipSync(json, { level: 1 }),
    };
    contentBootstrapSerializedCache.set(cacheKey, serialized);
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Vary", "Accept-Encoding");

  const acceptsGzip = /(?:^|,)\s*gzip(?:\s*;|\s*,|\s*$)/i.test(String(req.headers["accept-encoding"] || ""));
  if (acceptsGzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Length", serialized.gzip.byteLength);
    return res.end(serialized.gzip);
  }

  res.setHeader("Content-Length", Buffer.byteLength(serialized.json));
  return res.end(serialized.json);
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
    const requestedPathId = contentBootstrapIdSchema.parse(req.query.pathId);
    const requestedSubjectId = contentBootstrapIdSchema.parse(req.query.subjectId);
    const canUseFullScope = isStaffRole(req.authUser?.role);
    const {
      scope,
      phase,
      isLearningCore,
      isOperationsOnly,
      includeOperationalData,
      includeStudyPlans,
      canUseSharedCache,
      cacheKey: baseCacheKey,
    } = resolveContentBootstrapRequest({
      requestedScope,
      requestedPhase,
      canUseFullScope,
      isAuthenticated: Boolean(req.authUser),
    });

    const requestedContentFilter: Record<string, unknown> = {
      ...(requestedPathId ? { pathId: requestedPathId } : {}),
      ...(requestedSubjectId
        ? { $or: [{ subjectId: requestedSubjectId }, { subject: requestedSubjectId }] }
        : {}),
    };
    const cacheKey = canUseSharedCache
      ? `${baseCacheKey}:path:${requestedPathId || "all"}:subject:${requestedSubjectId || "all"}`
      : "";

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
          : isLearningCore
            ? TopicModel.find(combineMongoFilters(finalTopicFilter, managedFilter, requestedContentFilter))
                .select("id pathId subjectId sectionId skillId skillIds title parentId order showOnPlatform isLocked lessonIds quizIds libraryItemIds")
                .sort({ subjectId: 1, order: 1 })
                .lean()
            : TopicModel.find(combineMongoFilters(finalTopicFilter, managedFilter, requestedContentFilter))
                .sort({ subjectId: 1, order: 1 })
                .lean(),
        isOperationsOnly || isLearningCore
          ? Promise.resolve([])
          : LessonModel.find(combineMongoFilters(finalLessonFilter, managedFilter, requestedContentFilter))
              .sort({ createdAt: -1 })
              .lean(),
        isOperationsOnly || isLearningCore
          ? Promise.resolve([])
          : LibraryItemModel.find(combineMongoFilters(finalLibraryFilter, managedFilter, requestedContentFilter))
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
    res.setHeader("X-Content-Path", requestedPathId || "all");
    res.setHeader("X-Content-Subject", requestedSubjectId || "all");
    if (canUseSharedCache && cacheKey && cacheStatus) {
      return sendSharedBootstrapPayload(req, res, cacheKey, payload);
    }
    return res.json(payload);
  }),
);
