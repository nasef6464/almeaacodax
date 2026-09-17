# مصفوفة تتبع المتطلبات والمطابقة الوظيفية (Requirements Traceability Matrix)
**تاريخ التدقيق:** 17 سبتمبر 2026  
**الفرع:** `chatgpt/batch-01-build-baseline`  
**Commit:** `0e7baad6`

---

## 1. مصفوفة تتبع المتطلبات (Requirements Traceability Matrix)

| المتطلب (Requirement) | الواجهة (UI) | الخادم (API) | قاعدة البيانات (Database) | الصلاحيات (Authorization) | وسيلة الاختبار (Test) | النتيجة (Result) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **المسارات والوحدات التعليمية** | `pages/Courses.tsx`, `components/TaxonomyBrowser.tsx` | `GET /api/content/bootstrap?scope=learning` | `Topic` | All (Public / Authed) | `smoke:taxonomy-compact`, `smoke:student-learning-live` | **PASS** |
| **الدروس المرئية والتفاعلية** | `pages/LessonPage.tsx`, `components/LessonPlayer.tsx` | `GET /api/content/lessons/:id` | `Lesson` | Authed Learner | `smoke:video-questions`, `smoke:interactive-video-progress-runtime` | **PASS** |
| **تقدم الطالب في المواد** | `dashboards/student/StudentDashboard.tsx` | `GET /api/reports/student/overview` | `User`, `TopicProgress` | Student (Own account) | `smoke:student-journey`, `smoke:global-student-journey` | **PASS** |
| **بنك الأسئلة وتصنيف المهارات** | `dashboards/admin/QuestionsManager.tsx` | `GET /api/quizzes/questions` | `Question` | Admin, Teacher | `smoke:exam-question-source`, `smoke:saher-skills` | **PASS** |
| **تصنيف الأسئلة بالصعوبة** | `dashboards/admin/SmartQuestionSelector.tsx` | `GET /api/quizzes/questions?difficulty=...` | `Question` | Admin, Teacher | `smoke:assessment-question-selection` | **PASS** |
| **بناء الاختبارات المركزية** | `dashboards/admin/UnifiedQuizBuilder.tsx` | `POST /api/quizzes`, `PATCH /api/quizzes/:id` | `Quiz` | Admin, Teacher, Supervisor | `smoke:assessment-workflow`, `smoke:quiz-definition-schema` | **PASS** |
| **إجراء الاختبار والتصحيح الآلي** | `pages/QuizPage.tsx` | `POST /api/quizzes/:id/submit` | `QuizAttempt`, `QuizResult` | Student | `smoke:learning-quiz`, `smoke:results` | **PASS** |
| **مراجعة الحلول وتفسيرات الإجابات** | `pages/QuizPage.tsx`, `AssignedTestDetailPanel.tsx` | `GET /api/quizzes/results/:id` | `QuizResult`, `Question` | Student, Teacher, Parent | `live-assessment-commercial-audit.mjs` | **PASS** |
| **كشف نقاط الضعف والمهارات الحرجة** | `dashboards/student/WeakSkillsCenter.tsx` | `GET /api/reports/student/weak-skills` | `QuizResult` | Student, Teacher, Supervisor | `smoke:reports-role`, `smoke:quiz-skill-analytics` | **PASS** |
| **المعالجة التكيفية والخطط العلاجية** | `pages/StudyPlanPage.tsx` | `GET /api/content/study-plans` | `StudyPlan` | Student | `smoke:content-study-plan-schemas` | **PASS** |
| **الحصة الذكية التفاعلية (المعلم)** | `pages/ClassroomTeacherConsole.tsx` | `POST /api/classroom/sessions` | `ClassroomSession` | Teacher, Admin | `audit:smart-classroom-surfaces`, `simulate:smart-classroom` | **PASS** |
| **الحصة الذكية للطلاب بالرمز** | `pages/ClassroomStudentLive.tsx` | `POST /api/classroom/sessions/join-by-pin` | `ClassroomSession`, `ClassroomResponse` | Student | `audit:smart-classroom-surfaces` | **PASS** |
| **السبورة التفاعلية للبروجيكتور** | `pages/ClassroomProjectorView.tsx` | `GET /api/classroom/sessions/:id/aggregate` | `ClassroomSession` | Staff Roles | `audit:smart-classroom-surfaces` | **PASS** |
| **لوحة قيادة المشرف والمجموعات** | `dashboards/admin/SupervisorDashboard.tsx` | `GET /api/reports/supervisor/overview` | `Group`, `QuizResult` | Supervisor, Admin | `smoke:smoke-supervisor-dashboard-contract`, `live-supervisor-school-command-audit` | **PASS** |
| **لوحة ولي الأمر ومتابعة الأبناء** | `dashboards/parent/ParentDashboard.tsx` | `GET /api/reports/parent/overview` | `User`, `QuizResult` | Parent | `smoke:weekly-parent-report`, `smoke:parent-progress-bounded` | **PASS** |
| **لوحة مدير المدرسة والربط المدارسي** | `dashboards/admin/SchoolsManager.tsx` | `POST /api/content/groups` | `Group`, `B2BPackage` | School Admin, Admin | `smoke:school-management`, `smoke:school-roster-runtime` | **PASS** |
| **باقات الاشتراكات ورموز التفعيل** | `dashboards/admin/PackagesManager.tsx` | `POST /api/content/b2b-packages`, `/access-codes/redeem` | `B2BPackage`, `AccessCode` | Admin, Student | `smoke:package-revenue`, `smoke:membership-pricing` | **PASS** |
| **تسجيل الدخول بحساب Google** | `pages/Login.tsx` | `GET /api/auth/google/callback` | `User` | All / Guest | `BATCH_GOOGLE_CALLBACK_COMPAT_ALIAS` | **PARTIAL (الكود مكتمل، يتطلب ربط Client ID و Secret في الإنتاج)** |
| **تصدير التقارير بصيغة PDF/Excel** | `dashboards/admin/ReportsManager.tsx` | `GET /api/reports/export` | `QuizResult`, `Group` | Admin, Supervisor | `smoke:reports-role`, `smoke:xlsx-safety` | **PASS** |
| **مراقبة سرعة وتجاوب المنصة** | Frontend Core | `GET /api/health/ready` | In-Memory, Redis | Public / System | `smoke:production-speed`, `smoke:performance` | **PASS** |

---

## 2. النسبة الإجمالية للمطابقة المحسوبة رياضياً
- **إجمالي الميزات المفحوصة في المصفوفة:** 20 ميزة رئيسية.
- **ميزات مكتملة وتعمل بنجاح (PASS):** 19 ميزة (95%).
- **ميزات مكتملة برمجياً وتتطلب إعداد خارجي (PARTIAL):** 1 ميزة (Google OAuth Keys) (5%).
- **ميزات معطوبة أو غير موجودة (FAIL / MISSING):** 0 (0%).
- **معدل الجاهزية الوظيفية الفعلي:** **95% مباشرة محلياً** وتصل إلى **100%** فور إضافة مفاتيح جوجل السحابية عند النشر.
