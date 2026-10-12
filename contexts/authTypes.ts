export type BackendRole = 'student' | 'teacher' | 'admin' | 'supervisor' | 'school_admin' | 'parent';

export interface BackendAuthUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  role: BackendRole;
  points?: number;
  badges?: string[];
  isActive?: boolean;
  schoolId?: string | null;
  groupIds?: string[];
  linkedStudentIds?: string[];
  managedPathIds?: string[];
  managedSubjectIds?: string[];
  favorites?: string[];
  reviewLater?: string[];
  enrolledCourses?: string[];
  enrolledPaths?: string[];
  completedLessons?: string[];
  interactiveVideoProgress?: Array<{ courseId: string; lessonId: string; positionSeconds: number; answeredQuestionIds: string[]; updatedAt: number }>;
  subscription?: {
    plan?: 'free' | 'premium';
    expiresAt?: string;
    purchasedCourses?: string[] | string;
    purchasedPackages?: string[] | string;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: BackendRole;
  groupIds?: string[];
  schoolId?: string | null;
  token?: string;
}
