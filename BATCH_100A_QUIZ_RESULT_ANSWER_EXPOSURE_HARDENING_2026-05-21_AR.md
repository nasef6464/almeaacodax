# تقرير BATCH 100A — Quiz Result Answer Exposure Hardening
التاريخ: 2026-05-21
الحالة: Programmatically closed, production verification pending until deployment commit matches

## السبب
كشف الفحص العميق V13 أن نتائج الاختبارات كانت ترجع `correctOptionIndex` و`explanation` داخل `questionReview` في ردود API وصفحة النتائج، ما يعني إمكانية كشف الإجابات الصحيحة والشروحات للطالب بعد محاولة الاختبار.

## نطاق الدفعة
تم العمل فقط على منع تسريب إجابات الاختبارات من:
- `POST /api/quizzes/:id/submit`
- `GET /api/quiz-results/:id`
- قوائم نتائج الاختبارات التي قد تطلب `includeReview=true`
- fallback المحلي في صفحة الاختبار الذي كان يعيد حقن `questionReview` المحلي
- صفحة النتائج التي كانت تعرض الإجابة الصحيحة والشرح

لم يتم إصلاح RBAC النقاشات أو النصوص العربية أو ربط الدورات في هذه الدفعة.

## ما تم تنفيذه
- إضافة serializer آمن لنتائج الاختبارات يزيل `correctOptionIndex` و`explanation` من `questionReview` قبل إرسال الرد.
- تطبيق serializer على submit/latest/list/scoped/detail endpoints ذات الصلة بنتائج الاختبارات.
- منع صفحة الاختبار من إعادة حقن `questionReview` المحلي الذي يحتوي مفاتيح الإجابة فوق رد السيرفر الآمن.
- تعديل صفحة النتائج لتعرض اختيار الطالب وحالة الإجابة فقط دون عرض الإجابة الصحيحة أو الشرح التفصيلي.
- تعديل fallback الخاص ببنك الأسئلة حتى لا يعيد تكوين `correctOptionIndex` أو `explanation` داخل مراجعة النتائج.
- إضافة smoke contract جديد: `smoke:quiz-answer-exposure`.

## الملفات المعدلة في هذه الدفعة
| الملف | نوع التغيير | السبب |
|---|---|---|
| `server/src/utils/quizResultSerialization.ts` | جديد | serializer آمن لنتائج الاختبارات. |
| `server/src/routes/quiz.routes.ts` | تعديل | استخدام serializer قبل ردود results/submit/latest/scoped. |
| `server/src/routes/quizResults.routes.ts` | تعديل | استخدام serializer في endpoint تفاصيل النتيجة والقوائم. |
| `pages/QuizPage.tsx` | تعديل محدود | منع إعادة حقن questionReview المحلي فوق رد السيرفر. |
| `pages/Results.tsx` | تعديل محدود | منع عرض الإجابة الصحيحة والشرح. |
| `utils/quizPresentation.ts` | تعديل | منع fallback من استعادة مفاتيح الإجابة من question bank. |
| `types.ts` | تعديل | جعل `correctOptionIndex` اختياريًا في `QuizQuestionReview`. |
| `scripts/smoke-quiz-answer-exposure-contract.mjs` | جديد | اختبار عقدي يمنع رجوع التسريب. |
| `package.json` | تعديل | إضافة `smoke:quiz-answer-exposure`. |

## ملفات كانت معدلة مسبقًا ولم يتم لمسها في نطاق هذه الدفعة
تم رصد worktree dirty سابق قبل بدء الدفعة، ومنه ملفات مثل:
- `App.tsx`
- `contexts/AuthContext.tsx`
- `dashboards/admin/FinancialManager.tsx`
- `dashboards/admin/SchoolPortalManager.tsx`
- `dashboards/admin/UsersManager.tsx`
- `server/src/routes/notification.routes.ts`
- `server/src/routes/taxonomy.routes.ts`
- `server/src/services/notificationService.ts`
- عدة تقارير قديمة غير متعقبة

ملاحظة: `pages/QuizPage.tsx` كان معدلاً مسبقًا، وتم لمس جزء واحد فقط متعلق بمنع إعادة حقن `questionReview` المحلي.

## الفحوص
| الأمر | النتيجة | ملاحظات |
|---|---|---|
| `node scripts/smoke-quiz-answer-exposure-contract.mjs` قبل الإصلاح | FAIL | 5 checks فشلت وأثبتت التسريب. |
| `npm --prefix server run build` | PASS | TypeScript backend build نجح. |
| `npm run smoke:quiz-answer-exposure` | PASS | 5/5 checks. |
| `npm run typecheck` | PASS | بدون أخطاء TypeScript. |
| `npm run smoke:results` | PASS | 6/6 checks. |
| `npm run smoke:learning-quiz` | PASS | 7/7 checks. |
| `npm run build` | PASS | Vite production build نجح. |
| `npm run smoke:quiz-client-security` | PASS | 4/4 checks. |
| `npm run smoke:production-hardening` | PASS | 5/5 checks. |
| `npm run smoke:data-visibility-regression` | PASS | 28/28 checks. |
| `npm run smoke:frontend:strict` | PASS | 26/26 checks. |

## فحص الإنتاج
- سيتم بعد push/deploy.
- المطلوب للإغلاق الكامل: أن يعرض Render health آخر commit بعد النشر، ثم يتم تشغيل فحص إنتاجي يؤكد عدم تسريب الإجابات في الردود المحمية.
- إذا لم يتوفر token إنتاجي محمي للفحص التفصيلي، تبقى الحالة: `Programmatically closed, production verification pending`.

## خطوات التحقق اليدوي
1. افتح اختبار كطالب وأنهِ المحاولة.
2. راقب رد `POST /api/quizzes/:id/submit` في Network.
3. تأكد أن `questionReview` لا يحتوي `correctOptionIndex` ولا `explanation`.
4. افتح صفحة النتائج واضغط مراجعة.
5. تأكد أن الواجهة تعرض اختيار الطالب وحالة الإجابة فقط، ولا تعرض “الإجابة الصحيحة” أو “توضيح الحل”.
6. اطلب `GET /api/quiz-results/:id` كمستخدم مالك للنتيجة.
7. تأكد أن الرد لا يحتوي `correctOptionIndex` ولا `explanation`.

## المخاطر المتبقية
- تفاصيل التحقق الإنتاجي المحمي تحتاج token صالح أو جلسة مصرح بها بعد النشر.
- RBAC/scope الخاص بمنتدى النقاشات ما زال خارج نطاق هذه الدفعة.
- النصوص العربية التالفة ما زالت خارج نطاق هذه الدفعة.
- ربط الدورات path/subject/skills ما زال خارج نطاق هذه الدفعة.

## هل تم إغلاق الخطر الحرج برمجيًا؟
نعم، تم إغلاقه برمجيًا عبر serializer + smoke contract + منع fallback المحلي من إعادة التسريب.

## الدفعة التالية المقترحة
`BATCH 100B — Discussions RBAC Scope Hardening`
