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
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { StudyPlanModel } from "../models/StudyPlan.js";
import { AnnouncementAdModel } from "../models/AnnouncementAd.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { getActivePathIds, isStaffRole } from "../services/visibility.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { schoolImportSchema, schoolRelationSchema } from "../modules/content/http/schoolOperationsSchemas.js";
import { contentPresentationRouter } from "../modules/content/http/contentPresentationRoutes.js";
import { contentPlatformIntegrationRouter } from "../modules/content/http/contentPlatformIntegrationRoutes.js";
import { contentPlatformIntegrationRuntimeRouter } from "../modules/content/http/contentPlatformIntegrationRuntimeRoutes.js";
import { contentStudyPlanRouter } from "../modules/content/http/contentStudyPlanRoutes.js";
import { contentLearningRouter } from "../modules/content/http/contentLearningRoutes.js";
import { contentGroupRouter } from "../modules/content/http/contentGroupRoutes.js";
import { contentSchoolCommercialRouter } from "../modules/content/http/contentSchoolCommercialRoutes.js";
import { buildPaginationMeta, escapeRegExp } from "../modules/content/http/contentQueryUtilities.js";
import { buildDocumentQuery, buildDocumentsByIdsQuery } from "../modules/content/infrastructure/contentDocumentQuery.js";
import { assertSchoolManagementScope, resolveSupervisorManagementScope } from "../modules/content/application/schoolOperationsScope.js";
import { resolveContentBootstrapRequest } from "../modules/content/application/contentBootstrapRequest.js";
import { buildContentBootstrapVisibilityFilters } from "../modules/content/application/contentBootstrapVisibility.js";
import { buildContentBootstrapPayload } from "../modules/content/application/contentBootstrapPayload.js";
import { resolveContentBootstrapCache } from "../modules/content/application/contentBootstrapCache.js";
import {
  getScopedContentBootstrapOperationalData,
  PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT,
} from "../modules/content/infrastructure/contentBootstrapOperationalData.js";
import { ensureCanonicalParentRelationship } from "../services/parentAuthorityService.js";
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

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

const getModelDocumentId = (document: { id?: unknown; _id?: unknown }) => String(document.id || document._id || "");

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
