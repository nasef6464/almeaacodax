import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Role } from '../types';
import { useStore } from '../store/useStore';

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
  subscription?: {
    plan?: 'free' | 'premium';
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
      subscription: {
        ...existing.subscription,
        plan: backendUser?.subscription?.plan ?? existing.subscription.plan,
        purchasedCourses: toArray(backendUser?.subscription?.purchasedCourses),
        purchasedPackages: toArray(backendUser?.subscription?.purchasedPackages),
      },
    },
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
      useStore.getState().hydrateExamResults([]);
      return;
    }

    api.getQuizResults()
      .then((results) => {
        useStore.getState().hydrateExamResults(results as any[]);
      })
      .catch((error) => {
        console.warn('Failed to hydrate quiz results:', error);
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
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const inferredName = email.split('@')[0] || 'Student';
    const response = (await api.register(inferredName, email, password)) as {
      token: string;
      user: BackendAuthUser;
    };

    const sessionUser = buildSessionUser(response.user, response.token);
    persistSession(sessionUser, response.user);
  };

  const signInWithGoogle = async () => {
    throw new Error('\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062c\u0648\u062c\u0644 \u063a\u064a\u0631 \u0645\u0641\u0639\u0644 \u0628\u0639\u062f \u0641\u064a \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.');
  };

  const logout = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    resetStoreUser();
  };

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }),
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
