# ALMEAA — Current Execution Status

آخر تحديث: 2026-09-27

## الحالة المختصرة

| Plan | الحالة | التالي |
|---|---|---|
| 0 — Master Control & Safe Delivery | CLOSED ✅ | ابدأ Plan 1 |
| 1 — Repository Reconciliation | CLOSED ✅ | voice gap + R2 tooling reconciled |
| 2 — Production Closure | IN PROGRESS ⚠️ | runtime/performance/network green; DR runtime staging fix in #281 |
| 3 — Speed/Bandwidth | WAITING | #268 |
| 4 — Data Model/Storage | WAITING FOR DR | بعد Plan 2 baseline |
| 5 — Residual Architecture | WAITING | auth/App/quiz/store residuals |
| 6 — Student Journey Certification | MOSTLY MERGED | regression after structural/data changes |
| 7 — AI Live Certification | PROVIDER PENDING | real quota/cost/failover proof |
| 8 — Question Bank Integrity | MNSF26 QA LOCKED ✅ (1,989/2,129) | #264 + FND26/COL2627 + MNSF26 DB pre-import |
| 9 — Market Readiness | BLOCKED | requires 1–8 exit gates |

## PLAN 0 evidence

### GitHub
Ruleset: `Protect main`
- enforcement: active.
- target: default branch/main.
- pull request required.
- force push blocked.
- deletion blocked.
- bypass list empty.
- required checks:
  1. `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
  2. `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
  3. `Cross-phase + handover regression`

### Vercel
- Preview Branch Tracking disabled for unassigned/non-main work branches.
- Production Branch remains `main`.
- verification commit: `ab30963e0fd9e45e94bed31bd24499e107e609ad`.
- deployment records for that verification window: **0**.

## PLAN 1 closure

- PR #260 gap: minimal teacher voice playback reapplied inside `ReviewSession`; STT/TTS/Smart Tutor/session isolation preserved.
- R2 V2 audit tooling: clean-reapplied as manual reachability evidence; it does not authorize image linking and #264 remains visual truth.
- Reconciliation evidence: `docs/MASTER_CONTROL/PLAN_1_RECONCILIATION_EVIDENCE_AR.md`.
- No stale branch was merged wholesale.

**NEXT:** PLAN 2 — Production Closure / Runtime / DR / Governance.

## PLAN 2 current state

- Managed Redis: **LIVE PASS** — rate-limit + queue + realtime + scheduler; `scale-ready=200`.
- Google OAuth start: **LIVE PASS** — Google redirect + canonical Render callback.
- Sentry: **LIVE PASS** — latest event `a32f9e20f795473ea79116cbbc5b8176`.
- R2: **LIVE PASS** — presign/PUT/public-GET/SHA-256 proof completed.
- DR: **IN PROGRESS — RUNTIME NETWORK FIX** — the five source values are configured. Run `36320284837` proved a GitHub-hosted runner cannot reach Atlas after allowlist hardening; PR #281 moves only `mongodump` to a Frankfurt Render staging job while GitHub keeps the independent Artifact + isolated Mongo/MinIO restore certification. No runtime success is claimed yet.
- Frankfurt Atlas recovery: **NOT A FULL RESTORE** — do not cut over.
- Performance: **CLOSED ✅** — authenticated c=10/25/50, 340 GETs, 0% errors; material latency reduction satisfies #236 alternate exit path. Frankfurt↔Singapore remains optimization debt, not a PLAN 2 blocker.
- GitHub governance: closed.
- Atlas network: **CLOSED ✅** — `0.0.0.0/0` removed; current Render Frankfurt outbound `74.220.51.0/24` + `74.220.59.0/24` passed a fresh-process Mongo reconnect.
- Evidence: `docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md`.

**PLAN 2 is not CLOSED yet. PLAN 3 must wait.**

## Open operational/domain issues

- #234 runtime integrations — CLOSED ✅.
- #235 disaster recovery.
- #236 topology/capacity — CLOSED ✅.
- #237 governance/network — CLOSED ✅.
- #264 question visual integrity.
- #268 residual performance/runtime footprint.

## Baseline at PLAN 0 creation

`main@e60a8f563dd406098378df70857423455739ef7a`

Git HEAD always overrides this historical baseline.

## Owner-directed smart teacher practice — 2026-10-08

- PR #459 / branch `codex/smart-teacher-live-board`: optional practice checkpoint, two progressive local hints, contextual review of a student attempt and return to the saved board.
- Status: PARTIAL, review implementation; production AI/audio quality remains unproven. Exact code/CI evidence is on PR #459 and `docs/audits/INTERACTIVE_TEACHING_BOARD_V1_2026-10-08.md`.
- No changes to grades, mastery, auth, persisted data, provider budgets or production deployment. This owner-directed lane does not close PLAN 2 or start PLAN 3.

## BIO26 operational lane — CLOSED ✅ — 2026-10-07

- Scope: الأحياء فقط، batch `TAH-BIO-BIO26-FULL-V1`.
- Canonical production bank: **2,832/2,832 approved**; aliases excluded: **3/3**.
- Taxonomy coverage: **29 main / 98 subskills**.
- Package: `BIO26_FINAL_ASSETS_V3_READY_2832.zip`, bytes **30,690,582**, SHA-256 `e2063da82250395c8e7f9c50a6cbba34269d9c6683c7db91a0ea9a92a494fa8f`.
- R2 authenticated verification: **PASS 2,832/2,832** (`BIO26_R2_VERIFIED_PASS`).
- Dry Run: **PASS 2,832/2,832**, live image samples **30**.
- Canary: **PASS 5/5 drafts**.
- Full Draft Import: **PASS 2,832/2,832**, live image samples **30**.
- Integrity audit: **PASS** — 2,832 unique codes/sourceItemIds/image hashes, 29/98 coverage, **0** scope/taxonomy/content/identity errors, **0** linked quizzes.
- Provenance persistence defect discovered pre-approval and fixed in PR **#433**; targeted draft-only backfill restored `aiContext.optionTextsSource=SOURCE_PDF` + `optionTextsVerified=true` for **2,832/2,832**.
- PR #433 merged as `7b07579b4aa68c46562ac451711328a06ab055ee`; exact-head gates PASS including BIO26 closure contract.
- Live E2E before approval: learner hidden **PASS**, live image samples **30**.
- Approval: **PASS 2,832/2,832** by dedicated atomic BIO26 closure gate.
- Live E2E after approval: learner-visible **PASS**, answer/provenance leak **0**, live image samples **30**.
- Post-Approval Audit: **PASS 2,832**, 29/98, linked quizzes **0**.
- Learning structure subsequently merged:
  - PR #437: **29 main topics / 98 subtopics**, subskill foundation drills, main-skill training, first five free, and **71** standard all-bank tests.
  - PR #439: **49** main-skill training drills after split policy for high-volume skills.
  - 71 standard tests consume all **2,832** approved questions exactly once (**63×40 + 8×39 = 2,832**).
- Runtime restart audit exposed two bootstrap defects after closure: wrong learning batch id + non-constructive five-test coverage allocation.
- PR #445 fixed both defects and merged as `54f20dfa7524a212d18bc7bf316fded4b0bb82e6`; exact-head Safety/Backend/Deep E2E all PASS.
- Production restart proof after #445: `BIO26_STANDARD_TESTS_NOOP tests=71 uniqueQuestionRefs=2832 reserveQuestions=0 freeTests=5` and `BIO26_LEARNING_STRUCTURE_PASS`.
- A later unrelated production restart also returned `BIO26_STANDARD_TESTS_NOOP` + `BIO26_LEARNING_STRUCTURE_NOOP`, proving idempotent stability.
- Atlas runtime audit: **71/71 approved+published+visible**, **63×40 + 8×39**, **2,832 unique refs / 0 duplicates**, tests 01–05 free, tests 06–71 package, every 5-test tranche 1–14 covers **29/29** main skills.
- Learning runtime audit: **147/147 approved+published** = **98 foundation + 49 main-skill training**; 84 foundation drills have 10 source questions and 14 use all unique source questions available (<10) rather than inventing unsupported items.
- BIO26 closure-certified restart-stable application SHA: `54f20dfa7524a212d18bc7bf316fded4b0bb82e6`.
- Closure-record PR #442 merged as `1bdc0ce150ff018745a37b7461a5b419c986f410`; Render deployed that docs-only merge LIVE with no BIO26 code/data change.
- **BIO26 CLOSED ✅** — no remaining production-import, integrity, Live E2E, approval, or post-approval gate.

**BIO26 must not be reopened unless a new source/content revision is explicitly requested.**

## Interactive teaching board V1 — 2026-10-08
- Real-provider continuation: Gemini connectivity PASS; 4 bounded live-chat samples were truncated. Focused board-only Flash generation repair is on PR #459; owned-review post-deploy audit remains required. See docs/audits/TEACHING_BOARD_REAL_PROVIDER_2026-10-08.md.
- Owner-directed scope: current AI gateway integration and browser-side interactive board; baseline main@f40a785e, branch codex/smart-teacher-live-board.
- Status: PARTIAL; no production closure or deployment. Existing Master Control plan exit gates remain as recorded.
- Added validated versioned plans, local deterministic playback, narration adapter, contextual follow-up board and saved main-lesson resume. Existing authorization, budgets, scoring and image policy preserved.
- Evidence and remaining live-provider/voice checks: docs/audits/INTERACTIVE_TEACHING_BOARD_V1_2026-10-08.md. Exact-head CI is tracked on the attached PR.

## MNSF26 operational lane — QUESTION BANK MASTERING & QA PASS_LOCKED ✅ — 2026-10-11

- Scope: بنك المنصف 26 (الكمي — الحساب/الجبر + الهندسة)، إجمالي الكروبس: **2,135** (حساب 1,204 + هندسة 931)، الأسئلة النشطة: **2,129** (+6 مستبعدات موثقة).
- المراجعة الرياضية الشاملة (Run131): مراجعة 5 دفعات (Batches 001–005) تغطي 2,073 سؤالًا مستقلًا مع تحكيم رياضي وإعادة تصنيف قسري على التصنيف المعتمد.
- التصنيف المعتمد: **25 مهارة رئيسية / 95 مهارة فرعية** مطابقة كليًا لكود `server/src/scripts/deployQuantTaxonomy25.ts`. تم حظر جميع مسميات `main_quant_XX` القديمة ومحاذاة 1,364 سؤالًا كانت مصنفة خطأً تحت عناوين اختبارات مضللة إلى مهاراتها الحقيقية.
- عزل التعارضات (Fail-Closed Quarantine): عزل كامل لـ **37 تعارض مصدري موثق** وتحويل حالتها قسرًا إلى `status: REVIEW` مع `importEligible: false`. تم التحقق من نجاح بوابة التعارضات عبر `verify-mnsf26-37-source-conflicts.mjs` بنسبة 100%.
- دمج الملفات الأصلية: تم تحديث **2,316 سجلاً** عبر **345 ملف ماستر أصلي** في `docs/content/mnsf26/` مع الحفاظ على أسماء الملفات وتحديث العدادات.
- حزم وبيانات الإفراج المعتمدة:
  - `MNSF26_CERTIFIED_UPDATE_PACKAGE_V1.json` (3.24 MB).
  - `MNSF26_IMPORT_MANIFEST_READY_V1.json` (104,328 سطر، 4.55 MB): يضم **1,989 سؤالاً مؤهلاً للاستيراد** (MASTERED) و **140 سؤالاً معزولاً** (REVIEW).
  - أقفال الاعتماد: `MNSF26_QA_LOCK_CERTIFICATION_V1.json`، `MNSF26_DEDUPE_LOCK_CERTIFICATION_V1.json` (فحص تقاطعي مع 858 FND26 و 946 COL2627)، و `MNSF26_R2_REMOTE_SHA_CERTIFICATION_V1.json` (تطابق SHA-256 لجميع الـ 2,129 صورة على R2).
- بوابات التحقق المستقلة:
  - `verifyMnsf26CurrentFullbookGate.mjs` -> **PASS (ok: true, 0 failures)**.
  - `verifyMnsf26CurrentFullbookRows.mjs` -> **PASS (ok: true, expected: 2129, importable: 1989, 0 failures)**.
  - `verify-mnsf26-37-source-conflicts.mjs` -> **PASS (ok: true, checked: 37, 0 failures)**.
- التنفيذ الحي والاعتماد (Live Apply & Closure) — 2026-10-11:
  - استيراد الأسئلة: تم استيراد واعتماد **1,989 سؤالاً** حياً على MongoDB Atlas بنجاح (`pathId: p_1777779639431` — القدرات، `subjectId: sub_1777779748206` — الكمي).
  - الاختبارات القياسية: تم توليد وتثبيت **40 اختباراً معيارياً كاملاً** (`exam_mnsf26_mock_01` إلى `40`) بواقع 50 سؤالاً لكل اختبار وتغطية 18-20 مهارة فرعية متنوعة.
  - **MNSF26 LIVE DEPLOYED & CLOSED ✅**.

## MATH26 operational lane — LEARNING SUITE & STANDARD TESTS CLOSED ✅ — 2026-10-11

- Scope: رياضيات التحصيلي (`pathId: p_1777779653351`، `subjectId: sub_1777784609152`).
- إجمالي الأسئلة المعتمدة في قاعدة البيانات: **2,595 سؤالاً** معتمدة بنسبة 100% وبصور سحابية جاهزة ومربوطة بالمهارات:
  - بنك 1 (`YLM26` - يلو ماث 2026): **326 سؤالاً**.
  - بنك 2 (`COL26` - تجميعات 2026): **1,012 سؤالاً**.
  - بنك 3 (`COL26OLD` - تجميعات الأعوام السابقة): **1,257 سؤالاً**.
- هيكل التأسيس والمهارات:
  - **22 مهارة رئيسية** و **70 مهارة فرعية** مطابقة للمخطط المعياري `tahsili_math_taxonomy.json`.
  - **22 موضوع رئيسي** (5 مواضيع أولى مجانية `isLocked: false` و 17 موضوعاً مقفلاً `isLocked: true`).
  - **70 موضوع فرعي** مربوطة 1:1 بتدريبات التأسيس للمهارات الفرعية في حقل `quizIds`.
- توزيع البنوك وفق التوجيه المعتمد:
  - **التأسيس والتدريب (من بنك 1 وبنك 2 — إجمالي 1,338 سؤالاً بالتنسيق بينهما):**
    - **70 تدريباً تأسيسياً للمهارات الفرعية** (`math26_foundation_01_01` إلى `math26_foundation_22_05` في `slot: "foundation"`): 10 أسئلة لكل مهارة فرعية (أو كامل الأسئلة المتاحة للمهارات التي يقل عدد أسئلتها عن 10) باستهلاك 646 موضع سؤال فرعي.
    - **47 تدريباً شاملاً للمهارات الرئيسية** (`math26_training_XX` و `math26_training_XX_pY` في `slot: "training"`): سعة كل تدريب بين 26 إلى 40 سؤالاً مع تجزئة المهارات الضخمة إلى أجزاء (Part 1, Part 2, Part 3) لتغطية كافة أسئلة المهارة.
  - **الاختبارات المعيارية الشاملة (من بنك 3 — `COL26OLD` حصرياً):**
    - **26 اختباراً معيارياً شاملاً** (`math26_standard_test_01` إلى `math26_standard_test_26` في `slot: "tests"`): سعة كل اختبار 48 إلى 49 سؤالاً (17 اختباراً بـ 48 سؤالاً + 9 اختبارات بـ 49 سؤالاً).
    - تغطية بنك 3 كاملة: **1,257 / 1,257 سؤالاً (100.0%)** مع **صفر تكرار (Zero duplicates across tests)**.
    - سياسة الوصول: الاختبارات الـ 5 الأولى مجانية (`isFree: true`، `access: free`)، والاختبارات الـ 21 المتبقية ضمن الباقة المدفوعة (`access: paid`).
- التحقق المستقل وبوابة الاعتماد:
  - تشغيل `verifyMath26FullLearningSuite.ts` -> **PASS (MATH26_FULL_LEARNING_SUITE_VERIFICATION_PASS)**.
  - إجمالي الكويزات المباشرة: **145 كويزاً** (70 تأسيسي + 47 تدريب رئيسي + 26 اختبار معياري + 2 أرشيف سابق محفوظ).
- **MATH26 LIVE DEPLOYED & CLOSED ✅**.

## TAHSILI & QUDURAT PRESENTATION STANDARDIZATION — CLOSED ✅ — 2026-10-12

- Scope: توحيد عرض أسئلة التحصيلي بالكامل، تنظيف وقص صور الفيزياء 2026، وضبط أزرار القدرات.
- التحصيلي (فيزياء، كيمياء، أحياء، رياضيات):
  - توحيد كامل لـ **7,616 سؤالاً** عبر المواد الأربع:
    - الفيزياء (`PHYS26`): **2,064 / 2,064 (100.0%)**
    - الكيمياء (`CHEM26`): **1,708 / 1,708 (100.0%)**
    - الأحياء (`BIO26`): **2,832 / 2,832 (100.0%)**
    - الرياضيات (`COL26`): **1,012 / 1,012 (100.0%)**
  - إخفاء نص السؤال التلقائي إذا كان السؤال يحتوي على صورة مدمجة (السؤال والخيارات داخل الصورة).
  - الخيارات اللاتينية المعتمدة: **4 أزرار أفقية موحدة `[ A ] [ B ] [ C ] [ D ]`** لجميع المواد دون تكرار أي حروف.
  - إعادة معالجة وقص بنك الفيزياء بالكامل (`PHYS26`): **2,064 / 2,064 سؤالاً (100.0%)**:
    - حذف واقتطاع العمود والمربع الأيمن بالكامل (رقم السؤال المطبوع + سنة التجميع + بادج يلو ★★★) عبر خوارزمية كشف الفاصل الرأسي الذكية بدقة البكسل.
    - معالجة أي عناوين أو نصوص سفلية منعزلة خارج حدود السؤال والخيارات.
    - متوسط عرض صور الأسئلة المنظفة أصبح **519.7 بكسل** (بين 494 و 543 بكسل) مطابقاً تماماً لمعيار الرياضيات (518 بكسل) والكيمياء والأحياء.
    - رفع كامل الـ **2,064 صورة جديدة منظفة** إلى Cloudflare R2 CDN بمفاتيح النسخة الثانية المحدثة (`questions/v2/...`).
    - فحص عشوائي عبر الاتصال المباشر بالـ CDN ومطابقة الهاشات: **10/10 PASS**.
    - تحديث قاعدة بيانات MongoDB لجميع أسئلة الفيزياء الـ 2,064 بتعيين `optionsEmbeddedInImage: true` وروابط الصور الجديدة المحدثة.
    - تشغيل فحص البنك الكامل: `PHYS26_FULL_LEARNING_SUITE_VERIFICATION_PASS` بنجاح تام (2064 سؤالاً، 149 تدريباً، 43 اختباراً معيارياً بدون أي تكرار).
- القدرات (أينشتاين والمنصف):
  - تأسيس وتجميعات أينشتاين (`COL2627` & `FND26`): تعمل بانتظام تام بصورة نظيفة و4 أزرار `[ أ ] [ ب ] [ ج ] [ د ]`.
  - اختبارات المنصف (`MNSF26`): تم حل مشكلة تكرار الحروف (`أ أ` و `ب ب` أصبحت خيارات مفردة `[ أ ] [ ب ] [ ج ] [ د ]`) في صف أفقي بـ 4 أعمدة (`grid-cols-4`)، مع إخفاء إطار الصورة التالفة تلقائياً عبر `onError`.
- بوابات التحقق المستقلة:
  - `verifyPhys26FullLearningSuite.ts` -> **PASS (PHYS26_FULL_LEARNING_SUITE_VERIFICATION_PASS)**
  - `smoke:quiz-progress-draft` -> **PASS (7/7 checks)**
  - `test:tahsili-import-identity` -> **PASS (100%)**
  - `smoke:learning-quiz-journey` -> **PASS (7/7 checks on live Render)**
  - `smoke:adaptive-phase7-mastery-review` -> **PASS**
  - `smoke:assessment-answer-review` -> **PASS**

## QUIZ ACCESS AUTH GATE — FREE BEHIND REGISTRATION — CLOSED ✅ — 2026-10-12

- Scope: ضبط سياسة الوصول للاختبارات — "العضوية المجانية شرط بدء أي اختبار" (Free Behind Registration Gate).
- المشكلة السابقة: كان بإمكان الزائر غير المسجل (`guest`) الدخول إلى الاختبارات والبدء بالحل دون حساب، مما يؤدي إلى عدم حفظ نتائجه، وتعذر تسجيل الإحصائيات، وضياع إجاباته عند التسليم (حيث يتطلب الخادم توثيق الحساب `requireAuth` عند الإرسال)، بالإضافة إلى تفويت فرصة تسجيل الطلاب بالمنصة.
- الحل المنفذ والمعتمد:
  1. **بوابة الدخول الذكية (Auth Gate Card):**
     - تم منع الحسابات غير المسجلة (`user.id === 'guest'` أو `!isRegisteredUser(user)`) من استعراض أسئلة الاختبار عشوائياً.
     - استبدال رسالة الخطأ التقليدية ببطاقة ترحيبية تسويقية ذكية ومحفّزة توضح:
       - عنوان الاختبار وعدد الأسئلة والمدة الزمنية والتصحيح الفوري.
       - مميزات التسجيل: حفظ النتائج في السجل التعليمي، التحليل الفوري للمهارات ونقاط الضعف، مراجعة الشروحات النموذجية.
       - أزرار مباشرة عالية التحويل: "تسجيل الدخول والبدء مباشرة" و "إنشاء حساب جديد مجاناً (في ثوانٍ)".
  2. **انسيابية العودة التلقائية (Smooth returnTo Navigation):**
     - دعم كامل لبارامتر `returnTo` عبر كافة طرق التوثيق في `Header.tsx` و `AuthContext.tsx`:
       - الدخول والتسجيل بالبريد وكلمة المرور (`handleEmailAuth`).
       - الدخول الذكي برقم الهوية أو الجوال (`handleSmartLogin`).
       - الدخول السريع عبر Google (`signInWithGoogle`).
       - الدخول برمز التحقق عبر واتساب (`whatsappVerifyLogin`).
     - فور اكتمال تسجيل الدخول أو إنشاء الحساب، تتم إعادة الطالب مباشرة وفورياً إلى رابط الاختبار المحدد لتبدأ تجربته دون انقطاع.
  3. **حماية صلاحيات الإدارة والتطوير:**
     - الحسابات الإدارية (`admin`, `teacher`, `supervisor`) وجلسات التطوير (`isDevSessionUser`) تحتفظ بصلاحية المعاينة المباشرة للاختبارات دون أي عوائق.
- بوابات التحقق المستقلة:
  - `smoke:quiz-progress-draft` -> **PASS (7/7 checks)**
  - `smoke:quiz-access` -> **PASS (19/19 checks)**
  - `test:tahsili-import-identity` -> **PASS (100%)**
  - `smoke:learning-quiz-journey` -> **PASS (7/7 checks on live Render)**
  - `smoke:adaptive-phase7-mastery-review` -> **PASS**
  - `smoke:assessment-answer-review` -> **PASS**
  - `test-quiz-auth-gate-e2e.mjs` (Playwright E2E Browser Testing) -> **PASS (100%)**:
    - المرحلة 1: حجب الزائر غير المسجل وعرض بطاقة البوابة الذكية `quiz_auth_gate_card.png` فوراً دون أي تأخير في تجهيز الأسئلة.
    - المرحلة 2: انتقال سلس بالضغط على CTA إلى `/?auth=login&returnTo=%2Fquiz%2F...` وفتح نافذة الدخول تلقائياً مع توثيق الشاشة `quiz_auth_gate_login_modal.png`.
    - المرحلة 3: دخول الطالب وتخزين الجلسة، والعودة التلقائية للاختبار ليعمل محرك الاختبار بالكامل `quiz_runner_authenticated.png` مع كامل الأسئلة (1 من 10) والمؤقت والخيارات وشريط التنقل.
  - Production build: `vite build` completed cleanly (0 errors).

