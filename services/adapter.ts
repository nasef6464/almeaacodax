import { api } from "./api";
import { courses as mockCourses } from "./mockData";
import { Course, Lesson, Module } from "../types";

const USE_REAL_API =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_USE_REAL_API !== "false";

const FALLBACK_THUMBNAIL = "https://picsum.photos/seed/course-fallback/400/250";

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

export const adapter = {
  async getCourses() {
    if (!USE_REAL_API) {
      return mockCourses;
    }

    try {
      const data = await api.getCourses();
      const normalized = Array.isArray(data) ? data.map(normalizeCourse).filter((course) => course.id) : [];
      return normalized.length > 0 ? normalized : mockCourses;
    } catch (error) {
      console.warn("Falling back to mock courses:", error);
      return mockCourses;
    }
  },

  async getCourseById(courseId: string) {
    if (!USE_REAL_API) {
      return mockCourses.find((course) => course.id === courseId) || null;
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
      console.warn(`Falling back to mock course for ${courseId}:`, error);
    }

    return mockCourses.find((course) => course.id === courseId) || null;
  },

  async getTaxonomyBootstrap() {
    if (!USE_REAL_API) {
      return {
        paths: [],
        levels: [],
        subjects: [],
      };
    }

    try {
      return await api.getTaxonomyBootstrap();
    } catch (error) {
      console.warn("Falling back to empty taxonomy bootstrap:", error);
      return {
        paths: [],
        levels: [],
        subjects: [],
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
      return await api.getContentBootstrap();
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
};
