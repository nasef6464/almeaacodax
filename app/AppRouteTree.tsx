import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { RequireRole } from '../components/auth/RequireRole';
import { RequireAuth } from '../components/auth/RequireAuth';
import { useAuth } from '../contexts/AuthContext';
import { TeacherWorkspaceGate } from '../components/teacher/TeacherWorkspaceContext';
import { normalizePathId } from '../utils/normalizePathId';

const Landing = React.lazy(() => import('../pages/Landing').then(module => ({ default: module.Landing })));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Quiz = React.lazy(() => import('../pages/Quiz'));
const Results = React.lazy(() => import('../pages/Results'));
const MockExams = React.lazy(() => import('../pages/MockExams'));
const Quizzes = React.lazy(() => import('../pages/Quizzes'));
const Reports = React.lazy(() => import('../pages/Reports'));
const Favorites = React.lazy(() => import('../pages/Favorites'));
const Plan = React.lazy(() => import('../pages/Plan'));
const QA = React.lazy(() => import('../pages/QA'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Courses = React.lazy(() => import('../pages/Courses'));
const QuizGenerator = React.lazy(() => import('../components/QuizGenerator').then(module => ({ default: module.QuizGenerator })));
const Achievements = React.lazy(() => import('../pages/Achievements').then(module => ({ default: module.Achievements })));
const Blog = React.lazy(() => import('../pages/Blog'));
const CourseView = React.lazy(() => import('../pages/CourseView'));
const ForgotPassword = React.lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('../pages/VerifyEmail'));
const BookSession = React.lazy(() => import('../pages/BookSession').then(module => ({ default: module.BookSession })));
const LiveSessions = React.lazy(() => import('../pages/LiveSessions'));
const LiveSessionLobby = React.lazy(() => import('../pages/LiveSessionLobby'));
const QuizPage = React.lazy(() => import('../pages/QuizPage').then(module => ({ default: module.QuizPage })));
const ClassroomStudentLive = React.lazy(() => import('../pages/ClassroomStudentLive').then(module => ({ default: module.ClassroomStudentLive })));
const ClassroomTeacherConsole = React.lazy(() => import('../pages/ClassroomTeacherConsole').then(module => ({ default: module.ClassroomTeacherConsole })));
const ClassroomProjectorView = React.lazy(() => import('../pages/ClassroomProjectorView').then(module => ({ default: module.ClassroomProjectorView })));
const SchoolTeacherDashboard = React.lazy(() => import('../dashboards/SchoolTeacherDashboard').then(module => ({ default: module.SchoolTeacherDashboard })));
const SchoolDirectorDashboard = React.lazy(() => import('../dashboards/SchoolDirectorDashboard').then(module => ({ default: module.SchoolDirectorDashboard })));
const GenericPathPage = React.lazy(() => import('../pages/GenericPathPage').then(module => ({ default: module.GenericPathPage })));
const CertificatePage = React.lazy(() => import('../pages/CertificatePage'));
const ReviewSession = React.lazy(() => import('../pages/ReviewSession'));
const Pricing = React.lazy(() => import('../pages/Pricing'));
const Cart = React.lazy(() => import('../pages/Cart'));
const MyRequests = React.lazy(() => import('../pages/MyRequests').then(module => ({ default: module.MyRequests })));
const StaticInfoPage = React.lazy(() => import('../pages/StaticInfoPage'));
const BarcodeTest = React.lazy(() => import('../pages/BarcodeTest'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const loadAdminDashboardModule = () => import('../dashboards/admin/AdminDashboard');
const AdminDashboard = React.lazy(() => loadAdminDashboardModule().then(module => ({ default: module.AdminDashboard })));
const loadSupervisorDashboardModule = () => import('../dashboards/admin/SupervisorDashboard');
const SupervisorDashboard = React.lazy(() => loadSupervisorDashboardModule().then(module => ({ default: module.SupervisorDashboard })));

export const prefetchRoleWorkspaceModule = (role?: string | null) => {
  if (role === 'admin' || role === 'teacher') void loadAdminDashboardModule();
  if (role === 'supervisor') void loadSupervisorDashboardModule();
};

const LegacySubjectRouteRedirect: React.FC = () => {
  const { pathId = '', subjectId = '' } = useParams<{ pathId: string; subjectId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?subject=${subjectId}&tab=skills`} />;
};

const LegacyPackagesRouteRedirect: React.FC = () => {
  const { pathId = '' } = useParams<{ pathId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?tab=packages`} />;
};

const ClassroomStudentRedirect: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  return <Navigate replace to={`/classroom/${sessionId}`} />;
};

const DashboardRoleDispatcher: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <Navigate replace to="/classroom/teacher" />;
  if (user?.role === 'admin') return <Navigate replace to="/admin-dashboard" />;
  if (user?.role === 'supervisor') return <Navigate replace to="/supervisor-dashboard" />;
  if (user?.role === 'parent') return <Navigate replace to="/parent-dashboard" />;
  return <Dashboard />;
};

export const AppRouteTree: React.FC<{ loadingFallback: React.ReactNode }> = ({ loadingFallback }) => {
  const adminDashboard = (
    <RequireRole allowedRoles={['admin']}>
      <Suspense fallback={loadingFallback}><AdminDashboard /></Suspense>
    </RequireRole>
  );
  const instructorDashboard = (
    <RequireRole allowedRoles={['teacher']}>
      <TeacherWorkspaceGate workspace="platform">
        <Suspense fallback={loadingFallback}><AdminDashboard /></Suspense>
      </TeacherWorkspaceGate>
    </RequireRole>
  );

  return (
    <Routes>
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/quiz/:quizId" element={<QuizPage />} />
      <Route path="/classroom" element={<Navigate replace to="/classroom/teacher" />} />
      <Route path="/classroom/:sessionId" element={<ClassroomStudentLive />} />
      <Route path="/classroom/:sessionId/student" element={<ClassroomStudentRedirect />} />
      <Route path="/classroom/teacher" element={<RequireRole allowedRoles={['teacher', 'admin']}><ClassroomTeacherConsole /></RequireRole>} />
      <Route path="/classroom/:sessionId/teacher" element={<RequireRole allowedRoles={['teacher', 'admin']}><ClassroomTeacherConsole /></RequireRole>} />
      <Route path="/classroom/:sessionId/projector" element={<ClassroomProjectorView />} />
      <Route path="/results" element={<Results />} />
      <Route path="/admin-dashboard" element={adminDashboard} />
      <Route path="/instructor-dashboard" element={instructorDashboard} />
      <Route path="/school-teacher-dashboard" element={
        <RequireRole allowedRoles={['teacher']}>
          <TeacherWorkspaceGate workspace="school">
            <Suspense fallback={loadingFallback}><SchoolTeacherDashboard /></Suspense>
          </TeacherWorkspaceGate>
        </RequireRole>
      } />
      <Route path="/school-director-dashboard" element={
        <RequireRole allowedRoles={['school_admin']}>
          <Suspense fallback={loadingFallback}><SchoolDirectorDashboard /></Suspense>
        </RequireRole>
      } />
      <Route path="/supervisor-dashboard" element={
        <RequireRole allowedRoles={['admin', 'teacher', 'supervisor']}>
          <Suspense fallback={loadingFallback}><SupervisorDashboard /></Suspense>
        </RequireRole>
      } />
      <Route path="/parent-dashboard" element={<RequireRole allowedRoles={['parent']}><Dashboard /></RequireRole>} />

      <Route path="*" element={
        <Layout>
          <Suspense fallback={loadingFallback}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<RequireAuth><DashboardRoleDispatcher /></RequireAuth>} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/course/:courseId" element={<CourseView />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/mock-exams" element={<MockExams />} />
              <Route path="/my-quizzes" element={<RequireAuth><Quizzes view="attempts" /></RequireAuth>} />
              <Route path="/my-requests" element={<RequireAuth><MyRequests /></RequireAuth>} />
              <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
              <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
              <Route path="/plan" element={<RequireAuth><Plan /></RequireAuth>} />
              <Route path="/qa" element={<RequireAuth><QA /></RequireAuth>} />
              <Route path="/book-session" element={<RequireAuth><BookSession /></RequireAuth>} />
              <Route path="/live-sessions" element={<RequireAuth><LiveSessions /></RequireAuth>} />
              <Route path="/live-sessions/:lessonId" element={<RequireAuth><LiveSessionLobby /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/admin/quiz-gen" element={<RequireRole allowedRoles={['admin', 'teacher', 'supervisor']}><QuizGenerator /></RequireRole>} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/login" element={<Navigate replace to="/?auth=login" />} />
              <Route path="/signup" element={<Navigate replace to="/?auth=signup" />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Cart />} />
              <Route path="/barcode-test" element={<BarcodeTest />} />
              <Route path="/barcode-test/:slug" element={<BarcodeTest />} />
              <Route path="/b/:slug" element={<BarcodeTest />} />
              <Route path="/about" element={<StaticInfoPage kind="about" />} />
              <Route path="/contact" element={<StaticInfoPage kind="contact" />} />
              <Route path="/faq" element={<StaticInfoPage kind="faq" />} />
              <Route path="/privacy" element={<StaticInfoPage kind="privacy" />} />
              <Route path="/terms" element={<StaticInfoPage kind="terms" />} />
              <Route path="/certificate/:code" element={<CertificatePage />} />
              <Route path="/review" element={<RequireAuth><ReviewSession /></RequireAuth>} />
              <Route path="/category/:pathId" element={<GenericPathPage />} />
              <Route path="/category/:pathId/packages" element={<LegacyPackagesRouteRedirect />} />
              <Route path="/category/:pathId/:subjectId" element={<LegacySubjectRouteRedirect />} />
              <Route path="/section/:catId" element={<Navigate replace to="/dashboard" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      } />
    </Routes>
  );
};
