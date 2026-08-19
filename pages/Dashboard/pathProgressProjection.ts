type DashboardPath = {
  id: string;
  name?: string;
};

type DashboardCourse = {
  pathId?: string;
  category?: string;
  modules?: Array<{
    lessons: Array<{ id: string }>;
  }>;
};

type DashboardExamResult = {
  skillsAnalysis?: Array<{ pathId?: string }>;
};

export const normalizeDashboardScope = (value?: string) => (value ?? '').trim().toLowerCase();

export const courseBelongsToPath = (course: DashboardCourse, path: DashboardPath) => {
  const coursePath = normalizeDashboardScope(course.pathId || course.category);
  return coursePath === normalizeDashboardScope(path.id) || coursePath === normalizeDashboardScope(path.name);
};

export const getCourseLessons = (course: DashboardCourse) =>
  course.modules?.flatMap((module) => module.lessons || []) || [];

export const resolvePathProgress = (
  path: DashboardPath,
  courses: DashboardCourse[],
  completedLessons: string[],
  examResults: DashboardExamResult[],
) => {
  const pathCourses = courses.filter((course) => courseBelongsToPath(course, path));
  const lessonIds = pathCourses.flatMap(getCourseLessons).map((lesson) => lesson.id);
  const completedLessonCount = lessonIds.filter((lessonId) => completedLessons.includes(lessonId)).length;
  const pathExamCount = examResults.filter((result) => (result.skillsAnalysis || []).some((skill) => skill.pathId === path.id)).length;
  const completedUnits = completedLessonCount + pathExamCount;
  const totalUnits = lessonIds.length + pathExamCount;

  return {
    coursesCount: pathCourses.length,
    lessonsCount: lessonIds.length,
    completedLessonCount,
    examsCount: pathExamCount,
    progress: totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
  };
};
