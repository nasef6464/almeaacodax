# دليل التسليم بين الحسابات (نسخة التشغيل)

آخر تحديث: 2026-05-10

## الهدف
هذا الملف هو المرجع الموحد لأي حساب جديد حتى يكمل مباشرة بدون:
- إعادة شغل سابق
- كسر أجزاء مستقرة
- استهلاك توكن بدون تقدم فعلي

## قاعدة مهمة جدا
المحادثات نفسها لا تنتقل تلقائيا بين الحسابات.  
المرجع الحقيقي المشترك هو ملفات المشروع داخل GitHub/الريبو، وعلى رأسها هذا الملف.

## اقرأ هذا الترتيب قبل أي تعديل
1. `docs/SHIFT_HANDOFF_AR.md` (هذا الملف)
2. `docs/CURRENT_EXECUTION_PLAN_AR.md`
3. `docs/CURRENT_DEVELOPMENT_STATUS_AR.md`
4. `docs/AGENT_HANDOFF_AR.md`

## طريقة العمل الإلزامية (نفس النهج)
1. اختر جزئية واحدة فقط من الخطة.
2. نفذها كاملة (كود + فحص + تجربة الدور المناسب).
3. لا تلمس جزئية أخرى إلا بعد إغلاق الحالية.
4. حدّث هذا الملف بجملة: ماذا أُغلق؟ وما الذي بقي؟

## تعريف "الإغلاق"
الجزئية تعتبر مغلقة فقط إذا:
- الكود مكتمل
- فحوصها مرت
- تجربة الواجهة تمت للدور المعني (طالب/ولي أمر/مدير/مشرف/معلم حسب الحالة)
- تم توثيق النتيجة هنا

## حدود الصلاحيات والمنصات
- الاستمرار يعتمد على صلاحية نفس الجهاز/البيئة (GitHub/Render/Vercel/Mongo).
- لا نضع أسرار حساسة داخل المحادثة.
- أي تعديل بيئة إنتاج يتم توثيقه كـ "تغيير إعدادات" داخل هذا الملف.

## سياسة منع التكرار
- ممنوع إعادة تصميم جزء مستقر إلا لو ظهر خلل واضح.
- أي طلب جديد لا يلغي ما قبله إلا إذا كان "تعديل صريح".
- الأولوية: رحلة الطالب + البساطة + ثبات السلوك.

## سجل التسليم السريع
### 2026-05-10
- تم تثبيت مرجع تسليم موحّد بين الحسابات.
- المطلوب من أي حساب لاحق: البدء من هذا الملف ثم الخطة الحالية.
- تم إغلاق جزئية (المكتبة + ملف الدعم + مجاني/مدفوع حسب مكان العرض) بعد فحص ناجح:
  - `smoke:library-support` (10/10)
  - `smoke:student-journey` (6/6)
  - `smoke:quiz-access` (17/17)
- الجزئية الجارية التالية: ثبات رحلة الطالب داخل المادة بعد تحديث الصفحة (refresh) مع الحفاظ على نفس التبويب والسياق.
- تم تنفيذ دفعة أولى في الدورات: منشئ الدورة يستطيع الآن اختيار المدرب/المعلم، حفظ نسبة المدرب من دخل الدورة، واستدعاء درس موجود أو اختبار موجود داخل أقسام الدورة بدل الإضافة الجديدة فقط. الفحوص:
  - `smoke:course-builder` (4/4)
  - `smoke:quiz-access` (17/17)
  - `server build`
  - `frontend build`
- تم بدء وإغلاق عقد أسئلة الفيديو التفاعلية: الدرس يستطيع حفظ أسئلة بتوقيت محدد، والسؤال إما من بنك الأسئلة أو سؤال جديد ينشأ من منشئ الأسئلة الموحد، والمشغل يمررها في موضوعات التأسيس والدورات. الفحص: `smoke:video-questions` (5/5).
- تم إغلاق دفعة الباقات المدرسية ونسبة المعلم: الباقة المدرسية لها الآن معلم/مدرب ونسبة دخل محفوظة في النوع والسيرفر، وتظهر في إدارة المدارس وتقرير التصدير ولوحة المالية. الفحص: `smoke:package-revenue` (4/4)، مع نجاح `smoke:course-builder` و`smoke:quiz-access` والبناء الكامل.

## قالب تحديث مختصر (انسخه عند كل دفعة)
```
تاريخ:
الدفعة:
ما تم:
ما تم فحصه:
المتبقي المباشر:
مخاطر/ملاحظات:
```

## تحديث دفعة 2026-05-10 - فصل التدريب عن الاختبارات بصريًا
- القاعدة المثبتة: التدريب والاختبارات يظلان قسمين منفصلين في واجهة الطالب وإدارة المحتوى، حتى لو اشتركا داخليًا في نفس مشغل الأسئلة وبنك الأسئلة.
- ما تم: تحسين قائمة التدريب/الاختبارات داخل مساحة التعلم بإظهار ملخص بسيط: إجمالي العناصر، المفتوح الآن، وما هو ضمن باقة، مع شارات واضحة على كل عنصر.
- ما تم: زر التدريب يظهر كـ "ابدأ التدريب"، وزر الاختبار يظهر كـ "ابدأ الاختبار"، والاختبار/التدريب المغلق يفتح مسار الباقة.
- فحص الحماية المضاف: `smoke:quiz-access` يتحقق الآن من أن `mode="bank"` للتدريب، وأن مصادر `training` و`tests` منفصلة، وأن النصوص البصرية لا تدمج القسمين.
- المتبقي المباشر: استكمال تحسين تجربة الباقات/الإعلانات/تقارير الطالب وولي الأمر بنفس قاعدة البساطة وعدم نقل تفاصيل الإدارة للطالب.
## Production Hardening Sprint - 2026-05-10
- Closed critical direct-unlock route: `POST /api/auth/me/purchase` now returns `410 Gone`; paid access must come from payment review/webhook or access-code redemption.
- Closed direct quiz-result injection: `POST /api/quizzes/results` now returns `410 Gone`; real quiz results must come from `/api/quizzes/:id/submit`.
- Question attempts no longer trust client `isCorrect`; the server compares the selected option with the stored correct answer.
- Access-code redemption now reserves usage with MongoDB atomic `$inc` and `$expr` guard.
- Added baseline backend hardening: Helmet, compression, global rate limit, stricter auth/payment/AI/quiz-submit limits, and smaller JSON payload limit.
- Added docs: `PRODUCTION_READINESS_REPORT.md`, `SECURITY_CHECKLIST.md`, `LOAD_TEST_REPORT.md`, `BACKUP_RESTORE_GUIDE.md`.
- Added guard: `npm run smoke:production-hardening`.

## Production Audit + Paid/Free Foundation Sprint - 2026-05-10
- Added `AdminAuditLog` storage and `/api/operations/admin-audit-logs` for admin-only review of sensitive actions.
- Logged sensitive events: payment settings updates, payment request reviews, admin user upserts/updates, blocked direct purchase attempts, and blocked direct quiz result attempts.
- Changed `server/.env.example` so `DEV_LOCAL_ADMIN_BYPASS=false` is the safe default.
- Foundation topics now respect the topic itself for paid/free status. If a foundation topic is not locked, the student sees it as free and can open it directly. Locked topics still open the matching package/payment path.
- Added guard: `npm run smoke:production-audit`.
- Next direct work: complete package choice UX for public discount codes, memberships, and package variants (foundation only, tests only, full subject, full path, full membership) without merging training and tests.

## Payment Packages Sprint - 2026-05-10
- Closed the first package-choice pass: locked content can now pass several suitable public packages to the payment modal, so the student sees choices such as foundation-only, tests-only, subject/path package, or full package when those packages exist.
- Added optional `discountCode` to payment requests and the payment modal. This records the code for admin review only; real automated discounts still need a dedicated discount-code rules screen.
- Path package tabs now include global membership-style packages with no path binding, so a future "membership opens everything" package can be visible from path package pages.
- Guard added: `npm run smoke:payment-package`.
- Next direct work: build the real discount-code/ membership management UI and final package entitlement rules, while keeping training and tests as separate sections.

## Discount Codes Sprint - 2026-05-11
- Added a real MongoDB `DiscountCode` model and included discount codes in learning backups.
- Added admin payment APIs to list, create/update, pause, and reactivate discount codes.
- Payment requests now validate discount codes on the server, calculate original amount, discount amount, and final amount without trusting the browser, and increment redemption counts only when the admin approves the request.
- Approval is guarded: the server checks that the buyer still exists and reserves the discount-code usage before saving the request as approved, so a failed/expired code cannot leave a falsely approved request.
- The student payment modal now previews valid/invalid discount codes and shows the discounted total before submission; this is only UX, and the server recalculates again at request creation.
- Added the admin financial UI for discount-code creation, package targeting, usage review, pause/reactivate, and CSV export.
- Updated `npm run smoke:payment-package` so it guards discount persistence, server-side calculation, admin management, and backup coverage.
- Next direct work: membership/bundle administration, then payment gateway or verified manual approval workflow. Keep the student/parent screens simple; put dense financial detail in admin only.

## Global Membership Sprint - 2026-05-11
- Closed the first global-membership administration pass: admins can create a package as "membership" from path package management, with no path binding and `packageContentTypes=['all']`.
- Global memberships appear inside each path package tab as a platform-wide option, but still use the same approval/payment request flow. Students do not unlock anything by calling an API directly.
- Existing entitlement logic already treats a purchased public package with no path binding as matching any path, so approved membership payment opens courses, foundation, training, tests, and library without duplicating rules.
- Guard added to `npm run smoke:payment-package` for membership enums, admin global toggle, and global package tab visibility.
- Next direct work: payment gateway/webhook integration or stricter manual approval evidence, then focused UX polish for student package selection.

## Manual Payment Evidence Sprint - 2026-05-11
- Closed a payment-hardening pass: creating or approving a manual payment now requires clear evidence (transfer reference, wallet number, receipt link, card note, or explicit admin evidence).
- Admin financial review disables approval for pending requests with missing evidence, while rejection stays available.
- Approved requests store `approvalEvidence` for audit and future handoff.
- Guard extended in `npm run smoke:payment-package` so direct access cannot be unlocked from a weak payment approval path.
- Next direct work: payment gateway/webhook integration, then final student-facing package selection polish.

## Verified Payment Webhook Sprint - 2026-05-11
- Closed the first gateway-safe payment pass: `POST /api/payments/webhooks/payment` now accepts signed payment events only.
- The webhook requires `x-payment-signature` HMAC verification using `PAYMENT_WEBHOOK_SECRET` or the admin payment setting secret.
- The server rejects mismatched currency/amount, stores gateway event and transaction ids, treats repeated events as idempotent duplicates, and unlocks content only after the trusted paid event is accepted.
- Manual approval and gateway approval now share the same server-side purchase application helper and discount-redemption reservation path.
- Guard extended in `npm run smoke:payment-package`.
- Next direct work: polish the student locked-content package UX into a lighter "this is paid / view suitable packages" step, then connect the webhook contract to the chosen live payment provider.

## Student Package Choice UX Sprint - 2026-05-11
- Closed the first visual polish pass for locked paid content: when more than one suitable package is available, `PaymentModal` expands to a wider comparison layout and shows package choices in up to three columns.
- This keeps the student flow simple: locked content still opens the same secure payment/request path, but the available packages are easier to compare instead of appearing as a narrow vertical stack.
- Guard extended in `npm run smoke:payment-package` to verify the wider multi-package modal contract.
- Verified: `npm run smoke:payment-package`, `npm run typecheck`, `npm run build`, `npm --prefix server run build`, and local browser load of the learning page with zero console errors.
- Next direct work: a smaller pre-payment message step ("this part is paid / view suitable packages") before showing payment methods, while keeping dense package/payment details in admin screens only.

## Student Paid-Content Intro Sprint - 2026-05-11
- Added a lightweight first step inside `PaymentModal`: students now see a short paid-content message, the selected item/package price, suitable package choices, and one clear button to continue to payment methods.
- Payment methods, discount codes, access codes, and review evidence still run through the same hardened request flow; this is UX simplification only, not a new unlock path.
- Guard extended in `npm run smoke:payment-package` for the intro step, copy, and wider layout.
- Verified: `npm run smoke:payment-package`, `npm run typecheck`, `npm run build`, `npm --prefix server run build`, and local browser load with zero console errors.
- Next direct work: polish the package landing page and package cards so the student can compare foundation-only, tests-only, subject/path, and membership packages with the same simple style.

## Student Package Landing Sprint - 2026-05-12
- Closed the package-card polish pass: package cards now use clear visual tones by package scope/content type, with a stronger subscribe action for students and the same locked/payment flow underneath.
- The UI remains simple for students: package type, price, activation state, package preview, and subscribe/open action. Dense payment and coverage details stay on admin screens.
- Added a guard to `npm run smoke:payment-package` so the package landing page keeps the colored package-tone contract and visible subscribe call-to-action.
- Updated `LOAD_TEST_REPORT.md` with the immediate causes of Vercel slowness: large frontend chunks, Render cold start on the free instance, and missing measured load-test gates for 10k+ users.
- Next direct work: performance hardening in code, starting with chunk splitting and first-load cleanup, then measured k6/autocannon load tests before claiming large-scale readiness.

## Frontend First-Load Performance Sprint - 2026-05-12
- Closed the first performance pass: student-facing video entrypoints now lazy-load `CustomVideoPlayer` instead of importing the heavy video stack immediately.
- Touched entrypoints: `VideoModal`, `CoursePlayer`, and `CourseLanding`.
- Added guard: `npm run smoke:performance`.
- Expected effect: normal student pages and result/learning pages avoid pulling ReactPlayer/HLS/DASH until a lesson preview or video modal is opened.
- Remaining direct performance work: split admin/dashboard/report chunks, then run measured load tests before any 10k-user readiness claim.

## Reports Export Performance Sprint - 2026-05-12
- Closed the reports export split: `pages/Reports.tsx` now lazy-loads `xlsx` only when exporting Excel.
- This keeps student/parent report browsing lighter while preserving the same export buttons and behavior.
- `npm run smoke:performance` now verifies the reports page does not reintroduce a static spreadsheet import.

## Admin Dashboard Performance Sprint - 2026-05-12
- Closed the first admin split: `dashboards/admin/AdminDashboard.tsx` lazy-loads each heavy manager tab.
- Production build result: the admin dashboard shell is now about 51 kB before gzip instead of loading the previous large admin bundle up front.
- Important: this did not merge training/tests or change the student journey; it only changes when admin code downloads.
- Guard: `npm run smoke:performance` checks that heavy admin managers are not statically reintroduced.

## Vercel Cache Sprint - 2026-05-12
- Closed the production cache-header fix in `vercel.json`.
- Do not restore the old global `no-store`; it made repeat visits redownload built assets and was one cause of Vercel slowness.
- Hashed assets now use one-year immutable caching, while the SPA HTML shell uses revalidation so new deployments still appear.
- Guard: `npm run smoke:deployment-cache`.
- Scope: deployment/performance only. No student, parent, admin, quiz, package, payment, training, or foundation logic changed.

## Load Testing Sprint - 2026-05-12
- Added `load-tests/k6-platform-journey.js` for staged 100/500/1000 user checks.
- Added `load-tests/README.md` and `npm run smoke:load-tests`.
- This is the official measurement path before claiming large student capacity.
- Do not claim 10k-user readiness until real runs are recorded with upgraded Render and MongoDB metrics.
- Scope: test/readiness tooling only. No student, parent, admin, quiz, package, payment, training, or foundation logic changed.

## Monitoring Diagnostics Sprint - 2026-05-12
- Added backend structured request diagnostics in `server/src/middleware/requestLogger.ts`.
- Slow and failed API requests now write safe JSON logs with path, status, duration, user id/role when available, and no request body or secrets.
- Added Render env switches: `REQUEST_LOG_LEVEL=normal` and `SLOW_REQUEST_LOG_MS=1000`.
- Added `MONITORING_AND_LOGGING_GUIDE.md` and guard `npm run smoke:monitoring`.
- Scope: observability/readiness only. No student, parent, admin, quiz, package, payment, training, or foundation logic changed.

## Database Index Sprint - 2026-05-12
- Added first-pass MongoDB indexes for high-traffic reads: learning bootstrap, topics, lessons, library, courses/packages, users, groups, payment requests, discount codes, access codes, audit logs, AI metrics, and announcement ads.
- Added `DATABASE_REVIEW.md` and guard `npm run smoke:database`.
- Scope: database performance/readiness only. No student, parent, admin, quiz, package, payment, training, or foundation behavior changed.
