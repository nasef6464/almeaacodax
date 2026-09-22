import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { QuizModel } from "../../../models/Quiz.js";
import { QuestionModel } from "../../../models/Question.js";
import { optionalAuth, requireAuth, requireRole } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { isStaffRole, withLearnerVisiblePaths } from "../../../services/visibility.js";
import {
  assertManagedContentScope,
  buildManagedContentScopeFilter,
  combineMongoFilters,
  resolveManagedContentScope,
} from "../../../services/managedContentScope.js";
import { questionBaseSchema, questionListQuerySchema, questionSchema, questionVideoLinksSchema } from "./questionQuerySchemas.js";
import { sanitizeQuestionForLearner, toQuestionSummaryText } from "../presentation/questionPresentation.js";
import { escapeRegex } from "./queryUtilities.js";
import { getWorkflowDefaults, sanitizeWorkflowUpdate } from "../application/quizWorkflow.js";
import { getQuizQuestionIds } from "../application/quizQuestionSelection.js";
import { getQuestionBankCoverage } from "../application/questionBankCoverage.js";
import { buildOwnedDocumentQuery, uniqueStrings } from "../infrastructure/quizDocumentQuery.js";

const QUESTION_SUMMARY_CACHE_TTL_MS = 30 * 1000;
const QUESTION_SUMMARY_CACHE_MAX_ENTRIES = 100;

let publicQuestionSummaryCache = new Map<
  string,
  {
    expiresAt: number;
    payload: unknown[];
    hasMore: boolean;
  }
>();

export const clearQuestionBankSummaryCache = () => {
  publicQuestionSummaryCache.clear();
};

const buildQuestionSummaryCacheKey = (query: ReturnType<typeof questionListQuerySchema.parse>) =>
  JSON.stringify({
    page: query.page,
    limit: query.limit,
    pathId: query.pathId || "",
    subject: query.subject || "",
    sectionId: query.sectionId || "",
    skillId: query.skillId || "",
  });

export const questionBankRouter = Router();

questionBankRouter.get(
  "/questions",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const query = questionListQuerySchema.parse(req.query);
    const canUseSummaryCache =
      query.summary &&
      query.noTotal &&
      !query.ids &&
      !query.search &&
      !query.approvalStatus &&
      !isStaffRole(req.authUser?.role);
    const summaryCacheKey = canUseSummaryCache ? buildQuestionSummaryCacheKey(query) : "";
    const summaryCacheItem = summaryCacheKey ? publicQuestionSummaryCache.get(summaryCacheKey) : undefined;
    if (summaryCacheItem && summaryCacheItem.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.setHeader("X-Question-Summary-Cache", "hit");
      res.setHeader("X-Has-More", String(summaryCacheItem.hasMore));
      res.setHeader("X-Page", String(query.page));
      res.setHeader("X-Limit", String(query.limit));
      return res.json(summaryCacheItem.payload);
    }

    let baseFilter: Record<string, any> = {};

    if (!isStaffRole(req.authUser?.role)) {
      const visibleQuizFilter = await withLearnerVisiblePaths(
        {
          isPublished: true,
          showOnPlatform: { $ne: false },
          $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
        },
        req.authUser,
      );
      const shouldExpandLinkedQuizQuestions = !query.summary || Boolean(query.ids) || Boolean(query.search);
      const linkedQuestionConditions: Record<string, any>[] = [];

      if (shouldExpandLinkedQuizQuestions) {
        const visibleQuizzes = await QuizModel.find(visibleQuizFilter).select("questionIds mockExam").lean();
        const linkedQuestionIds = uniqueStrings(
          visibleQuizzes.flatMap((quiz: any) => getQuizQuestionIds(quiz)),
        );
        const linkedObjectIds = linkedQuestionIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        if (linkedQuestionIds.length > 0) {
          linkedQuestionConditions.push({ id: { $in: linkedQuestionIds } });
        }
        if (linkedObjectIds.length > 0) {
          linkedQuestionConditions.push({ _id: { $in: linkedObjectIds } });
        }
      }

      baseFilter = {
        $or: [
          { approvalStatus: "approved" },
          { approvalStatus: { $exists: false } },
          { approvalStatus: null },
          ...linkedQuestionConditions,
        ],
      };
    }

    const managedScope = await resolveManagedContentScope(req.authUser);

    const scopeFilter: Record<string, any> = {};
    if (query.pathId) scopeFilter.pathId = query.pathId;
    if (query.ids) {
      const ids = uniqueStrings(query.ids.split(",").map((item) => item.trim()).filter(Boolean)).slice(0, 200);
      const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
      scopeFilter.$or = [
        ...(Array.isArray(scopeFilter.$or) ? scopeFilter.$or : []),
        { id: { $in: ids } },
        ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
      ];
    }
    if (query.subject) scopeFilter.subject = query.subject;
    if (query.sectionId) scopeFilter.sectionId = query.sectionId;
    if (query.skillId) scopeFilter.skillIds = query.skillId;
    if (query.skillIds) {
      const skillIds = uniqueStrings(query.skillIds.split(",").map((item) => item.trim()));
      if (skillIds.length > 0) scopeFilter.skillIds = { $in: skillIds };
    }
    if (query.skillLinkStatus === "linked" && !query.skillId && !query.skillIds) {
      scopeFilter["skillIds.0"] = { $exists: true };
    } else if (query.skillLinkStatus === "unlinked") {
      scopeFilter["skillIds.0"] = { $exists: false };
    }
    if (query.difficulty) scopeFilter.difficulty = query.difficulty;
    if (query.examType) scopeFilter.examType = query.examType;
    if (query.source) scopeFilter.source = query.source;
    if (typeof query.year === "number") scopeFilter.year = query.year;
    if (query.approvalStatus && isStaffRole(req.authUser?.role)) scopeFilter.approvalStatus = query.approvalStatus;
    if (query.videoStatus === "with" || query.hasExplanationVideo) {
      scopeFilter.videoUrl = { $exists: true, $nin: ["", null] };
    } else if (query.videoStatus === "without") {
      scopeFilter.videoUrl = { $in: ["", null] };
    }
    if (query.explanationStatus === "with") {
      scopeFilter.explanation = { $exists: true, $nin: ["", null] };
    } else if (query.explanationStatus === "without") {
      scopeFilter.explanation = { $in: ["", null] };
    }
    if (query.search) {
      const safeSearch = escapeRegex(query.search);
      scopeFilter.$or = [
        ...(Array.isArray(scopeFilter.$or) ? scopeFilter.$or : []),
        { text: { $regex: safeSearch, $options: "i" } },
        { questionCode: { $regex: safeSearch, $options: "i" } },
        { explanation: { $regex: safeSearch, $options: "i" } },
        { id: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const filter = await withLearnerVisiblePaths(
      combineMongoFilters(baseFilter, scopeFilter, buildManagedContentScopeFilter(managedScope)),
      req.authUser,
    );
    const skip = (query.page - 1) * query.limit;
    const queryBuilder = QuestionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.noTotal ? query.limit + 1 : query.limit)
      .lean();
    if (query.summary) {
      queryBuilder.select("id questionCode text imageUrl imageAlt options optionsEmbeddedInImage correctOptionIndex explanation videoUrl skillIds pathId subject sectionId examType source year difficulty type ownerType ownerId createdBy assignedTeacherId approvalStatus approvedBy approvedAt reviewerNotes revenueSharePercentage createdAt updatedAt");
    }

    const shouldIncludeCoverage = Boolean(query.includeCoverage);
    const [rawItems, total, coverage] = await Promise.all([
      queryBuilder,
      query.noTotal ? Promise.resolve(null) : QuestionModel.countDocuments(filter),
      shouldIncludeCoverage ? getQuestionBankCoverage(filter) : Promise.resolve(null),
    ]);
    const hasMore = query.noTotal && rawItems.length > query.limit;
    const limitedItems = query.noTotal ? rawItems.slice(0, query.limit) : rawItems;
    const canSeeAnswers = isStaffRole(req.authUser?.role);
    const items = query.summary
      ? limitedItems.map((item) => ({ ...item, text: toQuestionSummaryText(item.text) }))
      : canSeeAnswers
        ? limitedItems
        : limitedItems.map((item) => sanitizeQuestionForLearner(item as Record<string, any>));
    if (total !== null) {
      res.setHeader("X-Total-Count", String(total));
    }
    res.setHeader("X-Has-More", String(hasMore));
    res.setHeader("X-Page", String(query.page));
    res.setHeader("X-Limit", String(query.limit));
    if (summaryCacheKey) {
      if (publicQuestionSummaryCache.size >= QUESTION_SUMMARY_CACHE_MAX_ENTRIES) {
        const oldestKey = publicQuestionSummaryCache.keys().next().value;
        if (oldestKey) {
          publicQuestionSummaryCache.delete(oldestKey);
        }
      }
      publicQuestionSummaryCache.set(summaryCacheKey, {
        expiresAt: Date.now() + QUESTION_SUMMARY_CACHE_TTL_MS,
        payload: items,
        hasMore,
      });
      res.setHeader("Cache-Control", "private, max-age=30");
      res.setHeader("X-Question-Summary-Cache", "miss");
    }
    if (query.paginate) {
      const resolvedTotal = total ?? skip + limitedItems.length + (hasMore ? 1 : 0);
      const totalPages = Math.max(1, Math.ceil(resolvedTotal / Math.max(query.limit, 1)));
      return res.json({
        data: items,
        ...(coverage ? { coverage } : {}),
        pagination: {
          total: resolvedTotal,
          page: query.page,
          limit: query.limit,
          totalPages,
          hasNext: query.noTotal ? hasMore : query.page < totalPages,
          hasPrev: query.page > 1,
        },
      });
    }

    res.json(items);
  }),
);

questionBankRouter.post(
  "/questions",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const draftPayload = questionBaseSchema.parse(req.body);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const payload = questionSchema.parse({
      ...draftPayload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? draftPayload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    await assertManagedContentScope(req.authUser!, payload);
    const created = await QuestionModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

questionBankRouter.patch(
  "/questions/video-links",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { items } = questionVideoLinksSchema.parse(req.body || {});
    const normalizedItems = items.map((item) => ({
      questionCode: item.questionCode.trim().toUpperCase(),
      videoUrl: item.videoUrl.trim(),
    }));
    const codes = uniqueStrings(normalizedItems.map((item) => item.questionCode));
    const existing = await QuestionModel.find({ questionCode: { $in: codes } })
      .select("questionCode")
      .lean();
    const existingCodes = new Set(existing.map((item: any) => String(item.questionCode || "").toUpperCase()).filter(Boolean));
    const operations = normalizedItems
      .filter((item) => existingCodes.has(item.questionCode))
      .map((item) => ({
        updateOne: {
          filter: { questionCode: item.questionCode },
          update: { $set: { videoUrl: item.videoUrl } },
        },
      }));

    const result = operations.length > 0
      ? await QuestionModel.bulkWrite(operations, { ordered: false })
      : null;
    const missingCodes = codes.filter((code) => !existingCodes.has(code));

    return res.json({
      requested: normalizedItems.length,
      matched: existingCodes.size,
      modified: Number(result?.modifiedCount || 0),
      missingCodes,
    });
  }),
);

questionBankRouter.get(
  "/questions/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const question = await QuestionModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!)).lean();
    if (!question) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }
    await assertManagedContentScope(req.authUser!, question);
    return res.json(question);
  }),
);

questionBankRouter.patch(
  "/questions/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = questionBaseSchema.partial().parse(req.body);
    const documentQuery = buildOwnedDocumentQuery(req.params.id, req.authUser!);
    const existing = await QuestionModel.findOne(documentQuery);

    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    const existingQuestionCode = String((existing as any).questionCode || "").trim().toUpperCase();
    const requestedQuestionCode = String((payload as any).questionCode || "").trim().toUpperCase();
    if (existingQuestionCode && requestedQuestionCode && existingQuestionCode !== requestedQuestionCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "questionCode is immutable once assigned",
        questionCode: existingQuestionCode,
      });
    }

    const mergedPayload = questionSchema.parse({
      ...existing.toObject(),
      ...payload,
    });

    await assertManagedContentScope(req.authUser!, mergedPayload);
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await QuestionModel.findOneAndUpdate(documentQuery, sanitizedPayload, { new: true });
    return res.json(updated);
  }),
);

questionBankRouter.delete(
  "/questions/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await QuestionModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await QuestionModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });

    const deletedId = String(deleted.id || deleted._id);

    // Cascade: remove deleted questionId from all quizzes that reference it
    // This prevents broken references in published quizzes
    await Promise.all([
      // Remove from root questionIds array
      QuizModel.updateMany(
        { questionIds: deletedId },
        { $pull: { questionIds: deletedId } }
      ),
      // Remove from mockExam sections
      QuizModel.updateMany(
        { "mockExam.sections.questionIds": deletedId },
        { $pull: { "mockExam.sections.$[].questionIds": deletedId } }
      ),
    ]);

    return res.json({ success: true, cascadeRemovedFromQuizzes: true });
  }),
);
