
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { adapter } from './services/adapter';
import { api } from './services/api';
import { useStore } from './store/useStore';
import { RequireRole } from './components/auth/RequireRole';
import { normalizePathId } from './utils/normalizePathId';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { APP_VERSION } from './utils/appVersion';
import { installGlobalClientTelemetry } from './services/clientTelemetry';

import { RoleSwitcher } from './components/RoleSwitcher';

// Lazy Load Pages
const Landing = React.lazy(() => import('./pages/Landing').then(module => ({ default: module.Landing })));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const Results = React.lazy(() => import('./pages/Results'));
const MockExams = React.lazy(() => import('./pages/MockExams'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Plan = React.lazy(() => import('./pages/Plan'));
const QA = React.lazy(() => import('./pages/QA'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Courses = React.lazy(() => import('./pages/Courses'));
const QuizGenerator = React.lazy(() => import('./components/QuizGenerator').then(module => ({ default: module.QuizGenerator })));
const Achievements = React.lazy(() => import('./pages/Achievements').then(module => ({ default: module.Achievements })));
const Qudrat = React.lazy(() => import('./pages/Qudrat').then(module => ({ default: module.Qudrat })));
const QudratSection = React.lazy(() => import('./pages/QudratSection').then(module => ({ default: module.QudratSection })));
const Tahsili = React.lazy(() => import('./pages/Tahsili').then(module => ({ default: module.Tahsili })));
const TahsiliSubject = React.lazy(() => import('./pages/TahsiliSubject').then(module => ({ default: module.TahsiliSubject })));
const Blog = React.lazy(() => import('./pages/Blog'));
const CourseView = React.lazy(() => import('./pages/CourseView'));
const BookSession = React.lazy(() => import('./pages/BookSession').then(module => ({ default: module.BookSession })));
const LiveSessions = React.lazy(() => import('./pages/LiveSessions'));
const QuizPage = React.lazy(() => import('./pages/QuizPage').then(module => ({ default: module.QuizPage })));
const GenericPathPage = React.lazy(() => import('./pages/GenericPathPage').then(module => ({ default: module.GenericPathPage })));

// Dashboards
const AdminDashboard = React.lazy(() => import('./dashboards/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 text-amber-500">
    <Loader2 className="w-10 h-10 animate-spin" />
  </div>
);

const LegacySubjectRouteRedirect: React.FC = () => {
  const { pathId = '', subjectId = '' } = useParams<{ pathId: string; subjectId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?subject=${subjectId}&tab=skills`} />;
};

const LegacyPackagesRouteRedirect: React.FC = () => {
  const { pathId = '' } = useParams<{ pathId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?tab=packages`} />;
};

const App: React.FC = () => {
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const hydrateCourses = useStore((state) => state.hydrateCourses);
  const hydrateQuestions = useStore((state) => state.hydrateQuestions);
  const hydrateQuizzes = useStore((state) => state.hydrateQuizzes);
  const hydrateTaxonomy = useStore((state) => state.hydrateTaxonomy);
  const hydrateContentBootstrap = useStore((state) => state.hydrateContentBootstrap);
  const hydrateSkillProgress = useStore((state) => state.hydrateSkillProgress);

  useEffect(() => {
    window.__ALMEAA_APP_VERSION__ = APP_VERSION;
    window.__ALMEAA_API_BASE_URL__ = api.baseUrl;
  }, []);

  useEffect(() => installGlobalClientTelemetry(), []);

  useEffect(() => {
    const useRealApi = import.meta.env.VITE_USE_REAL_API !== 'false';

    if (useRealApi) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    import('./services/firebaseSync')
      .then((module) => {
        if (!cancelled) {
          cleanup = module.startFirebaseSync();
        }
      })
      .catch((error) => {
        console.warn('Legacy Firebase sync unavailable:', error);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrapAppData = async () => {
      try {
        const [coursesResult, questionsResult, quizzesResult, taxonomyResult, contentResult, skillProgressResult] = await Promise.allSettled([
          adapter.getCourses(),
          adapter.getQuestions(),
          adapter.getQuizzes(),
          adapter.getTaxonomyBootstrap(),
          adapter.getContentBootstrap(),
          api.getSkillProgress(),
        ]);

        if (!mounted) {
          return;
        }

        if (coursesResult.status === 'fulfilled') {
          hydrateCourses(coursesResult.value);
        }

        if (questionsResult.status === 'fulfilled') {
          hydrateQuestions(questionsResult.value);
        }

        if (quizzesResult.status === 'fulfilled') {
          hydrateQuizzes(quizzesResult.value);
        }

        if (taxonomyResult.status === 'fulfilled') {
          hydrateTaxonomy({
            paths: taxonomyResult.value.paths as any[],
            levels: taxonomyResult.value.levels as any[],
            subjects: taxonomyResult.value.subjects as any[],
            sections: taxonomyResult.value.sections as any[],
            skills: taxonomyResult.value.skills as any[],
          });
        }

        if (contentResult.status === 'fulfilled') {
          hydrateContentBootstrap({
            topics: contentResult.value.topics as any[],
            lessons: contentResult.value.lessons as any[],
            libraryItems: contentResult.value.libraryItems as any[],
            groups: contentResult.value.groups as any[],
            b2bPackages: contentResult.value.b2bPackages as any[],
            accessCodes: contentResult.value.accessCodes as any[],
            studyPlans: contentResult.value.studyPlans as any[],
          });
        }

        if (skillProgressResult.status === 'fulfilled') {
          hydrateSkillProgress(skillProgressResult.value as any[]);
        }
      } catch (error) {
        console.warn('App bootstrap fallback active:', error);
      } finally {
        if (mounted) {
          setBootstrapReady(true);
        }
      }
    };

    bootstrapAppData();

    return () => {
      mounted = false;
    };
  }, [hydrateContentBootstrap, hydrateCourses, hydrateQuestions, hydrateQuizzes, hydrateSkillProgress, hydrateTaxonomy]);

  if (!bootstrapReady) {
    return <LoadingFallback />;
  }

  const staffDashboard = (
    <RequireRole allowedRoles={['admin', 'teacher', 'supervisor']}>
      <Suspense fallback={<LoadingFallback />}>
        <AdminDashboard />
      </Suspense>
    </RequireRole>
  );

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <AppErrorBoundary>
        <Routes>
          {/* Routes without Main Layout (Full Screen) */}
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/:quizId" element={<QuizPage />} />
          <Route path="/results" element={<Results />} />
          
          {/* Admin Routes */}
          <Route path="/admin-dashboard" element={staffDashboard} />
          <Route path="/instructor-dashboard" element={staffDashboard} />
          <Route path="/supervisor-dashboard" element={staffDashboard} />
          <Route
            path="/parent-dashboard"
            element={
              <RequireRole allowedRoles={['parent']}>
                <Dashboard />
              </RequireRole>
            }
          />

          {/* Routes with Main Layout */}
          <Route path="*" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/course/:courseId" element={<CourseView />} />
                  <Route path="/quizzes" element={<Navigate replace to="/dashboard?tab=saher" />} />
                  <Route path="/mock-exams" element={<MockExams />} />
                  <Route path="/my-quizzes" element={<Navigate replace to="/dashboard?tab=quizzes" />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/plan" element={<Plan />} />
                  <Route path="/qa" element={<QA />} />
                  <Route path="/book-session" element={<BookSession />} />
                  <Route path="/live-sessions" element={<LiveSessions />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin/quiz-gen" element={<QuizGenerator />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/blog" element={<Blog />} />
                  
                  {/* Old Hardcoded Routes mapped to generic or kept if needed. The new pattern replaces old Nafes */}
                  <Route path="/category/:pathId" element={<GenericPathPage />} />
                  <Route path="/category/:pathId/packages" element={<LegacyPackagesRouteRedirect />} />
                  <Route path="/category/:pathId/:subjectId" element={<LegacySubjectRouteRedirect />} />
                  
                  {/* Placeholder for other routes */}
                  <Route path="/section/:catId" element={<Navigate replace to="/dashboard" />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
        </AppErrorBoundary>
        {(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ? <RoleSwitcher /> : null}
      </Suspense>
    </Router>
  );
};

export default App;
