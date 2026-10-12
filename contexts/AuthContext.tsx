import { advanceAuthSession, captureAuthActor, isCurrentAuthActor } from '../utils/authSessionLifetime';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { resetStoreUser, syncStoreUser } from './authStoreSync';
import { useStore } from '../store/useStore';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

import type { BackendRole, BackendAuthUser, SessionUser } from './authTypes';
export type { BackendRole, BackendAuthUser, SessionUser } from './authTypes';

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<SessionUser>;
  signInWithNationalId: (nationalId: string, password: string) => Promise<SessionUser>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshProfile?: () => Promise<void>;
  devSwitchRole?: (role: BackendRole) => void;
}

const SESSION_STORAGE_KEY = 'the-hundred-auth-profile';
const OAUTH_BOOTSTRAP_FLAG_KEY = 'almeaa:oauth-bootstrap-pending';
const AUTH_BOOTSTRAP_PRIVATE_PREFIXES = [
  '/dashboard',
  '/admin-dashboard',
  '/instructor-dashboard',
  '/school-teacher-dashboard',
  '/school-director-dashboard',
  '/supervisor-dashboard',
  '/parent-dashboard',
  '/classroom',
  '/plan',
  '/profile',
  '/favorites',
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAuthSessionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Authentication required|Invalid token|Token expired|jwt expired|jwt malformed|unauthorized/i.test(message);
};

const devRoleNames: Record<BackendRole, string> = {
  admin: 'مدير النظام',
  teacher: 'معلم تجريبي',
  student: 'طالب تجريبي',
  supervisor: 'مشرف تجريبي',
  school_admin: 'مدير مدرسة تجريبي',
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

const buildSessionUser = (user: BackendAuthUser): SessionUser => ({
  id: String(user.id || user._id || user.email),
  email: user.email,
  displayName: user.name,
  photoURL: user.avatar || DEFAULT_AVATAR,
  role: user.role,
  groupIds: Array.isArray(user.groupIds) ? user.groupIds.map(String) : [],
  schoolId: user.schoolId ?? null,
});

const restoreInitialSession = (): SessionUser | null => {
  try {
    const hash = window.location.hash || '';
    const queryIndex = hash.indexOf('?');
    if (queryIndex >= 0) {
      const params = new URLSearchParams(hash.slice(queryIndex + 1));
      const oauthReturn = decodeURIComponent(params.get('oauth_return') || '/');
      if (params.get('oauth_provider') || params.get('oauth_error')) {
        if (params.get('oauth_provider')) sessionStorage.setItem(OAUTH_BOOTSTRAP_FLAG_KEY, '1');
        window.location.hash = oauthReturn.startsWith('/') ? `#${oauthReturn}` : '#/';
      }
    }
  } catch (error) {
    console.warn('Failed to restore OAuth session from URL:', error);
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email || !parsed?.role) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if ('token' in parsed) {
      delete parsed.token;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
    }
    advanceAuthSession();
    syncStoreUser(parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to restore auth session:', error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

const getCurrentRoutePath = () => {
  const pathname = window.location.pathname || '/';
  const hashPath = window.location.hash.replace(/^#/, '');
  if ((pathname === '/' || !pathname) && hashPath.startsWith('/')) return hashPath.split(/[?#]/)[0];
  return pathname;
};

const shouldBootstrapAuthForPath = (path: string) =>
  AUTH_BOOTSTRAP_PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialUser = useMemo(() => restoreInitialSession(), []);
  const initialPath = useMemo(() => getCurrentRoutePath(), []);
  const shouldBootstrapInitialAuth = !initialUser && shouldBootstrapAuthForPath(initialPath);
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const logoutStartedRef = useRef(false);
  const [loading, setLoading] = useState(shouldBootstrapInitialAuth);

  useEffect(() => {
    try { localStorage.removeItem('the-hundred-auth-session'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(false);
      return;
    }

    if (logoutStartedRef.current) { setLoading(false); return; }
    const currentPath = getCurrentRoutePath();
    const hasPendingOauthBootstrap = sessionStorage.getItem(OAUTH_BOOTSTRAP_FLAG_KEY) === '1';
    if (!shouldBootstrapAuthForPath(currentPath) && !hasPendingOauthBootstrap) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const actor = captureAuthActor(useStore.getState().user);
    setLoading(true);
    api.getCurrentUser()
      .then((response) => {
        if (cancelled || !isCurrentAuthActor(actor, useStore.getState().user)) return;
        const backendUser = (response as { user?: BackendAuthUser })?.user;
        if (backendUser?.email && backendUser?.role) {
          advanceAuthSession();
          const sessionUser = buildSessionUser(backendUser);
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
          setUser(sessionUser);
          syncStoreUser(sessionUser, backendUser);
        }
        sessionStorage.removeItem(OAUTH_BOOTSTRAP_FLAG_KEY);
      })
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem(OAUTH_BOOTSTRAP_FLAG_KEY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) {
      syncStoreUser(null);
      useStore.getState().hydrateExamResults([]);
      useStore.getState().hydrateQuestionAttempts([]);
      return;
    }

    let cancelled = false;
    const actor = captureAuthActor(useStore.getState().user);
    const isCurrent = () => !cancelled && isCurrentAuthActor(actor, useStore.getState().user);
    let idleHandle: number | undefined;
    let timer: number | undefined;

    const hydrateNonCriticalSessionData = () => {
      Promise.all([
        api.getMyQuizResultsPage({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
        api.getQuestionAttempts({ page: 1, limit: 100 }),
      ])
        .then(([resultsPage, questionAttempts]) => {
          if (!isCurrent()) return;
          useStore.getState().hydrateExamResults((resultsPage as { data?: unknown[] })?.data as any[] || []);
          useStore.getState().hydrateQuestionAttempts(questionAttempts as any[]);
        })
        .catch((error) => { if (isCurrent()) console.warn('Failed to hydrate non-critical session data:', error); });
    };

    api.getCurrentUser()
      .then((currentUserResponse) => {
        if (!isCurrent()) return;
        syncStoreUser(user, (currentUserResponse as { user?: BackendAuthUser })?.user || null);
        const requestIdle = window.requestIdleCallback?.bind(window);
        if (requestIdle) idleHandle = requestIdle(hydrateNonCriticalSessionData, { timeout: 2500 });
        else timer = window.setTimeout(hydrateNonCriticalSessionData, 900);
      })
      .catch((error) => {
        if (!isCurrent()) return;
        console.warn('Failed to hydrate session data:', error);
        if (isAuthSessionError(error)) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setUser(null);
          resetStoreUser();
        }
      });

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [user]);

  function persistSession(sessionUser: SessionUser, backendUser: BackendAuthUser) {
    logoutStartedRef.current = false;
    advanceAuthSession();
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    setLoading(false);
    syncStoreUser(sessionUser, backendUser);
  }

  const signInWithEmail = async (email: string, password: string) => {
    const response = (await api.login(email, password)) as { token?: string; user: BackendAuthUser };
    const sessionUser = buildSessionUser(response.user);
    persistSession(sessionUser, response.user);
    return sessionUser;
  };

  const signInWithNationalId = async (nationalId: string, password: string) => {
    const response = (await api.nationalIdLogin(nationalId, password)) as { token?: string; user: BackendAuthUser };
    const sessionUser = buildSessionUser(response.user);
    persistSession(sessionUser, response.user);
    return sessionUser;
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const finalName = name?.trim() || email.split('@')[0] || 'Student';
    const response = (await api.register(finalName, email, password)) as { token?: string; user: BackendAuthUser };
    const sessionUser = buildSessionUser(response.user);
    persistSession(sessionUser, response.user);
    return sessionUser;
  };

  const signInWithGoogle = async () => {
    const returnTo = window.location.hash.replace(/^#/, '') || '/';
    const oauthApiBase =
      import.meta.env.VITE_GOOGLE_OAUTH_API_BASE?.replace(/\/$/, '') ||
      (import.meta.env.PROD ? 'https://almeaacodax-codex.onrender.com/api' : (api.baseUrl.endsWith('/api') ? api.baseUrl : `${api.baseUrl.replace(/\/$/, '')}/api`));
    window.location.assign(`${oauthApiBase}/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const logout = async () => {
    logoutStartedRef.current = true;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
    setLoading(false);
    resetStoreUser();
    try { await api.logout(); } catch (error) { console.warn('Failed to clear server session cookie:', error); }
  };

  const devSwitchRole = (role: BackendRole) => {
    if (!import.meta.env.DEV) return;
    const backendUser = buildDevBackendUser(role);
    const sessionUser = buildSessionUser(backendUser);
    persistSession(sessionUser, backendUser);
  };

  const refreshProfile = useCallback(async () => {
    const actor = captureAuthActor(useStore.getState().user);
    if (!actor.actorId || actor.actorId === 'guest') return;
    try {
      const response = await api.getCurrentUser();
      if (!isCurrentAuthActor(actor, useStore.getState().user)) return;
      const backendUser = (response as { user?: BackendAuthUser })?.user;
      if (backendUser && backendUser.email && backendUser.role) {
        const sessionUser = buildSessionUser(backendUser);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
        setUser(sessionUser);
        syncStoreUser(sessionUser, backendUser);
      }
    } catch (error) {
      if (isCurrentAuthActor(actor, useStore.getState().user)) console.warn('Failed to refresh profile in background:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let lastSync = Date.now();
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastSync > 15000) {
        lastSync = Date.now();
        void refreshProfile();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user, refreshProfile]);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signInWithNationalId, signUpWithEmail, logout, refreshProfile, devSwitchRole }),
    [user, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
