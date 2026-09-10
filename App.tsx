
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { adapter } from './services/adapter';
import { api } from './services/api';
import { useStore } from './store/useStore';
import { RequireRole } from './components/auth/RequireRole';
import { RequireAuth } from './components/auth/RequireAuth';
import { normalizePathId } from './utils/normalizePathId';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AnnouncementAdsOverlay } from './components/AnnouncementAdsOverlay';
import { PlatformFontBootstrap } from './components/PlatformFontBootstrap';
import { APP_VERSION } from './utils/appVersion';
import { installGlobalClientTelemetry } from './services/clientTelemetry';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { TeacherWorkspaceGate } from './components/teacher/TeacherWorkspaceContext';

import { RoleSwitcher } from './components/RoleSwitcher';

// Lazy Load Pages
const Landing = React.lazy(() => import('./pages/Landing').then(module => ({ default: module.Landing })));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const Results = React.lazy(() => import('./pages/Results'));
const MockExams = React.lazy(() => import('./pages/MockExams'));
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
const Blog = React.lazy(() => import('./pages/Blog'));
const CourseView = React.lazy(() => import('./pages/CourseView'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const BookSession = React.lazy(() => import('./pages/BookSession').then(module => ({ default: module.BookSession })));
const LiveSessions = React.lazy(() => import('./pages/LiveSessions'));
const LiveSessionLobby = React.lazy(() => import('./pages/LiveSessionLobby'));
const QuizPage = React.lazy(() => import('./pages/QuizPage').then(module => ({ default: module.QuizPage })));
const ClassroomStudentLive = React.lazy(() => import('./pages/ClassroomStudentLive').then(module => ({ default: module.ClassroomStudentLive })));
const ClassroomTeacherConsole = React.lazy(() => import('./pages/ClassroomTeacherConsole').then(module => ({ default: module.ClassroomTeacherConsole })));
const ClassroomProjectorView = React.lazy(() => import('./pages/ClassroomProjectorView').then(module => ({ default: module.ClassroomProjectorView })));
const SchoolTeacherDashboard = React.lazy(() => import('./dashboards/SchoolTeacherDashboard').then(module => ({ default: module.SchoolTeacherDashboard })));
const SchoolDirectorDashboard = React.lazy(() => import('./dashboards/SchoolDirectorDashboard').then(module => ({ default: module.SchoolDirectorDashboard })));
const GenericPathPage = React.lazy(() => import('./pages/GenericPathPage').then(module => ({ default: module.GenericPathPage })));
const CertificatePage = React.lazy(() => import('./pages/CertificatePage'));
const ReviewSession = React.lazy(() => import('./pages/ReviewSession'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Cart = React.lazy(() => import('./pages/Cart'));
const MyRequests = React.lazy(() => import('./pages/MyRequests').then(module => ({ default: module.MyRequests })));
const StaticInfoPage = React.lazy(() => import('./pages/StaticInfoPage'));
const BarcodeTest = React.lazy(() => import('./pages/BarcodeTest'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Dashboards
const loadAdminDashboardModule = () => import('./dashboards/admin/AdminDashboard');
const AdminDashboard = React.lazy(() => loadAdminDashboardModule().then(module => ({ default: module.AdminDashboard })));
const loadSupervisorDashboardModule = () => import('./dashboards/admin/SupervisorDashboard');
const SupervisorDashboard = React.lazy(() => loadSupervisorDashboardModule().then(module => ({ default: module.SupervisorDashboard })));

const prefetchCommonRouteModules = (role?: string | null) => {
  void import('./pages/Dashboard');
  void import('./pages/GenericPathPage');
  void import('./pages/Quizzes');
  void import('./pages/MockExams');
  void import('./pages/Courses');

  if (role === 'admin' || role === 'teacher') {
    void loadAdminDashboardModule();
  }
  if (role === 'supervisor') {
    void loadSupervisorDashboardModule();
  }
};

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

const resolveBootstrapProfile = (path: string): BootstrapProfile => {
  if (path === '/' || path === '/blog') {
    return MINIMAL_BOOTSTRAP_PROFILE;
  }

  if (path.startsWith('/category/') || path === '/courses' || path.startsWith('/course/')) {
    return {
      ...FULL_BOOTSTRAP_PROFILE,
      contentScope: 'learning',
      loadQuestions: false,
      loadSkillProgress: false,
    };
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

  if (
    path.startsWith('/quiz') ||
    path.startsWith('/results') ||
    path.startsWith('/reports') ||
    path.startsWith('/dashboard')
  ) {
    return FULL_BOOTSTRAP_PROFILE;
  }

  return {
    ...FULL_BOOTSTRAP_PROFILE,
    loadQuestions: false,
    loadSkillProgress: false,
  };
};

const getSeoBaseUrl = () => {
  const configuredSiteUrl = String(
    import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL || '',
  ).trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};

const SEO_BASE_URL = getSeoBaseUrl();
const SEO_DEFAULT_IMAGE_PATH = '/images/homepage-hero-boy-platform.jpg';

const SEO_PRIVATE_PREFIXES = [
  '/dashboard',
  '/admin-dashboard',
  '/instructor-dashboard',
  '/school-teacher-dashboard',
  '/school-director-dashboard',
  '/supervisor-dashboard',
  '/parent-dashboard',
  '/quiz',
  '/results',
  '/my-quizzes',
  '/reports',
  '/favorites',
  '/plan',
  '/qa',
  '/book-session',
  '/live-sessions',
  '/profile',
  '/admin',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

const upsertMeta = (selector: string, attribute: 'name' | 'property', name: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const ADMIN_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة الإدارة | نظرة عامة والنبض التشغيلي - منصة المئة',
    description: 'لوحة التحكم الإدارية ونظرة عامة على مؤشرات الأداء والتشغيل في منصة المئة.',
  },
  paths: {
    title: 'لوحة الإدارة | إدارة المسارات والمناهج - منصة المئة',
    description: 'إدارة وتعديل المسارات التعليمية والمناهج والأقسام داخل منصة المئة.',
  },
  courses: {
    title: 'لوحة الإدارة | إدارة المسارات والمناهج - منصة المئة',
    description: 'إدارة وتعديل المسارات التعليمية والمناهج والأقسام داخل منصة المئة.',
  },
  lessons: {
    title: 'لوحة الإدارة | مركز الدروس التعليمية - منصة المئة',
    description: 'إدارة ونشر وتنسيق الدروس والشروحات التعليمية داخل منصة المئة.',
  },
  library: {
    title: 'لوحة الإدارة | مركز المكتبة وملفات الدعم - منصة المئة',
    description: 'إدارة المذكرات والملفات والكتب الداعمة لمسارات القدرات والتحصيلي.',
  },
  quizzes: {
    title: 'لوحة الإدارة | مركز إدارة الاختبارات - منصة المئة',
    description: 'إنشاء وجدولة وإدارة الاختبارات التدريبية والمركزية داخل منصة المئة.',
  },
  'mock-exams': {
    title: 'لوحة الإدارة | مركز الاختبارات المحاكية - منصة المئة',
    description: 'إدارة نماذج المحاكاة الموزونة لاختبارات القدرات والتحصيلي.',
  },
  questions: {
    title: 'لوحة الإدارة | بنك الأسئلة المركزي - منصة المئة',
    description: 'إدارة وتصنيف بنك الأسئلة المركزي وربطه بالمهارات ومعايير قياس.',
  },
  skills: {
    title: 'لوحة الإدارة | مركز المهارات وشجرة التعلم - منصة المئة',
    description: 'هندسة المهارات ومعايير الإتقان وشجرة التعلم التراكمية في منصة المئة.',
  },
  users: {
    title: 'لوحة الإدارة | إدارة المستخدمين والصلاحيات - منصة المئة',
    description: 'إدارة حسابات الطلاب والمعلمين والمشرفين وتعيين الأدوار والصلاحيات.',
  },
  schools: {
    title: 'لوحة الإدارة | تشغيل وإدارة المدارس - منصة المئة',
    description: 'إدارة المدارس المشتركة وتخصيص الباقات وإسناد الفصول والمشرفين.',
  },
  groups: {
    title: 'لوحة الإدارة | تشغيل وإدارة المدارس - منصة المئة',
    description: 'إدارة المدارس المشتركة وتخصيص الباقات وإسناد الفصول والمشرفين.',
  },
  'school-portal': {
    title: 'لوحة الإدارة | بوابة متابعة المدارس - منصة المئة',
    description: 'بوابة المتابعة الميدانية لأداء المدارس والفصول ونسب الإنجاز.',
  },
  memberships: {
    title: 'لوحة الإدارة | إدارة العضويات والباقات - منصة المئة',
    description: 'إدارة خطط الاشتراكات والعضويات وباقات المدارس والطلاب.',
  },
  financial: {
    title: 'لوحة الإدارة | التقارير المالية والاشتراكات - منصة المئة',
    description: 'متابعة المدفوعات والاشتراكات والعمليات المالية داخل منصة المئة.',
  },
  notifications: {
    title: 'لوحة الإدارة | مركز الإشعارات والتنبيهات - منصة المئة',
    description: 'إرسال وجدولة التنبيهات والإشعارات العامة والموجهة للمستخدمين.',
  },
  monitoring: {
    title: 'لوحة الإدارة | مراقبة النظام والأداء التشغيلي - منصة المئة',
    description: 'متابعة استقرار الخدمات ومعدل الاستجابة والتشغيل التقني للمنصة.',
  },
  settings: {
    title: 'لوحة الإدارة | إعدادات المنصة والنظام - منصة المئة',
    description: 'ضبط الإعدادات العامة للمنصة وخيارات الذكاء الاصطناعي والأمان.',
  },
  homepage: {
    title: 'لوحة الإدارة | إدارة الصفحة الرئيسية - منصة المئة',
    description: 'تخصيص وإدارة أقسام ومحتوى الصفحة الرئيسية للمنصة.',
  },
  'announcement-ads': {
    title: 'لوحة الإدارة | إدارة الإعلانات الترويجية - منصة المئة',
    description: 'إدارة وإطلاق الإعلانات وشاشات العرض الترويجية للمستفيدين.',
  },
  'platform-fonts': {
    title: 'لوحة الإدارة | إدارة خطوط المنصة - منصة المئة',
    description: 'تخصيص الخطوط العربية والطباعة البصرية وهوية المنصة.',
  },
  'platform-integrations': {
    title: 'لوحة الإدارة | إدارة التكاملات والربط التقني - منصة المئة',
    description: 'إدارة الربط البرمجي وخدمات الرسائل والدفع والتكاملات الخارجية.',
  },
  backups: {
    title: 'لوحة الإدارة | النسخ الاحتياطي للنظام - منصة المئة',
    description: 'إدارة النسخ الاحتياطية واستعادة البيانات وضمان استمرارية الأعمال.',
  },
  'ai-assistant': {
    title: 'لوحة الإدارة | إدارة المساعد الذكي - منصة المئة',
    description: 'إعداد نماذج الذكاء الاصطناعي وتوليد الأسئلة والشروحات الآلية.',
  },
  'live-sessions': {
    title: 'لوحة الإدارة | إدارة الحصص المباشرة - منصة المئة',
    description: 'جدولة الحصص التفاعلية والغرف الصوتية والمرئية مع المعلمين.',
  },
  'barcode-tests': {
    title: 'لوحة الإدارة | إدارة اختبارات الباركود - منصة المئة',
    description: 'إنشاء وإدارة الاختبارات السريعة المرتبطة برموز الباركود QR.',
  },
};

const SUPERVISOR_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة المشرف | نظرة عامة ونبض الأداء - منصة المئة',
    description: 'ملخص شامل لنطاق الإشراف وأداء المدارس والفصول والطلاب المتعثرين.',
  },
  students: {
    title: 'لوحة المشرف | متابعة الطلاب وإحصائيات الإنجاز - منصة المئة',
    description: 'متابعة تفصيلية لدرجات الطلاب ومستويات الإنجاز والمهارات المحتاجة للدعم.',
  },
  tests: {
    title: 'لوحة المشرف | بنك واختبارات النطاق - منصة المئة',
    description: 'إدارة وتوجيه الاختبارات التشخيصية والمركزية على مستوى النطاق الإشرافي.',
  },
  skills: {
    title: 'لوحة المشرف | تحليل المهارات ونقاط التحسين - منصة المئة',
    description: 'خريطة المهارات وتحليل الفجوات ونقاط الضعف الجماعية والفردية.',
  },
  reports: {
    title: 'لوحة المشرف | التقارير التفصيلية والتحليل التراكمي - منصة المئة',
    description: 'تقارير أداء تراكمية ورسوم بيانية لتوزيع الدرجات ونسب التحسن.',
  },
  'live-sessions': {
    title: 'لوحة المشرف | الحصص المباشرة والجدول - منصة المئة',
    description: 'جدول ومتابعة الحصص التفاعلية وجلسات الدعم المباشرة في النطاق.',
  },
  'live-monitoring': {
    title: 'لوحة المشرف | المراقبة الحية للغرف والنشاط - منصة المئة',
    description: 'متابعة لحظية ومراقبة حية للنشاط التدريبي وغرف التعلم الفعالة.',
  },
};

const INSTRUCTOR_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة مدرب المنصة | نظرة عامة - منصة المئة',
    description: 'لوحة مدرب المنصة لمتابعة المساهمات والمحتوى التعليمي داخل نطاقه.',
  },
  lessons: {
    title: 'لوحة مدرب المنصة | مركز الدروس التعليمية - منصة المئة',
    description: 'إدارة الدروس والشروحات التفاعلية ومتابعة الاعتماد.',
  },
  quizzes: {
    title: 'لوحة مدرب المنصة | الاختبارات والتدريبات - منصة المئة',
    description: 'إنشاء وإدارة الاختبارات الموجهة للطلاب وتقييم المحتوى.',
  },
  'mock-exams': {
    title: 'لوحة مدرب المنصة | الاختبارات المحاكية - منصة المئة',
    description: 'إعداد نماذج المحاكاة والمراجعات لاختبارات قياس.',
  },
  questions: {
    title: 'لوحة مدرب المنصة | بنك الأسئلة - منصة المئة',
    description: 'إضافة ومراجعة بنك الأسئلة والخيارات والحلول النموذجية.',
  },
  library: {
    title: 'لوحة مدرب المنصة | المكتبة وملفات الدعم - منصة المئة',
    description: 'رفع وإدارة الملفات والمذكرات الداعمة للطلاب.',
  },
  skills: {
    title: 'لوحة مدرب المنصة | شجرة المهارات - منصة المئة',
    description: 'استعراض وربط المهارات ونقاط القوة والتحسين.',
  },
};

const PARENT_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'لوحة ولي الأمر | متابعة الأبناء - منصة المئة',
    description: 'ملخص أسبوعي بسيط لمتابعة نتائج الأبناء ونقاط التقدم والدعم المطلوبة.',
  },
  'parent-results': {
    title: 'لوحة ولي الأمر | نتائج واختبارات الأبناء - منصة المئة',
    description: 'سجل شامل لنتائج ودرجات جميع الاختبارات التي أداها الأبناء.',
  },
  'parent-skills': {
    title: 'لوحة ولي الأمر | المهارات ونقاط المتابعة - منصة المئة',
    description: 'تحليل المهارات التي تحتاج إلى دعم وتوجيه إضافي في المنزل.',
  },
  'parent-link': {
    title: 'لوحة ولي الأمر | ربط وإضافة طالب - منصة المئة',
    description: 'ربط حساب ابن جديد عبر الكود الخاص لمتابعة درجاته ونشاطه.',
  },
  'parent-followup': {
    title: 'لوحة ولي الأمر | خطة المتابعة الأسبوعية - منصة المئة',
    description: 'خطة علاجية ميسرة لمدة 3 أيام لدعم الأبناء بدون ضغط.',
  },
  reports: {
    title: 'لوحة ولي الأمر | تقرير مستوى الأبناء - منصة المئة',
    description: 'تقرير بياني لمستوى الأبناء والمهارات المكتسبة.',
  },
  requests: {
    title: 'لوحة ولي الأمر | طلبات الدفع والاشتراك - منصة المئة',
    description: 'إدارة طلبات باقات واشتراكات الأبناء في منصة المئة.',
  },
  qa: {
    title: 'لوحة ولي الأمر | الأسئلة والاستفسارات - منصة المئة',
    description: 'التواصل مع المعلمين وإدارة المنصة بخصوص مستوى الأبناء.',
  },
};

const STUDENT_TAB_METAS: Record<string, { title: string; description: string }> = {
  overview: {
    title: 'مساحة الطالب | لوحة التعلم ونظرة عامة - منصة المئة',
    description: 'نظرة عامة على إنجازاتك اليومية ومساراتك واختباراتك الموجهة.',
  },
  paths: {
    title: 'مساحة الطالب | مساراتي التعليمية - منصة المئة',
    description: 'استعراض المسارات المشترك بها والتقدم في كل مسار.',
  },
  'my-courses': {
    title: 'مساحة الطالب | دوراتي المسجلة - منصة المئة',
    description: 'الدورات التدريبية والشروحات التأسيسية الخاصة بك.',
  },
  'smart-path': {
    title: 'مساحة الطالب | مسار التعلم الذكي - منصة المئة',
    description: 'مسار تعلم مخصص يعالج نقاط ضعفك تلقائيًا بالذكاء الاصطناعي.',
  },
  sessions: {
    title: 'مساحة الطالب | جلساتي التعليمية - منصة المئة',
    description: 'مواعيد الجلسات الخاصة والحصص المباشرة القادمة.',
  },
  quizzes: {
    title: 'مساحة الطالب | سجل اختباراتي السابقة - منصة المئة',
    description: 'سجل كامل للاختبارات التي تم حلها مع درجاتها وتفاصيلها.',
  },
  'mock-exams': {
    title: 'مساحة الطالب | الاختبارات المحاكية لقياس - منصة المئة',
    description: 'نماذج اختبارات محاكية كاملة لنظام واختبارات قياس الحقيقية.',
  },
  'school-tests': {
    title: 'مساحة الطالب | الاختبارات المدرسية الموجهة - منصة المئة',
    description: 'الاختبارات الموجهة لك من معلميك ومدرستك لمتابعة التحصيل.',
  },
  exams: {
    title: 'مساحة الطالب | مركز الاختبارات والتقييمات - منصة المئة',
    description: 'مركز موحد لجميع الاختبارات المحاكية والمدرسية والسابقة.',
  },
  saher: {
    title: 'مساحة الطالب | اختبار ساهر السريع - منصة المئة',
    description: 'اختبار سريع وذكي يحدد مستواك ويوصي بما تحتاجه فورًا.',
  },
  reports: {
    title: 'مساحة الطالب | تقارير الأداء والمستوى - منصة المئة',
    description: 'تحليل دقيق لأدائك ومدى جاهزيتك للاختبار الفعلي.',
  },
  plan: {
    title: 'مساحة الطالب | خطتي الدراسية - منصة المئة',
    description: 'جدولك الدراسي المخصص للوصول إلى النسبة المستهدفة.',
  },
  favorites: {
    title: 'مساحة الطالب | مراجعة الأسئلة المحفوظة - منصة المئة',
    description: 'الأسئلة التي قمت بحفظها للمراجعة والتدريب المركز.',
  },
  flashcards: {
    title: 'مساحة الطالب | بطاقات التذكر الذكية - منصة المئة',
    description: 'بطاقات مراجعة سريعة للمفاهيم والقوانين الرياضية واللفظية.',
  },
  qa: {
    title: 'مساحة الطالب | بنك الأسئلة والاستفسارات - منصة المئة',
    description: 'مجتمع النقاش وطرح الأسئلة مع المعلمين والزملاء.',
  },
  requests: {
    title: 'مساحة الطالب | طلباتي واشتراكاتي - منصة المئة',
    description: 'متابعة حجوزات الجلسات الخاصة وطلبات الاشتراكات.',
  },
};

const resolvePageMeta = (
  pathname = '/',
  search = '',
  hash = '',
  userRole = '',
): { title: string; description: string; isPrivate: boolean; canonicalPath: string } => {
  let effectivePath = pathname || '/';
  let effectiveSearch = search || '';

  if ((effectivePath === '/' || !effectivePath) && hash.startsWith('#/')) {
    const hashContent = hash.slice(1);
    const [hPath, hQuery] = hashContent.split('?');
    effectivePath = hPath || '/';
    if (!effectiveSearch && hQuery) {
      effectiveSearch = `?${hQuery}`;
    }
  }

  const isPrivate = SEO_PRIVATE_PREFIXES.some((prefix) => effectivePath === prefix || effectivePath.startsWith(`${prefix}/`));
  const searchParams = new URLSearchParams(effectiveSearch);
  const tab = searchParams.get('tab') || '';

  // 1. Admin Dashboard
  if (effectivePath === '/admin-dashboard' || effectivePath.startsWith('/admin-dashboard/')) {
    const tabMeta = ADMIN_TAB_METAS[tab] || (tab ? null : ADMIN_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة الإدارة - منصة المئة` : 'لوحة الإدارة | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة الإدارة والتحكم الكامل بمنصة المئة التعليمية.',
      isPrivate: true,
      canonicalPath: '/admin-dashboard',
    };
  }

  // 2. Supervisor Dashboard
  if (effectivePath === '/supervisor-dashboard' || effectivePath.startsWith('/supervisor-dashboard/')) {
    const tabMeta = SUPERVISOR_TAB_METAS[tab] || (tab ? null : SUPERVISOR_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة المشرف - منصة المئة` : 'لوحة المشرف التربوي | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة المشرف التربوي لمتابعة الطلاب والتقارير والاختبارات الموجهة داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/supervisor-dashboard',
    };
  }

  // 3. Instructor Dashboard
  if (effectivePath === '/instructor-dashboard' || effectivePath.startsWith('/instructor-dashboard/')) {
    const tabMeta = INSTRUCTOR_TAB_METAS[tab] || (tab ? null : INSTRUCTOR_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة مدرب المنصة - منصة المئة` : 'لوحة مدرب المنصة | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة مدرب المنصة لإدارة المحتوى والدروس والأسئلة والاختبارات داخل نطاقه.',
      isPrivate: true,
      canonicalPath: '/instructor-dashboard',
    };
  }

  if (effectivePath === '/school-teacher-dashboard' || effectivePath.startsWith('/school-teacher-dashboard/')) {
    return {
      title: 'لوحة معلم المدرسة | منصة المئة',
      description: 'مساحة معلم المدرسة للفصول المسندة والاختبارات المدرسية والفصل الذكي.',
      isPrivate: true,
      canonicalPath: '/school-teacher-dashboard',
    };
  }

  if (effectivePath === '/school-director-dashboard' || effectivePath.startsWith('/school-director-dashboard/')) {
    return {
      title: 'لوحة مدير المدرسة | منصة المئة',
      description: 'مساحة مدير المدرسة للمؤشرات التنفيذية وعمليات الطلاب داخل المدارس المفوضة.',
      isPrivate: true,
      canonicalPath: '/school-director-dashboard',
    };
  }

  // 4. Parent Dashboard
  if (effectivePath === '/parent-dashboard' || (effectivePath === '/dashboard' && userRole === 'parent')) {
    const tabMeta = PARENT_TAB_METAS[tab] || (tab ? null : PARENT_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | لوحة ولي الأمر - منصة المئة` : 'لوحة ولي الأمر | متابعة الأبناء - منصة المئة'),
      description: tabMeta ? tabMeta.description : 'لوحة ولي الأمر لمتابعة تقدم الأبناء ونتائج الاختبارات والخطط العلاجية داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/parent-dashboard',
    };
  }

  // 5. Student Dashboard
  if (effectivePath === '/dashboard' || effectivePath.startsWith('/dashboard/')) {
    const tabMeta = STUDENT_TAB_METAS[tab] || (tab ? null : STUDENT_TAB_METAS.overview);
    return {
      title: tabMeta ? tabMeta.title : (tab ? `${tab} | مساحة الطالب - منصة المئة` : 'مساحة الطالب | منصة المئة'),
      description: tabMeta ? tabMeta.description : 'مساحة الطالب داخل منصة المئة لمتابعة المسارات والدروس والاختبارات المحاكية والتقارير الذكية.',
      isPrivate: true,
      canonicalPath: '/dashboard',
    };
  }

  // 6. Independent & Static Routes
  if (effectivePath === '/quiz' || effectivePath.startsWith('/quiz/')) {
    return {
      title: 'جلسة الاختبار | منصة المئة',
      description: 'أداء وتدريب على اختبارات القدرات والتحصيلي مع تصحيح ذكي فوري داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/quiz',
    };
  }

  if (effectivePath === '/results') {
    return {
      title: 'نتيجة الاختبار وتحليل الأداء | منصة المئة',
      description: 'تقرير تفصيلي لنتيجة الاختبار وتحليل المهارات ونقاط القوة والضعف داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/results',
    };
  }

  if (effectivePath === '/review') {
    return {
      title: 'مراجعة الإجابات والتحليل | منصة المئة',
      description: 'مراجعة تفصيلية لإجابات الاختبار والشروحات التعليمية داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/review',
    };
  }

  if (effectivePath === '/my-quizzes') {
    return {
      title: 'سجل اختباراتي | مساحة الطالب - منصة المئة',
      description: 'سجل كامل لجميع الاختبارات والتدريبات السابقة ومتابعة التطور الزمني.',
      isPrivate: true,
      canonicalPath: '/my-quizzes',
    };
  }

  if (effectivePath === '/my-requests') {
    return {
      title: 'طلباتي ومتابعة الحجوزات | منصة المئة',
      description: 'متابعة طلبات الجلسات الخاصة والاشتراكات داخل منصة المئة.',
      isPrivate: true,
      canonicalPath: '/my-requests',
    };
  }

  if (effectivePath === '/reports') {
    return {
      title: 'التقارير والتحليلات التعليمية | منصة المئة',
      description: 'تقارير تفصيلية ورسوم بيانية لقياس مدى جاهزية الطالب لاختبارات قياس.',
      isPrivate: true,
      canonicalPath: '/reports',
    };
  }

  if (effectivePath === '/favorites') {
    return {
      title: 'الأسئلة المفضلة والمحفوظة | منصة المئة',
      description: 'قائمتك الخاصة من الأسئلة المحفوظة للمراجعة والتدريب المركز.',
      isPrivate: true,
      canonicalPath: '/favorites',
    };
  }

  if (effectivePath === '/plan') {
    return {
      title: 'الخطة الدراسية المخصصة | منصة المئة',
      description: 'خطة مذاكرة وجدول زمني ذكي مبني على مستواك وهدفك في قياس.',
      isPrivate: true,
      canonicalPath: '/plan',
    };
  }

  if (effectivePath === '/qa') {
    return {
      title: 'مجتمع الأسئلة والأجوبة | منصة المئة',
      description: 'اطرح أسئلتك وتفاعل مع المعلمين والزملاء في تدريبات القدرات والتحصيلي.',
      isPrivate: true,
      canonicalPath: '/qa',
    };
  }

  if (effectivePath === '/book-session') {
    return {
      title: 'حجز جلسة خاصة مع معلّم | منصة المئة',
      description: 'احجز جلسة تدريب فردية مباشرة مع نخبة من المعلمين المعتمدين.',
      isPrivate: true,
      canonicalPath: '/book-session',
    };
  }

  if (effectivePath === '/live-sessions' || effectivePath.startsWith('/live-sessions/')) {
    return {
      title: 'جدول الحصص واللقاءات المباشرة | منصة المئة',
      description: 'حصص تفاعلية مباشرة مع أفضل معلمي القدرات والتحصيلي.',
      isPrivate: true,
      canonicalPath: '/live-sessions',
    };
  }

  if (effectivePath === '/profile') {
    return {
      title: 'الملف الشخصي وإعدادات الحساب | منصة المئة',
      description: 'إدارة الحساب والبيانات الشخصية وكلمة المرور في منصة المئة.',
      isPrivate: true,
      canonicalPath: '/profile',
    };
  }

  if (effectivePath === '/admin/quiz-gen') {
    return {
      title: 'لوحة الإدارة | منشئ الاختبارات بالذكاء الاصطناعي - منصة المئة',
      description: 'أداة إنشاء الاختبارات والأسئلة تلقائيًا بالذكاء الاصطناعي.',
      isPrivate: true,
      canonicalPath: '/admin/quiz-gen',
    };
  }

  if (effectivePath === '/quizzes') {
    return {
      title: 'بنك الاختبارات والتدريبات | منصة المئة',
      description: 'مئات الاختبارات والتدريبات المتدرجة في القدرات والتحصيلي لرفع جاهزيتك.',
      isPrivate: false,
      canonicalPath: '/quizzes',
    };
  }

  if (effectivePath === '/mock-exams') {
    return {
      title: 'الاختبارات المحاكية لقياس | منصة المئة',
      description: 'اختبارات تحاكي تمامًا بيئة وتوقيت وأقسام اختبار القدرات والتحصيلي الحقيقي.',
      isPrivate: false,
      canonicalPath: '/mock-exams',
    };
  }

  if (effectivePath === '/courses' || effectivePath.startsWith('/course/')) {
    return {
      title: 'دورات القدرات والتحصيلي | منصة المئة',
      description: 'دورات تعليمية منظمة للقدرات والتحصيلي داخل منصة المئة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath.startsWith('/category/')) {
    return {
      title: 'مسارات القدرات والتحصيلي | منصة المئة',
      description: 'استكشف مسارات القدرات والتحصيلي والتأسيس والتدريب والاختبارات داخل منصة المئة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath === '/achievements') {
    return {
      title: 'لوحة الإنجازات والأوسمة | منصة المئة',
      description: 'استعرض أوسمتك وإنجازاتك في مسيرتك التعليمية على منصة المئة.',
      isPrivate: false,
      canonicalPath: '/achievements',
    };
  }

  if (effectivePath === '/blog') {
    return {
      title: 'مدونة منصة المئة',
      description: 'مقالات وإرشادات تعليمية من منصة المئة لطلاب القدرات والتحصيلي.',
      isPrivate: false,
      canonicalPath: '/blog',
    };
  }

  if (effectivePath === '/pricing') {
    return {
      title: 'عضويات المنصة | منصة المئة',
      description: 'تعرف على باقات منصة المئة للقدرات والتحصيلي واختر الخطة الأنسب لك.',
      isPrivate: false,
      canonicalPath: '/pricing',
    };
  }

  if (effectivePath === '/cart' || effectivePath === '/checkout') {
    return {
      title: 'سلة المشتريات وإتمام الطلب | منصة المئة',
      description: 'مراجعة طلبك وإتمام الاشتراك في باقات ودورات منصة المئة بأمان.',
      isPrivate: false,
      canonicalPath: '/cart',
    };
  }

  if (effectivePath.startsWith('/barcode-test') || effectivePath.startsWith('/b/')) {
    return {
      title: 'اختبار الباركود السريع | منصة المئة',
      description: 'خض تجربة حل الاختبار السريع عبر مسح رمز الاستجابة السريعة.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath.startsWith('/certificate/')) {
    return {
      title: 'شهادة إتمام معتمدة | منصة المئة',
      description: 'التحقق من صحة شهادة الإتمام الصادرة من منصة المئة التعليمية.',
      isPrivate: false,
      canonicalPath: effectivePath,
    };
  }

  if (effectivePath === '/about') {
    return {
      title: 'من نحن | منصة المئة للقدرات والتحصيلي',
      description: 'تعرف على رؤية ورسالة منصة المئة وأهدافها في تمكين الطلاب من التفوق.',
      isPrivate: false,
      canonicalPath: '/about',
    };
  }

  if (effectivePath === '/contact') {
    return {
      title: 'اتصل بنا | الدعم الفني لمنصة المئة',
      description: 'تواصل مع فريق الدعم الفني وخدمة المستفيدين لمنصة المئة.',
      isPrivate: false,
      canonicalPath: '/contact',
    };
  }

  if (effectivePath === '/faq') {
    return {
      title: 'الأسئلة الشائعة | منصة المئة',
      description: 'إجابات على الأسئلة الأكثر شيوعًا حول التسجيل والدورات والاختبارات في المنصة.',
      isPrivate: false,
      canonicalPath: '/faq',
    };
  }

  if (effectivePath === '/privacy') {
    return {
      title: 'سياسة الخصوصية | منصة المئة',
      description: 'سياسة الخصوصية وحماية بيانات المستخدمين في منصة المئة.',
      isPrivate: false,
      canonicalPath: '/privacy',
    };
  }

  if (effectivePath === '/terms') {
    return {
      title: 'الشروط والأحكام | منصة المئة',
      description: 'الشروط والأحكام الخاصة باستخدام خدمات ومنتجات منصة المئة.',
      isPrivate: false,
      canonicalPath: '/terms',
    };
  }

  if (effectivePath === '/forgot-password') {
    return {
      title: 'استعادة كلمة المرور | منصة المئة',
      description: 'استعادة الوصول إلى حسابك على منصة المئة بخطوات بسيطة.',
      isPrivate: true,
      canonicalPath: '/forgot-password',
    };
  }

  if (effectivePath === '/reset-password') {
    return {
      title: 'تعيين كلمة المرور الجديدة | منصة المئة',
      description: 'تعيين كلمة مرور جديدة لحسابك على منصة المئة.',
      isPrivate: true,
      canonicalPath: '/reset-password',
    };
  }

  if (effectivePath === '/verify-email') {
    return {
      title: 'تأكيد البريد الإلكتروني | منصة المئة',
      description: 'تأكيد وتفعيل بريدك الإلكتروني في منصة المئة.',
      isPrivate: true,
      canonicalPath: '/verify-email',
    };
  }

  return {
    title: isPrivate ? 'منصة المئة | مساحة خاصة' : 'منصة المئة | قدرات وتحصيلي',
    description: isPrivate
      ? 'مساحة خاصة داخل منصة المئة للطالب أو الإدارة.'
      : 'منصة تعليمية عربية للقدرات والتحصيلي، تجمع المسارات التعليمية والدروس والاختبارات والتحليل الذكي في مكان واحد.',
    isPrivate,
    canonicalPath: isPrivate ? '/' : effectivePath,
  };
};

const SeoRouteMeta: React.FC = () => {
  const location = useLocation();
  const user = useStore((state) => state.user);
  const [urlTick, setUrlTick] = useState(0);

  useEffect(() => {
    const handleUrlChange = () => setUrlTick((prev) => prev + 1);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('app:url-change', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('app:url-change', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    const rawPath = (typeof window !== 'undefined' ? window.location.pathname : '') || location.pathname || '/';
    const rawSearch = (typeof window !== 'undefined' ? window.location.search : '') || location.search || '';
    const rawHash = (typeof window !== 'undefined' ? window.location.hash : '') || '';

    const meta = resolvePageMeta(rawPath, rawSearch, rawHash, user?.role);
    const canonicalPath = meta.isPrivate ? '/' : meta.canonicalPath;
    const canonicalUrl = `${SEO_BASE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;
    const imageUrl = `${SEO_BASE_URL}${SEO_DEFAULT_IMAGE_PATH}`;
    const robots = meta.isPrivate ? 'noindex, nofollow' : 'index, follow';

    document.title = meta.title;
    upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'منصة المئة للقدرات والتحصيلي');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [location.pathname, location.search, urlTick, user?.role]);

  return null;
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

const LegacySubjectRouteRedirect: React.FC = () => {
  const { pathId = '', subjectId = '' } = useParams<{ pathId: string; subjectId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?subject=${subjectId}&tab=skills`} />;
};

const LegacyPackagesRouteRedirect: React.FC = () => {
  const { pathId = '' } = useParams<{ pathId: string }>();
  return <Navigate replace to={`/category/${normalizePathId(pathId)}?tab=packages`} />;
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
        const contentPromise = profile.loadContent ? adapter.getContentBootstrap(profile.contentScope, contentPhase) : null;
        const questionsPromise = shouldLoadQuestions ? adapter.getQuestions({ page: 1, limit: 100 }) : null;
        const skillProgressPromise = shouldLoadSkillProgress ? api.getSkillProgress() : null;

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
              studyPlans: contentResult.studyPlans as any[],
            });
          }
        }).catch((error) => console.warn('Content bootstrap unavailable:', error));

        if (profile.loadContent && profile.contentScope === 'learning') {
          void adapter.getContentBootstrap('learning', 'full')
            .then((extendedContent) => {
              if (!mounted) return;
              const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
              if ([extendedContent.lessons, extendedContent.libraryItems, extendedContent.studyPlans].some(hasItems)) {
                hydrateContentBootstrap({
                  lessons: extendedContent.lessons as any[],
                  libraryItems: extendedContent.libraryItems as any[],
                  studyPlans: extendedContent.studyPlans as any[],
                });
              }
            })
            .catch((error) => console.warn('Deferred learning content bootstrap unavailable:', error));
        }

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
          void api.getSkillProgress()
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

    let bootstrapStarted = false;
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

    const startBootstrap = () => {
      if (bootstrapStarted) {
        return;
      }

      bootstrapStarted = true;
      const path = getInitialRouterPath();
      const profile = resolveBootstrapProfile(path);
      void bootstrapAppData({
        profile,
        deferQuestions: shouldDeferQuestionBootstrap(path),
        deferSkillProgress: shouldDeferSkillProgressBootstrap(path),
      });
    };

    const startIfRouteNeedsData = () => {
      const path = getInitialRouterPath();
      if (path === '/admin-dashboard' || path === '/instructor-dashboard' || path === '/supervisor-dashboard') {
        void loadAdminDashboardModule();
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
        prefetchCommonRouteModules();
        void loadPublicAnnouncementAds();
      }, { timeout: 1000 });
    } else {
      void loadPublicNavigationBootstrap();
      prefetchCommonRouteModules();
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
    if (user) {
      const requestIdle = window.requestIdleCallback?.bind(window);

      if (requestIdle) {
        const handle = requestIdle(() => {
          prefetchCommonRouteModules(user.role);
        }, { timeout: 1200 });
        return () => window.cancelIdleCallback?.(handle);
      }

      const timer = window.setTimeout(() => {
        prefetchCommonRouteModules(user.role);
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [user?.role]);

  const adminDashboard = (
    <RequireRole allowedRoles={['admin']}>
      <Suspense fallback={<LoadingFallback />}>
        <AdminDashboard />
      </Suspense>
    </RequireRole>
  );

  const instructorDashboard = (
    <RequireRole allowedRoles={['teacher']}>
      <TeacherWorkspaceGate workspace="platform">
        <Suspense fallback={<LoadingFallback />}>
          <AdminDashboard />
        </Suspense>
      </TeacherWorkspaceGate>
    </RequireRole>
  );

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
        <Routes>
          {/* Routes without Main Layout (Full Screen) */}
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/:quizId" element={<QuizPage />} />
          <Route path="/classroom/:sessionId" element={<ClassroomStudentLive />} />
          <Route path="/classroom/teacher" element={<RequireRole allowedRoles={['teacher', 'admin']}><ClassroomTeacherConsole /></RequireRole>} />
          <Route path="/classroom/:sessionId/teacher" element={<RequireRole allowedRoles={['teacher', 'admin']}><ClassroomTeacherConsole /></RequireRole>} />
          <Route path="/classroom/:sessionId/projector" element={<ClassroomProjectorView />} />
          <Route path="/results" element={<Results />} />
          
          {/* Admin Routes */}
          <Route path="/admin-dashboard" element={adminDashboard} />
          <Route path="/instructor-dashboard" element={instructorDashboard} />
          <Route path="/school-teacher-dashboard" element={
            <RequireRole allowedRoles={['teacher']}>
              <TeacherWorkspaceGate workspace="school">
                <Suspense fallback={<LoadingFallback />}>
                  <SchoolTeacherDashboard />
                </Suspense>
              </TeacherWorkspaceGate>
            </RequireRole>
          } />
          <Route path="/school-director-dashboard" element={
            <RequireRole allowedRoles={['school_admin']}>
              <Suspense fallback={<LoadingFallback />}>
                <SchoolDirectorDashboard />
              </Suspense>
            </RequireRole>
          } />
          <Route path="/supervisor-dashboard" element={
            <RequireRole allowedRoles={['admin', 'teacher', 'supervisor']}>
              <Suspense fallback={<LoadingFallback />}>
                <SupervisorDashboard />
              </Suspense>
            </RequireRole>
          } />
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
                  <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
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
                  
                  {/* Old Hardcoded Routes mapped to generic or kept if needed. The new pattern replaces old Nafes */}
                  <Route path="/category/:pathId" element={<GenericPathPage />} />
                  <Route path="/category/:pathId/packages" element={<LegacyPackagesRouteRedirect />} />
                  <Route path="/category/:pathId/:subjectId" element={<LegacySubjectRouteRedirect />} />
                  
                  {/* Placeholder for other routes */}
                  <Route path="/section/:catId" element={<Navigate replace to="/dashboard" />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
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

