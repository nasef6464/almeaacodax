# قرار معماري: تطور بيانات الاختبارات والمحاولات

## الحالة المعتمدة

هذا قرار تصميم لـPhase 5، وليس migration معتمدًا للتنفيذ الآن.

- `QuizResult` هو سجل التسليم المكتمل الحالي: يحمل `attemptNumber` و`submissionKey` وsnapshot وsection results عند وجودها.
- المسار `POST /api/quizzes/:id/submit` يبني رقم المحاولة من النتائج السابقة، ويمنع تكرار نفس الرقم عبر `submissionKey` فريد؛ لذلك إعادة الإرسال المتزامنة لا تنشئ نتيجتين لنفس المحاولة.
- مسودة الطالب في `QuizPage` محلية فقط. عند تعذر التسليم تبقى للمحاولة اللاحقة، ولا تتحول إلى نتيجة رسمية.
- `LiveExamSession` سجل مراقبة حي: يبدأ/يحدث التقدم/ينهي للجمهور الإداري، ولا يخزن إجابات أو state لمحاولة أو ساعة تسليم مُلزمة.

## الفجوة التي لا يعالجها refactor الحالي

لا يمكن ضمان استكمال محاولة أو حساب الوقت من الخادم أو تطبيق سياسة section-lock بعد refresh/device change بالاعتماد على `QuizResult + LiveExamSession` الحاليين. لا يجوز تسمية ذلك “جلسة امتحان خادمية” قبل وجود كيان مستقل.

## الشكل المستهدف — مشروط بموافقة منتج

1. **AssessmentVersion**: لقطة تعريف عند النشر/التكليف، لا تعديل للسجلات التاريخية.
2. **AssessmentAssignment**: جمهور، نافذة، سياسة محاولات، وحالة تكليف؛ ليس نسخة من محتوى الاختبار.
3. **AssessmentAttempt**: طالب + version/assignment + بداية خادمية + حالة + رقم محاولة + انتهاء منطقي.
4. **AssessmentResponse**: إجابات progress قابلة للحفظ، مع section state منفصل عند المحاكي.
5. **AssessmentResult**: read model/نتيجة نهائية مرتبطة بالمحاولة، مع compatibility projection إلى `QuizResult` في مرحلة الانتقال.

## خطة انتقال إلزامية

| المرحلة | التغيير المسموح | دليل الخروج | الرجوع |
| --- | --- | --- | --- |
| Additive | models/indexes جديدة فقط بلا تغيير قراءة قديمة | server build + migration dry run على DB معزولة | إيقاف الكتابة الجديدة |
| Adapter | قراءة تعريف/نتيجة عبر adapter مع fallback للقديم | مقارنة payloads لعينة تاريخية | fallback القديم يبقى |
| Dual write | محاولات جديدة تكتب الجديد والقديم idempotently | reconciliation job وmetrics | إيقاف كتابة الجديد |
| Backfill | دفعات قابلة لإعادة التشغيل ومحدودة | counts/checksums وaudit row | watermark محفوظ، لا حذف |
| Verification | HTTP/E2E لعادي/محاكي/موجّه ونتائج تاريخية | بوابات `ASSESSMENT_TEST_ROADMAP_AR` خضراء | إبقاء dual-read |
| Cutover | قارئ جديد افتراضي feature-flagged | مراقبة واختبار rollback | إعادة flag للقديم |
| Retirement | حذف القديم بعد telemetry ومدة احتفاظ معتمدة | caller proof + product signoff | نسخة/خطة استعادة موثقة |

## قرارات مطلوبة قبل البدء

- هل استكمال المحاولة مطلوب لكل الاختبارات أم للمحاكيات/التكليفات فقط؟
- هل الوقت يبدأ عند أول فتح أم عبر موعد تكليف؟ وما سياسة انقطاع الشبكة؟
- هل تغيير تعريف اختبار منشور ينشئ version جديدًا دائمًا؟
- ما سياسة إعادة الإرسال والتصحيح اليدوي والمراجعة بعد انتهاء الوقت؟
- ما retention المطلوب للمحاولات والإجابات والـsnapshots؟

إلى أن تُعتمد هذه القرارات لا توجد هجرة schema أو backfill أو تحويل لـ`LiveExamSession` إلى مصدر حقيقة.

## قرارات المالك المفوَّضة — 2026-08-31

في هذه الدورة فُوِّض قرار المنتج للتنفيذ الآمن. تُعتمد الحدود التالية لبدء مرحلة
**Additive** فقط، ولا تعني تفويض backfill أو cutover:

- يبدأ الاستئناف الخادمي للمحاولات الجديدة المكلَّفة والمحاكيات بعد اكتمال
  `AssessmentAttempt` و`AssessmentResponse` عبر واجهات متوافقة؛ يبقى التدريب
  العادي غير المكلَّف على عقد `QuizResult` الحالي إلى أن يُسند صراحةً.
- يبدأ الوقت من أول بداية خادمية موثقة للمحاولة، وليس من تحميل الواجهة. سياسة
  انقطاع الشبكة والقفل التفصيلي لا تُنفذ قبل اختبار رحلة الاستئناف المعزولة.
- كل تعديل لتعريف منشور ينشئ `AssessmentVersion` جديدًا عند إدخاله في مسار
  الإصدار الجديد؛ لا يُعدَّل version تاريخي.
- يظل حد المحاولات من سياسة التكليف/التعريف الحالية. لا تُضاف تصحيحات يدوية أو
  مراجعة إجابات قبل الانتهاء في هذه المرحلة.
- لا يوجد حذف أو TTL لبيانات المحاولة أو الإجابة أو النتيجة الجديدة تلقائيًا.
  تُحفظ حتى يعتمد المالك سياسة retention قانونية وتشغيلية منفصلة.

بوابة الدفعة الأولى: models وفهارس additive فقط، مع عدم وجود route أو
dual-write أو قراءة إنتاجية تعتمد عليها. يجب أن يثبت dry run معزول قبل كتابة
أي بيانات جديدة.

## قرار backfill نتيجة-only — 2026-08-31

بعد إثبات أن بعض السجلات التاريخية لا تحمل إجابات أو تعريف اختبار كامل، يكون
المسموح تاريخيًا هو إنشاء `AssessmentResult` فقط مع
`dataCompleteness=result_only` و`source=legacy_backfill`. لا تنشأ
`AssessmentAttempt` أو `AssessmentResponse` أو `AssessmentVersion` تاريخية من
تخمينات. يظل `QuizResult` أصل الحقيقة وتكون الكتابة dry-run افتراضيًا ومحدودة
بالـcursor؛ لا يشمل القرار أي cutover أو حذف للـlegacy.

## قرار cutover قارئ النتيجة المفردة — 2026-08-31

يُسمح بتحكم additive قابل للرجوع لكل اختبار في
`assessmentData.resultReaderMode`: القيمة الافتراضية `legacy`، والقيمة
`compatibility` تقرأ فقط الإسقاط المتوافق للـ`AssessmentResult` المرتبط عند
وجوده. عدم وجود الإسقاط أو إرجاع العلم إلى `legacy` يعيد نفس قراءة
`QuizResult` القديمة فورًا. لا يفعّل هذا القرار أي اختبار إنتاجي، ولا يغير
scoring أو RBAC أو عقد HTTP. يحافظ PATCH
الجزئي على `mirrorSubmissions` ولا يبدله ضمنًا.

## سجل حدود قارئ النتائج المباشر — 2026-08-31

يغطي القارئ المتوافق القابل للرجوع أسطح payload النتيجة المباشر التالية فقط:
`/quiz-results/:id`، `/quiz-results/my`، `/admin/quiz-results`،
`/quizzes/results`، `/quizzes/results/scoped`، و`/quizzes/results/latest`.
القوائم تستخدم lookupين محدودين بالصفحة (modes ثم projections) ولا تعمل
استعلامًا لكل صف؛ `latest` نتيجة مفردة فيجوز له lookup واحد بعد اختيار سجل
الـlegacy. في كل الحالات يسبق authorization/scoping الـlegacy أي projection
متوافق، و`legacy` هو الافتراضي والرجوع الفوري.

لا تدخل `/analytics/overview`، section analytics، parent/school/leaderboard،
weekly notifications، سياق AI، أو operational counters في هذا القارئ. هذه
قارئات aggregates/metrics تعتمد على حقول تاريخية مثل `skillsAnalysis` ووقت
المحاولة وتجميعات score، ولا يكفي `compatibilityProjection` result-only
لجعلها authoritative. تبقى على `QuizResult` إلى أن يثبت Batch منفصل read model
مقاس مع parity وRBAC/rollback خاصين به؛ هذا ليس استثناءً مؤقتًا ولا تصريحًا
بالـcutover أو backfill جديد.
