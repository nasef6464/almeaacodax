import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { QuizModel } from "../../../models/Quiz.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { recordAdminAuditLog } from "../../../services/adminAuditLog.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildPaginatedResponse, resolvePagination } from "../../../utils/pagination.js";
import { serializeQuizResultForLearner, serializeQuizResultsForLearner } from "../../../utils/quizResultSerialization.js";
import { filterResultsByManagedContentScope } from "../application/quizManagedContentScope.js";
import { resolveCompatibleLatestQuizResult, resolveCompatibleQuizResultList } from "../application/quizResultCompatibility.js";
import { resolveScopedStudents } from "../application/quizReportScope.js";
import { resolveAuthUserByAuthId } from "../application/quizUserLookup.js";
import { buildDocumentQuery } from "../infrastructure/quizDocumentQuery.js";
import { getCachedQuizResults, setCachedQuizResults } from "../infrastructure/quizResultsCache.js";
import { quizResultsListQuerySchema } from "./questionQuerySchemas.js";
import { buildQuizResultsCacheKey, escapeRegex, parseDateFilter } from "./queryUtilities.js";

const idOf = (item: any) => String(item?.id || item?._id || "");
const DIRECT_RESULT_DISABLED_MESSAGE =
  "Direct quiz result creation is disabled. Submit quiz answers through /api/quizzes/:id/submit.";

const buildResultTaxonomyScopeFilter = (query: { pathId?: string; subjectId?: string }) => {
  if (query.pathId && query.subjectId) {
    return {
      $or: [
        { "quizSnapshot.pathId": query.pathId, "quizSnapshot.subjectId": query.subjectId },
        { skillsAnalysis: { $elemMatch: { pathId: query.pathId, subjectId: query.subjectId } } },
      ],
    };
  }
  if (query.pathId) {
    return {
      $or: [
        { "quizSnapshot.pathId": query.pathId },
        { skillsAnalysis: { $elemMatch: { pathId: query.pathId } } },
      ],
    };
  }
  if (query.subjectId) {
    return {
      $or: [
        { "quizSnapshot.subjectId": query.subjectId },
        { skillsAnalysis: { $elemMatch: { subjectId: query.subjectId } } },
      ],
    };
  }
  return {};
};


export const quizResultsRouter = Router();

quizResultsRouter.get(
  "/results",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = quizResultsListQuerySchema.parse(req.query);
    const includeReview = String(req.query.includeReview || "").toLowerCase() === "true";
    const canUseShortCache = !includeReview && query.noTotal;
    const cacheKey = buildQuizResultsCacheKey(req.authUser!.id, req.originalUrl || req.url || "/results", includeReview);
    if (canUseShortCache) {
      const cached = getCachedQuizResults(cacheKey);
      if (cached !== undefined) {
        res.setHeader("X-Quiz-Results-Cache", "hit");
        return res.json(cached);
      }
      res.setHeader("X-Quiz-Results-Cache", "miss");
    }
    const pagination = resolvePagination(query, { page: query.page, limit: query.limit });
    const filter: Record<string, unknown> = { userId: req.authUser!.id, ...buildResultTaxonomyScopeFilter(query) };
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
      setCachedQuizResults(cacheKey, payload);
    }
    res.json(payload);
  }),
);


quizResultsRouter.get(
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

    const scopedFilter: Record<string, unknown> = { ...buildResultTaxonomyScopeFilter(query) };
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


quizResultsRouter.get(
  "/results/latest",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await QuizResultModel.findOne({ userId: req.authUser!.id }).sort({ createdAt: -1 }).lean();

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No quiz results found" });
    }

    return res.json(
      serializeQuizResultForLearner(
        await resolveCompatibleLatestQuizResult(item as Record<string, unknown>),
      ),
    );
  }),
);


quizResultsRouter.get(
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



quizResultsRouter.post(
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
