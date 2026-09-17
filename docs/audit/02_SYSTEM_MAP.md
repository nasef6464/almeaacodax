# خريطة النظام الشاملة والطبقات المعمارية (System Map)
**تاريخ التدقيق:** 17 سبتمبر 2026  
**الفرع:** `chatgpt/batch-01-build-baseline`  
**Commit SHA:** `0e7baad6`  
**بيئة التدقيق:** بيئة محلية معزولة (Node.js v24.11.1, React 19, Express 4.21, Mongoose 8.9)

---

## 1. ملخص البنية المعمارية العامة (Architecture Summary)
المنصة مصممة كـ **Modular Monolith** موحد ومبني بلغة TypeScript من الواجهة إلى الخادم:
- **الواجهة الأمامية (Frontend):** React 19 (Single Page Application عبر Vite 6.2)، مكتبة Lucide للتصميم، Tailwind CSS، KaTeX للصيغ الرياضية العلمية، Zustand لإدارة الحالة، وموجه صفحات React Router v6 يضم 55 مساراً (Routes).
- **الخادم الخلفي (Backend API):** Node.js و Express 4.21 يضم 313 مساراً API موزعاً على وحدات منطقية دقيقة، مع حماية أمنية عبر CSRF tokens، ملفات تعريف ارتباط مشفرة (HttpOnly Cookies)، تحديد معدل الطلبات (Rate Limiting) عبر Express/Redis، ومراقبة حية للأخطاء عبر Sentry.
- **قاعدة البيانات (Database Layer):** MongoDB مع نمذجة صارمة بواسطة Mongoose 8.9، تدعم 32 نموذجاً رئيسياً مفهرساً بشكل دقيق لعزل بيانات المدارس والطلاب.
- **بوابة الحماية المعمارية (Architecture Safety Gate):** نظام فحص صارم (`tools/refactor/architecture-gate.mjs`) يمنع أي تعديل أو كسر للعقود المعمارية أو إضافة مسارات غير موثقة دون اعتماد صريح.

---

## 2. جدول المكونات والميزات الشامل (System Map Matrix)

| Feature (الميزة) | Frontend Component | API Endpoint | Service / Controller | Database Model | Roles Allowed | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **المصادقة وتسجيل الدخول** | `pages/Login.tsx`, `components/AuthModal.tsx` | `POST /api/auth/login`, `GET /api/auth/csrf-token` | `auth.routes.ts`, `AuthContext.tsx` | `User` | All / Guest | bcryptjs, jsonwebtoken | **PASS (مكتمل ويعمل)** |
| **تسجيل الطلاب الجدد** | `pages/Register.tsx` | `POST /api/auth/register` | `auth.routes.ts` | `User` | Guest | Zod validation | **PASS (مكتمل ويعمل)** |
| **جلسات المستخدم الحالية** | `contexts/AuthContext.tsx` | `GET /api/auth/me` | `auth.routes.ts` | `User` | Authenticated | Cookie parser | **PASS (مكتمل ويعمل)** |
| **إدارة المستخدمين والأدوار** | `dashboards/admin/UsersManager.tsx` | `GET /api/auth/admin/users`, `PATCH /api/auth/admin/users/:id` | `auth.routes.ts` | `User`, `Group` | `admin` | Pagination, Search | **PASS (مكتمل بعد تصحيح حفظ النطاق)** |
| **انتقال دور الطالب لمشرف** | `dashboards/admin/UsersManager.tsx` | `PATCH /api/auth/admin/users/:id` | `auth.routes.ts` | `User`, `Group` | `admin` | Membership cleanup hooks | **PASS (مكتمل ومثبت برمجياً)** |
| **إدارة المدارس والفصول** | `dashboards/admin/SchoolsManager.tsx` | `POST /api/content/groups`, `PATCH /api/content/groups/:id`, `DELETE /api/content/groups/:id` | `content.routes.ts` | `Group` | `admin`, `supervisor` | SchoolOperationsSchemas | **PASS (مكتمل ويعمل)** |
| **قراءة المجموعات والعمليات** | `services/apiGroups/taxonomyContentApi.ts` | `GET /api/content/bootstrap?scope=operations` | `content.routes.ts`, `contentBootstrapOperationalData.ts` | `Group`, `B2BPackage`, `AccessCode` | `admin`, `supervisor` | Caching, Scope filters | **PASS (مكتمل ومحصن)** |
| **بنك الأسئلة المركزي** | `dashboards/admin/QuestionsManager.tsx` | `GET /api/quizzes/questions`, `POST /api/quizzes/questions` | `quiz.routes.ts` | `Question` | `admin`, `teacher` | KaTeX, Media upload | **PASS (مكتمل ويعمل)** |
| **منشئ الاختبارات الموحد** | `dashboards/admin/UnifiedQuizBuilder.tsx` | `POST /api/quizzes`, `PATCH /api/quizzes/:id` | `quiz.routes.ts` | `Quiz` | `admin`, `teacher`, `supervisor` | SmartQuestionSelector | **PASS (مكتمل ويعمل)** |
| **إجراء الاختبار للطالب** | `pages/QuizPage.tsx` | `GET /api/quizzes/:id`, `POST /api/quizzes/:id/submit` | `quiz.routes.ts` | `Quiz`, `QuizAttempt`, `QuizResult` | `student` | Timer, Auto-grading | **PASS (مكتمل ومجرب في CI)** |
| **مراجعة الحلول والأخطاء** | `pages/QuizPage.tsx`, `dashboards/admin/AssignedTestDetailPanel.tsx` | `GET /api/quizzes/results/:id` | `quiz.routes.ts` | `QuizResult` | `student`, `teacher`, `parent` | Dynamic count UI | **PASS (مكتمل بعد تصحيح المطابقة)** |
| **الحصة الذكية (شاشة المعلم)** | `pages/ClassroomTeacherConsole.tsx` | `POST /api/classroom/sessions`, `GET /api/classroom/sessions/:id/aggregate` | `classroom.routes.ts` | `ClassroomSession`, `Question` | `teacher`, `admin` | Realtime polling/socket | **PASS (مكتمل ويعمل بالكامل)** |
| **الحصة الذكية (شاشة الطالب)** | `pages/ClassroomStudentLive.tsx`, `SmartClassroomExamRunner.tsx` | `POST /api/classroom/sessions/join-by-pin`, `PUT /api/classroom/sessions/:id/answers/:qId` | `classroom.routes.ts` | `ClassroomSession`, `ClassroomResponse` | `student` | Focus mode, Auto PIN | **PASS (مكتمل ويعمل بالكامل)** |
| **الحصة الذكية (السبورة الذكية)** | `pages/ClassroomProjectorView.tsx` | `GET /api/classroom/sessions/:id/aggregate` | `classroom.routes.ts` | `ClassroomSession` | `teacher`, `school_admin`, `supervisor`, `admin` | Anonymous Privacy Guard | **PASS (مكتمل مع حماية هوية الطلاب)** |
| **تقارير الحصص الذكية للمشرف** | `components/classroom/SmartClassroomReportsSection.tsx` | `GET /api/classroom/supervisor/sessions/:id/report` | `classroom.routes.ts` | `ClassroomSession`, `Group` | `supervisor`, `admin` | School scope boundary | **PASS (مكتمل ومحمي بـ RBAC)** |
| **شجرة المسارات والمواد (Taxonomy)** | `pages/Courses.tsx`, `components/TaxonomyBrowser.tsx` | `GET /api/content/bootstrap?scope=learning` | `content.routes.ts` | `Topic`, `Lesson`, `LibraryItem` | All / Public | Shared memory cache | **PASS (مكتمل ويعمل)** |
| **الدروس المرئية والتفاعلية** | `pages/LessonPage.tsx` | `GET /api/content/lessons/:id` | `content.routes.ts` | `Lesson` | Authenticated learner | Video streaming, Sanitizer | **PASS (مكتمل ويعمل)** |
| **حزم الاشتراكات B2B والرموز** | `dashboards/admin/PackagesManager.tsx` | `POST /api/content/b2b-packages`, `POST /api/content/access-codes/redeem` | `content.routes.ts` | `B2BPackage`, `AccessCode` | `admin`, `school_admin` | Multi-school scoping | **PASS (مكتمل ويعمل)** |
| **لوحة متابعة ولي الأمر** | `dashboards/parent/ParentDashboard.tsx` | `GET /api/reports/parent/overview` | `report.routes.ts` | `User`, `QuizResult`, `StudyPlan` | `parent` | Child ownership guard | **PASS (مكتمل ويعمل)** |
| **كشف المهارات الضعيفة والعلاج** | `dashboards/student/WeakSkillsCenter.tsx` | `GET /api/reports/student/weak-skills` | `report.routes.ts` | `QuizResult`, `Topic` | `student`, `teacher`, `supervisor` | Diagnostic engine | **PASS (مكتمل ويعمل)** |
| **الخطط الدراسية التكيفية** | `pages/StudyPlanPage.tsx` | `GET /api/content/study-plans`, `POST /api/content/study-plans` | `content.routes.ts` | `StudyPlan` | `student` | Day-based scheduler | **PASS (مكتمل ويعمل)** |
| **فحص الـ SEO وملف Sitemap** | `pages/Home.tsx` | `GET /sitemap.xml`, `GET /robots.txt`, `GET /api/content/seo/status` | `content.routes.ts` | `Topic`, `Lesson` | Guest / Public | XML Builder | **PASS (مكتمل بنسبة 100%)** |
| **مراقبة أداء السيرفر وتفريغ السجلات** | Internal middleware | `GET /api/health/ready`, `GET /api/health/live` | `health.routes.ts` | None | Monitoring / Public | DB ping, Redis status | **PASS (مكتمل ويعمل)** |
