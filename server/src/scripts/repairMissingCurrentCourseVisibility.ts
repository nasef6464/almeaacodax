import mongoose from "mongoose";
import { env } from "../config/env.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { PathModel } from "../models/Path.js";
import { QuizModel } from "../models/Quiz.js";
import { SubjectModel } from "../models/Subject.js";
import { TopicModel } from "../models/Topic.js";

type AnyDoc = Record<string, any>;

const idOf = (item: AnyDoc | null | undefined) => String(item?.id || item?._id || "");
const slug = (value: string) => value.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");

const getArgValue = (name: string) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const subjectTemplate = (subjectName: string, pathName = "") => {
  const searchableName = `${subjectName} ${pathName}`;
  const isVerbal = /لفظ|لغة|قراءة|نص/.test(searchableName);
  const isScience = /تحصيلي|رياض|فيز|كيم|أحيا|احيا|علوم/.test(searchableName);

  if (isVerbal) {
    return {
      topicTitle: "فهم السياق والفكرة الرئيسية",
      quizTitle: "تدريب اللفظي: فهم السياق",
      courseTitle: "تأسيس اللفظي: فهم المقروء",
      description: `مسار تأسيسي مختصر في ${subjectName}`,
    };
  }

  if (isScience) {
    return {
      topicTitle: "أساسيات المادة والقوانين المهمة",
      quizTitle: `تدريب ${subjectName}: المفاهيم الأساسية`,
      courseTitle: `تأسيس ${subjectName}`,
      description: `مسار تأسيسي مختصر في ${subjectName}`,
    };
  }

  return {
    topicTitle: "ترتيب العمليات والمهارات الأساسية",
    quizTitle: "تدريب الكمي: العمليات والمهارات الأساسية",
    courseTitle: "تأسيس الكمي: العمليات والمهارات الأساسية",
    description: `مسار تأسيسي مختصر في ${subjectName}`,
  };
};

export async function repairMissingCurrentCourseVisibility() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12000 });

  const targetPathId = getArgValue("pathId");
  const targetSubjectId = getArgValue("subjectId");
  const activePaths = await PathModel.find({
    isActive: { $ne: false },
    ...(targetPathId ? { _id: targetPathId } : {}),
  }).lean();
  const activePathIds = activePaths.map(idOf);
  const subjects = await SubjectModel.find({
    pathId: { $in: activePathIds },
    ...(targetSubjectId ? { _id: targetSubjectId } : {}),
  }).lean();

  const repaired: AnyDoc[] = [];
  const skipped: AnyDoc[] = [];

  for (const subject of subjects) {
    const subjectId = idOf(subject);
    const pathId = String(subject.pathId || "");
    const pathDoc = activePaths.find((item) => idOf(item) === pathId);
    const suffix = slug(`${pathId}_${subjectId}`);
    const topicId = `topic_current_${suffix}_foundation`;
    const lessonId = `lesson_current_${suffix}_intro`;
    const quizId = `quiz_current_${suffix}_practice`;
    const courseId = `course_current_${suffix}_foundation`;

    const [lesson, existingCourse, existingTopic] = await Promise.all([
      LessonModel.findOne({ id: lessonId }).lean(),
      CourseModel.findOne({ _id: courseId }).lean(),
      TopicModel.findOne({ id: topicId }).lean(),
    ]);

    if (!lesson) {
      skipped.push({ pathId, subjectId, reason: "missing-current-lesson", lessonId, courseId });
      continue;
    }

    const template = subjectTemplate(String(subject.name || subjectId), String(pathDoc?.name || ""));
    const lessonTitle = String(lesson.title || template.topicTitle);
    const moduleTitle = String(existingCourse?.modules?.[0]?.title || existingTopic?.title || template.topicTitle);
    const modules =
      Array.isArray(existingCourse?.modules) && existingCourse.modules.length
        ? existingCourse.modules
        : [
            {
              title: moduleTitle,
              order: 1,
              lessons: [{ id: lessonId, title: String(lesson.title || lessonTitle), type: lesson.type || "video" }],
            },
          ];

    await QuizModel.updateOne(
      { id: quizId },
      {
        $setOnInsert: {
          id: quizId,
          title: template.quizTitle,
          description: `تدريب سريع مرتبط بمادة ${subject.name || subjectId}`,
          sectionId: null,
          type: "bank",
          mode: "regular",
          settings: {
            showExplanations: true,
            showAnswers: true,
            maxAttempts: 3,
            passingScore: 60,
            timeLimit: 30,
          },
          access: { type: "free", price: 0, allowedGroupIds: [] },
          questionIds: [],
          skillIds: [topicId],
          ownerType: "platform",
        },
        $set: {
          pathId,
          subjectId,
          isPublished: true,
          showOnPlatform: true,
          approvalStatus: "approved",
        },
      },
      { upsert: true },
    );

    await TopicModel.updateOne(
      { id: topicId },
      {
        $setOnInsert: {
          id: topicId,
          title: template.topicTitle,
          parentId: null,
          order: 1,
          isLocked: false,
          libraryItemIds: [],
        },
        $set: {
          pathId,
          subjectId,
          sectionId: null,
          showOnPlatform: true,
        },
        $addToSet: {
          lessonIds: lessonId,
          quizIds: quizId,
        },
      },
      { upsert: true },
    );

    await CourseModel.updateOne(
      { _id: courseId },
      {
        $set: {
          _id: courseId,
          title: existingCourse?.title || template.courseTitle,
          thumbnail: existingCourse?.thumbnail || "",
          instructor: existingCourse?.instructor || "منصة المئة",
          price: existingCourse?.price ?? 0,
          currency: existingCourse?.currency || "SAR",
          duration: existingCourse?.duration ?? 1,
          level: existingCourse?.level || "Beginner",
          rating: existingCourse?.rating ?? 4.8,
          progress: existingCourse?.progress ?? 0,
          category: pathId,
          subject: subjectId,
          pathId,
          subjectId,
          sectionId: existingCourse?.sectionId || "",
          features: existingCourse?.features?.length
            ? existingCourse.features
            : ["درس مرئي", "تدريب مباشر", "ملخص سريع"],
          description: existingCourse?.description || template.description,
          instructorBio: existingCourse?.instructorBio || "",
          modules,
          isPublished: true,
          showOnPlatform: true,
          isPackage: false,
          packageContentTypes: existingCourse?.packageContentTypes?.length
            ? existingCourse.packageContentTypes
            : ["courses"],
          skills: existingCourse?.skills?.length ? existingCourse.skills : [topicId],
          ownerType: existingCourse?.ownerType || "platform",
          approvalStatus: "approved",
        },
      },
      { upsert: true },
    );

    repaired.push({
      pathId,
      subjectId,
      courseId,
      topicId,
      lessonId,
      quizId,
      preservedLessonTitle: lessonTitle,
    });
  }

  return { repaired, skipped };
}

repairMissingCurrentCourseVisibility()
  .then(async (result) => {
    console.log(JSON.stringify(result, null, 2));
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Missing current course visibility repair failed");
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
