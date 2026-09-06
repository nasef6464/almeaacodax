# ALMEAA — Interactive Video Must-Pass Integrity Handoff

## GOAL

إغلاق فجوة Student Video Player واحدة بعد دمج PR #51: ضمان أن السؤال التفاعلي الموسوم `mustPass` لا يُعتبر مجابًا بعد إجابة خاطئة، بحيث تبقى دلالة "إجابة مطلوبة للمتابعة" حقيقية في مساري YouTube والملف المباشر.

## STATUS

**CLOSED / VERIFIED — bounded product-integrity batch**

## PROVEN GAP

قبل هذه الدفعة كان كلا مساري المشغل يضيفان `activeQuestion.id` إلى `answeredQuestionIds` قبل فحص صحة الإجابة. عند إجابة خاطئة على سؤال `mustPass` — حتى مع `actionOnFail=rewatch` — كان السؤال يُحفظ كمجاب، ثم لا يعود `getDueVideoQuestion` يقدمه مرة أخرى. هذا كان يكسر عقد `mustPass` الذي تعرضه أداة التأليف كإجابة مطلوبة للمتابعة.

## DELIVERED

- الإجابة الصحيحة ما زالت تسجل السؤال كمجاب.
- السؤال الاختياري `mustPass=false` يحتفظ بسلوكه الحالي عند الإجابة/المتابعة.
- الإجابة الخاطئة على `mustPass=true` لا تضيف السؤال إلى `answeredQuestionIds`، لذلك يبقى قابلًا لإعادة التقديم حسب موضع الفيديو وسياسة `actionOnFail` الحالية.
- نفس القاعدة مطبقة في مسار YouTube ومسار الفيديو المباشر.
- عقد `smoke:video-questions` يثبت وجود الشرط في المسارين ويمنع عودة الإضافة غير المشروطة القديمة.

## VERIFIED

Final runtime/test verification head:

`de0da4a84da1c0c48531aff2ab512fcbeaf09581`

Runtime source change commit:

`5b42a6f2958ccca8656adba18ce42530d88f345d`

الـcommit التالي `de0da4a...` يضيف عقد الاختبار فقط؛ لا يغير سلوك runtime بعد `5b42a6f...`.

CI على رأس التحقق النهائي:

- Platform V3 Phase + Handover Gate `34033252243` — **SUCCESS**
- Platform V3 Recovery Gate `34033252266` — **SUCCESS**
- Refactor V2 Safety Gate `34033252248` — **SUCCESS**
  - frontend typecheck — SUCCESS
  - API typecheck — SUCCESS
  - frontend production build — SUCCESS
  - API production build — SUCCESS
  - immutable architecture — SUCCESS
  - progressive module boundary — SUCCESS
  - security/contracts — SUCCESS
- Platform V3 Public UI Gate `34033252252` — **SUCCESS**
- Backend Integration / Deep Pre-Merge / Live Role / Assessment — **SKIPPED** وفق شروط المسار الحالية؛ هذه الدفعة لا تغيّر backend runtime أو RBAC أو assessment ownership.

Vercel:

- runtime commit `5b42a6f2958ccca8656adba18ce42530d88f345d` → deployment `dpl_E4mhsRZrW3t8Lkis1dse44KSEkS5` — **READY**.
- final runtime/test head `de0da4a84da1c0c48531aff2ab512fcbeaf09581` → deployment `dpl_G2jTgK3tNXJqWFAKP8zaiGqCQXM1` — **READY**.

## BOUNDARIES PRESERVED

- لا تغيير في public route URL/method.
- لا تغيير في auth/RBAC.
- لا تغيير في Assessment scoring أو Question Bank ownership.
- لا تغيير في payments.
- لا persisted schema/data ownership أو query responsibility جديدة.
- لا production-data migration/cutover.
- لا global `tenantId` أو SaaS multi-tenancy.
- لا microservices أو buyer-specific core forks.
- لا UI redesign.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, و`DATA_ACCESS_MAP.md` تبقى دون تغيير لأن ملكية الوحدات، مكان المسؤولية، وdata-access/query ownership لم تتحرك.

## DEFERRED

- grade-bearing interactive-video attempts.
- advanced video analytics.
- AI recommendations.
- player redesign/rewrite.

## COMMITS

- `5b42a6f2958ccca8656adba18ce42530d88f345d` — runtime fix.
- `de0da4a84da1c0c48531aff2ab512fcbeaf09581` — focused contract guard.

## NEXT GOAL

بعد دمج PR #52 والتحقق من production deployment/health عند توفره، يبدأ أي continuation جديد من أحدث `main` وعلى branch مركز جديد. لا تُفتح Gates 1–6 مجددًا دون defect مثبت أو authorization صريح، ولا تبدأ فجوة Product ثانية في نفس الدفعة.
