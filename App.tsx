
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { adapter } from './services/adapter';
import { api } from './services/api';
import { useStore } from './store/useStore';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { normalizePathId } from './utils/normalizePathId';
import { AnnouncementAdsOverlay } from './components/AnnouncementAdsOverlay';
import { PlatformFontBootstrap } from './components/PlatformFontBootstrap';
import { APP_VERSION } from './utils/appVersion';
import { installGlobalClientTelemetry } from './services/clientTelemetry';
import { PwaInstallBanner } from './components/PwaInstallBanner';

import { RoleSwitcher } from './components/RoleSwitcher';
import { AppRouteTree, prefetchRoleWorkspaceModule } from './app/AppRouteTree';
import { SeoRouteMeta } from './app/SeoRouteMeta';

const DATA_BOOTSTRAP_BLOCKING_PREFIXES = [
  '/quiz',
  '/results',
];

const DATA_BOOTSTRAP_START_PREFIXES = [
  '/dashboard',
  '/admin-dashboard',
  '/instructor-dashboard',
  '/school-teacher-dashboard',
  '/supervisor-dashboard',
  '/parent-dashboard',
  '/category',
  '/quiz',
  '/results',
  '/courses',
  '/course',
  '/quizzes',
  '/mock-exams',
  '/my-quizzes',
  '/my-requests',
  '/reports',
  '/favorites',
  '/plan',
  '/qa',
  '/book-session',
  '/live-sessions',
  '/profile',
  '/admin/quiz-gen',
  '/achievements',
];

const DATA_BOOTSTRAP_GATE_TIMEOUT_MS = 8000;

const getInitialRouterPath = () => {
  const pathname = window.location.pathname || '/';
  const hashPath = window.location.hash.replace(/^#/, '');

  if ((pathname === '/' || !pathname) && hashPath.startsWith('/')) {
    return hashPath.split(/[?#]/)[0];
  }

  return pathname;
};

const shouldBlockInitialBootstrap = () => {
  const path = getInitialRouterPath();
  return DATA_BOOTSTRAP_BLOCKING_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

const isDataBootstrapBlockingPath = (path: string) =>
  DATA_BOOTSTRAP_BLOCKING_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const shouldStartInitialBootstrap = () => {
  const path = getInitialRouterPath();
  return DATA_BOOTSTRAP_START_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

const shouldStartBootstrapForPath = (path: string) =>
  DATA_BOOTSTRAP_START_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const QUESTION_BOOTSTRAP_DEFER_PREFIXES = [
  '/category',
  '/dashboard',
  '/admin-dashboard',
  '/instructor-dashboard',
  '/school-teacher-dashboard',
  '/supervisor-dashboard',
  '/parent-dashboard',
  '/reports',
];

const shouldDeferQuestionBootstrap = (path: string) =>
  QUESTION_BOOTSTRAP_DEFER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const SKILL_PROGRESS_BOOTSTRAP_DEFER_PREFIXES = [
  '/category',
];

const shouldDeferSkillProgressBootstrap = (path: string) =>
  SKILL_PROGRESS_BOOTSTRAP_DEFER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const isRegisteredUser = (user?: { id?: string; email?: string }) =>
  Boolean(user && user.id && user.id !== 'guest' && user.email);

type BootstrapProfile = {
  loadCourses: boolean;
  loadQuizzes: boolean;
  loadTaxonomy: boolean;
  loadContent: boolean;
  contentScope: 'full' | 'learning';
  loadQuestions: boolean;
  loadSkillProgress: boolean;
};

const MINIMAL_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: false,
  loadQuizzes: false,
  loadTaxonomy: true,
  loadContent: false,
  contentScope: 'learning',
  loadQuestions: false,
  loadSkillProgress: false,
};

const FULL_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: true,
  loadQuizzes: true,
  loadTaxonomy: true,
  loadContent: true,
  contentScope: 'full',
  loadQuestions: true,
  loadSkillProgress: true,
};

const DASHBOARD_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: true,
  loadQuizzes: true,
  loadTaxonomy: true,
  loadContent: false,
  contentScope: 'learning',
  loadQuestions: false,
  loadSkillProgress: false,
};

const REPORTS_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: false,
  loadQuizzes: true,
  loadTaxonomy: true,
  loadContent: false,
  contentScope: 'learning',
  loadQuestions: false,
  loadSkillProgress: false,
};

const COURSE_CATALOG_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: false,
  loadQuizzes: false,
  loadTaxonomy: true,
  loadContent: false,
  contentScope: 'learning',
  loadQuestions: false,
  loadSkillProgress: false,
};

const CATEGORY_BOOTSTRAP_PROFILE: BootstrapProfile = {
  loadCourses: true,
  loadQuizzes: false,
  loadTaxonomy: true,
  loadContent: false,
  contentScope: 'learning',
  loadQuestions: false,
  loadSkillProgress: false,
};

const resolveBootstrapProfile = (path: string): BootstrapProfile => {
  if (path === '/' || path === '/blog') {
    return MINIMAL_BOOTSTRAP_PROFILE;
  }

  if (path.startsWith('/category/')) {
    return CATEGORY_BOOTSTRAP_PROFILE;
  }

  if (path === '/courses') {
    return COURSE_CATALOG_BOOTSTRAP_PROFILE;
  }

  if (path.startsWith('/course/')) {
    return MINIMAL_BOOTSTRAP_PROFILE;
  }

  if (
    path.startsWith('/admin-dashboard') ||
    path.startsWith('/instructor-dashboard') ||
    path.startsWith('/supervisor-dashboard') ||
    path.startsWith('/parent-dashboard')
  ) {
    return {
      ...FULL_BOOTSTRAP_PROFILE,
      loadQuestions: false,
      loadSkillProgress: false,
    };
  }

  if (path.startsWith('/dashboard')) {
    return DASHBOARD_BOOTSTRAP_PROFILE;
  }

  if (path.startsWith('/reports')) {
    return REPORTS_BOOTSTRAP_PROFILE;
  }

  if (path.startsWith('/quiz') || path.startsWith('/results')) {
    return FULL_BOOTSTRAP_PROFILE;
  }

  return {
    ...FULL_BOOTSTRAP_PROFILE,
    loadQuestions: false,
    loadSkillProgress: false,
  };
};

const LoadingFallback = () => {
  const path = getInitialRouterPath();
  const isDashboardRoute = path.includes('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      <div className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <div className="h-4 w-20 animate-pulse rounded-full bg-gray-100" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="flex items-baseline font-black">
            <span className="text-blue-900">منصة</span>
            <span className="mx-1 text-amber-500">المئة</span>
          </div>
        </div>
      </div>

      <div className={`mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:px-8 ${isDashboardRoute ? 'md:grid-cols-[16rem_1fr]' : ''}`}>
        {isDashboardRoute ? (
          <aside className="hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:block">
            <div className="mb-6 h-12 animate-pulse rounded-2xl bg-gray-50" />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`loading-side-${index}`} className="mb-3 h-10 animate-pulse rounded-2xl bg-gray-50" />
            ))}
          </aside>
        ) : null}

        <main className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-36 animate-pulse rounded-full bg-amber-100" />
              <div className="h-8 w-64 max-w-full animate-pulse rounded-2xl bg-gray-100" />
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`loading-card-${index}`} className="h-32 animate-pulse rounded-3xl bg-gray-50" />
            ))}
          </div>
          <div className="mt-5 h-56 animate-pulse rounded-3xl bg-gray-50" />
        </main>
      </div>
    </div>
  );
};

const LegacyHashRouteCompat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const rawHash = window.location.hash || '';
    if (!rawHash.startsWith('#/')) {
      return;
    }

    if (location.pathname !== '/' || location.search) {
      return;
    }

    const target = rawHash.slice(1);
    if (!target.startsWith('/')) {
      return;
    }

    navigate(target, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
};

const AbsoluteUrlPathRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const normalizeAbsolutePathCandidate = (value: string) =>
      /^https?:\/{1,2}/i.test(value) ? value.replace(/^(https?):\/(?!\/)/i, '$1://') : '';
    const rawPath = location.pathname || '/';
    const encodedCandidate = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    const decodedCandidate = (() => {
      try {
        return decodeURIComponent(encodedCandidate);
      } catch {
        return encodedCandidate;
      }
    })();
    const normalizedDecodedCandidate = normalizeAbsolutePathCandidate(decodedCandidate);
    const normalizedEncodedCandidate = normalizeAbsolutePathCandidate(encodedCandidate);
    const absoluteCandidate = normalizedDecodedCandidate
      ? `${normalizedDecodedCandidate}${location.search || ''}${location.hash || ''}`
      : normalizedEncodedCandidate
        ? `${normalizedEncodedCandidate}${location.search || ''}${location.hash || ''}`
        : '';

    if (!absoluteCandidate) {
      return;
    }

    try {
      const target = new URL(absoluteCandidate);
      if (target.origin === window.location.origin) {
        const nextPath = `${target.pathname || '/'}${target.search || ''}${target.hash || ''}`;
        navigate(nextPath || '/', { replace: true });
        return;
      }
    } catch {
      // Unknown absolute-looking paths fall back to the public home page.
    }

    navigate('/', { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
};

const BootstrapRouteGate: React.FC<{ bootstrapReady: boolean; children: React.ReactNode }> = ({ bootstrapReady, children }) => {
  const location = useLocation();
  const [timedOutPath, setTimedOutPath] = useState<string | null>(null);
  const currentPath = location.pathname || '/';

  useEffect(() => {
    if (bootstrapReady || !isDataBootstrapBlockingPath(currentPath)) {
      setTimedOutPath(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOutPath(currentPath);
    }, DATA_BOOTSTRAP_GATE_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [bootstrapReady, currentPath]);

  if (!bootstrapReady && isDataBootstrapBlockingPath(currentPath) && timedOutPath !== currentPath) {
    return <LoadingFallback />;
  }

  return <>{children}</>;
};

const CategoryRouteShellGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const paths = useStore((state) => state.paths);
  const subjects = useStore((state) => state.subjects);
  const isCategoryRoute = location.pathname === '/category' || location.pathname.startsWith('/category/');

  if (isCategoryRoute && paths.length === 0 && subjects.length === 0) {
    return <LoadingFallback />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const hydrateCourses = useStore((state) => state.hydrateCourses);
  const hydrateQuestions = useStore((state) => state.hydrateQuestions);
  const hydrateQuizzes = useStore((state) => state.hydrateQuizzes);
  const hydrateTaxonomy = useStore((state) => state.hydrateTaxonomy);
  const hydrateContentBootstrap = useStore((state) => state.hydrateContentBootstrap);
  const hydrateSkillProgress = useStore((state) => state.hydrateSkillProgress);
  const user = useStore((state) => state.user);

  useEffect(() => {
    window.__ALMEAA_APP_VERSION__ = APP_VERSION;
    window.__ALMEAA_API_BASE_URL__ = api.baseUrl;
    window.__ALMEAA_PERF_DEBUG__ = new URLSearchParams(window.location.search).get('perf') === '1';
    window.__ALMEAA_APP_STARTED_AT__ = performance.now();
  }, []);

  useEffect(() => installGlobalClientTelemetry(), []);

  useEffect(() => {
    let mounted = true;

    const bootstrapAppData = async (
      options: {
        profile?: BootstrapProfile;
        deferQuestions?: boolean;
        deferSkillProgress?: boolean;
        contentFilters?: { pathId?: string; subjectId?: string };
      } = {},
    ) => {
      try {
        const useRealApi = import.meta.env.PROD || import.meta.env.VITE_USE_REAL_API !== 'false';
        const profile = options.profile ?? FULL_BOOTSTRAP_PROFILE;
        if (useRealApi) {
          window.setTimeout(() => {
            void api.health().catch((error) => {
              console.warn('API health check failed; continuing data bootstrap.', error);
            });
          }, 2000);
        }

        const shouldLoadQuestions = profile.loadQuestions && !options.deferQuestions;
        const shouldLoadSkillProgress =
          profile.loadSkillProgress &&
          !options.deferSkillProgress &&
          isRegisteredUser(user);
        const coursesPromise = profile.loadCourses ? adapter.getCourses() : null;
        const quizzesPromise = profile.loadQuizzes ? adapter.getQuizzes() : null;
        const taxonomyPromise = profile.loadTaxonomy ? adapter.getTaxonomyBootstrap() : null;
        const taxonomyLoadPromise =
          profile.loadTaxonomy && profile.contentScope === 'learning'
            ? adapter.getTaxonomyBootstrap('core')
            : taxonomyPromise;
        const contentPhase = profile.contentScope === 'learning' ? 'core' : 'full';
        const contentPromise = profile.loadContent
          ? adapter.getContentBootstrap(profile.contentScope, contentPhase, options.contentFilters)
          : null;
        const questionsPromise = shouldLoadQuestions ? adapter.getQuestions({ page: 1, limit: 100 }) : null;
        const skillProgressPromise = shouldLoadSkillProgress ? api.getSkillProgress({ noTotal: true }) : null;

        coursesPromise?.then((courses) => {
          if (mounted && courses.length > 0) {
            hydrateCourses(courses);
          }
        }).catch((error) => console.warn('Course bootstrap unavailable:', error));

        quizzesPromise?.then((quizzes) => {
          if (mounted) {
            hydrateQuizzes(quizzes);
          }
        }).catch((error) => console.warn('Quiz bootstrap unavailable:', error));

        taxonomyLoadPromise?.then((taxonomyResult) => {
          if (!mounted) return;
          const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
          if (
            [
              taxonomyResult.paths,
              taxonomyResult.levels,
              taxonomyResult.subjects,
              taxonomyResult.sections,
              taxonomyResult.skills,
            ].some(hasItems)
          ) {
            hydrateTaxonomy({
              paths: taxonomyResult.paths as any[],
              levels: taxonomyResult.levels as any[],
              subjects: taxonomyResult.subjects as any[],
              sections: taxonomyResult.sections as any[],
              skills: taxonomyResult.skills as any[],
            });
          }
        }).catch((error) => console.warn('Taxonomy bootstrap unavailable:', error));

        if (profile.loadTaxonomy && profile.contentScope === 'learning') {
          void adapter.getTaxonomyBootstrap('compact')
            .then((compactTaxonomyResult) => {
              if (!mounted) return;
              const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
              if (
                [
                  compactTaxonomyResult.paths,
                  compactTaxonomyResult.levels,
                  compactTaxonomyResult.subjects,
                  compactTaxonomyResult.sections,
                  compactTaxonomyResult.skills,
                ].some(hasItems)
              ) {
                hydrateTaxonomy({
                  paths: compactTaxonomyResult.paths as any[],
                  levels: compactTaxonomyResult.levels as any[],
                  subjects: compactTaxonomyResult.subjects as any[],
                  sections: compactTaxonomyResult.sections as any[],
                  skills: compactTaxonomyResult.skills as any[],
                });
              }
            })
            .catch((error) => console.warn('Deferred taxonomy bootstrap unavailable:', error));
        }

        contentPromise?.then((contentResult) => {
          if (!mounted) return;
          const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
          if (
            [
              contentResult.topics,
              contentResult.lessons,
              contentResult.libraryItems,
              contentResult.groups,
              contentResult.b2bPackages,
              contentResult.accessCodes,
              contentResult.announcementAds,
              contentResult.studyPlans,
            ].some(hasItems)
          ) {
            hydrateContentBootstrap({
              topics: contentResult.topics as any[],
              lessons: contentResult.lessons as any[],
              libraryItems: contentResult.libraryItems as any[],
              groups: contentResult.groups as any[],
              b2bPackages: contentResult.b2bPackages as any[],
              accessCodes: contentResult.accessCodes as any[],
              announcementAds: contentResult.announcementAds as any[],
              studyPlans: profile.contentScope === 'full' && ['admin', 'teacher', 'supervisor'].includes(user?.role || '')
                ? contentResult.studyPlans as any[] : undefined,
            });
          }
        }).catch((error) => console.warn('Content bootstrap unavailable:', error));

        const [questionsResult, skillProgressResult] = await Promise.allSettled([
          questionsPromise ?? Promise.resolve(null),
          skillProgressPromise ?? Promise.resolve(null),
        ]);

        if (!mounted) {
          return;
        }

        if (questionsResult.status === 'fulfilled' && Array.isArray(questionsResult.value)) {
          hydrateQuestions(questionsResult.value);
        }

        if (skillProgressResult.status === 'fulfilled') {
          hydrateSkillProgress(skillProgressResult.value as any[]);
        }

        if (profile.loadQuestions && options.deferQuestions) {
          void adapter.getQuestions({ page: 1, limit: 20, summary: true, noTotal: true })
            .then((questions) => {
              if (mounted) {
                const currentQuestions = useStore.getState().questions || [];
                const mergedById = new Map(currentQuestions.map((question) => [question.id, question]));
                questions.forEach((question) => {
                  if (!mergedById.has(question.id)) {
                    mergedById.set(question.id, question);
                  }
                });
                hydrateQuestions(Array.from(mergedById.values()));
              }
            })
            .catch((error) => {
              console.warn('Deferred question bootstrap unavailable:', error);
            });
        }

        if (profile.loadSkillProgress && options.deferSkillProgress && isRegisteredUser(user)) {
          void api.getSkillProgress({ noTotal: true })
            .then((skillProgress) => {
              if (mounted) {
                hydrateSkillProgress(skillProgress as any[]);
              }
            })
            .catch((error) => {
              console.warn('Deferred skill-progress bootstrap unavailable:', error);
            });
        }
      } catch (error) {
        console.warn('App bootstrap fallback active:', error);
      } finally {
        if (mounted) {
          setBootstrapReady(true);
        }
      }
    };

    const loadPublicAnnouncementAds = async () => {
      try {
        const response = await api.getPublicAnnouncementAds();

        if (mounted) {
          hydrateContentBootstrap({
            announcementAds: response.announcementAds as any[],
          });
        }
      } catch (error) {
        console.warn('Public announcement ads unavailable:', error);
      }
    };

    const loadPublicNavigationBootstrap = async () => {
      try {
        const taxonomyResult = await adapter.getTaxonomyBootstrap('core');

        if (mounted) {
          hydrateTaxonomy({
            paths: taxonomyResult.paths as any[],
            levels: taxonomyResult.levels as any[],
            subjects: taxonomyResult.subjects as any[],
            sections: taxonomyResult.sections as any[],
            skills: taxonomyResult.skills as any[],
          });
        }
      } catch (error) {
        console.warn('Public navigation bootstrap unavailable:', error);
      }
    };

    const startedBootstrapProfiles = new Set<string>();
    let publicAdsTimer: ReturnType<typeof setTimeout> | undefined;
    let publicAdsIdleHandle: number | undefined;

    const cancelDeferredBootstrap = () => {
      if (publicAdsTimer !== undefined) {
        window.clearTimeout(publicAdsTimer);
      }

      if (publicAdsIdleHandle !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(publicAdsIdleHandle);
      }
    };

    const resolveContentFiltersForPath = (path: string) => {
      const categoryMatch = path.match(/^\/category\/([^/?#]+)/);
      if (!categoryMatch?.[1]) return undefined;
      return { pathId: normalizePathId(decodeURIComponent(categoryMatch[1])) };
    };

    const startBootstrap = () => {
      const path = getInitialRouterPath();
      const profile = resolveBootstrapProfile(path);
      const deferQuestions = shouldDeferQuestionBootstrap(path);
      const deferSkillProgress = shouldDeferSkillProgressBootstrap(path);
      const contentFilters = profile.loadContent ? resolveContentFiltersForPath(path) : undefined;
      const profileKey = JSON.stringify({
        profile,
        deferQuestions,
        deferSkillProgress,
        contentFilters,
      });

      if (startedBootstrapProfiles.has(profileKey)) {
        return;
      }

      startedBootstrapProfiles.add(profileKey);
      if (isDataBootstrapBlockingPath(path)) {
        setBootstrapReady(false);
      }

      void bootstrapAppData({
        profile,
        deferQuestions,
        deferSkillProgress,
        contentFilters,
      });
    };

    const startIfRouteNeedsData = () => {
      const path = getInitialRouterPath();
      if (path === '/admin-dashboard' || path === '/instructor-dashboard' || path === '/supervisor-dashboard') {
        prefetchRoleWorkspaceModule(path === '/supervisor-dashboard' ? 'supervisor' : 'admin');
      }

      if (shouldStartBootstrapForPath(path)) {
        if (isDataBootstrapBlockingPath(path)) {
          cancelDeferredBootstrap();
        }
        startBootstrap();
      }
    };

    const requestIdle = window.requestIdleCallback?.bind(window);

    if (shouldStartInitialBootstrap()) {
      startIfRouteNeedsData();
    } else if (requestIdle) {
      publicAdsTimer = globalThis.setTimeout(() => {
        void loadPublicNavigationBootstrap();
      }, 50);
      publicAdsIdleHandle = requestIdle(() => {
        void loadPublicAnnouncementAds();
      }, { timeout: 1000 });
    } else {
      void loadPublicNavigationBootstrap();
      publicAdsTimer = globalThis.setTimeout(() => {
        void loadPublicAnnouncementAds();
      }, 350);
    }

    window.addEventListener('hashchange', startIfRouteNeedsData);
    window.addEventListener('popstate', startIfRouteNeedsData);

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = ((...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      window.dispatchEvent(new Event('app:url-change'));
      startIfRouteNeedsData();
    }) as History['pushState'];

    window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      window.dispatchEvent(new Event('app:url-change'));
      startIfRouteNeedsData();
    }) as History['replaceState'];

    return () => {
      mounted = false;
      cancelDeferredBootstrap();
      window.removeEventListener('hashchange', startIfRouteNeedsData);
      window.removeEventListener('popstate', startIfRouteNeedsData);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [hydrateContentBootstrap, hydrateCourses, hydrateQuestions, hydrateQuizzes, hydrateSkillProgress, hydrateTaxonomy]);

  useEffect(() => {
    if (!['admin', 'teacher', 'supervisor'].includes(user?.role || '')) {
      return;
    }

    const requestIdle = window.requestIdleCallback?.bind(window);
    if (requestIdle) {
      const handle = requestIdle(() => {
        prefetchRoleWorkspaceModule(user.role);
      }, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => {
      prefetchRoleWorkspaceModule(user.role);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [user?.role]);

  return (
    <Router>
      <PlatformFontBootstrap />
      <Suspense fallback={<LoadingFallback />}>
        <AppErrorBoundary>
        <LegacyHashRouteCompat />
        <AbsoluteUrlPathRedirect />
        <SeoRouteMeta />
        <BootstrapRouteGate bootstrapReady={bootstrapReady}>
        <CategoryRouteShellGate>
        <AppRouteTree loadingFallback={<LoadingFallback />} />
        </CategoryRouteShellGate>
        </BootstrapRouteGate>
        </AppErrorBoundary>
        <AnnouncementAdsOverlay />
        <PwaInstallBanner />
        {(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ? <RoleSwitcher /> : null}
      </Suspense>
    </Router>
  );
};

export default App;

