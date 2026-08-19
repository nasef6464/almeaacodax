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
- Core build + architecture: PASS على آخر جولة مكتملة قبل آخر إصلاحين، وسيعاد على checkpoint الحالي.
- Student + assessment regression: PASS.
- Auth + security regression: PASS.
- Production readiness contracts: PASS.
- Mock Exams / School Portal / Exam Question Source / Quiz Access: العقود القديمة تم تحديثها لتطابق المالك والسلوك الحالي بدل إعطاء إنذارات كاذبة.
- `smoke:frontend:strict` أُخرج من PR CI لأنه يقارن commit الفرع مع Production المنشور؛ يظل Post-Deploy check فقط.

### Product bug #1 — manual payment approval evidence — FIXED
- الخلل: `FinancialManager` كان يعتمد الدفع اليدوي بدون إرسال `approvalEvidence` رغم أن الـBackend يشترطه قبل فتح الوصول.
- الإصلاح: الاعتماد فقط يرسل evidence مشتقًا من بيانات المراجعة؛ الرفض لا يفتح وصولًا.
- commit: `c8e36ef5f0161c3dce8be172a81ce9b6d306d478`.
- verified: payment-package PASS + frontend typecheck PASS + API typecheck PASS + production build PASS + guarded one-file patch PASS.

### Product bug #2 — direct course purchase vs package substitution — FIXED
- الخلل: زر `شراء الدورة` كان يصل إلى `CourseOverview` ثم قد يستبدل هدف الدفع تلقائيًا بباقة مطابقة.
- القرار: شراء الدورة وشراء الباقة مساران منفصلان؛ `CourseOverview` هو مالك شراء الدورة، وصفحة/أزرار الباقات هي مالك شراء الباقة.
- الإصلاح: `PaymentModal` في `CourseOverview` يستقبل الدورة نفسها مع `purchaseType: 'course'` و`type="course"` دائمًا.
- commit: `64a665e28626b41b21b55d7c529fc5209f643d14`.
- verified before commit: package/course split PASS + payment-package PASS + payment-tampering PASS + frontend typecheck PASS + API typecheck PASS + production build PASS + guarded one-file patch PASS.

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
- [ ] Login live
- [x] Student journey contracts
- [x] Learning / assessment contracts
- [x] Mock exam contracts
- [x] Quiz access / integrity / answer-exposure contracts
- [x] Results contracts
- [ ] Dashboard live
- [ ] Learning paths live
- [ ] Course / lesson open live
- [ ] Quiz start / persistence / submit live
- [ ] Results / reports live
- [ ] Favorites / plan / profile live

### 4. Admin
- [ ] Login live
- [x] School management contracts
- [x] Supervisor dashboard / school portal contracts
- [x] Reports role contracts
- [x] Membership / payment security contracts
- [x] Manual payment approval evidence repair
- [ ] Users / schools / question bank / quiz / courses / paths live
- [ ] Packages / memberships / finance live
- [ ] Reports / settings / integrations live

### 5. Teacher
- [ ] Login live
- [ ] Allowed dashboard live
- [ ] Assigned content / students live
- [ ] Reports and scope restrictions live

### 6. School Supervisor
- [ ] Login live
- [x] School RBAC / supervisor contracts
- [x] School portal / command center contracts
- [ ] School-only student scope live
- [ ] School reports live
- [ ] Cross-school access denial live

### 7. Parent
- [ ] Login live
- [ ] Parent dashboard live
- [ ] Linked student visibility live
- [ ] Student report visibility live
- [ ] Unauthorized student denial live

### 8. Security / Integrity
- [x] Anonymous auth protection basic check
- [x] Admin API anonymous protection basic check
- [x] CSRF token availability
- [x] Contract-level authentication / CSRF / API security / NoSQL sanitizer checks
- [x] Contract-level quiz integrity / answer exposure checks
- [x] Contract-level payment tampering checks
- [ ] Role-based access live checks
- [ ] Quiz answer exposure live check with authenticated student
- [ ] Session/logout/reload behavior live
- [ ] School scope isolation live

## ترتيب التنفيذ
1. Keep the Platform V3 read-only regression gate green after every recovery fix.
2. Continue peeling the admin / package / navigation contracts until the full static gate is green.
3. Complete live role journeys using dedicated test accounts when an authenticated browser/POST-capable runner is available.
4. Record every defect as BLOCKER / HIGH / MEDIUM / LOW.
5. Fix one defect group at a time on the recovery branch.
6. Run direct contract + typecheck/build + focused smoke after each fix.
7. Keep a Preview deployment for validation.
8. Only when the matrix is green, prepare a release PR to `main`.
9. After stabilization, begin product-development backlog (UX, performance, assessment features, reporting, admin tooling) in separate feature branches.

## الفروع القديمة
الفروع `refactor/*runner*` و`refactor/*trigger*` تعتبر آثار تنفيذ Refactor V2. لا يتم دمجها تلقائيًا. يتم تنظيفها فقط بعد التأكد أن `main` يحتوي التغييرات المطلوبة وأن لا PR أو recovery path يعتمد عليها.

## تعريف النجاح
المنصة تعتبر مستعادة بالكامل عندما تكون الرحلات الأساسية لكل دور PASS على Production/Preview، ولا توجد أخطاء Runtime حرجة، وتنجح بوابات build/type/security/quiz integrity/RBAC المرتبطة بالتغييرات.
