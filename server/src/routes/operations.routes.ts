import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth.js";
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

const idOf = (item: any) => String(item?.id || item?._id || "");

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

operationsRouter.post("/repair", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const action = String(req.body?.action || "") as OperationsRepairAction;
    const apply = req.body?.apply === true;
    if (!["hide-empty-published-quizzes", "hide-empty-active-paths"].includes(action)) {
      return res.status(400).json({
        message: "Unsupported repair action",
      });
    }

    res.json(await runOperationsRepair(action, apply));
  } catch (error) {
    next(error);
  }
});
