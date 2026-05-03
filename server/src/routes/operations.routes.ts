import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { ClientEventModel } from "../models/ClientEvent.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { PathModel } from "../models/Path.js";
import { QuizModel } from "../models/Quiz.js";
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

operationsRouter.post("/repair", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const action = String(req.body?.action || "") as OperationsRepairAction;
    const apply = req.body?.apply === true;
    if (!["hide-empty-published-quizzes", "hide-empty-active-paths", "unlink-unavailable-topic-quizzes"].includes(action)) {
      return res.status(400).json({
        message: "Unsupported repair action",
      });
    }

    res.json(await runOperationsRepair(action, apply));
  } catch (error) {
    next(error);
  }
});
