import type { Course, Lesson } from '../types';

export const toFiniteDisplayNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getCourseAudienceCount = (course: { fakeStudentsCount?: unknown; studentCount?: unknown }) => {
  const baseline = toFiniteDisplayNumber(course.fakeStudentsCount, 0);
  const realStudents = toFiniteDisplayNumber(course.studentCount, 0);
  return baseline + realStudents;
};

export const getCourseRating = (course: { fakeRating?: unknown; rating?: unknown }) => {
  const fakeRating = toFiniteDisplayNumber(course.fakeRating, 0);
  if (fakeRating > 0) return Math.min(fakeRating, 5);
  return Math.min(toFiniteDisplayNumber(course.rating, 0), 5);
};

const isVideoLesson = (lesson: Lesson) =>
  lesson.type === 'video' ||
  Boolean(lesson.videoUrl) ||
  lesson.type === 'live_youtube' ||
  lesson.type === 'zoom' ||
  lesson.type === 'google_meet' ||
  lesson.type === 'teams';

export const getCourseContentStats = (course: Course) => {
  const lessons = (course.modules || []).flatMap((module) => module.lessons || []);
  const quizIds = new Set<string>();

  lessons.forEach((lesson) => {
    if (lesson.type === 'quiz' || lesson.quizId) {
      quizIds.add(String(lesson.quizId || lesson.id));
    }
  });

  (course.assessments || []).forEach((assessment) => {
    if (assessment.showOnPlatform !== false && assessment.quizId) {
      quizIds.add(String(assessment.quizId));
    }
  });

  const durationHours = toFiniteDisplayNumber(course.duration, 0);
  const weeksCount = toFiniteDisplayNumber(course.weeksCount, 0);
  const durationLabel = durationHours > 0
    ? `${durationHours} ساعة`
    : weeksCount > 0
      ? `${weeksCount} أسابيع`
      : 'غير محددة';

  return {
    totalLessons: lessons.length,
    videoLessons: lessons.filter(isVideoLesson).length,
    testsCount: quizIds.size,
    durationLabel,
  };
};
