import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { AiInteractionModel } from "../models/AiInteraction.js";
import { BackupSnapshotModel } from "../models/BackupSnapshot.js";
import { ClientEventModel } from "../models/ClientEvent.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { PathModel } from "../models/Path.js";
import { QuizModel } from "../models/Quiz.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { SubjectModel } from "../models/Subject.js";
import { TopicModel } from "../models/Topic.js";
import { createOperationsAudit } from "../services/operationsAudit.js";
import { runOperationsRepair, type OperationsRepairAction } from "../services/operationsRepair.js";

export const operationsRouter = Router();

const clientEventSchema = z.object({
  severity: z.enum(["info", "warning", "error"]).default("error"),
  source: z
    .enum(["app", "error-boundary", "unhandled-error", "unhandled-rejection", "video-player", "api", "manual"])
    .default("app"),
  message: z.string().min(1).max(800),
  stack: z.string().max(3000).optional().default(""),
  path: z.string().max(500).optional().default(""),
  appVersion: z.string().max(120).optional().default(""),
  userAgent: z.string().max(500).optional().default(""),
  metadata: z.record(z.any()).optional().default({}),
});

const resolveClientEventsSchema = z.object({
  severity: z.enum(["info", "warning", "error"]).optional(),
  source: z
    .enum(["app", "error-boundary", "unhandled-error", "unhandled-rejection", "video-player", "api", "manual"])
    .optional(),
});

const idOf = (item: any) => String(item?.id || item?._id || "");

const safeString = (value: unknown, maxLength: number) => String(value || "").slice(0, maxLength);

const isVisibleContent = (item: any) =>
  item?.showOnPlatform !== false &&
  item?.isPublished !== false &&
  (!item?.approvalStatus || item.approvalStatus === "approved");

const sanitizeVideoUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return "";

  let trimmedUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmedUrl) return "";

  trimmedUrl = trimmedUrl
    .replace(/^https?:\/\/https?:\/\//i, "https://")
    .replace(/^https?:\/\/:\/\//i, "https://")
    .replace(/^:\/\//, "https://")
    .replace(/^\/\//, "https://");

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};

const hasPlayableLessonMedia = (lesson: any) =>
  Boolean(
    sanitizeVideoUrl(lesson?.videoUrl) ||
      String(lesson?.fileUrl || "").trim() ||
      String(lesson?.content || "").trim() ||
      String(lesson?.recordingUrl || "").trim(),
  );

operationsRouter.get("/status", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
  try {
    const [paths, subjects, topics, lessons, quizzes, courses, libraryItems] = await Promise.all([
      PathModel.find().lean(),
      SubjectModel.find().lean(),
      TopicModel.find().lean(),
      LessonModel.find().lean(),
      QuizModel.find().lean(),
      CourseModel.find().lean(),
      LibraryItemModel.find().lean(),
    ]);

    const activePathIds = new Set(paths.filter((path: any) => path.isActive !== false).map(idOf));
    const visibleSubjects = subjects.filter((subject: any) => activePathIds.has(subject.pathId));
    const visibleTopics = topics.filter((topic: any) => topic.showOnPlatform !== false && activePathIds.has(topic.pathId));
    const visibleLessons = lessons.filter((lesson: any) => isVisibleContent(lesson) && activePathIds.has(lesson.pathId));
    const visibleQuizzes = quizzes.filter((quiz: any) => isVisibleContent(quiz) && activePathIds.has(quiz.pathId));
    const visibleCourses = courses.filter((course: any) => isVisibleContent(course) && activePathIds.has(course.pathId || course.category));
    const visibleLibraryItems = libraryItems.filter((item: any) => isVisibleContent(item) && activePathIds.has(item.pathId));

    const visibleSubjectIds = new Set(visibleSubjects.map(idOf));
    const lessonIds = new Set(visibleLessons.map(idOf));
    const quizIds = new Set(visibleQuizzes.map(idOf));
    const lessonById = new Map(visibleLessons.map((lesson: any) => [idOf(lesson), lesson]));

    const spaces = visibleSubjects.map((subject: any) => {
      const subjectId = idOf(subject);
      const pathId = subject.pathId;
      const topicCount = visibleTopics.filter((item: any) => item.pathId === pathId && item.subjectId === subjectId).length;
      const lessonCount = visibleLessons.filter((item: any) => item.pathId === pathId && item.subjectId === subjectId).length;
      const quizCount = visibleQuizzes.filter((item: any) => item.pathId === pathId && item.subjectId === subjectId).length;
      const courseCount = visibleCourses.filter(
        (item: any) => (item.pathId || item.category) === pathId && (item.subjectId || item.subject) === subjectId,
      ).length;
      const libraryCount = visibleLibraryItems.filter((item: any) => item.pathId === pathId && item.subjectId === subjectId).length;

      return {
        pathId,
        subjectId,
        subjectName: subject.name,
        total: topicCount + lessonCount + quizCount + courseCount + libraryCount,
        topics: topicCount,
        lessons: lessonCount,
        quizzes: quizCount,
        courses: courseCount,
        library: libraryCount,
      };
    });

    const missingTopicSubjects = visibleTopics.filter((topic: any) => topic.subjectId && !visibleSubjectIds.has(topic.subjectId)).length;
    const missingLessonRefs = visibleTopics.reduce(
      (total: number, topic: any) => total + (topic.lessonIds || []).filter((lessonId: string) => !lessonIds.has(String(lessonId))).length,
      0,
    );
    const missingQuizRefs = visibleTopics.reduce(
      (total: number, topic: any) => total + (topic.quizIds || []).filter((quizId: string) => !quizIds.has(String(quizId))).length,
      0,
    );
    const unplayableLinkedLessons = visibleTopics.reduce(
      (total: number, topic: any) =>
        total +
        (topic.lessonIds || []).filter((lessonId: string) => {
          const lesson = lessonById.get(String(lessonId));
          return lesson && !hasPlayableLessonMedia(lesson);
        }).length,
      0,
    );

    const emptySpaces = spaces.filter((space) => space.total === 0).length;
    const usableSpaces = spaces.filter((space) => space.total > 0).length;
    const issueCount = missingTopicSubjects + missingLessonRefs + missingQuizRefs + unplayableLinkedLessons + emptySpaces;
    const readinessScore = spaces.length
      ? Math.max(0, Math.min(100, Math.round(((spaces.length - emptySpaces) / spaces.length) * 70 + (issueCount === 0 ? 30 : 0))))
      : 0;

    res.json({
      checkedAt: new Date().toISOString(),
      database: {
        status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        name: mongoose.connection.db?.databaseName || "unknown",
      },
      counts: {
        paths: paths.length,
        subjects: subjects.length,
        topics: topics.length,
        lessons: lessons.length,
        quizzes: quizzes.length,
        courses: courses.length,
        libraryItems: libraryItems.length,
      },
      visible: {
        paths: activePathIds.size,
        subjects: visibleSubjects.length,
        topics: visibleTopics.length,
        lessons: visibleLessons.length,
        quizzes: visibleQuizzes.length,
        courses: visibleCourses.length,
        libraryItems: visibleLibraryItems.length,
      },
      learningReadiness: {
        score: readinessScore,
        usableSpaces,
        emptySpaces,
        spaces: spaces.slice(0, 12),
      },
      issues: {
        missingTopicSubjects,
        missingLessonRefs,
        missingQuizRefs,
        unplayableLinkedLessons,
      },
      deployment: {
        api: "Render",
        database: "MongoDB Atlas",
        frontend: "Vercel",
        nodeEnv: process.env.NODE_ENV || "development",
        clientUrl: process.env.CLIENT_URL || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

operationsRouter.get("/audit", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
  try {
    res.json(await createOperationsAudit());
  } catch (error) {
    next(error);
  }
});

operationsRouter.get("/delivery-readiness", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const audit = await createOperationsAudit();

    const [
      latestBackup,
      unresolvedClientErrors,
      clientErrors24h,
      aiErrors24h,
      studentChats24h,
      personalizedStudentChats7d,
      studentsWithResults,
      weakSkillSignals,
    ] = await Promise.all([
      BackupSnapshotModel.findOne({ kind: "learning-content" }).sort({ createdAt: -1 }).lean(),
      ClientEventModel.countDocuments({ resolved: false, severity: "error" }),
      ClientEventModel.countDocuments({ severity: "error", createdAt: { $gte: since24h } }),
      AiInteractionModel.countDocuments({ status: "error", createdAt: { $gte: since24h } }),
      AiInteractionModel.countDocuments({ endpoint: "/ai/chat", audience: "student", createdAt: { $gte: since24h } }),
      AiInteractionModel.countDocuments({ endpoint: "/ai/chat", audience: "student", personalized: true, createdAt: { $gte: since7d } }),
      QuizResultModel.distinct("userId").then((ids) => ids.length),
      SkillProgressModel.countDocuments({ status: { $in: ["weak", "average"] } }),
    ]);

    const backupCreatedAt = latestBackup?.createdAt ? new Date(latestBackup.createdAt) : null;
    const backupAgeHours = backupCreatedAt ? Math.round((Date.now() - backupCreatedAt.getTime()) / (60 * 60 * 1000)) : null;
    const backupFresh = typeof backupAgeHours === "number" && backupAgeHours <= 72;
    const backupOld = typeof backupAgeHours === "number" && backupAgeHours > 72 && backupAgeHours <= 24 * 14;

    const checks = [
      {
        id: "database",
        title: "قاعدة البيانات",
        status: mongoose.connection.readyState === 1 ? "pass" : "fail",
        detail: mongoose.connection.readyState === 1 ? `متصل بقاعدة ${mongoose.connection.db?.databaseName || "MongoDB"}.` : "الخادم غير متصل بقاعدة البيانات.",
        action: "راجع MONGODB_URI في Render وأعد النشر عند الحاجة.",
        routeHint: "",
      },
      {
        id: "content",
        title: "رحلة الطالب والمحتوى",
        status: audit.totals.critical > 0 ? "fail" : audit.score >= 80 ? "pass" : "warning",
        detail: `درجة الفحص ${audit.score}/100، حرجة ${audit.totals.critical}، تنبيهات ${audit.totals.warnings}.`,
        action: "افتح مركز القيادة وعالج أولويات المحتوى قبل التسليم النهائي.",
        routeHint: "#/admin-dashboard?tab=monitoring",
      },
      {
        id: "backup",
        title: "النسخ الاحتياطي",
        status: backupFresh ? "pass" : backupOld ? "warning" : "fail",
        detail: backupCreatedAt
          ? `آخر نسخة محفوظة منذ ${backupAgeHours} ساعة، وبها ${latestBackup?.totalDocuments || 0} عنصر.`
          : "لا توجد نسخة احتياطية محفوظة على السيرفر حتى الآن.",
        action: "افتح النسخ الاحتياطي واحفظ نسخة قبل أي دفعة محتوى كبيرة أو قبل التسليم.",
        routeHint: "#/admin-dashboard?tab=backups",
      },
      {
        id: "client-errors",
        title: "أخطاء الواجهة",
        status: unresolvedClientErrors === 0 && clientErrors24h === 0 ? "pass" : clientErrors24h > 0 ? "fail" : "warning",
        detail: `أخطاء آخر 24 ساعة: ${clientErrors24h}، غير مغلقة: ${unresolvedClientErrors}.`,
        action: "راجع سجل أخطاء الواجهة داخل مركز القيادة عند ظهور أي صفحة بيضاء أو خطأ فيديو.",
        routeHint: "#/admin-dashboard?tab=monitoring",
      },
      {
        id: "ai",
        title: "المساعد الذكي",
        status: aiErrors24h > 0 ? "warning" : studentsWithResults > 0 ? "pass" : "warning",
        detail: `طلاب لديهم نتائج: ${studentsWithResults}، إشارات مهارية: ${weakSkillSignals}، محادثات طالب آخر 24 ساعة: ${studentChats24h}.`,
        action: "اربط مزود ذكاء من Render عند الحاجة، واجعل الطلاب يجرون اختبارات حتى يصبح التوجيه شخصيا.",
        routeHint: "#/admin-dashboard?tab=ai-assistant",
      },
      {
        id: "personalization",
        title: "التوجيه الشخصي",
        status: personalizedStudentChats7d > 0 || weakSkillSignals > 0 ? "pass" : "warning",
        detail: `محادثات شخصية آخر 7 أيام: ${personalizedStudentChats7d}.`,
        action: "اربط نتائج الاختبارات بالمهارات حتى يعرف المساعد نقاط ضعف الطالب.",
        routeHint: "#/admin-dashboard?tab=questions",
      },
    ];

    const failed = checks.filter((item) => item.status === "fail").length;
    const warnings = checks.filter((item) => item.status === "warning").length;
    const score = Math.max(0, Math.min(100, Math.round(100 - failed * 18 - warnings * 7)));

    res.json({
      checkedAt: new Date().toISOString(),
      score,
      status: failed > 0 ? "blocked" : warnings > 0 ? "ready_with_notes" : "ready",
      summary: {
        failed,
        warnings,
        passed: checks.filter((item) => item.status === "pass").length,
        auditScore: audit.score,
        latestBackupAt: backupCreatedAt?.toISOString() || "",
        backupAgeHours,
        clientErrors24h,
        aiErrors24h,
      },
      checks,
      nextActions: checks
        .filter((item) => item.status !== "pass")
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          action: item.action,
          routeHint: item.routeHint,
        })),
    });
  } catch (error) {
    next(error);
  }
});

operationsRouter.post("/client-events", optionalAuth, async (req, res, next) => {
  try {
    const payload = clientEventSchema.parse(req.body || {});
    const authUser = req.authUser;

    await ClientEventModel.create({
      severity: payload.severity,
      source: payload.source,
      message: safeString(payload.message, 800),
      stack: safeString(payload.stack, 3000),
      path: safeString(payload.path, 500),
      appVersion: safeString(payload.appVersion, 120),
      userAgent: safeString(payload.userAgent, 500),
      userId: authUser?.id || "",
      userEmail: authUser?.email || "",
      role: authUser?.role || "",
      metadata: payload.metadata,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

operationsRouter.get("/client-events", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
    const severity = String(req.query.severity || "");
    const filter = ["info", "warning", "error"].includes(severity) ? { severity } : {};
    const events = await ClientEventModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    const unresolvedCount = await ClientEventModel.countDocuments({ resolved: false });
    const last24hCount = await ClientEventModel.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      events,
      summary: {
        unresolvedCount,
        last24hCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

operationsRouter.patch("/client-events/:id/resolve", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid client event id" });
    }

    const authUser = req.authUser;
    const event = await ClientEventModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: authUser?.id || "",
          resolvedByEmail: authUser?.email || "",
        },
      },
      { new: true },
    ).lean();

    if (!event) {
      return res.status(404).json({ message: "Client event not found" });
    }

    res.json({ ok: true, event });
  } catch (error) {
    next(error);
  }
});

operationsRouter.post("/client-events/resolve-all", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = resolveClientEventsSchema.parse(req.body || {});
    const authUser = req.authUser;
    const filter: Record<string, unknown> = { resolved: false };
    if (payload.severity) {
      filter.severity = payload.severity;
    }
    if (payload.source) {
      filter.source = payload.source;
    }

    const result = await ClientEventModel.updateMany(filter, {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: authUser?.id || "",
        resolvedByEmail: authUser?.email || "",
      },
    });

    res.json({
      ok: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

operationsRouter.post("/repair", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const action = String(req.body?.action || "") as OperationsRepairAction;
    const apply = req.body?.apply === true;
    if (
      ![
        "hide-empty-published-quizzes",
        "hide-empty-active-paths",
        "unlink-unavailable-topic-lessons",
        "unlink-unavailable-topic-quizzes",
      ].includes(action)
    ) {
      return res.status(400).json({
        message: "Unsupported repair action",
      });
    }

    res.json(await runOperationsRepair(action, apply));
  } catch (error) {
    next(error);
  }
});
