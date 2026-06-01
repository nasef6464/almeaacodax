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
