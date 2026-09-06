import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { QuizModel } from "../models/Quiz.js";
import { UserModel } from "../models/User.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { isStaffRole, withLearnerVisiblePaths } from "../services/visibility.js";

const badRequest = (message: string) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
};

const numberWithDefault = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return defaultValue;
    }
    return value;
  }, z.coerce.number().finite().default(defaultValue));

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return null;
  }
  return value;
}, z.coerce.number().finite().nullable().optional());

const assessmentSchema = z.object({
  id: z.string(),
  quizId: z.string(),
  title: z.string(),
  phase: z.enum(["pre_course", "during_course", "final_course"]).default("during_course"),
  access: z.enum(["free_preview", "enrolled_paid"]).default("enrolled_paid"),
  showOnPlatform: z.boolean().default(true),
  order: z.coerce.number().finite().default(0),
});

const courseFileSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string().default("pdf"),
  url: z.string().default(""),
  size: z.string().default(""),
  access: z.enum(["free_preview", "enrolled_paid"]).default("enrolled_paid"),
});

const courseSchema = z.object({
  id: z.string().optional(),
  title: z.preprocess((value) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text || "Untitled Course";
  }, z.string().min(1)),
  thumbnail: z.string().optional(),
  instructor: z.preprocess((value) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text || "Platform Team";
  }, z.string().min(1)),
  price: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return 0;
    }
    return value;
  }, z.coerce.number().finite().min(0).default(0)),
  currency: z.string().default("SAR"),
  duration: numberWithDefault(0),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
  rating: numberWithDefault(0),
  progress: numberWithDefault(0),
  category: z.string().default(""),
  subject: z.string().default(""),
  pathId: z.string().optional(),
  subjectId: z.string().optional(),
  sectionId: z.string().optional(),
  features: z.array(z.string()).default([]),
  description: z.string().optional(),
  instructorBio: z.string().optional(),
  modules: z.array(z.any()).default([]),
  assessments: z.array(assessmentSchema).optional(),
  files: z.array(courseFileSchema).optional(),
  qa: z.array(z.any()).optional(),
  isPublished: z.boolean().default(false),
  showOnPlatform: z.boolean().default(true),
  isPackage: z.boolean().default(false),
  packageType: z.enum(["courses", "videos", "tests", "membership"]).optional(),
  packageContentTypes: z.array(z.enum(["courses", "foundation", "banks", "tests", "mockExams", "library", "all"])).optional(),
  originalPrice: nullableNumber,
  includedCourses: z.array(z.string()).optional(),
  studentCount: numberWithDefault(0),
  fakeStudentsCount: numberWithDefault(0),
  fakeRating: numberWithDefault(5),
  prerequisiteCourseIds: z.array(z.string()).optional(),
  dripContentEnabled: z.boolean().optional(),
  certificateEnabled: z.boolean().optional(),
  lessonStartIcon: z.string().optional(),
  lessonStartIconColor: z.string().optional(),
  lessonEndIcon: z.string().optional(),
  lessonEndIconColor: z.string().optional(),
  skills: z.array(z.string()).optional(),
  ownerType: z.enum(["platform", "teacher", "school"]).optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  assignedTeacherId: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: nullableNumber,
  reviewerNotes: z.string().optional(),
  revenueSharePercentage: nullableNumber,
});

const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  pathId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  kind: z.enum(['learning', 'package', 'all']).default('all'),
});

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
    if (nextPayload.isPublished === true) {
      nextPayload.isPublished = false;
    }
  } else {
    if (typeof nextPayload.approvalStatus === "string") {
      if (nextPayload.approvalStatus === "approved") {
        nextPayload.approvedBy = authUser.id;
        nextPayload.approvedAt = Date.now();
      } else if (nextPayload.approvalStatus === "rejected" || nextPayload.approvalStatus === "pending_review") {
        nextPayload.approvedBy = "";
        nextPayload.approvedAt = null;
        nextPayload.isPublished = false;
      }
    }
  }

  return nextPayload;
};

const buildCourseVisibilityFilter = (authUser?: { role?: string; id?: string }) => {
  if (isStaffRole(authUser?.role)) {
    return {};
  }

  return {
    isPublished: true,
    showOnPlatform: { $ne: false },
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
  };
};

const buildCourseIdentityQuery = (id: string) => {
  const normalizedId = String(id || "").trim();
  return { $or: [{ _id: normalizedId }, { id: normalizedId }] };
};

const normalizeStringList = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];

const grantAllowsCourse = (grant: any, course: any) => {
  if (!grant || grant.status !== "active") return false;
  const expiresAt = Number(grant.expiresAt || 0);
  if (expiresAt > 0 && expiresAt <= Date.now()) return false;

  const courseId = String(course.id || course._id || "").trim();
  const coursePathId = String(course.pathId || course.category || "").trim();
  const courseSubjectId = String(course.subjectId || course.subject || "").trim();
  const courseIds = normalizeStringList(grant.courseIds);
  if (courseIds.length > 0) return courseIds.includes(courseId);

  const contentTypes = normalizeStringList(grant.contentTypes);
  if (!contentTypes.includes("all") && !contentTypes.includes("courses")) return false;

  const pathIds = normalizeStringList(grant.pathIds);
  const subjectIds = normalizeStringList(grant.subjectIds);
  const matchesPath = pathIds.length === 0 || (!!coursePathId && pathIds.includes(coursePathId));
  const matchesSubject = subjectIds.length === 0 || (!!courseSubjectId && subjectIds.includes(courseSubjectId));
  return matchesPath && matchesSubject;
};

const hasCourseEntitlement = async (userId: string, course: any) => {
  const [user, activeGrants] = await Promise.all([
    UserModel.findById(userId).select("enrolledCourses subscription").lean(),
    AccessGrantModel.find({ userId, status: "active" })
      .select("courseIds contentTypes pathIds subjectIds status expiresAt")
      .lean(),
  ]);
  if (!user) return false;

  const courseId = String(course.id || course._id || "").trim();
  const enrolledCourseIds = new Set([
    ...normalizeStringList((user as any).enrolledCourses),
    ...normalizeStringList((user as any).subscription?.purchasedCourses),
  ]);
  const purchasedPackages = new Set(normalizeStringList((user as any).subscription?.purchasedPackages));
  const isPremiumSubscription = String((user as any).subscription?.plan || "free") === "premium";

  return (
    isPremiumSubscription ||
    enrolledCourseIds.has(courseId) ||
    purchasedPackages.has(courseId) ||
    activeGrants.some((grant) => grantAllowsCourse(grant, course))
  );
};

const redactRestrictedLessonPayload = (lesson: any) => {
  if (!lesson || typeof lesson !== "object" || lesson.accessControl === "public") {
    return lesson;
  }

  const {
    content: _content,
    videoUrl: _videoUrl,
    fileUrl: _fileUrl,
    assignmentDetails: _assignmentDetails,
    meetingUrl: _meetingUrl,
    recordingUrl: _recordingUrl,
    joinInstructions: _joinInstructions,
    interactiveQuestions: _interactiveQuestions,
    attendedStudentIds: _attendedStudentIds,
    allowedGroupIds: _allowedGroupIds,
    ...safeLesson
  } = lesson;

  return {
    ...safeLesson,
    isLocked: true,
  };
};

const projectRestrictedCoursePayload = (course: any) => ({
  ...course,
  modules: Array.isArray(course?.modules)
    ? course.modules.map((moduleItem: any) => ({
        ...moduleItem,
        lessons: Array.isArray(moduleItem?.lessons)
          ? moduleItem.lessons.map(redactRestrictedLessonPayload)
          : [],
      }))
    : [],
  files: Array.isArray(course?.files)
    ? course.files.map((file: any) =>
        file?.access === "free_preview" ? file : { ...file, url: "" },
      )
    : [],
});

const buildOwnedCourseQuery = (
  id: string,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const baseQuery = buildCourseIdentityQuery(id);

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

type CurriculumLesson = {
  id?: string;
  title?: string;
  type?: string;
  quizId?: string;
  pathId?: string;
  subjectId?: string;
};

type CurriculumModule = {
  id?: string;
  title?: string;
  lessons?: CurriculumLesson[];
};

const normalizeCourseModules = (modules: unknown) => {
  if (!Array.isArray(modules)) return [];

  return modules.map((moduleItem, index) => {
    const moduleRecord = (moduleItem && typeof moduleItem === "object" ? moduleItem : {}) as Record<string, unknown>;
    const normalizedLessons = Array.isArray(moduleRecord.lessons) ? moduleRecord.lessons : [];
    const rawTitle = typeof moduleRecord.title === "string" ? moduleRecord.title.trim() : "";
    return {
      ...moduleRecord,
      title: rawTitle || `قسم ${index + 1}`,
      order:
        typeof moduleRecord.order === "number" && Number.isFinite(moduleRecord.order)
          ? moduleRecord.order
          : index,
      lessons: normalizedLessons,
    };
  });
};

const normalizeCourseAssessments = (assessments: unknown) => {
  if (!Array.isArray(assessments)) return [];

  return assessments
    .map((assessmentItem, index) => {
      const item =
        assessmentItem && typeof assessmentItem === "object"
          ? (assessmentItem as Record<string, unknown>)
          : ({} as Record<string, unknown>);
      const rawId = typeof item.id === "string" ? item.id.trim() : "";
      const rawQuizId = typeof item.quizId === "string" ? item.quizId.trim() : "";
      const rawTitle = typeof item.title === "string" ? item.title.trim() : "";
      if (!rawQuizId) {
        return null;
      }
      return {
        ...item,
        id: rawId || `assessment_${Date.now()}_${index}`,
        quizId: rawQuizId,
        title: rawTitle || "اختبار الدورة",
      };
    })
    .filter(Boolean);
};

const getRefIdCandidates = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  // Imported entries keep stable prefixes in the builder, e.g. course_quiz_<id>_<timestamp>.
  const prefixedMatch = raw.match(/^course_(quiz|lesson)_(.+)_\d+$/);
  if (prefixedMatch?.[2]) {
    return [prefixedMatch[2], raw];
  }

  return [raw];
};

const buildRefLookup = (idCandidates: string[]) => {
  const normalized = idCandidates.map((candidate) => String(candidate || "").trim()).filter(Boolean);
  const objectIdCandidates = normalized.filter((candidate) => mongoose.Types.ObjectId.isValid(candidate));
  const clauses: Array<Record<string, unknown>> = [{ id: { $in: normalized } }];
  if (objectIdCandidates.length > 0) {
    clauses.push({ _id: { $in: objectIdCandidates } });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
};

const isScopeMismatch = (
  itemPathId: string,
  itemSubjectId: string,
  coursePathId: string,
  courseSubjectId: string,
) => {
  if (!coursePathId || !courseSubjectId) return false;
  if (!itemPathId || !itemSubjectId) return false;
  return itemPathId !== coursePathId || itemSubjectId !== courseSubjectId;
};

const assertCurriculumImportScope = async (params: {
  coursePathId?: string;
  courseSubjectId?: string;
  modules?: CurriculumModule[];
}) => {
  const coursePathId = String(params.coursePathId || "").trim();
  const courseSubjectId = String(params.courseSubjectId || "").trim();
  const modules = Array.isArray(params.modules) ? params.modules : [];

  if (!coursePathId || !courseSubjectId || modules.length === 0) {
    return;
  }

  for (const moduleItem of modules) {
    const lessons = Array.isArray(moduleItem.lessons) ? moduleItem.lessons : [];

    for (const lesson of lessons) {
      const lessonPathId = String(lesson.pathId || "").trim();
      const lessonSubjectId = String(lesson.subjectId || "").trim();
      if (isScopeMismatch(lessonPathId, lessonSubjectId, coursePathId, courseSubjectId)) {
        throw badRequest(`Lesson scope mismatch in module \"${String(moduleItem.title || "")}\"`);
      }

      const quizId = String(lesson.quizId || "").trim();
      if (quizId) {
        const idCandidates = getRefIdCandidates(quizId);
        const quizDoc = await QuizModel.findOne(buildRefLookup(idCandidates))
          .select("pathId subjectId")
          .lean();

        if (!quizDoc) {
          throw badRequest(`Referenced quiz not found: ${quizId}`);
        }

        if (
          isScopeMismatch(
            String((quizDoc as { pathId?: string }).pathId || ""),
            String((quizDoc as { subjectId?: string }).subjectId || ""),
            coursePathId,
            courseSubjectId,
          )
        ) {
          throw badRequest(`Quiz scope mismatch: ${quizId}`);
        }
      }

      const lessonIdCandidates = getRefIdCandidates(String(lesson.id || ""));
      if (lessonIdCandidates.length > 0) {
        const lessonDoc = await LessonModel.findOne(buildRefLookup(lessonIdCandidates))
          .select("pathId subjectId")
          .lean();

        if (lessonDoc) {
          if (
            isScopeMismatch(
              String((lessonDoc as { pathId?: string }).pathId || ""),
              String((lessonDoc as { subjectId?: string }).subjectId || ""),
              coursePathId,
              courseSubjectId,
            )
          ) {
            throw badRequest(`Lesson import scope mismatch: ${String(lesson.id || "")}`);
          }
        }
      }
    }
  }
};

export const courseRouter = Router();

const PUBLIC_COURSE_LIST_CACHE_TTL_MS = 60 * 1000;
let publicCourseListCache:
  | {
      key: string;
      expiresAt: number;
      payload: {
        courses: unknown[];
        pagination: ReturnType<typeof buildPaginatedResponse>;
      };
    }
  | null = null;

const clearPublicCourseListCache = () => {
  publicCourseListCache = null;
};

courseRouter.use((req, _res, next) => {
  if (req.method !== "GET") {
    clearPublicCourseListCache();
  }
  next();
});

courseRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaffViewer = isStaffRole(req.authUser?.role);
    const query = courseListQuerySchema.parse(req.query);
    const pagination = resolvePagination(query, { limit: 200 });
    const cacheKey = [
      pagination.page,
      pagination.limit,
      query.pathId || "all-paths",
      query.subjectId || "all-subjects",
      query.search || "",
      query.kind || "all",
    ].join(":");

    if (!isStaffViewer && publicCourseListCache?.key === cacheKey && publicCourseListCache.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("X-Course-List-Cache", "hit");
      return res.json(publicCourseListCache.payload);
    }

    const scopedFilter: Record<string, unknown> = {};
    if (query.kind === 'learning') scopedFilter.isPackage = { $ne: true };
    if (query.kind === 'package') scopedFilter.isPackage = true;
    if (query.pathId) scopedFilter.pathId = query.pathId;
    if (query.subjectId) {
      scopedFilter.$or = [{ subjectId: query.subjectId }, { subject: query.subjectId }];
    }
    if (query.search) {
      const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      scopedFilter.$and = [
        ...((scopedFilter.$and as Record<string, unknown>[] | undefined) || []),
        {
          $or: [
            { title: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: safeSearch, $options: "i" } },
          ],
        },
      ];
    }

    const visibilityFilter = await withLearnerVisiblePaths(buildCourseVisibilityFilter(req.authUser), req.authUser);
    const filterParts = [visibilityFilter, scopedFilter].filter((item) => Object.keys(item).length > 0);
    const filter = filterParts.length > 1 ? { $and: filterParts } : filterParts[0] || {};
    const [items, total] = await Promise.all([
      CourseModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      CourseModel.countDocuments(filter),
    ]);
    const projectedItems = isStaffViewer ? items : items.map(projectRestrictedCoursePayload);
    const payload = {
      courses: projectedItems,
      pagination: buildPaginatedResponse([], pagination, total),
    };

    if (!isStaffViewer) {
      publicCourseListCache = {
        key: cacheKey,
        expiresAt: Date.now() + PUBLIC_COURSE_LIST_CACHE_TTL_MS,
        payload,
      };
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("X-Course-List-Cache", "miss");
    }

    res.json(payload);
  }),
);

courseRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const visibilityFilter = await withLearnerVisiblePaths(buildCourseVisibilityFilter(req.authUser), req.authUser);
    const identityFilter = buildCourseIdentityQuery(req.params.id);
    const item = await CourseModel.findOne({
      $and: [identityFilter, visibilityFilter],
    }).lean();
    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }

    if (isStaffRole(req.authUser?.role)) {
      return res.json(item);
    }

    const entitled = req.authUser?.id
      ? await hasCourseEntitlement(req.authUser.id, item)
      : false;
    return res.json(entitled ? item : projectRestrictedCoursePayload(item));
  }),
);

courseRouter.post(
  "/",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = courseSchema.parse(req.body);
    const normalizedPayload = {
      ...payload,
      modules: normalizeCourseModules(payload.modules),
      assessments: normalizeCourseAssessments(payload.assessments),
      title: String(payload.title || "").trim() || "Untitled Course",
      instructor: String(payload.instructor || "").trim() || "Platform Team",
    };
    await assertCurriculumImportScope({
      coursePathId: normalizedPayload.pathId,
      courseSubjectId: normalizedPayload.subjectId,
      modules: normalizedPayload.modules as CurriculumModule[],
    });
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const courseId = String(normalizedPayload.id || `course_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
    const created = await CourseModel.create({
      ...normalizedPayload,
      id: courseId,
      _id: courseId,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? normalizedPayload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
      isPublished: req.authUser?.role === "admin" ? normalizedPayload.isPublished : false,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

const handleCourseUpdate = asyncHandler(async (req, res) => {
  const payload = courseSchema.partial().parse(req.body);
  const normalizedPayload = {
    ...payload,
    ...(Object.prototype.hasOwnProperty.call(payload, "modules")
      ? { modules: normalizeCourseModules(payload.modules) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "assessments")
      ? { assessments: normalizeCourseAssessments(payload.assessments) }
      : {}),
  } as Record<string, unknown>;
  const existing = await CourseModel.findOne(buildOwnedCourseQuery(req.params.id, req.authUser!)).lean();
  if (!existing) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
  }

  const nextPathId = String(normalizedPayload.pathId || (existing as { pathId?: string }).pathId || "").trim();
  const nextSubjectId = String(normalizedPayload.subjectId || (existing as { subjectId?: string }).subjectId || "").trim();
  const nextModules = Array.isArray(normalizedPayload.modules)
    ? (normalizedPayload.modules as CurriculumModule[])
    : ((existing as { modules?: CurriculumModule[] }).modules || []);

  await assertCurriculumImportScope({
    coursePathId: nextPathId,
    courseSubjectId: nextSubjectId,
    modules: nextModules,
  });

  const sanitizedPayload = sanitizeWorkflowUpdate(normalizedPayload, req.authUser!);
  if (Object.prototype.hasOwnProperty.call(sanitizedPayload, "title")) {
    const value = typeof sanitizedPayload.title === "string" ? sanitizedPayload.title.trim() : "";
    if (value) {
      sanitizedPayload.title = value;
    } else {
      delete sanitizedPayload.title;
    }
  }
  if (Object.prototype.hasOwnProperty.call(sanitizedPayload, "instructor")) {
    const value = typeof sanitizedPayload.instructor === "string" ? sanitizedPayload.instructor.trim() : "";
    if (value) {
      sanitizedPayload.instructor = value;
    } else {
      delete sanitizedPayload.instructor;
    }
  }
  const updated = await CourseModel.findOneAndUpdate(
    { _id: (existing as { _id: string })._id },
    sanitizedPayload,
    { new: true },
  );
  if (!updated) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
  }
  return res.json(updated);
});

courseRouter.patch("/:id", requireAuth, requireRole(["admin", "teacher", "supervisor"]), handleCourseUpdate);
courseRouter.put("/:id", requireAuth, requireRole(["admin", "teacher", "supervisor"]), handleCourseUpdate);

courseRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await CourseModel.findOneAndDelete(buildOwnedCourseQuery(req.params.id, req.authUser!));
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }
    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);

const handleCourseEnrollment = asyncHandler(async (req, res) => {
  const requestedCourseId = String(req.params.id || "").trim();
  const identityFilter = buildCourseIdentityQuery(requestedCourseId);
  const visibilityFilter = await withLearnerVisiblePaths(buildCourseVisibilityFilter(req.authUser), req.authUser);
  const course = await CourseModel.findOne({ $and: [identityFilter, visibilityFilter] });

  if (!course) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
  }

  const user = await UserModel.findById(req.authUser!.id);
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User account not found" });
  }

  const courseId = String(course.id || course._id || requestedCourseId);
  const currentEnrolled = Array.isArray(user.enrolledCourses)
    ? user.enrolledCourses.map(String)
    : [];
  const currentPurchased = Array.isArray(user.subscription?.purchasedCourses)
    ? user.subscription.purchasedCourses.map(String)
    : [];

  if (
    currentEnrolled.includes(courseId) ||
    currentEnrolled.includes(requestedCourseId) ||
    currentPurchased.includes(courseId) ||
    currentPurchased.includes(requestedCourseId)
  ) {
    return res.status(StatusCodes.OK).json({
      success: true,
      enrolled: true,
      alreadyEnrolled: true,
      courseId,
      message: "Already enrolled in course",
    });
  }

  if (Number(course.price || 0) > 0) {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      enrolled: false,
      code: "COURSE_PURCHASE_REQUIRED",
      courseId,
      message: "Paid course requires verified purchase or package access",
    });
  }

  currentEnrolled.push(courseId);
  user.enrolledCourses = currentEnrolled;
  await user.save();

  await CourseModel.updateOne({ _id: course._id }, { $inc: { studentCount: 1 } });

  return res.status(StatusCodes.OK).json({
    success: true,
    enrolled: true,
    alreadyEnrolled: false,
    courseId,
    message: "Enrolled in course successfully",
  });
});

courseRouter.post("/:id/enroll", requireAuth, handleCourseEnrollment);
courseRouter.post("/:id/join", requireAuth, handleCourseEnrollment);
