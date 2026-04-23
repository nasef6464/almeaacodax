import { api } from "./api";
import { CategoryLevel, CategoryPath, CategorySection, CategorySubject, Course, Group, Lesson, LibraryItem, Module, Question, Quiz, Skill, Topic } from "../types";

const USE_REAL_API =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_USE_REAL_API !== "false";

const FALLBACK_THUMBNAIL = "https://picsum.photos/seed/course-fallback/400/250";

const normalizePath = (path: any): CategoryPath => ({
  id: String(path?.id || path?._id || ""),
  name: String(path?.name || ""),
  color: path?.color,
  icon: path?.icon,
  iconUrl: path?.iconUrl,
  iconStyle: path?.iconStyle,
  showInNavbar: path?.showInNavbar,
  showInHome: path?.showInHome,
  isActive: path?.isActive,
  parentPathId: path?.parentPathId || undefined,
  description: path?.description,
});

const normalizeLevel = (level: any): CategoryLevel => ({
  id: String(level?.id || level?._id || ""),
  pathId: String(level?.pathId || ""),
  name: String(level?.name || ""),
});

const normalizeSubject = (subject: any): CategorySubject => ({
  id: String(subject?.id || subject?._id || ""),
  pathId: String(subject?.pathId || ""),
  levelId: subject?.levelId || undefined,
  name: String(subject?.name || ""),
  color: subject?.color,
  icon: subject?.icon,
  iconUrl: subject?.iconUrl,
  iconStyle: subject?.iconStyle,
  settings: subject?.settings,
});

const normalizeSection = (section: any): CategorySection => ({
  id: String(section?.id || section?._id || ""),
  subjectId: String(section?.subjectId || ""),
  name: String(section?.name || ""),
});

const normalizeSkill = (skill: any): Skill => ({
  id: String(skill?.id || skill?._id || ""),
  name: String(skill?.name || ""),
  pathId: String(skill?.pathId || ""),
  subjectId: String(skill?.subjectId || ""),
  sectionId: String(skill?.sectionId || ""),
  description: skill?.description || "",
  lessonIds: Array.isArray(skill?.lessonIds) ? skill.lessonIds.map(String) : [],
  questionIds: Array.isArray(skill?.questionIds) ? skill.questionIds.map(String) : [],
  createdAt: Number(skill?.createdAt ? new Date(skill.createdAt).getTime() : Date.now()),
});

const normalizeLesson = (lesson: any, moduleIndex: number, lessonIndex: number): Lesson => ({
  id: String(lesson?.id || lesson?._id || `lesson-${moduleIndex + 1}-${lessonIndex + 1}`),
  title: String(lesson?.title || `الدرس ${lessonIndex + 1}`),
  description: lesson?.description || "",
  type: lesson?.type || "video",
  duration: String(lesson?.duration || "0 دقيقة"),
  isCompleted: Boolean(lesson?.isCompleted),
  content: lesson?.content,
  videoUrl: lesson?.videoUrl,
  videoSource: lesson?.videoSource,
  interactiveQuestions: Array.isArray(lesson?.interactiveQuestions) ? lesson.interactiveQuestions : [],
  quizId: lesson?.quizId,
  fileUrl: lesson?.fileUrl,
  assignmentDetails: lesson?.assignmentDetails,
  meetingUrl: lesson?.meetingUrl,
  meetingDate: lesson?.meetingDate,
  isLocked: Boolean(lesson?.isLocked),
  accessControl: lesson?.accessControl,
  allowedGroupIds: Array.isArray(lesson?.allowedGroupIds) ? lesson.allowedGroupIds : [],
  order: Number(lesson?.order ?? lessonIndex),
  skillIds: Array.isArray(lesson?.skillIds) ? lesson.skillIds : [],
  pathId: lesson?.pathId,
  subjectId: lesson?.subjectId,
  sectionId: lesson?.sectionId,
});

const normalizeTopic = (topic: any): Topic => ({
  id: String(topic?.id || topic?._id || ""),
  pathId: topic?.pathId || undefined,
  subjectId: String(topic?.subjectId || ""),
  sectionId: topic?.sectionId || undefined,
  title: String(topic?.title || ""),
  parentId: topic?.parentId || null,
  order: Number(topic?.order ?? 0),
  lessonIds: Array.isArray(topic?.lessonIds) ? topic.lessonIds.map(String) : [],
  quizIds: Array.isArray(topic?.quizIds) ? topic.quizIds.map(String) : [],
});

const normalizeLibraryItem = (item: any): LibraryItem => ({
  id: String(item?.id || item?._id || ""),
  title: String(item?.title || ""),
  size: String(item?.size || ""),
  downloads: Number(item?.downloads ?? 0),
  type: item?.type || "pdf",
  pathId: item?.pathId ? String(item.pathId) : undefined,
  subjectId: String(item?.subjectId || ""),
  sectionId: item?.sectionId ? String(item.sectionId) : undefined,
  skillIds: Array.isArray(item?.skillIds) ? item.skillIds.map((value: unknown) => String(value)) : [],
  url: item?.url || undefined,
});

const normalizeGroup = (group: any): Group => ({
  id: String(group?.id || group?._id || ""),
  name: String(group?.name || ""),
  type: group?.type || "CLASS",
  parentId: group?.parentId || undefined,
  ownerId: String(group?.ownerId || ""),
  supervisorIds: Array.isArray(group?.supervisorIds) ? group.supervisorIds.map(String) : [],
  studentIds: Array.isArray(group?.studentIds) ? group.studentIds.map(String) : [],
  courseIds: Array.isArray(group?.courseIds) ? group.courseIds.map(String) : [],
  createdAt: Number(group?.createdAt ?? Date.now()),
  metadata: group?.metadata,
  totalStudents: typeof group?.totalStudents === "number" ? group.totalStudents : undefined,
  totalSupervisors: typeof group?.totalSupervisors === "number" ? group.totalSupervisors : undefined,
  totalCourses: typeof group?.totalCourses === "number" ? group.totalCourses : undefined,
  activityScore: typeof group?.activityScore === "number" ? group.activityScore : undefined,
  performanceScore: typeof group?.performanceScore === "number" ? group.performanceScore : undefined,
});

const normalizeModule = (module: any, moduleIndex: number): Module => ({
  id: String(module?.id || module?._id || `module-${moduleIndex + 1}`),
  title: String(module?.title || `الوحدة ${moduleIndex + 1}`),
  order: Number(module?.order ?? moduleIndex),
  lessons: Array.isArray(module?.lessons)
    ? module.lessons.map((lesson: any, lessonIndex: number) => normalizeLesson(lesson, moduleIndex, lessonIndex))
    : [],
});

const normalizeCourse = (course: any): Course => ({
  id: String(course?.id || course?._id || ""),
  title: String(course?.title || "دورة بدون عنوان"),
  thumbnail: course?.thumbnail || FALLBACK_THUMBNAIL,
  instructor: String(course?.instructor || "فريق المنصة"),
  price: Number(course?.price ?? 0),
  currency: String(course?.currency || "ر.س"),
  duration: Number(course?.duration ?? 0),
  level: course?.level || "Beginner",
  rating: Number(course?.rating ?? 0),
  progress: Number(course?.progress ?? 0),
  category: String(course?.category || "عام"),
  subject: course?.subject || "",
  pathId: course?.pathId ? String(course.pathId) : undefined,
  subjectId: course?.subjectId ? String(course.subjectId) : undefined,
  sectionId: course?.sectionId ? String(course.sectionId) : undefined,
  features: Array.isArray(course?.features) ? course.features : [],
  description: course?.description || "",
  instructorBio: course?.instructorBio || "",
  modules: Array.isArray(course?.modules) ? course.modules.map((module: any, index: number) => normalizeModule(module, index)) : [],
  isPurchased: Boolean(course?.isPurchased),
  isPackage: Boolean(course?.isPackage),
  packageType: course?.packageType,
  originalPrice: typeof course?.originalPrice === "number" ? course.originalPrice : undefined,
  includedCourses: Array.isArray(course?.includedCourses) ? course.includedCourses : [],
  studentCount: typeof course?.studentCount === "number" ? course.studentCount : undefined,
  weeksCount: typeof course?.weeksCount === "number" ? course.weeksCount : undefined,
  previewVideoUrl: course?.previewVideoUrl,
  files: Array.isArray(course?.files) ? course.files : [],
  qa: Array.isArray(course?.qa) ? course.qa : [],
  isPublished: Boolean(course?.isPublished),
  prerequisiteCourseIds: Array.isArray(course?.prerequisiteCourseIds) ? course.prerequisiteCourseIds : [],
  dripContentEnabled: Boolean(course?.dripContentEnabled),
  certificateEnabled: Boolean(course?.certificateEnabled),
  fakeRating: typeof course?.fakeRating === "number" ? course.fakeRating : undefined,
  fakeStudentsCount: typeof course?.fakeStudentsCount === "number" ? course.fakeStudentsCount : undefined,
  skills: Array.isArray(course?.skills) ? course.skills : [],
});

const normalizeQuestion = (question: any): Question => ({
  id: String(question?.id || question?._id || ""),
  text: String(question?.text || ""),
  options: Array.isArray(question?.options) ? question.options.map(String) : [],
  correctOptionIndex: Number(question?.correctOptionIndex ?? 0),
  explanation: question?.explanation || "",
  videoUrl: question?.videoUrl,
  imageUrl: question?.imageUrl,
  skillIds: Array.isArray(question?.skillIds) ? question.skillIds.map(String) : [],
  pathId: question?.pathId,
  subject: String(question?.subject || ""),
  sectionId: question?.sectionId,
  difficulty: question?.difficulty || "Medium",
  type: question?.type || "mcq",
});

const normalizeQuiz = (quiz: any): Quiz => ({
  id: String(quiz?.id || quiz?._id || ""),
  title: String(quiz?.title || ""),
  description: quiz?.description || "",
  pathId: String(quiz?.pathId || ""),
  subjectId: String(quiz?.subjectId || ""),
  sectionId: quiz?.sectionId || undefined,
  type: quiz?.type || "quiz",
  mode: quiz?.mode || "regular",
  settings: {
    showExplanations: Boolean(quiz?.settings?.showExplanations),
    showAnswers: Boolean(quiz?.settings?.showAnswers),
    maxAttempts: Number(quiz?.settings?.maxAttempts ?? 1),
    passingScore: Number(quiz?.settings?.passingScore ?? 50),
    timeLimit: typeof quiz?.settings?.timeLimit === "number" ? quiz.settings.timeLimit : undefined,
  },
  access: {
    type: quiz?.access?.type || "free",
    price: typeof quiz?.access?.price === "number" ? quiz.access.price : undefined,
    allowedGroupIds: Array.isArray(quiz?.access?.allowedGroupIds) ? quiz.access.allowedGroupIds.map(String) : [],
  },
  questionIds: Array.isArray(quiz?.questionIds) ? quiz.questionIds.map(String) : [],
  createdAt: Number(quiz?.createdAt ?? Date.now()),
  isPublished: Boolean(quiz?.isPublished),
  skillIds: Array.isArray(quiz?.skillIds) ? quiz.skillIds.map(String) : [],
  targetGroupIds: Array.isArray(quiz?.targetGroupIds) ? quiz.targetGroupIds.map(String) : [],
  targetUserIds: Array.isArray(quiz?.targetUserIds) ? quiz.targetUserIds.map(String) : [],
  dueDate: quiz?.dueDate || undefined,
});

export const adapter = {
  async getCourses() {
    if (!USE_REAL_API) {
      return [];
    }

    try {
      const data = await api.getCourses();
      const normalized = Array.isArray(data) ? data.map(normalizeCourse).filter((course) => course.id) : [];
      return normalized;
    } catch (error) {
      console.warn("Falling back to empty courses:", error);
      return [];
    }
  },

  async getCourseById(courseId: string) {
    if (!USE_REAL_API) {
      return null;
    }

    try {
      const data = await api.getCourseById(courseId);
      if (data) {
        const normalized = normalizeCourse(data);
        if (normalized.id) {
          return normalized;
        }
      }
    } catch (error) {
      console.warn(`Unable to fetch course for ${courseId}:`, error);
    }

    return null;
  },

  async getTaxonomyBootstrap() {
    if (!USE_REAL_API) {
      return {
        paths: [],
        levels: [],
        subjects: [],
        sections: [],
        skills: [],
      };
    }

    try {
      const data = await api.getTaxonomyBootstrap();

      return {
        paths: Array.isArray(data?.paths) ? data.paths.map(normalizePath).filter((path) => path.id && path.name) : [],
        levels: Array.isArray(data?.levels) ? data.levels.map(normalizeLevel).filter((level) => level.id && level.pathId) : [],
        subjects: Array.isArray(data?.subjects)
          ? data.subjects.map(normalizeSubject).filter((subject) => subject.id && subject.pathId && subject.name)
          : [],
        sections: Array.isArray(data?.sections)
          ? data.sections.map(normalizeSection).filter((section) => section.id && section.subjectId && section.name)
          : [],
        skills: Array.isArray(data?.skills)
          ? data.skills.map(normalizeSkill).filter((skill) => skill.id && skill.pathId && skill.subjectId && skill.sectionId && skill.name)
          : [],
      };
    } catch (error) {
      console.warn("Falling back to empty taxonomy bootstrap:", error);
      return {
        paths: [],
        levels: [],
        subjects: [],
        sections: [],
        skills: [],
      };
    }
  },

  async getContentBootstrap() {
    if (!USE_REAL_API) {
      return {
        topics: [],
        lessons: [],
        libraryItems: [],
        groups: [],
      };
    }

    try {
      const data = await api.getContentBootstrap();
      return {
        topics: Array.isArray(data?.topics) ? data.topics.map(normalizeTopic).filter((topic) => topic.id && topic.subjectId && topic.title) : [],
        lessons: Array.isArray(data?.lessons) ? data.lessons.map((lesson: any, index: number) => normalizeLesson(lesson, 0, index)).filter((lesson) => lesson.id && lesson.title) : [],
        libraryItems: Array.isArray(data?.libraryItems) ? data.libraryItems.map(normalizeLibraryItem).filter((item) => item.id && item.title) : [],
        groups: Array.isArray(data?.groups) ? data.groups.map(normalizeGroup).filter((group) => group.id && group.name) : [],
      };
    } catch (error) {
      console.warn("Falling back to empty content bootstrap:", error);
      return {
        topics: [],
        lessons: [],
        libraryItems: [],
        groups: [],
      };
    }
  },

  async getQuestions(): Promise<Question[]> {
    if (!USE_REAL_API) {
      return [];
    }

    try {
      const data = await api.getQuestions();
      return Array.isArray(data) ? data.map(normalizeQuestion).filter((question) => question.id && question.text) : [];
    } catch (error) {
      console.warn("Falling back to existing in-memory questions:", error);
      return [];
    }
  },

  async getQuizzes(): Promise<Quiz[]> {
    if (!USE_REAL_API) {
      return [];
    }

    try {
      const data = await api.getQuizzes();
      return Array.isArray(data) ? data.map(normalizeQuiz).filter((quiz) => quiz.id && quiz.title) : [];
    } catch (error) {
      console.warn("Falling back to existing in-memory quizzes:", error);
      return [];
    }
  },
};
