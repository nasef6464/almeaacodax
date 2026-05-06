import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Role, User as StoreUser } from '../types';
import { useStore } from '../store/useStore';
import { DEV_TOKEN_PREFIX } from '../utils/devSession';

type BackendRole = 'student' | 'teacher' | 'admin' | 'supervisor' | 'parent';

interface BackendAuthUser {
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
  subscription?: {
    plan?: 'free' | 'premium';
    expiresAt?: string;
    purchasedCourses?: string[] | string;
    purchasedPackages?: string[] | string;
  };
}

interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: BackendRole;
  token: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<SessionUser>;
  signUpWithEmail: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  devSwitchRole?: (role: BackendRole) => void;
}

const AUTH_STORAGE_KEY = 'the-hundred-auth-session';

const roleMap: Record<BackendRole, Role> = {
  admin: Role.ADMIN,
  teacher: Role.TEACHER,
  student: Role.STUDENT,
  supervisor: Role.SUPERVISOR,
  parent: Role.PARENT,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const devRoleNames: Record<BackendRole, string> = {
  admin: 'مدير النظام',
  teacher: 'معلم تجريبي',
  student: 'طالب تجريبي',
  supervisor: 'مشرف تجريبي',
  parent: 'ولي أمر تجريبي',
};

const buildDevBackendUser = (role: BackendRole): BackendAuthUser => ({
  id: `dev-${role}`,
  name: devRoleNames[role],
  email: `dev-${role}@almeaa.local`,
  role,
  points: role === 'student' ? 120 : 0,
  badges: [],
  isActive: true,
  linkedStudentIds: role === 'parent' ? ['69f5eee03ca434d37422ab69'] : [],
  managedPathIds: role === 'teacher' || role === 'supervisor' ? ['p_1777779639431'] : [],
  managedSubjectIds: role === 'teacher' ? ['sub_1777779748206'] : [],
  favorites: [],
  reviewLater: [],
  enrolledCourses: [],
  enrolledPaths: role === 'student' ? ['p_1777779639431'] : [],
  completedLessons: [],
  subscription: {
    plan: role === 'student' ? 'premium' : 'free',
    purchasedPackages: role === 'student' ? ['pkg_seed_school_quant_full'] : [],
    purchasedCourses: [],
  },
});

const toArray = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const buildSessionUser = (user: BackendAuthUser, token: string): SessionUser => ({
  id: String(user.id || user._id || user.email),
  email: user.email,
  displayName: user.name,
  photoURL: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
  role: user.role,
  token,
});

const normalizeStoreUser = (user: BackendAuthUser): StoreUser => ({
  id: String(user.id || user._id || user.email),
  name: user.name,
  email: user.email,
  avatar: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
  role: roleMap[user.role],
  points: user.points ?? 0,
  badges: user.badges ?? [],
  isActive: user.isActive ?? true,
  schoolId: user.schoolId ?? undefined,
  groupIds: user.groupIds ?? [],
  linkedStudentIds: user.linkedStudentIds ?? [],
  managedPathIds: user.managedPathIds ?? [],
  managedSubjectIds: user.managedSubjectIds ?? [],
  subscription: {
    plan: user.subscription?.plan ?? 'free',
    expiresAt: user.subscription?.expiresAt,
    purchasedCourses: toArray(user.subscription?.purchasedCourses),
    purchasedPackages: toArray(user.subscription?.purchasedPackages),
  },
});

const syncStoreUser = (sessionUser: SessionUser | null, backendUser?: BackendAuthUser | null) => {
  if (!sessionUser) {
    return;
  }

  const existing = useStore.getState().user;

  useStore.setState({
    user: {
      ...existing,
      id: sessionUser.id,
      name: sessionUser.displayName,
      email: sessionUser.email,
      avatar: sessionUser.photoURL,
      role: roleMap[sessionUser.role],
      points: backendUser?.points ?? existing.points,
      badges: backendUser?.badges ?? existing.badges,
      linkedStudentIds: backendUser?.linkedStudentIds ?? existing.linkedStudentIds,
      managedPathIds: backendUser?.managedPathIds ?? existing.managedPathIds,
      managedSubjectIds: backendUser?.managedSubjectIds ?? existing.managedSubjectIds,
      subscription: {
        ...existing.subscription,
        plan: backendUser?.subscription?.plan ?? existing.subscription.plan,
        expiresAt: backendUser?.subscription?.expiresAt ?? existing.subscription.expiresAt,
        purchasedCourses: toArray(backendUser?.subscription?.purchasedCourses),
        purchasedPackages: toArray(backendUser?.subscription?.purchasedPackages),
      },
    },
    favorites: backendUser?.favorites ?? useStore.getState().favorites,
    reviewLater: backendUser?.reviewLater ?? useStore.getState().reviewLater,
    enrolledCourses: backendUser?.enrolledCourses ?? useStore.getState().enrolledCourses,
    enrolledPaths: backendUser?.enrolledPaths ?? useStore.getState().enrolledPaths,
    completedLessons: backendUser?.completedLessons ?? useStore.getState().completedLessons,
  });
};

const resetStoreUser = () => {
  const existing = useStore.getState().user;

  useStore.setState({
    user: {
      ...existing,
      id: 'guest',
      name: 'Guest User',
      email: undefined,
      avatar: 'https://i.pravatar.cc/150?u=guest',
      role: Role.STUDENT,
      points: 0,
      badges: [],
      subscription: {
        plan: 'free',
        expiresAt: undefined,
        purchasedCourses: [],
        purchasedPackages: [],
      },
    },
    examResults: [],
    questionAttempts: [],
    favorites: [],
    reviewLater: [],
    recentActivity: [],
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        setUser(parsed);
        syncStoreUser(parsed);
      }
    } catch (error) {
      console.warn('Failed to restore auth session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      syncStoreUser(null);
      useStore.getState().hydrateExamResults([]);
      useStore.getState().hydrateQuestionAttempts([]);
      return;
    }

    if (user.token.startsWith(DEV_TOKEN_PREFIX)) {
      syncStoreUser(user, buildDevBackendUser(user.role));
      return;
    }

    Promise.all([
      api.getCurrentUser(),
      api.getQuizResults(),
      api.getQuestionAttempts(),
      user.role === 'admin' ? api.getAdminUsers() : Promise.resolve({ users: [] }),
    ])
      .then(([currentUserResponse, results, questionAttempts, usersResponse]) => {
        syncStoreUser(user, (currentUserResponse as { user?: BackendAuthUser })?.user || null);
        useStore.getState().hydrateExamResults(results as any[]);
        useStore.getState().hydrateQuestionAttempts(questionAttempts as any[]);
        if (user.role === 'admin') {
          const normalizedUsers = ((usersResponse as { users?: BackendAuthUser[] })?.users || []).map(normalizeStoreUser);
          useStore.getState().hydrateUsers(normalizedUsers);
        }
      })
      .catch((error) => {
        console.warn('Failed to hydrate session data:', error);
      });
  }, [user]);

  const persistSession = (sessionUser: SessionUser, backendUser: BackendAuthUser) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    syncStoreUser(sessionUser, backendUser);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const response = (await api.login(email, password)) as {
      token: string;
      user: BackendAuthUser;
    };

    const sessionUser = buildSessionUser(response.user, response.token);
    persistSession(sessionUser, response.user);
    return sessionUser;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const inferredName = email.split('@')[0] || 'Student';
    const response = (await api.register(inferredName, email, password)) as {
      token: string;
      user: BackendAuthUser;
    };

    const sessionUser = buildSessionUser(response.user, response.token);
    persistSession(sessionUser, response.user);
    return sessionUser;
  };

  const signInWithGoogle = async () => {
    throw new Error('\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062c\u0648\u062c\u0644 \u063a\u064a\u0631 \u0645\u0641\u0639\u0644 \u0628\u0639\u062f \u0641\u064a \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.');
  };

  const logout = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    resetStoreUser();
  };

  const devSwitchRole = (role: BackendRole) => {
    if (!import.meta.env.DEV) {
      return;
    }

    const backendUser = buildDevBackendUser(role);
    const sessionUser = buildSessionUser(backendUser, `${DEV_TOKEN_PREFIX}${role}`);
    persistSession(sessionUser, backendUser);
  };

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, devSwitchRole }),
    [user, loading],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-500">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
