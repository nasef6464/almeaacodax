import { CourseModel } from "../../../models/Course.js";
import { LessonModel } from "../../../models/Lesson.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { UserModel } from "../../../models/User.js";

const trainerOwnershipQuery = (trainerId: string) => ({
  $or: [{ ownerId: trainerId }, { createdBy: trainerId }, { assignedTeacherId: trainerId }],
});

const getTrainerPortfolioStats = async (ownership: ReturnType<typeof trainerOwnershipQuery>) => {
  const statusSummary = (model: any) => model.aggregate([
    { $match: ownership },
    { $group: { _id: { $ifNull: ["$approvalStatus", "draft"] }, count: { $sum: 1 } } },
  ]);
  const [courseCount, lessonCount, questionCount, quizCount, libraryCount, ...statusGroups] = await Promise.all([
    CourseModel.countDocuments(ownership),
    LessonModel.countDocuments(ownership),
    QuestionModel.countDocuments(ownership),
    QuizModel.countDocuments(ownership),
    LibraryItemModel.countDocuments(ownership),
    statusSummary(CourseModel),
    statusSummary(LessonModel),
    statusSummary(QuestionModel),
    statusSummary(QuizModel),
    statusSummary(LibraryItemModel),
    CourseModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LessonModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    QuestionModel.countDocuments({ ...ownership, approvalStatus: "approved" }),
    QuizModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LibraryItemModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LessonModel.countDocuments({ ...ownership, type: "video" }),
  ]);
  const videos = Number(statusGroups.pop() || 0);
  const publishedCounts = statusGroups.splice(-5) as number[];
  const statuses = { draft: 0, pending_review: 0, approved: 0, rejected: 0, published: 0 };
  statusGroups.flat().forEach((group: any) => {
    const status = String(group._id || "draft") as keyof typeof statuses;
    if (status in statuses) statuses[status] += Number(group.count || 0);
  });
  statuses.published = publishedCounts.reduce((total, count) => total + Number(count || 0), 0);
  return { total: courseCount + lessonCount + questionCount + quizCount + libraryCount, courses: courseCount, lessons: lessonCount, videos, questions: questionCount, quizzes: quizCount, libraryItems: libraryCount, ...statuses };
};

export const getTrainerPortfolio = async (trainerId: string, includeItems = false) => {
  const ownership = trainerOwnershipQuery(trainerId);
  const statsPromise = getTrainerPortfolioStats(ownership);
  if (!includeItems) return { stats: await statsPromise, items: undefined };

  const limit = 100;
  const [courses, lessons, questions, quizzes, libraryItems, stats] = await Promise.all([
    CourseModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    LessonModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    QuestionModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id text approvalStatus pathId subject updatedAt").lean(),
    QuizModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    LibraryItemModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    statsPromise,
  ]);
  return { stats, items: { courses, lessons, questions, quizzes, libraryItems } };
};

export const getTrainerPerformance = async (trainerId: string) => {
  const courses = await CourseModel.find(trainerOwnershipQuery(trainerId)).select("_id modules").lean();
  const courseIds = courses.map((course: any) => String(course._id));
  const quizIds = (await QuizModel.find(trainerOwnershipQuery(trainerId)).select("id _id").lean()).map((quiz: any) => String(quiz.id || quiz._id));
  const [enrolledStudents, quizSummary] = await Promise.all([
    courseIds.length ? UserModel.find({ role: "student", enrolledCourses: { $in: courseIds } }).select("enrolledCourses completedLessons").lean() : [],
    quizIds.length ? QuizResultModel.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: null, attempts: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } }, averageScore: { $avg: "$score" } } },
    ]) : [],
  ]);
  const lessonIdsByCourse = new Map(courses.map((course: any) => [
    String(course._id),
    (course.modules || []).flatMap((module: any) => (module.lessons || []).map((lesson: any) => String(lesson.id))).filter(Boolean),
  ]));
  let measurableEnrollments = 0;
  let completedEnrollments = 0;
  for (const student of enrolledStudents as any[]) {
    const completedLessons = new Set((student.completedLessons || []).map(String));
    for (const courseId of (student.enrolledCourses || []).map(String).filter((id: string) => courseIds.includes(id))) {
      const lessonIds = lessonIdsByCourse.get(courseId) || [];
      if (!lessonIds.length) continue;
      measurableEnrollments += 1;
      if (lessonIds.every((lessonId: string) => completedLessons.has(lessonId))) completedEnrollments += 1;
    }
  }
  const results = quizSummary[0] || { attempts: 0, passed: 0, averageScore: null };
  return {
    enrolledStudents: enrolledStudents.length,
    measurableEnrollments,
    completedEnrollments,
    completionRate: measurableEnrollments ? Math.round((completedEnrollments / measurableEnrollments) * 100) : null,
    quizAttempts: Number(results.attempts || 0),
    passedQuizAttempts: Number(results.passed || 0),
    averageQuizScore: results.averageScore == null ? null : Math.round(Number(results.averageScore)),
    revenue: { available: false, reason: "لا يوجد مصدر إيراد أو دفع موثوق لحساب مستحقات المدرب." },
  };
};
