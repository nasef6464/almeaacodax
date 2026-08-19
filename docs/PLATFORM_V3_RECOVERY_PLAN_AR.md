# Platform V3 Recovery & Development Plan

## الهدف
إعادة التحقق من كل وظائف المنصة بعد دمج Refactor V2، إصلاح أي أعطال حقيقية، ثم بدء تطوير منظم وآمن بدون تعديل مباشر على `main`.

## سياسة العمل
- `main` = Production مستقر فقط.
- كل إصلاح/تطوير يتم على `develop/platform-v3-recovery` أو فرع أصغر منه.
- لا دمج إلى `main` قبل Build + Typecheck + العقود + فحص Production/Preview المناسب.
- لا Force Push.
- لا تغييرات مدمرة على قاعدة البيانات أثناء الاستعادة.
- لا كلمات مرور أو Tokens داخل المستودع أو سجلات الاختبار.

## الحالة الحالية بعد الدمج
- Refactor V2 مدموج إلى `main`.
- Production frontend يعمل على merge commit `fab4e31f037feeeb178788dd2a79971e4fce2cbc`.
- Production backend `/api/health` أكد نفس commit المختصر `fab4e31f037f`.
- Database connected.
- Redis rate-limit ready.
- Redis queue ready.
- Public frontend routes `/courses` و`/quizzes` ترجع 200.
- Learning content bootstrap يرجع بيانات فعلية من قاعدة البيانات.
- `/api/auth/me` بدون جلسة يرجع 401 كما يجب.
- Admin users API بدون جلسة يرجع 401 كما يجب.
- CSRF token endpoint يعمل ويصدر cookie.
- لا Runtime Errors ظهرت في فحص Vercel الأخير.

## تقدم Recovery Gate
- Core build + architecture: PASS على آخر جولة مكتملة قبل إصلاح شراء الدورة.
- Student + assessment regression: PASS.
- Auth + security regression: PASS.
- Production readiness contracts: PASS.
- تم اكتشاف أثر قديم لمسار تقرير `PACKAGE_COURSE_SPLIT_REPORT.md` بعد إعادة التنظيم وتصحيح العقد إلى `docs/archive_reports/PACKAGE_COURSE_SPLIT_REPORT.md`.
- تم اكتشاف خلل وظيفي في فصل شراء الدورة عن الباقة: عند وجود باقة مطابقة كان `CourseOverview` يحوّل طلب شراء الدورة إلى شراء باقة.
- تم إصلاح الخلل في commit `64a665e28626b41b21b55d7c529fc5209f643d14`: شراء الدورة يظل `type="course"` و`purchaseType: 'course'`، والباقات تظل مسارًا منفصلًا.
- الإصلاح المباشر اجتاز عقد فصل package/course، عقد الدفع، حماية tampering، frontend typecheck، API typecheck، وfrontend production build قبل الـcommit.
- الجولة التالية من Recovery/Safety Gate يجب أن تعمل على head جديد صادر من تحديث بشري/توثيقي لأن GitHub لا يعيد تشغيل سلسلة workflows تلقائيًا من commit صادر عن GitHub Actions.

## مصفوفة الاستعادة الوظيفية

### 1. Production / Infrastructure
- [x] Frontend production deployment
- [x] Backend health
- [x] Database connectivity
- [x] Redis readiness
- [ ] Production runtime observation بعد استخدام فعلي لكل الأدوار

### 2. Visitor / Public
- [x] Landing shell
- [x] Courses route availability
- [x] Quizzes route availability
- [x] Public learning data API
- [ ] Pricing / cart / checkout UI journey
- [ ] Blog / static pages / certificates
- [ ] Login / signup / forgot-password UI journey

### 3. Student
- [ ] Login
- [ ] Dashboard
- [ ] Learning paths
- [ ] Course / lesson open
- [ ] Quiz start
- [ ] Answer persistence
- [ ] Submit
- [ ] Results
- [ ] Reports
- [ ] Favorites
- [ ] Plan
- [ ] Profile
- [ ] Mock exams
- [ ] My quizzes

### 4. Admin
- [ ] Login
- [ ] Dashboard
- [ ] Users
- [ ] Schools
- [ ] Students / teachers / supervisors
- [ ] Question bank
- [ ] Quiz management
- [ ] Courses / paths
- [ ] Packages / memberships
- [ ] Payments / finance
- [ ] Reports
- [ ] Platform settings / integrations

### 5. Teacher
- [ ] Login
- [ ] Allowed dashboard
- [ ] Assigned content / students
- [ ] Reports and scope restrictions

### 6. School Supervisor
- [ ] Login
- [ ] School dashboard
- [ ] School-only student scope
- [ ] School reports
- [ ] Command center / roster / packages / relations
- [ ] Cross-school access denial

### 7. Parent
- [ ] Login
- [ ] Parent dashboard
- [ ] Linked student visibility
- [ ] Student report visibility
- [ ] Unauthorized student denial

### 8. Security / Integrity
- [x] Anonymous auth protection basic check
- [x] Admin API anonymous protection basic check
- [x] CSRF token availability
- [x] Contract-level authentication / CSRF / API security / NoSQL sanitizer checks
- [x] Contract-level quiz integrity / answer exposure checks
- [x] Contract-level payment tampering checks
- [ ] Role-based access live checks
- [ ] Quiz answer exposure live check with authenticated student
- [ ] Session/logout/reload behavior
- [ ] School scope isolation live check

## ترتيب التنفيذ
1. Complete live role journeys using dedicated test accounts.
2. Record every defect as BLOCKER / HIGH / MEDIUM / LOW.
3. Fix one defect group at a time on the recovery branch.
4. Run direct contract + typecheck/build + focused smoke after each fix.
5. Keep a Preview deployment for validation.
6. Only when the matrix is green, prepare a release PR to `main`.
7. After stabilization, begin product-development backlog (UX, performance, assessment features, reporting, admin tooling) in separate feature branches.

## الفروع القديمة
الفروع `refactor/*runner*` و`refactor/*trigger*` تعتبر آثار تنفيذ Refactor V2. لا يتم دمجها تلقائيًا. يتم تنظيفها فقط بعد التأكد أن `main` يحتوي التغييرات المطلوبة وأن لا PR أو recovery path يعتمد عليها.

## تعريف النجاح
المنصة تعتبر مستعادة بالكامل عندما تكون الرحلات الأساسية لكل دور PASS على Production/Preview، ولا توجد أخطاء Runtime حرجة، وتنجح بوابات build/type/security/quiz integrity/RBAC المرتبطة بالتغييرات.
