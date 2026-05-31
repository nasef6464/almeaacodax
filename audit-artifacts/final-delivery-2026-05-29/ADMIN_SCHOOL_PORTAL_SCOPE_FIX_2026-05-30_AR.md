# إصلاح نطاق بوابة المدارس للمدير - 2026-05-30

## السبب
- أثناء فحص لوحة الإدارة الحي ظهر أن تبويب بوابة المدارس يفتح، لكن الفحص الداخلي صنفه REVIEW لأن حساب المدير لا يملك نطاق مدرسة محدد.
- الجذر: المكون كان يبني بيانات المدارس والفصول والطلاب من نطاق المستخدم الحالي فقط. هذا مناسب للمشرف/المدرسة، لكنه غير مناسب للمدير العام.

## الإصلاح
- عند دخول مستخدم بدور المدير، تعرض بوابة المدارس كل المدارس والفصول والطلاب ونتائجهم والباقات والأكواد والدورات والاختبارات المرتبطة.
- بقي السلوك المقيد كما هو للمستخدمين غير المديرين.

## التحقق المحلي قبل النشر
- PASS: فحص أنواع الواجهة.
- PASS: بناء الواجهة.
- PASS: فحص أنواع الخادم.
- PASS: بناء الخادم.

## التحقق المطلوب بعد النشر
- PASS: الإنتاج يخدم commit `f6bd12df`.
- PASS: فحص لوحة الإدارة الحي بعد النشر: 22 تبويب PASS، 0 FAIL.
- PASS: فحص المجموعات/بوابة المدارس/المستخدمين الداخلي بعد النشر: 10 PASS، 0 REVIEW، 0 FAIL.
- PASS: فحص مساعد الطالب الحي من جلسة متصفح حقيقية: تسجيل دخول طالب 200، `/ai/chat` 200، المزود `gemini`، الموديل `gemini-2.5-flash`، و `usedFallback=false`.
- PASS: `smoke:ai-config-bridge`.
- PASS: `smoke:health-readiness`.
- PASS: `smoke:payment-package`.
- PASS: `smoke:batch136-admin-users-schools-parent-payment`.
- PASS: `smoke:student-journey` - 7/7 لمسار تعلم الطالب.
- PASS: `smoke:real-usage-readiness` - 8/8 لجاهزية الاستخدام الحقيقي.
- PASS: `smoke:production-audit` - 9/9 بعد تحديث العقد ليقبل إزالة Firebase legacy بالكامل.
- PASS: `smoke:runtime-source` - 5/5 لتأكيد مصدر التشغيل الحقيقي.
- PASS: `smoke:operational` على الخادم الحي - 71/71 لأدوار المدير والمعلم والمشرف والطالب وولي الأمر.
- PASS: `smoke:auth-frontend` - 6/6.
- PASS: `smoke:auth-account` - 5/5.
- PASS: `smoke:membership-pricing` - 4/4 بعد تحديث العقد إلى تبويب العضويات المستقل.
- PASS: `smoke:mock-exams` - 9/9.
- PASS: `smoke:my-quizzes` - 8/8 بعد تحديث العقد لمسار المستخدم المحمي وملف CSS الحالي.
- PASS: `smoke:reports-role` - 11/11.
- PASS: `smoke:school-management` - 9/9.
- PASS: `smoke:supervisor-dashboard` - 3/3 بعد تحديث العقد إلى أزرار المشرف الحالية.
- PASS: `smoke:payment-providers` - 7/7.
- PASS: `smoke:notifications` - 6/6.
- PASS: `smoke:monitoring` - 6/6.
- PASS: `smoke:seo`.
- PASS: `smoke:api-security` - 6/6.
- PASS: `smoke:csrf` - 4/4.
- PASS: `smoke:quiz-integrity-guard` - 4/4.
- PASS: `smoke:quiz-answer-exposure` - 5/5.
- PASS: `smoke:rbac-school-scope` - 4/4.
- PASS: `smoke:integrations-runtime` - 10/10.
- PASS: إعادة `typecheck` و `build` للواجهة والخادم بعد تحديث عقود الفحص.
- PASS: فحص بصري مركز للضيف والطالب على الإنتاج - 13/13 صفحة، 0 REVIEW، 0 أخطاء Console، 0 أخطاء Network 5xx.
- PASS: فحص بصري مركز لولي الأمر والمعلم والمشرف على الإنتاج - 9/9 صفحات، 0 REVIEW، 0 أخطاء Console، 0 أخطاء Network 5xx.
- PASS: إعادة فحص لوحة المدير النهائية بعد إضافة العضويات لمصفوفة الفحص - 23/23 تبويب PASS، 0 FAIL.
- PASS: تبويب `memberships` داخل لوحة المدير مفحوص بصريا ووظيفيا: 40 عنصر تفاعلي ظاهر، 0 disabled، 0 Console errors، 0 Network 5xx.
- PASS: فحص وظائف الإدارة الآمنة للتبويبات الحرجة - 12/12 PASS، ويشمل المستخدمين، المجموعات، بوابة المدارس، العضويات، المالية، التكاملات، مساعد الإدارة، الصفحة الرئيسية، الإعلانات، الخطوط، النسخ الاحتياطي، والمراقبة.
- PASS: عقود الإدارة الوظيفية المتاحة: `smoke:admin-tabs`, `smoke:admin-memberships-ai-closure`, `smoke:ai-admin-closure`, `smoke:admin-school-command`, `smoke:batch100i-admin-dashboard-functional-qa`, `smoke:batch100n-admin-tab-e2e`, `smoke:batch100o-admin-crud-course-linkage`, `smoke:batch100q-operational-admin-runtime`.
- PASS: عقود إدارة الشكل والمحتوى: `smoke:announcement-ads`, `smoke:platform-fonts`, `smoke:batch100j-homepage-branding-course-icons`, `smoke:batch100k-homepage-admin-sweep`, `smoke:batch100l-homepage-color-picker`, `smoke:batch100m-homepage-live-preview`.

## أدلة الفحص
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-critical-live-postfix/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-groups-schools-critical-postfix-live/`
- `audit-artifacts/final-delivery-2026-05-29/live-student-ai-chat-browser-post-schoolportal-fix-2026-05-30.json`
- `audit-artifacts/final-delivery-2026-05-29/in-app-browser-admin-groups-final-2026-05-30.png`
- `audit-artifacts/ui-audit-exhaustive/2026-05-30-focused-public-student-visual/`
- `audit-artifacts/ui-audit-exhaustive/2026-05-30-focused-staff-parent-visual/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-critical-final-sweep-with-memberships/`
- `audit-artifacts/admin-live-handoff/2026-05-30-admin-safe-actions-final/`

## فحص الحفظ الحي الآمن - 2026-05-30
- PASS: تم اختبار حفظ فعلي آمن على الإنتاج بدون تغيير محتوى المستخدم: قراءة الإعداد الحالي، حفظ نفس القيمة، ثم قراءة ثانية ومقارنة الحالة المستقرة.
- PASS: `homepage-settings` - GET 200، SAVE 200، RELOAD 200، والحالة المستقرة محفوظة.
- PASS: `platform-font-settings` - GET 200، SAVE 200، RELOAD 200، والحالة المستقرة محفوظة.
- PASS: `platform-integrations` - GET 200، SAVE 200، RELOAD 200، والحالة المستقرة محفوظة، بدون تسجيل أي أسرار أو مفاتيح في التقرير.
- PASS: `payment-settings` - GET 200، SAVE 200، RELOAD 200، والحالة المستقرة محفوظة.
- الدليل: `audit-artifacts/admin-live-handoff/2026-05-30-admin-live-idempotent-save-final/`.

## فحص علاقات الإدارة وبوابة المدارس - 2026-05-30
- PASS: فحص علاقات حي عبر API للمدير - 12/12 PASS، 0 REVIEW، 0 FAIL.
- PASS: المستخدمون ظاهرون للإدارة: 42 مستخدمًا، موزعون على طالب/مشرف/معلم/ولي أمر/مدير.
- PASS: المدارس والفصول والربط: 18 مدرسة، 6 فصول، و5 فصول مرتبطة مباشرة بمدارس.
- PASS: الطلاب والربط: 25 طالبًا، منهم 6 مرتبطون بمدرسة و6 مرتبطون بفصل.
- PASS: العضويات/الباقات والمالية: 13 باقة/عضوية، عضوية عامة واحدة، 17 طلب دفع، وبيانات الاشتراكات موجودة على المستخدمين.
- PASS: تم إصلاح سماح المدير بفتح تبويب `school-portal` من أزرار الإدارة الداخلية بدل الرجوع إلى النظرة العامة.
- PASS: `smoke:admin-tabs` يغطي الآن أن `school-portal` مسموح للمدير والمشرف ومربوط في `renderContent`.
- PASS: فحص ما بعد النشر أكد أن الإنتاج يخدم commit `01aa64f6` وأن تبويب `school-portal` يفتح للمدير مباشرة: 50 عنصر تحكم ظاهر، 4 حقول إدخال، 0 Console errors، 0 Network 5xx.
- الأدلة:
  - `audit-artifacts/admin-live-handoff/2026-05-30-admin-relations-api-final/`
  - `audit-artifacts/admin-live-handoff/2026-05-30-admin-school-portal-postdeploy-final/`

## فحص أفعال المجموعات والمدارس من الداخل - 2026-05-31
- PASS: فحص حي آمن لتبويب `groups` على الإنتاج - 6/6 PASS، 0 REVIEW، 0 FAIL.
- PASS: فتح تبويب المجموعات والمدارس كمدير يعرض شاشة تشغيلية: 146 عنصر تحكم، حقل بحث واحد، و113 زر/أمر داخل المحتوى.
- PASS: تم اختبار حقل البحث داخل التبويب دون تغيير بيانات.
- PASS: تم فتح أول مدرسة من زر الإدارة الداخلي بنجاح، وظهرت شاشة إدارة المدرسة: 63 عنصر تحكم، 9 حقول إدخال، و22 زر/أمر داخل المحتوى.
- PASS: شاشة إدارة المدرسة الداخلية لا تسجل أخطاء Console ولا Network 5xx.
- ملاحظة: لم يتم تنفيذ حذف أو اعتماد أو تعديل بيانات إنتاجية في هذا الفحص؛ الاختبار بصري/وظيفي آمن.
- الدليل: `audit-artifacts/admin-live-handoff/2026-05-31-admin-groups-school-actions-final/`.

## فحص ربط باقات المدارس والمجموعات - 2026-05-31
- PASS: تم تشغيل فحص حي آمن على الإنتاج يثبت أن اختيار دورة داخل باقة مدرسة لا يبقى واجهة فقط، بل يصل إلى الخادم ويرجع بعد قراءة البيانات من جديد.
- PASS: تم اختبار باقة مدرسة موجودة بطريقة مؤقتة: إضافة دورة إلى `courseIds` للباقة، والتأكد أن الباقة نفسها والمدرسة المرتبطة يعكسان التغيير بعد إعادة تحميل بيانات التشغيل.
- PASS: تم اختبار فلتر أكواد التفعيل حسب `packageId`، وتقرير المدرسة `/content/schools/:id/report` أعاد مؤشرات الباقات والأكواد بنجاح.
- PASS: تم اختبار مجموعة/فصل موجود: إضافة دورة مؤقتة إلى `courseIds` للمجموعة، ثم قراءة البيانات من الخادم والتأكد أن الربط ظهر فعليا.
- PASS: تمت إعادة كل التغييرات المؤقتة إلى حالتها الأصلية: الباقة، المدرسة، والمجموعة.
- النتيجة: 7/7 PASS، 0 FAIL، 0 BLOCKED.
- الدليل: `audit-artifacts/admin-live-handoff/2026-05-31-admin-school-package-linkage-final/`.
- PASS بعد النشر: الإنتاج يخدم commit `4791eb2a`، وتمت إعادة نفس فحص ربط باقات المدارس والمجموعات بعد النشر بنتيجة 7/7 PASS، 0 FAIL، 0 BLOCKED.
- دليل ما بعد النشر: `audit-artifacts/admin-live-handoff/2026-05-31-admin-school-package-linkage-postdeploy/`.

## فحص فجوات الوضوح داخل لوحة المدير - 2026-05-31
- PASS: تم تشغيل فحص بصري شامل على الإنتاج الحالي لكل تبويبات لوحة المدير بعد آخر نشر: 23/23 تبويب PASS، 0 FAIL، 0 Console errors، 0 Network 5xx.
- PASS: تم تشغيل فحص فجوات دقيق للأزرار غير المسماة والعناصر المعطلة بلا سبب ونصوص "قريبا/تحت التطوير".
- تم إصلاح فجوة حقيقية في الوضوح: أزرار الأيقونات فقط داخل `paths` و`library` و`skills` أصبحت تحمل `aria-label` و`title` واضحين مثل تعديل/حذف/فتح/طي، بدون تغيير وظيفة البيانات.
- PASS بعد الإصلاح والنشر: الإنتاج يخدم commit `4ed7c188`، و`smoke:frontend:strict` نجح 29/29.
- PASS بعد الإصلاح: تبويب `paths` انتقل من REVIEW إلى PASS، وتبويب `library` انتقل من REVIEW إلى PASS، وتبويب `skills` اختفت منه 12 فجوة أزرار غير مسماة.
- المتبقي غير حاجز للتسليم: بعض حقول النماذج والـ checkboxes لها عناوين مرئية لكن تحتاج ربط label تقني أدق، وبعض الفلاتر المعطلة تظهر كذلك لأنها تعتمد على اختيار سابق. لا يوجد معها فشل حفظ أو خطأ شبكة أو شاشة مكسورة.
- أدلة الفحص:
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-tabs-postdeploy-final-894f85cc/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-postdeploy-final/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-postdeploy-after-clarity-fix/`
- PASS تحسين حقول النماذج بعد النشر: تم نشر commit `b508613a`، ونجح `smoke:frontend:strict` بنتيجة 29/29، والفحص يؤكد أن الإنتاج يخدم نفس commit.
- تم تحسين وضوح حقول النماذج والاختيارات داخل `homepage` و`announcement-ads` و`platform-integrations` و`platform-fonts` و`backups` و`notifications` و`mock-exams` بإضافة أسماء/تلميحات تشغيلية بدون تغيير هدف أو منطق المنصة.
- نتيجة فحص الفجوات بعد الإصلاح الثاني: 16/23 تبويب PASS و7 REVIEW، بعد أن كانت 11/23 PASS و12 REVIEW في الجولة السابقة.
- ما زال المتبقي غير حاجز للتسليم لكنه يحتاج تمريرة UX لاحقة: عناصر معطلة لأنها تعتمد على اختيار سابق في `lessons` و`quizzes` و`questions` و`skills` و`users`، و12 حقل داخل مكونات الصفحة الرئيسية، و5 حقول متبقية في التكاملات.
- دليل الإصلاح الثاني: `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-postdeploy-after-form-label-fix/`.
- PASS الإغلاق النهائي لفجوات الوضوح: تم نشر commit `2511266b` وتشغيل `smoke:frontend:strict` على الإنتاج بنتيجة 29/29، ثم تشغيل فحص فجوات لوحة الإدارة على الموقع الحي بنتيجة 23/23 PASS و0 REVIEW.
- ما تم إغلاقه في الجولة النهائية: أسباب تعطيل فلاتر المواد/المهارات التابعة لاختيار سابق، تلميحات أزرار الصفحات المعطلة في المستخدمين وبنك الأسئلة، تسميات اختيارات الصفحة الرئيسية، وتسميات أزرار الحذف الأيقونية في التكاملات.
- دليل الإغلاق النهائي: `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-postdeploy-final-clarity-closed/`.

## فحص حي للمساعد الذكي والتكاملات - 2026-05-31
- PASS: تم إضافة فاحص حي مستقل `scripts/live-ai-runtime-audit.mjs` يقرأ حالة `/ai/status` و`/ai/readiness`، يختبر مزود الإدارة الفعلي، ثم يرسل رسالة طالب عبر `/ai/chat` بدون حفظ أو طباعة أي مفاتيح.
- PASS: الفحص الحي النهائي أعطى 6/6 PASS و0 REVIEW.
- PASS: الإنتاج يقرأ ترتيب المزود من الإدارة: `providerOrderSource=admin`، والمزود الفعلي `gemini`، والموديل `gemini-2.5-flash`.
- PASS: جاهزية AI الحالية 100/100، ولا توجد محادثات طالب fallback في آخر 24 ساعة، ولا أخطاء AI في آخر 24 ساعة.
- PASS: اختبار مزود Gemini من الإدارة نجح، ورسالة الطالب رجعت من `gemini` مع `usedFallback=false`.
- ملاحظة تشغيلية: يوجد سجل قديم كبير لمحادثات fallback قبل الإصلاحات، لكنه ليس حالة الإنتاج الحالية؛ آخر فحص حي سجل محادثة طالب جديدة ناجحة على Gemini.
- دليل الفحص: `audit-artifacts/admin-live-handoff/2026-05-31-live-ai-runtime-final-check-3/`.

## تدقيق التبعيات قبل التسليم - 2026-05-31
- PASS: تم تشغيل `npm --prefix server audit fix` للخادم، وتحديث `express/body-parser/qs` داخل `server/package-lock.json`.
- PASS: `npm --prefix server audit --json` أصبح 0 ثغرات، و`npm --prefix server run check` و`npm --prefix server run build` نجحا.
- PASS: تم تقليل تحذيرات الواجهة من 3 إلى 1: تثبيت `react-quill-new@3.7.0` مع override آمن لـ `quill@2.0.2` أزال تحذير Quill منخفض الخطورة.
- PASS: بعد تعديل محرر النص الغني نجحت `npm run typecheck` و`npm run build` و`smoke:admin-tabs` و`smoke:admin-memberships-ai-closure` و`smoke:ai-config-bridge`.
- المتبقي: تحذير `xlsx` عالي الخطورة لا يملك fix متاحا في قناة npm الحالية؛ آخر إصدار منشور هو `0.18.5` نفسه. المخاطر العملية مخففة حاليا عبر التحميل الكسول وطبقة `utils/xlsxLoader.ts` التي تعطل الصيغ/VBA وتزيل مفاتيح prototype pollution من بيانات الاستيراد.
- قرار التسليم: لا يتم استبدال `xlsx` بمكتبة مختلفة في نفس دفعة التسليم دون جولة Regression مخصصة للاستيراد/التصدير؛ يسجل كبند متابعة أمني بعد التسليم وليس كعطل في لوحة الإدارة.
- PASS بعد النشر: الإنتاج يخدم commit `38b5a176`، و`smoke:frontend:strict` نجح 29/29.
- PASS بعد تعديل التبعيات: فحص فجوات لوحة الإدارة الحي أعاد 23/23 PASS و0 REVIEW.
- PASS بعد تعديل التبعيات: فحص AI الحي أعاد 6/6 PASS و0 REVIEW، ومحادثة الطالب استخدمت `gemini-2.5-flash` مع `usedFallback=false`.
- أدلة ما بعد التبعيات:
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-postdeploy-after-dependency-fix/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-live-ai-runtime-postdependency/`

## فحص Excel والتصدير العملي على الإنتاج - 2026-05-31
- PASS: تم إضافة فاحص حي مستقل `scripts/admin-xlsx-export-live-audit.mjs` لتجربة تنزيل ملفات Excel/القوالب من لوحة الإدارة على الموقع المنشور.
- PASS: الفحص العملي أعاد 15/15 PASS و0 FAIL و0 Console errors و0 Network failures.
- PASS: تم تنزيل الملفات التالية فعليا من الإنتاج: تقرير المستخدمين، تقرير جاهزية المدارس/المجموعات، قالب استيراد الدروس، تصدير الدروس، تصدير الأسئلة، قالب أسئلة Excel، تصدير المكتبة، وتصدير جاهزية الاختبارات.
- PASS: الفحص يدعم قرار إبقاء `xlsx` مؤقتا مع طبقة التخفيف الحالية؛ وظائف التصدير والقوالب الأساسية تعمل بعد آخر نشر، والتحذير الأمني المتبقي لا يظهر كعطل وظيفي في لوحة الإدارة.
- PASS: فحص ربط باقات المدارس والمجموعات بعد آخر نشر أعاد 7/7 PASS، ويثبت أن اختيار الدورة داخل باقة مدرسة أو مجموعة يصل للخادم ويرجع بعد القراءة، ثم تتم إعادة أي تعديل مؤقت لحالته الأصلية.
- الأدلة:
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-xlsx-export-postdeploy-v3/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-school-package-linkage-postdeploy-xlsx/`
- PASS بعد النشر: الإنتاج يخدم commit `fdd2c2d5`، و`smoke:frontend:strict` نجح 29/29، ثم تمت إعادة فحص Excel الحي بنتيجة 15/15 PASS وإعادة فحص ربط باقات المدارس والمجموعات بنتيجة 7/7 PASS.
- أدلة ما بعد النشر:
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-xlsx-export-postdeploy-fdd2c2d5/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-school-package-linkage-postdeploy-fdd2c2d5/`

## فحص إغلاق لوحة الإدارة والمساعد بعد آخر رفع - 2026-05-31
- PASS: الإنتاج يخدم commit `5dffc7e5`، و`smoke:frontend:strict` نجح 29/29 بعد النشر.
- PASS: تم فتح وتصوير 23 تبويبا في لوحة الإدارة على الإنتاج: 23/23 PASS و0 FAIL، بدون أخطاء Console أو Network 5xx.
- PASS: فحص فجوات الوضوح داخل لوحة الإدارة أعاد 23/23 PASS و0 REVIEW؛ لا توجد أزرار مرئية بلا اسم، ولا عناصر معطلة بلا سبب تشغيلي، ولا نصوص "قريبا/تحت التطوير" في التبويبات المفحوصة.
- PASS: تبويبات العضويات، المالية، المدارس/المجموعات، بوابة المدارس، التكاملات، ومساعد الإدارة ظهرت ضمن الفحص النهائي وعملت كواجهات إدارة فعلية وليست صفحات فارغة.
- PASS: فحص AI النهائي أعاد 6/6 PASS و0 REVIEW: المزود `gemini`، الموديل `gemini-2.5-flash`، مصدر الترتيب `admin`، readiness = 100، ومحادثة الطالب رجعت من Gemini مع `usedFallback=false`.
- أدلة الإغلاق بعد آخر رفع:
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-tabs-final-after-5dffc7e5/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-admin-ui-gap-final-after-5dffc7e5/`
  - `audit-artifacts/admin-live-handoff/2026-05-31-live-ai-runtime-final-after-5dffc7e5/`

## فحص أدوار المستخدمين خارج الإدارة - 2026-05-31
- PASS: تم إضافة فاحص حي مستقل `scripts/live-role-pages-audit.mjs` لفتح صفحات الأدوار الأساسية على الإنتاج بدون ضغط عشوائي على الأزرار.
- PASS: فحص الأدوار أعاد 20/20 PASS و0 FAIL و0 BLOCKED.
- PASS: تم فحص الزائر على الصفحة الرئيسية والعضويات والمدونة، مع التأكد أن `/reports` و`/my-requests` محميتان وتفتحان تسجيل الدخول بدلا من كشف بيانات.
- PASS: تم فحص الطالب على `/dashboard` و`/my-quizzes` و`/reports` و`/plan` و`/profile` و`/pricing` بدون أخطاء Console أو Network 4xx/5xx.
- PASS: تم فحص ولي الأمر على `/parent-dashboard` و`/reports` و`/profile`.
- PASS: تم فحص المعلم والمشرف على `/admin-dashboard` و`/reports` و`/profile`.
- PASS: `npm run smoke:payment-package` نجح 8/8، ويغطي العضويات العامة، طلبات الدفع، الخصومات، الاعتماد اليدوي، والربط مع الباقات.
- PASS: `npm run smoke:reports-role` نجح 11/11، ويغطي تقارير الطالب وولي الأمر والمعلم/المشرف مع نطاق الصلاحيات والتصدير.
- الدليل: `audit-artifacts/ui-audit-exhaustive/2026-05-31-role-pages-live-after-9641982a-v4/`.

## فحص رحلة الطالب التعليمية العميقة وربط الباقات - 2026-05-31
- PASS: `npm run smoke:student-learning-journey` نجح 7/7، ويؤكد أن مسار القدرات/الكمي يعرض المهارات، الدروس، الاختبار التدريبي، ملفات الدعم، وروابط الرجوع داخل نفس الموضوع.
- PASS: تم إضافة فاحص بصري حي `scripts/live-student-learning-deep-audit.mjs` يفتح حساب طالب على الإنتاج، يلتقط صورا للوحة الطالب، خريطة المهارات، مشغل الدورة، الاختبار، محاولاتي، التقارير، والخطة الدراسية.
- PASS جزئي قبل النشر: الفحص البصري الحي أعاد 9/10 PASS بعد ضبط جلسة الطالب وCSRF في الفاحص.
- FAIL حقيقي قبل النشر: صفحة مشغل الدورة تعمل بصريا، لكن طلب `سؤال وجواب` داخل الدورة يرجع 403 لأن backend كان يعتمد على `enrolledCourses` فقط ولا يعترف بصلاحيات الباقات/الأكواد/العضوية المسجلة في `AccessGrant`.
- تم الإصلاح: مسار نقاشات الدورة في الخادم أصبح يعترف بالوصول المباشر للدورة وبصلاحيات الباقات حسب `courseIds` أو `pathIds/subjectIds/contentTypes` النشطة، مع احترام انتهاء الصلاحية والحالة `active`.
- PASS تحقق قبل الرفع: `npm --prefix server run check`، `npm --prefix server run build`، `npm run typecheck`، `npm run build`، `npm run smoke:my-quizzes`، و`npm run smoke:student-learning-journey`.
- دليل ما قبل النشر: `audit-artifacts/ui-audit-exhaustive/2026-05-31-student-learning-deep-after-69c5259d-v2-predeploy/`.
- تحديث بعد إعادة التشخيص: الدورة المفحوصة منشورة ومعتمدة وسعرها 0؛ لذلك تم توسيع صلاحية `سؤال وجواب` للدورات المجانية المنشورة للطلاب المسجلين، مع بقاء الدورات المدفوعة مرتبطة بـ `enrolledCourses` أو `AccessGrant`.
- PASS بعد النشر النهائي: الإنتاج يخدم commit `12d26857` عبر `smoke:frontend:strict` بنتيجة 29/29، ثم فحص رحلة الطالب البصري الحي أعاد 10/10 PASS و0 FAIL و0 Console errors و0 Network 4xx/5xx.
- دليل ما بعد النشر النهائي: `audit-artifacts/ui-audit-exhaustive/2026-05-31-student-learning-deep-postdeploy-12d26857/`.
