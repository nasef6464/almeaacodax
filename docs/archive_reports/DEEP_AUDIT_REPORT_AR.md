# تقرير الفحص العميق الشامل — منصة المئة
التاريخ: 2026-05-21 | الإصدار: V13 | النتيجة الإجمالية: 79%

## ملخص تنفيذي
- نوع الجلسة: فحص عميق مستقل فقط، بدون إصلاحات كود.
- إجمالي البنية المرصودة: 237 ملف TypeScript/TSX، و41 نموذج Mongoose، و20 ملف routes، و74 سكربت smoke.
- نتيجة الفحوص الأساسية: 18/18 PASS.
- نتيجة فحوص CI/الإثبات الحي الإضافية: 2 FAIL بسبب غياب `SMOKE_ADMIN_TOKEN` في بيئة التشغيل المحلية.
- الحكم العام: المشروع قوي جدًا كـ MVP/Pilot، لكنه ليس جاهزًا لإطلاق عام واسع قبل إغلاق مخاطر تسريب إجابات الاختبار، نطاق منتدى النقاشات، فساد النصوص العربية، ومزامنة النشر الإنتاجي.

## ملخص الحالة بالأرقام
| البند | النتيجة |
|---|---:|
| تعمل بشكل كامل | 43 ✅ |
| تعمل جزئياً | 18 ⚠️ |
| لا تعمل أو بها خلل مؤكد | 7 ❌ |
| مفقودة/غير مثبتة | 9 🔵 |

## ماذا يعتقد المشروع عن نفسه؟
- `PROJECT_STATUS.md` يعلن أن آخر خطة موثقة هي خطة الوصول إلى 100% بتاريخ 2026-05-21 وأن الدفعة النشطة غير محددة، مع اقتراح `BATCH 100A` كفحص شامل للّوحات.
- `docs/NEXT_SESSION_HANDOVER_AR.md` يحتوي قاعدة عمل إلزامية: كلمة "اكمل" تعني استمرار تلقائي حتى إغلاق الدفعة كاملة، مع build + smoke + report + ledger + push + deploy + live verification.
- `docs/SPARK_BATCH_LEDGER_AR.md` يسجل أغلب الدفعات 00-21 كـ `Fully closed`، مع بقاء BATCH 20 في حالة scale hardening pending.
- توجد تناقضات نصية/ترميزية داخل بعض ملفات التوثيق نفسها، وهذا لا يكسر التشغيل لكنه يضعف قابلية التسليم للحساب القادم.

## نتائج أوامر البنية
| الأمر | النتيجة | ملاحظات |
|---|---:|---|
| `rg --files -g "*.ts" -g "*.tsx" ... | Measure-Object` | 237 | الرقم الفعلي ليس 229. |
| `Get-ChildItem server/src/models -Filter *.ts` | 41 | مطابق للادعاء. |
| `Get-ChildItem scripts -Filter smoke-*.mjs` | 74 | الرقم الفعلي ليس 68. |
| `Get-Content server/src/routes/index.ts` | 19 mount فعلي | 20 route file مع `index.ts`. |

## نتائج الـ Smoke Tests
| الأمر | النتيجة | التفاصيل |
|---|---|---|
| `npm --prefix server run build` | ✅ PASS | 38.21s |
| `npm run typecheck` | ✅ PASS | 106.58s |
| `npm run build` | ✅ PASS | 76.20s |
| `npm run smoke:health-readiness` | ✅ PASS | 2.21s |
| `npm run smoke:production-hardening` | ✅ PASS | 2.13s |
| `npm run smoke:frontend:strict` | ✅ PASS | 10.91s |
| `npm run smoke:auth-cookie` | ✅ PASS | 1.95s |
| `npm run smoke:csrf` | ✅ PASS | 2.13s |
| `npm run smoke:seo` | ✅ PASS | 2.30s |
| `npm run smoke:security-rbac-phase6` | ✅ PASS | 2.10s |
| `npm run smoke:database` | ✅ PASS | 1.91s |
| `npm run smoke:notifications` | ✅ PASS | 1.82s |
| `npm run smoke:learning-quiz` | ✅ PASS | 7.53s |
| `npm run smoke:student-journey` | ✅ PASS | 5.07s |
| `npm run smoke:results` | ✅ PASS | 1.90s |
| `npm run smoke:payment-providers` | ✅ PASS | 1.70s |
| `npm run smoke:monitoring` | ✅ PASS | 1.53s |
| `npm run smoke:sentry-runtime` | ✅ PASS | 2.05s |
| `npm run smoke:operational` | ❌ FAIL | `Operational smoke test failed` ثم `missing token for production smoke. Set SMOKE_ADMIN_TOKEN or enable SMOKE_ALLOW_PASSWORD_LOGIN=true explicitly.` |
| `npm run smoke:sentry-live-proof` | ❌ FAIL | `Missing SMOKE_ADMIN_TOKEN` |

## فحص الإنتاج السريع
| الفحص | النتيجة | الدليل |
|---|---|---|
| `GET /api/health` | ✅ ready=true | الإنتاج يرجع database connected وRedis ready. |
| Redis rateLimit | ✅ ready | ظهر في health كـ ready. |
| Redis queue | ✅ ready | ظهر في health كـ ready. |
| commit الإنتاج | ⚠️ غير مطابق | health يعرض commit `5d9b337a96f9` بينما `origin/main` هو `8c1c9311322`. |
| `GET /api/operations/health` | ⚠️ ready_with_notes | WhatsApp provider unknown، Email provider console. |

## فحص النماذج (Models)
| النموذج | الحقول | الـ Indexes | الـ Routes | الـ Frontend | المشاكل |
|---|---|---|---|---|---|
| User | ✅ `server/src/models/User.ts:16-20` subscription includes plan/expiresAt/purchasedCourses/purchasedPackages | ✅ `User.ts:60-69` | ✅ auth/content/payment | ✅ Profile/Dashboard | يحتاج تأكيد مزامنة enrolledCourses مع purchasedCourses في كل المسارات. |
| Course | ✅ `Course.ts:39-85` includes pathId/subjectId/modules/assessments/isPublished/showOnPlatform | ✅ `Course.ts:91-96` | ✅ content/courses/payment | ✅ course/admin/student | ⚠️ شكاوى المالك تؤكد تكرار/عدم اتساق path/subject في UI ويجب Batch مستقل. |
| QuizResult | ✅ `QuizResult.ts:5-21` | ✅ `QuizResult.ts:28-32` | ✅ quiz/quiz-results | ✅ Results | ❌ يحتوي `questionReview` بتفاصيل الإجابة الصحيحة ويرجع للعميل. |
| QuestionAttempt | ✅ `QuestionAttempt.ts:3-15` | ✅ `QuestionAttempt.ts:21-25` | ✅ quiz submit | ✅ analytics indirectly | ⚠️ لا يحتوي `quizResultId`، فتتبع العلاقة Result -> Attempts غير مباشر. |
| Certificate | ✅ userId/courseId/verificationCode | ✅ unique user+course وverificationCode | ✅ certificates.routes | ✅ CertificatePage/Dashboard | ✅ جيد، التوليد يعتمد على طلب/اكتمال. |
| ReviewCard | ✅ SM-2 fields | ✅ unique user+question وnextReview indexes | ✅ review.routes | ✅ ReviewSession | ⚠️ route due يسمح limit حتى 100 وليس 20 كما في معيار الفحص. |
| DiscussionThread | ✅ `DiscussionThread.ts:6-14` | ✅ `DiscussionThread.ts:21` | ✅ discussions.routes | ✅ CourseOverview | ⚠️ repliesCount يزيد عند الإضافة، لكن نطاق staff واسع جدًا. |
| DiscussionReply | ✅ | ✅ threadId+createdAt | ✅ discussions.routes | ✅ CourseOverview | ⚠️ يعتمد على scope thread. |
| PhoneOtp | ✅ codeHash/expiresAt/attempts | ✅ phone+purpose وexpiresAt | ✅ auth.routes | ✅ auth UI حسب التدفق | ⚠️ تحقق الكود يستخدم مقارنة hash عادية وليس timing-safe. |
| PaymentRequest | ✅ status/amount/item/server fields | ✅ عدة indexes | ✅ payment.routes | ✅ FinancialManager | ✅ حماية server-verified جيدة؛ لا يوجد unique مباشر للgateway ids لكن idempotent grant موجود. |
| AccessGrant | ✅ | ✅ idempotency/source unique | ✅ access/payment | ✅ access checks | ✅ جيد. |
| PlatformIntegrationSettings | ✅ provider secrets | ⚠️ encryption helper موجود | ✅ content routes | ✅ PlatformIntegrationsManager | ⚠️ التشفير يعتمد على key مخصص أو fallback إلى JWT_SECRET، والبيانات القديمة قد تحتاج lazy migration. |

## فحص الـ Routes
| الـ Route | Auth | Validation | الـ Model | الـ Frontend | المشاكل |
|---|---|---|---|---|---|
| auth.routes.ts | ✅ cookie + JWT + role | ✅ Zod في عدة مسارات | User/PhoneOtp | AuthContext/services/api | ⚠️ token لا يظهر في JSON بالإنتاج (`auth.routes.ts:211-252`) جيد، لكن sessionStorage fallback موجود للتوافق. |
| quiz.routes.ts | ✅ requireAuth في submit | ✅ Zod | Quiz/Question/QuizResult/ReviewCard | QuizPage/Results | ❌ submit يرجع result raw مع `correctOptionIndex` و`explanation` (`quiz.routes.ts:2140-2217`). |
| quizResults.routes.ts | ✅ owner/admin check | ✅ pagination | QuizResult | Results | ❌ detail endpoint يرجع result raw، وليس serializer آمن. |
| certificates.routes.ts | ✅ my/generate auth، public verify | ✅ جزئي | Certificate/Course | CertificatePage/Dashboard | ✅ جيد كبنية. |
| discussions.routes.ts | ✅ requireAuth | ✅ entity type check | DiscussionThread/Reply/Course | CourseOverview | ❌ `assertCanAccessEntity` يعطي admin/teacher/supervisor وصولًا عامًا (`discussions.routes.ts:26-28`). |
| review.routes.ts | ✅ requireAuth | ✅ quality 0-5 | ReviewCard/Question | ReviewSession | ⚠️ limit max 100 بدل معيار max 20. |
| payment.routes.ts | ✅ admin/user protected حسب endpoint | ✅ Zod | PaymentRequest/AccessGrant | FinancialManager | ⚠️ نصوص عربية تالفة كثيرة في رسائل الدفع. |
| content.routes.ts | ✅ role/scope في أجزاء مهمة | ✅ واسع | معظم النماذج | Store/Admin/Student | ⚠️ bootstrap ما زال نقطة أداء، والتكاملات encrypted/masked جزئيًا. |
| operations.routes.ts | ✅ admin للعمليات الحساسة | ✅ | health/ops | Admin/CI | ✅ لا يعرض أسرار، ويعطي readiness. |
| seo.routes.ts | ✅ public | ✅ | content metadata | crawlers | ⚠️ صفحات public القانونية/404 ناقصة. |

## فحص العلاقات (Flows)
| الـ Flow | الخطوة 1 | الخطوة 2 | الخطوة 3 | النتيجة |
|---|---|---|---|---|
| Student enrolls -> content | AccessGrant/User subscription | content bootstrap | CourseOverview | ⚠️ يعمل غالبًا، لكن بيانات course القديمة `subject` vs `subjectId` سببت شكاوى ظهور. |
| Quiz -> Results -> Analysis | submit scores server-side | stores QuizResult | Results page | ❌ يعمل وظيفيًا لكنه يسرب الإجابات الصحيحة. |
| Course completion -> certificate | completion calculated | generate certificate route | CertificatePage | ✅ موجود، يحتاج تحقق رحلة كاملة لكل دور. |
| Review session -> SM-2 | due cards | answer quality | sm2 update | ✅ موجود. |
| Payment -> access grant | request approved/webhook | completeApprovedPaymentRequest | AccessGrant/User update | ✅ جيد برمجيًا. |
| Discussion -> instructor | thread/reply | repliesCount | resolve | ⚠️ وظيفي، لكن scope staff واسع وخطر. |
| Admin creates course -> student sees it | publish/show flags | bootstrap | course page | ⚠️ يحتاج BATCH دورات شامل بسبب تكرار UI وربط المادة/المهارات وظهور الدورة. |

## الأخطاء الحرجة 🔴
| # | الوصف | الملف | السطر | التأثير |
|---|---|---|---|---|
| 1 | تسريب `correctOptionIndex` و`explanation` في نتيجة الاختبار | `server/src/routes/quiz.routes.ts` | 2140-2217 | الطالب يستطيع استخراج الإجابة الصحيحة من API/الواجهة بعد التسليم، وهذا يخالف قاعدة عدم كشف الإجابات. |
| 2 | endpoint تفاصيل النتيجة يرجع result raw | `server/src/routes/quizResults.routes.ts` | 90-113 | أي مالك نتيجة يرى الإجابات الصحيحة والشروحات مخزنة داخل `questionReview`. |
| 3 | صلاحيات منتدى النقاشات واسعة للمعلم/المشرف | `server/src/routes/discussions.routes.ts` | 26-28, 181-196 | teacher/supervisor قد يصل أو يغلق نقاشات خارج نطاقه إذا عرف المعرف. |

## التحذيرات 🟡
| # | الوصف | الملف | التأثير |
|---|---|---|---|
| 1 | نصوص عربية تالفة/Mojibake في الواجهة وSEO | `App.tsx:264-285`, `App.tsx:334-335`, `pages/CourseView.tsx:74-181` | تظهر علامات استفهام/نصوص تالفة للمستخدم كما في صور المالك. |
| 2 | رسائل دفع عربية تالفة | `server/src/routes/payment.routes.ts:139-163`, `470-488`, `1364-1634` | أخطاء API ورسائل مالية غير مفهومة. |
| 3 | commit الإنتاج غير مطابق لـ GitHub main | `server/src/routes/health.routes.ts:27-38` | لا يمكن إعلان تحقق إنتاجي نهائي لأحدث حالة حتى يطابق Render آخر commit. |
| 4 | `SMOKE_ADMIN_TOKEN` غير متاح محليًا لفحوص operational وسنتري live | `.github/workflows/post-deploy-smoke.yml:14-17`, `40-52` | CI/الإثبات الحي لا يكتمل بدون secret صالح. |
| 5 | integration secrets encryption يعتمد على fallback | `server/src/utils/integrationSecretsCrypto.ts:12` | يفضل مفتاح مخصص وعدم الاعتماد على JWT_SECRET. |

## المفقود 🔵
| # | الميزة | التأثير على المستخدم |
|---|---|---|
| 1 | صفحة 404 حقيقية | المسارات الخاطئة تعرض Layout فارغ بدل رسالة مفيدة (`App.tsx:819-857`). |
| 2 | صفحات شروط الخدمة/الخصوصية/من نحن | غير مناسب لإطلاق تجاري عام. |
| 3 | دليل live كامل لكل الأدوار | لا توجد نتيجة موثقة حديثة تغطي admin/student/teacher/supervisor/parent بصريًا وعمليًا. |
| 4 | فحص integrity شامل للدورات وربط path/subject/skills | الدورة قد لا تظهر للطالب أو تظهر إعداداتها مكررة/غير مترابطة. |

## تقييم الأمان
- Auth cookie: ✅ `httpOnly=true` و`secure=true` في الإنتاج داخل `server/src/utils/authCookie.ts:8-11`.
- CSRF: ✅ `csrfGuard` مطبق على `/api` في `server/src/app.ts:85`، ويستثني GET/HEAD/OPTIONS في `server/src/middleware/csrf.ts:40-56`.
- Token JSON: ✅ محجوب في production عبر `shouldExposeTokenInAuthResponse` في `server/src/routes/auth.routes.ts:211`.
- Token fallback: ⚠️ sessionStorage/Bearer fallback لا يزال موجودًا في `services/api.ts:92-104` و`services/api.ts:186` للتوافق.
- JWT secret: ⚠️ الحد الأدنى 16 فقط في `server/src/config/env.ts:50`، والأفضل 32+.
- Quiz answer leakage: ❌ خطر حرج كما سبق.
- RBAC/scope: ⚠️ المدارس تحسنت، لكن discussions فيها bypass scope.
- Secrets: ⚠️ masking/encryption موجود، لكن يلزم إثبات migration ومفتاح مستقل.

## تقييم الأداء والتحمل
- `content/bootstrap` ما زال محور خطر أداء لأنه يجمع بيانات كثيرة حسب scope (`server/src/routes/content.routes.ts:1361-1454`).
- minimal bootstrap تحسن، لكن التعلم والدورات تحتاج Retest بعد إصلاحات الربط.
- Redis في production health الآن ready، وهذا تحسن عن الفجوة القديمة.
- MongoDB/Render free tiers ما زالت مخاطرة قبل 500+ concurrent.
- Bundle/build pass، لكن يلزم تقرير chunks مستقل في دفعة أداء لاحقة.

## تقييم CI/CD والنشر
- GitHub main الحالي: `8c1c9311322`.
- Render health يعرض commit مختلف: `5d9b337a96f9`.
- post-deploy workflow موجود ويطلب secrets مهمة، لكنه سيفشل بدون `SMOKE_ADMIN_TOKEN` أو login fallback مضبوط.
- Vercel SPA rewrite موجود في `vercel.json`، مناسب لـ BrowserRouter.

## خلاصة القرار
المشروع ليس في وضع إصلاح عشوائي؛ المطلوب بدء دفعات إغلاق إنتاجي مرتبة. أول دفعة يجب أن تكون أمنية لأنها تمنع تسريب إجابات الاختبار، ثم RBAC للنقاشات، ثم تنظيف النصوص العربية وربط الدورات.
