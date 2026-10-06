import { CourseModel } from "../../../models/Course.js";
import { QuizModel } from "../../../models/Quiz.js";

type CourseAuditSeverity = "error" | "warning" | "suggestion";

type CourseAuditFinding = {
  severity: CourseAuditSeverity;
  type: string;
  message: string;
  moduleId?: string;
  lessonId?: string;
  quizId?: string;
  skillId?: string;
};

const clean = (value: unknown) => String(value || "").trim();

const lessonHasContent = (lesson: any) => {
  const type = clean(lesson?.type);
  if (type === "video") return Boolean(clean(lesson?.videoUrl));
  if (type === "file") return Boolean(clean(lesson?.fileUrl));
  if (type === "text") return Boolean(clean(lesson?.content));
  if (["live_youtube", "zoom", "google_meet", "teams"].includes(type)) {
    return Boolean(clean(lesson?.meetingUrl) || clean(lesson?.recordingUrl) || clean(lesson?.videoUrl));
  }
  if (type === "quiz") return Boolean(clean(lesson?.quizId));
  return Boolean(
    clean(lesson?.content) ||
      clean(lesson?.videoUrl) ||
      clean(lesson?.fileUrl) ||
      clean(lesson?.meetingUrl) ||
      clean(lesson?.recordingUrl),
  );
};

export async function auditCourse(courseId: string) {
  const id = clean(courseId);
  if (!id) {
    throw Object.assign(new Error("courseId is required"), { statusCode: 422 });
  }

  const course = await CourseModel.findById(id).lean();
  if (!course) {
    throw Object.assign(new Error("Course not found"), { statusCode: 404 });
  }

  const modules = Array.isArray((course as any).modules) ? (course as any).modules : [];
  const assessments = Array.isArray((course as any).assessments) ? (course as any).assessments : [];
  const courseSkills = new Set(
    (Array.isArray((course as any).skills) ? (course as any).skills : [])
      .map(clean)
      .filter(Boolean),
  );

  const findings: CourseAuditFinding[] = [];
  const referencedQuizIds = new Set<string>();
  const lessonIds = new Set<string>();
  const coveredSkillIds = new Set<string>();
  let contentLessonCount = 0;
  let quizLessonCount = 0;

  if (modules.length === 0) {
    findings.push({
      severity: "error",
      type: "course_has_no_modules",
      message: "الدورة لا تحتوي على وحدات.",
    });
  }

  for (const [moduleIndex, module] of modules.entries()) {
    const moduleId = clean(module?.id) || `module-${moduleIndex + 1}`;
    const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
    if (lessons.length === 0) {
      findings.push({
        severity: "error",
        type: "module_has_no_lessons",
        moduleId,
        message: `الوحدة "${clean(module?.title) || moduleId}" لا تحتوي على دروس.`,
      });
      continue;
    }

    let moduleHasQuiz = false;
    for (const [lessonIndex, lesson] of lessons.entries()) {
      const lessonId = clean(lesson?.id) || `${moduleId}-lesson-${lessonIndex + 1}`;
      const lessonType = clean(lesson?.type);
      if (lessonIds.has(lessonId)) {
        findings.push({
          severity: "error",
          type: "duplicate_lesson_id",
          moduleId,
          lessonId,
          message: "معرف الدرس مكرر داخل الدورة.",
        });
      }
      lessonIds.add(lessonId);

      for (const skillId of Array.isArray(lesson?.skillIds) ? lesson.skillIds : []) {
        const normalized = clean(skillId);
        if (normalized) coveredSkillIds.add(normalized);
      }

      if (lessonType === "quiz") {
        quizLessonCount += 1;
        moduleHasQuiz = true;
        const quizId = clean(lesson?.quizId);
        if (!quizId) {
          findings.push({
            severity: "error",
            type: "quiz_lesson_missing_quiz_id",
            moduleId,
            lessonId,
            message: "درس الاختبار لا يحتوي على quizId.",
          });
        } else {
          referencedQuizIds.add(quizId);
        }
        continue;
      }

      contentLessonCount += 1;
      if (!lessonHasContent(lesson)) {
        findings.push({
          severity: "warning",
          type: "lesson_missing_primary_content",
          moduleId,
          lessonId,
          message: `الدرس "${clean(lesson?.title) || lessonId}" لا يحتوي على محتوى أساسي قابل للتشغيل.`,
        });
      }

      if (!Array.isArray(lesson?.skillIds) || lesson.skillIds.filter((item: unknown) => clean(item)).length === 0) {
        findings.push({
          severity: "warning",
          type: "lesson_missing_skills",
          moduleId,
          lessonId,
          message: `الدرس "${clean(lesson?.title) || lessonId}" غير مرتبط بمهارات.`,
        });
      }

      const directQuizId = clean(lesson?.quizId);
      if (directQuizId) referencedQuizIds.add(directQuizId);
      const nextLesson = lessons[lessonIndex + 1];
      const nextIsQuiz = clean(nextLesson?.type) === "quiz" && Boolean(clean(nextLesson?.quizId));
      if (!directQuizId && !nextIsQuiz) {
        findings.push({
          severity: "suggestion",
          type: "lesson_training_gap",
          moduleId,
          lessonId,
          message: `الدرس "${clean(lesson?.title) || lessonId}" لا يظهر له تدريب مباشر؛ راجع هل يحتاج تدريبًا من بنك المنصة.`,
        });
      }
    }

    if (!moduleHasQuiz) {
      findings.push({
        severity: "suggestion",
        type: "module_assessment_gap",
        moduleId,
        message: `الوحدة "${clean(module?.title) || moduleId}" لا تحتوي على اختبار داخل تسلسل الدروس.`,
      });
    }
  }

  for (const assessment of assessments) {
    const quizId = clean(assessment?.quizId);
    if (!quizId) {
      findings.push({
        severity: "error",
        type: "assessment_missing_quiz_id",
        message: `التقييم "${clean(assessment?.title) || clean(assessment?.id) || "غير مسمى"}" لا يحتوي على quizId.`,
      });
      continue;
    }
    referencedQuizIds.add(quizId);
  }

  if (!assessments.some((assessment: any) => clean(assessment?.phase) === "final_course")) {
    findings.push({
      severity: "suggestion",
      type: "final_assessment_gap",
      message: "الدورة لا تحتوي على اختبار نهائي؛ راجع هل تحتاج اختبارًا نهائيًا من الاختبارات الموجودة.",
    });
  }

  if (courseSkills.size === 0) {
    findings.push({
      severity: "warning",
      type: "course_missing_skills",
      message: "الدورة نفسها غير مرتبطة بمهارات.",
    });
  }

  const quizIds = [...referencedQuizIds];
  const quizzes = quizIds.length
    ? await QuizModel.find({
        $or: [{ _id: { $in: quizIds } }, { id: { $in: quizIds } }],
      })
        .select("_id id title questionIds skillIds isPublished showOnPlatform approvalStatus")
        .lean()
    : [];

  const quizByAlias = new Map<string, any>();
  for (const quiz of quizzes as any[]) {
    for (const alias of [clean(quiz?._id), clean(quiz?.id)]) {
      if (alias) quizByAlias.set(alias, quiz);
    }
    for (const skillId of Array.isArray(quiz?.skillIds) ? quiz.skillIds : []) {
      const normalized = clean(skillId);
      if (normalized) coveredSkillIds.add(normalized);
    }
  }

  for (const quizId of quizIds) {
    const quiz = quizByAlias.get(quizId);
    if (!quiz) {
      findings.push({
        severity: "error",
        type: "referenced_quiz_not_found",
        quizId,
        message: "اختبار مرتبط بالدورة غير موجود في بنك الاختبارات.",
      });
      continue;
    }
    const questionCount = Array.isArray(quiz.questionIds) ? quiz.questionIds.length : 0;
    if (questionCount === 0) {
      findings.push({
        severity: "warning",
        type: "referenced_quiz_empty",
        quizId,
        message: `الاختبار "${clean(quiz.title) || quizId}" لا يحتوي على أسئلة.`,
      });
    }
  }

  for (const skillId of courseSkills) {
    if (!coveredSkillIds.has(skillId)) {
      findings.push({
        severity: "suggestion",
        type: "course_skill_without_content_coverage",
        skillId,
        message: "مهارة مرتبطة بالدورة لا تظهر في مهارات الدروس أو الاختبارات المستخدمة.",
      });
    }
  }

  const counts = {
    modules: modules.length,
    contentLessons: contentLessonCount,
    quizLessons: quizLessonCount,
    assessments: assessments.length,
    referencedQuizzes: quizIds.length,
    files: Array.isArray((course as any).files) ? (course as any).files.length : 0,
    courseSkills: courseSkills.size,
    coveredSkills: coveredSkillIds.size,
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    suggestions: findings.filter((item) => item.severity === "suggestion").length,
  };

  return {
    course: {
      id: clean((course as any)._id),
      title: clean((course as any).title),
      pathId: clean((course as any).pathId),
      subjectId: clean((course as any).subjectId),
      sectionId: clean((course as any).sectionId),
      isPublished: Boolean((course as any).isPublished),
      showOnPlatform: (course as any).showOnPlatform !== false,
      approvalStatus: clean((course as any).approvalStatus),
    },
    healthy: counts.errors === 0,
    readyForPublishReview: counts.errors === 0 && counts.warnings === 0,
    counts,
    findings,
    policy: {
      mode: "read_only_audit",
      reuseFirst: true,
      automaticGeneration: false,
      automaticPublish: false,
    },
  };
}
