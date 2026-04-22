
import React, { Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { useFirebaseSync } from './services/firebaseSync';
import { adapter } from './services/adapter';
import { useStore } from './store/useStore';
import { RequireRole } from './components/auth/RequireRole';

import { RoleSwitcher } from './components/RoleSwitcher';

// Lazy Load Pages
const Landing = React.lazy(() => import('./pages/Landing').then(module => ({ default: module.Landing })));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const Results = React.lazy(() => import('./pages/Results'));
const Quizzes = React.lazy(() => import('./pages/Quizzes'));
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
const Blog = React.lazy(() => import('./pages/Blog').then(module => ({ default: module.Blog })));
const CourseView = React.lazy(() => import('./pages/CourseView'));
const BookSession = React.lazy(() => import('./pages/BookSession').then(module => ({ default: module.BookSession })));
const SubjectLearningPage = React.lazy(() => import('./pages/SubjectLearningPage').then(module => ({ default: module.SubjectLearningPage })));
const QuizPage = React.lazy(() => import('./pages/QuizPage').then(module => ({ default: module.QuizPage })));
const GenericPathPage = React.lazy(() => import('./pages/GenericPathPage').then(module => ({ default: module.GenericPathPage })));

// Dashboards
const AdminDashboard = React.lazy(() => import('./dashboards/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 text-amber-500">
    <Loader2 className="w-10 h-10 animate-spin" />
  </div>
);

const App: React.FC = () => {
  useFirebaseSync();
  const hydrateCourses = useStore((state) => state.hydrateCourses);
  const hydrateTaxonomy = useStore((state) => state.hydrateTaxonomy);

  useEffect(() => {
    let mounted = true;

    const bootstrapAppData = async () => {
      try {
        const [courses, taxonomy] = await Promise.all([
          adapter.getCourses(),
          adapter.getTaxonomyBootstrap(),
        ]);

        if (!mounted) {
          return;
        }

        hydrateCourses(courses);
        hydrateTaxonomy({
          paths: taxonomy.paths as any[],
          levels: taxonomy.levels as any[],
          subjects: taxonomy.subjects as any[],
        });
      } catch (error) {
        console.warn('App bootstrap fallback active:', error);
      }
    };

    bootstrapAppData();

    return () => {
      mounted = false;
    };
  }, [hydrateCourses, hydrateTaxonomy]);

  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Routes without Main Layout (Full Screen) */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:quizId" element={<QuizPage />} />
            <Route path="/results" element={<Results />} />
            
            {/* Admin Routes */}
            <Route path="/admin-dashboard" element={
              <RequireRole allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDashboard />
                </Suspense>
              </RequireRole>
            } />

            {/* Routes with Main Layout */}
            <Route path="*" element={
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/course/:courseId" element={<CourseView />} />
                    <Route path="/quizzes" element={<Quizzes />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/plan" element={<Plan />} />
                    <Route path="/qa" element={<QA />} />
                    <Route path="/book-session" element={<BookSession />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin/quiz-gen" element={<QuizGenerator />} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="/blog" element={<Blog />} />
                    
                    {/* Old Hardcoded Routes mapped to generic or kept if needed. The new pattern replaces old Nafes */}
                    <Route path="/category/:pathId" element={<GenericPathPage />} />
                    <Route path="/category/:pathId/:subjectId" element={<SubjectLearningPage />} />
                    
                    {/* Placeholder for other routes */}
                    <Route path="/section/:catId" element={<div className="p-20 text-center font-bold text-gray-500 text-xl">صفحة القسم (قيد التطوير)</div>} />
                  </Routes>
                </Suspense>
              </Layout>
            } />
          </Routes>
          {(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ? <RoleSwitcher /> : null}
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
