import type { Course } from '../types';

export type CourseProductKind = 'learning' | 'package';

export const getCourseProductKind = (course: Pick<Course, 'isPackage'>): CourseProductKind =>
  course.isPackage === true ? 'package' : 'learning';

export const isLearningCourse = (course: Pick<Course, 'isPackage'>) =>
  getCourseProductKind(course) === 'learning';

export const isPublicPackageCourse = (course: Pick<Course, 'isPackage'>) =>
  getCourseProductKind(course) === 'package';
