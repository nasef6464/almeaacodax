import { Router } from "express";
import { z } from "zod";
import { optionalAuth } from "../middleware/auth.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { QuestionModel } from "../models/Question.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  type: z.enum(["all", "lesson", "question", "course"]).default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});

export const searchRouter = Router();

searchRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const query = searchQuerySchema.parse(req.query);
    const keyword = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(keyword, "i");

    const includeCourses = query.type === "all" || query.type === "course";
    const includeLessons = query.type === "all" || query.type === "lesson";
    const includeQuestions = query.type === "all" || query.type === "question";

    const [courses, lessons, questions] = await Promise.all([
      includeCourses
        ? CourseModel.find({
            isPublished: true,
            showOnPlatform: { $ne: false },
            $or: [{ title: matcher }, { description: matcher }],
          })
            .select("_id title description pathId subjectId category")
            .limit(query.limit)
            .lean()
        : Promise.resolve([]),
      includeLessons
        ? LessonModel.find({
            showOnPlatform: { $ne: false },
            approvalStatus: "approved",
            $or: [{ title: matcher }, { description: matcher }, { content: matcher }],
          })
            .select("id title description pathId subjectId sectionId type")
            .limit(query.limit)
            .lean()
        : Promise.resolve([]),
      includeQuestions
        ? QuestionModel.find({
            approvalStatus: "approved",
            $or: [{ text: matcher }, { explanation: matcher }],
          })
            .select("id text pathId subject sectionId difficulty")
            .limit(query.limit)
            .lean()
        : Promise.resolve([]),
    ]);

    return res.json({
      q: query.q,
      type: query.type,
      results: {
        courses: courses.map((course: any) => ({
          id: String(course._id),
          title: String(course.title || ""),
          subtitle: String(course.description || ""),
          route: `/course/${String(course._id)}`,
          pathId: String(course.pathId || ""),
          subjectId: String(course.subjectId || ""),
        })),
        lessons: lessons.map((lesson: any) => ({
          id: String(lesson.id || lesson._id),
          title: String(lesson.title || ""),
          subtitle: String(lesson.description || lesson.type || ""),
          route:
            lesson.pathId && lesson.subjectId
              ? `/category/${String(lesson.pathId)}?subject=${encodeURIComponent(String(lesson.subjectId))}`
              : "/dashboard",
          pathId: String(lesson.pathId || ""),
          subjectId: String(lesson.subjectId || ""),
          sectionId: String(lesson.sectionId || ""),
        })),
        questions: questions.map((question: any) => ({
          id: String(question.id || question._id),
          title: String(question.text || "").slice(0, 120),
          subtitle: String(question.difficulty || ""),
          route:
            question.pathId && question.subject
              ? `/category/${String(question.pathId)}?subject=${encodeURIComponent(String(question.subject))}&tab=tests`
              : "/quizzes",
          pathId: String(question.pathId || ""),
          subjectId: String(question.subject || ""),
          sectionId: String(question.sectionId || ""),
        })),
      },
    });
  }),
);
