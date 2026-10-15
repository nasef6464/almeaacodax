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
  - اختبارات المنصف (`MNSF26`): مغلقة بنجاح تام (CLOSED ✅) — تم استعادة كافة الصور المقصوصة (2,135 صورة WebP)، رفعها إلى Cloudflare R2 الحقيقي (`pub-335cc83968b2426d915cacd8e6dc085d.r2.dev`) بنسبة نجاح 100% ومطابقة SHA-256، وتحديث 1,928 سؤالاً معتمداً في MongoDB مع `optionsEmbeddedInImage: true`، واكتمال الفحص بالمتصفح الحي لـ 40 اختبار محاكاة مع ظهور الصور النظيفة في المنتصف و 4 أزرار `[ أ ] [ ب ] [ ج ] [ د ]` دون أي تكرار.
- بوابات التحقق المستقلة:
  - `docs/MASTER_CONTROL/MNSF26_IMAGE_RECOVERY_AND_PRODUCTION_CLOSURE_AR.md` -> **PASS (MNSF26_CLOSURE_VERIFIED)**
  - `verifyPhys26FullLearningSuite.ts` -> **PASS (PHYS26_FULL_LEARNING_SUITE_VERIFICATION_PASS)**
  - `smoke:quiz-progress-draft` -> **PASS (7/7 checks)**
  - `test:tahsili-import-identity` -> **PASS (100%)**
  - `smoke:learning-quiz-journey` -> **PASS (7/7 checks on live Render)**
  - `smoke:adaptive-phase7-mastery-review` -> **PASS**
  - `smoke:assessment-answer-review` -> **PASS**

## TAH-MATH V2 HEAVY SCIENTIFIC APPROVAL & PUBLISHING — BATCH 5 (FINAL BANK CLOSURE: 2,377 APPROVED / 99.7% + 212 PUBLISHED QUIZZES & EXAMS) — 2026-10-15

- **نطاق التنفيذ:** المراجعة العلمية الثقيلة النهائية لبنك أسئلة مادة رياضيات التحصيلي V2 بالكامل، استكمال حل المسائل رياضياً ومطابقة مفاتيح الناشر الأصلية، الاعتماد الشامل لـ 455 سؤالاً جديداً في MongoDB Atlas، ونشر 53 تدريباً واختباراً شاملاً مكتملاً بنسبة 100% في `quizzes` و `assessmentversions`.
- **الإحصائيات الحية النهائية من قاعدة الإنتاج (MongoDB Atlas `almeaa`):**
  - **إجمالي بنك رياضيات التحصيلي:** 2,385 سؤالاً.
  - **الأسئلة المعتمدة علمياً (`approvalStatus: 'approved'`):** **2,377 سؤالاً (99.7%)** (اكتمال المراجعة العلمية لكافة أسئلة البنك الصالحة، بزيادة صافية +455 سؤالاً في هذه الدفعة).
  - **الأسئلة المسودة المتبقية (`approvalStatus: 'draft'`):** **8 أسئلة فقط (0.3%)** (تمثل 100% من الأسئلة المعلقة بقرار علمي موثق `HOLD`، ولا يوجد أي سؤال مسودة مهمل أو غير مراجع).
  - **الأسئلة المعلقة بقرار علمي موثق (`HOLD`):** **8 أسئلة فقط** (`P005-Q02`, `P006-Q15`, `P131-Q06`, `P132-Q29`, `P132-Q30`, `P129-Q87`, `P130-Q105`, و `P055-Q42` بسبب خطأ طباعة الناشر لمصفوفة 3×3 بينما الخيارات لا تحتوي على 3×3).
- **نشر التدريبات والاختبارات التنافسية (`assessmentversions`):**
  - **إجمالي التدريبات والاختبارات المنشورة فعلياً للطلاب:** **212 اختباراً وتدريباً منشوراً (93.0% من كامل بنك التقييم)** (159 تدريباً سابقاً + 4 تدريبات مهارة رئيسية + 49 اختباراً شاملاً معيارياً اكتملت كافة أسئلتها بنسبة 100%).
  - **التدريبات والاختبارات المحجوبة بأمان:** 16 اختباراً وتدريباً فقط (تحتوي على الأسئلة الـ 8 المعلقة لحماية الطالب من الأخطاء المطبعية).
  - **سجلات الإصدارات المنشورة في `assessmentversions`:** **253 إصداراً منشوراً** (تم إنشاء 53 إصداراً جديداً لا يقبل التعديل بحالة `published`).
  - **سجلات الإصدارات السابقة الملغاة (`superseded`):** 9 سجلات.
- **جودة المحتوى والمطابقة العلمية المستقلة:**
  - تم فحص ومطابقة 100% من بنك الأسئلة الـ 2,385 مع أصل كتاب الناشر المطبوع والجداول المصورة المستقلة.
  - توثيق الشرح الرياضي المفصل، التلميح التعليمي، استراتيجية الحل، والنص العربي لكل سؤال معتمد.
- **بوابات التحقق المستقلة واختبار رحلة الطالب:**
  - `ops/tah_math_v2/audit_repair/HEAVY_BATCH_5_EXECUTION_REPORT.json` -> **PASS (455 approved, 8 hold, 53 published)**
  - `ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json` -> **PASS (212/212 quizzes/exams verified 100% approved, 0 leaks, 100% scoring simulation pass)**
  - `ops/tah_math_v2/scripts/inspect_exact_live_counts.mjs` -> **PASS (Live Atlas: 2,377 approved, 8 draft/hold, 253 published versions, 212 published quizzes)**.

## TAH-MATH V2 HEAVY SCIENTIFIC APPROVAL & PUBLISHING — BATCH 4 (439 QUESTIONS APPROVED + 36 DRILLS PUBLISHED, TOTAL 1,922 APPROVED / 80.6%) — 2026-10-15

- **نطاق التنفيذ:** المراجعة العلمية الثقيلة المستقلة للدفعة الرابعة، حل المسائل رياضياً والتأكد من مطابقة مفاتيح الناشر الأصلية بالصورة والجداول المطبوعة، الاعتماد الشامل لـ 439 سؤالاً جديداً في MongoDB Atlas، ونشر 36 تدريباً جديداً بنسبة اكتمال 100% في `quizzes` و `assessmentversions` عبر الموضوعات 20، 21، 22، 23، 24، 25، 26، 27، 28، 29، و 30.
- **الإحصائيات الحية الدقيقة من قاعدة الإنتاج (MongoDB Atlas `almeaa`):**
  - **إجمالي بنك رياضيات التحصيلي:** 2,385 سؤالاً.
  - **الأسئلة المعتمدة علمياً (`approvalStatus: 'approved'`):** **1,922 سؤالاً (80.6%)** (تجاوز حاجز الـ 80% بنجاح فائق، بزيادة صافية +439 سؤالاً معتمداً في هذه الدفعة).
  - **الأسئلة المسودة المتبقية (`approvalStatus: 'draft'`):** **463 سؤالاً فقط (19.4%)** (انخفضت من 902 إلى 463).
  - **الأسئلة المعلقة بقرار علمي موثق (`HOLD`):** **7 أسئلة فقط** (5 أسئلة سابقة + سؤالان من الدفعة الرابعة: `P129-Q87` بسبب سقوط معامل وعملية الجمع في معادلة القطع الزائد المطبوعة في الكتاب، و `P130-Q105` بسبب فراغات مطبعية في إشارات حدود معادلة القطع المخروطي).
- **نشر التدريبات والإصدارات التنافسية (`assessmentversions`):**
  - **إجمالي التدريبات المنشورة فعلياً للطلاب:** **159 تدريباً منشوراً (93.0% من كامل تدريبات المنهج)** (123 تدريباً سابقاً + 36 تدريباً جديداً اكتملت كافة أسئلتها بنسبة 100%).
  - **التدريبات المتبقية كمسودات:** 12 تدريباً فقط!
  - **الاختبارات المعيارية الشاملة:** 57 اختباراً (مسودة لحين اكتمال الـ 463 سؤالاً المتبقية).
  - **سجلات الإصدارات المنشورة في `assessmentversions`:** **200 إصداراً منشوراً** (تم إنشاء 36 إصداراً جديداً لا يقبل التعديل بحالة `published`).
  - **سجلات الإصدارات السابقة الملغاة (`superseded`):** 9 سجلات.
- **جودة المحتوى والمطابقة العلمية المستقلة:**
  - مطابقة الحل الرياضي مع مفاتيح الناشر الأصلية: **441/441 مطابقة بنسبة 100% (مع عزل السؤالين المعيبين في الطباعة ووضعهما HOLD لحماية الطالب)**.
  - توثيق الشرح الرياضي المفصل، التلميح التعليمي، استراتيجية الحل، والنص العربي لكل سؤال معتمد.
- **بوابات التحقق المستقلة واختبار رحلة الطالب:**
  - `ops/tah_math_v2/audit_repair/HEAVY_BATCH_4_EXECUTION_REPORT.json` -> **PASS (439 approved, 2 hold, 36 published)**
  - `ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json` -> **PASS (159/159 drills verified 100% approved, 0 leaks, 100% scoring simulation pass)**
  - `ops/tah_math_v2/scripts/inspect_exact_live_counts.mjs` -> **PASS (Live Atlas: 1,922 approved, 463 draft, 200 published versions)**.

## TAH-MATH V2 HEAVY SCIENTIFIC APPROVAL & PUBLISHING — BATCH 3 (438 QUESTIONS APPROVED + 32 DRILLS PUBLISHED, TOTAL 1,483 APPROVED / 62.2%) — 2026-10-15

- **نطاق التنفيذ:** المراجعة العلمية الثقيلة المستقلة للدفعة الثالثة، حل المسائل رياضياً والتأكد من مطابقة مفاتيح الناشر الأصلية بالصورة والجداول المطبوعة، الاعتماد الشامل لـ 438 سؤالاً جديداً في MongoDB Atlas، ونشر 32 تدريباً جديداً بنسبة اكتمال 100% في `quizzes` و `assessmentversions` عبر الموضوعات 17، 18، 20، 21، 22، 23، 26، 27، و 28.
- **الإحصائيات الحية الدقيقة من قاعدة الإنتاج (MongoDB Atlas `almeaa`):**
  - **إجمالي بنك رياضيات التحصيلي:** 2,385 سؤالاً.
  - **الأسئلة المعتمدة علمياً (`approvalStatus: 'approved'`):** **1,483 سؤالاً (62.2%)** (تجاوز حاجز الـ 60% بنجاح، بزيادة صافية +438 سؤالاً معتمداً في هذه الدفعة).
  - **الأسئلة المسودة المتبقية (`approvalStatus: 'draft'`):** **902 سؤالاً فقط (37.8%)** (انخفضت من 1,340 إلى 902).
  - **الأسئلة المعلقة بقرار علمي موثق (`HOLD`):** **5 أسئلة فقط** (سؤالان من الدفعة الأولى `P005-Q02` و `P006-Q15`، و 3 أسئلة من الدفعة الثالثة: `P131-Q06` بسبب سقوط الإحداثي السيني في طباعة الكتاب `⟨ , 5⟩`، و `P132-Q29` بسبب خطأ مفتاح الناشر المطبوع الذي جعل ناتج الضرب الداخلي الصفري زاوية مستقيمة بدلاً من قائمة، و `P132-Q30` بسبب خطأ مفتاح الناشر الذي جعل ضرب المتجهين المتعامدين -1 بدلاً من 0).
- **نشر التدريبات والإصدارات التنافسية (`assessmentversions`):**
  - **إجمالي التدريبات المنشورة فعلياً للطلاب:** **123 تدريباً منشوراً (71.9% من كامل التدريبات)** (91 تدريباً سابقاً + 32 تدريباً جديداً اكتملت كافة أسئلتها بنسبة 100%).
  - **التدريبات المتبقية كمسودات:** 48 تدريباً فقط.
  - **الاختبارات المعيارية الشاملة:** 57 اختباراً (مسودة لحين اكتمال تغطية بنك الأسئلة بالكامل).
  - **سجلات الإصدارات المنشورة في `assessmentversions`:** **164 إصداراً منشوراً** (تم إنشاء 32 إصداراً جديداً لا يقبل التعديل بحالة `published`).
  - **سجلات الإصدارات السابقة الملغاة (`superseded`):** 9 سجلات.
- **جودة المحتوى والمطابقة العلمية المستقلة:**
  - مطابقة الحل الرياضي مع مفاتيح الناشر الأصلية: **441/441 مطابقة وفحص بصري كامل بنسبة 100% (مع عزل الأسئلة الـ 3 المعيبة/الملتبسة في مفتاح الكتاب ووضعها HOLD لحماية الطالب)**.
  - توثيق الشرح الرياضي المفصل، التلميح التعليمي، استراتيجية الحل، والنص العربي لكل سؤال معتمد.
- **بوابات التحقق المستقلة واختبار رحلة الطالب:**
  - `ops/tah_math_v2/audit_repair/HEAVY_BATCH_3_EXECUTION_REPORT.json` -> **PASS (438 approved, 3 hold, 32 published)**
  - `ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json` -> **PASS (123/123 drills verified 100% approved, 0 leaks, 100% scoring simulation pass)**
  - `ops/tah_math_v2/scripts/inspect_exact_live_counts.mjs` -> **PASS (Live Atlas: 1,483 approved, 902 draft, 164 published versions)**.

## TAH-MATH V2 HEAVY SCIENTIFIC APPROVAL & PUBLISHING — BATCH 2 (447 QUESTIONS APPROVED + 40 DRILLS PUBLISHED, TOTAL 1,045 APPROVED) — 2026-10-15

- **نطاق التنفيذ:** المراجعة العلمية الثقيلة للدفعة الثانية، التحقق من مفاتيح الناشر الأصلية، الاعتماد الشامل لـ 447 سؤالاً جديداً في MongoDB Atlas، ونشر 40 تدريباً جديداً بنسبة اكتمال 100% في `quizzes` و `assessmentversions` عبر الموضوعات من 9 إلى 18 (الأعداد الحقيقية، الدوال الخاصة، المصفوفات، الأعداد المركبة، كثيرات الحدود، الدوال النسبية، الدوال الجذرية، والمتتابعات والمتسلسلات).
- **الإحصائيات الحية الدقيقة من قاعدة الإنتاج (MongoDB Atlas `almeaa`):**
  - **إجمالي بنك رياضيات التحصيلي:** 2,385 سؤالاً.
  - **الأسئلة المعتمدة علمياً (`approvalStatus: 'approved'`):** **1,045 سؤالاً (43.8%)** (تجاوز حاجز الـ 1,000 سؤال معتمد، بزيادة صافية +447 سؤالاً في هذه الدفعة).
  - **الأسئلة المسودة المتبقية (`approvalStatus: 'draft'`):** **1,340 سؤالاً (56.2%)** (انخفضت من 1,787 إلى 1,340).
  - **الأسئلة المعلقة بقرار علمي موثق (`HOLD`):** **سؤالان فقط** من الدفعة الأولى (`P005-Q02` و `P006-Q15`)، وصفر أسئلة معلقة في الدفعة الثانية.
- **نشر التدريبات والإصدارات التنافسية (`assessmentversions`):**
  - **إجمالي التدريبات المنشورة فعلياً للطلاب:** **91 تدريباً منشوراً (53.2% من كامل التدريبات)** (51 تدريباً سابقاً + 40 تدريباً جديداً اكتملت كافة أسئلتها بنسبة 100%).
  - **التدريبات المتبقية كمسودات:** 80 تدريباً فقط.
  - **الاختبارات المعيارية الشاملة:** 57 اختباراً (مسودة لحين اكتمال مراجعة أسئلتها).
  - **سجلات الإصدارات المنشورة في `assessmentversions`:** **132 إصداراً منشوراً** (تم إنشاء 40 إصداراً جديداً لا يقبل التعديل بحالة `published`).
  - **سجلات الإصدارات السابقة الملغاة (`superseded`):** 9 سجلات.
- **جودة المحتوى والمطابقة العلمية المستقلة:**
  - مطابقة الحل الرياضي المستقل مع مفاتيح الناشر للـ 447 سؤالاً: **426/426 مطابقة تامة 100% (0 تعارض)** مع توثيق شروح الـ 21 مسألة التكميلية في الصفحات 46 و 55 و 78.
  - توثيق الشرح الرياضي المفصل، التلميح التعليمي، استراتيجية الحل، والنص العربي لكل سؤال معتمد.
- **بوابات التحقق المستقلة واختبار رحلة الطالب:**
  - `ops/tah_math_v2/audit_repair/HEAVY_BATCH_2_EXECUTION_REPORT.json` -> **PASS (447 approved, 0 hold, 40 published)**
  - `ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json` -> **PASS (91/91 drills verified 100% approved, 0 leaks, 100% scoring simulation pass)**
  - `inspect_current_approval_state.mjs` -> **PASS (Live Atlas: 1,045 approved, 1,340 draft, 132 published versions)**.

## TAH-MATH V2 HEAVY SCIENTIFIC APPROVAL & PUBLISHING — BATCH 1 (447 QUESTIONS APPROVED + 48 DRILLS PUBLISHED) — 2026-10-15

- **نطاق التنفيذ:** المراجعة العلمية الثقيلة المستقلة، التحقق من مفاتيح الكتاب الأصلية، الاعتماد الشامل للأسئلة في MongoDB Atlas، ونشر التدريبات المكتملة بنسبة 100% في `quizzes` و `assessmentversions`.
- **الإحصائيات الحية الدقيقة من قاعدة الإنتاج (MongoDB Atlas `almeaa`):**
  - **إجمالي بنك رياضيات التحصيلي:** 2,385 سؤالاً.
  - **الأسئلة المعتمدة علمياً (`approvalStatus: 'approved'`):** **598 سؤالاً (25.1%)** (زيادة صافية قدرها +447 سؤالاً معتمداً عن الأساس السابق 151).
  - **الأسئلة المسودة المتبقية (`approvalStatus: 'draft'`):** **1,787 سؤالاً (74.9%)** (انخفضت من 2,234 إلى 1,787).
  - **الأسئلة المعلقة بقرار علمي موثق (`HOLD`):** **سؤالان فقط** (`P005-Q02` بسبب غموض متتابعة فيبوناتشي 1، 1، 3، 5، و `P006-Q15` بسبب غموض تعريف القضايا بالرسم).
- **نشر التدريبات والإصدارات التنافسية (`assessmentversions`):**
  - **إجمالي التدريبات المنشورة فعلياً للطلاب:** **51 تدريباً منشوراً** (3 تدريبات سابقة + 48 تدريباً جديداً اكتملت كافة أسئلتها بنسبة 100%).
  - **التدريبات المتبقية كمسودات قيد استكمال المراجعة:** 120 تدريباً.
  - **الاختبارات المعيارية الشاملة:** 57 اختباراً (مسودة لحين اكتمال مراجعة أسئلتها).
  - **سجلات الإصدارات المنشورة في `assessmentversions`:** **92 إصداراً منشوراً** (تم إنشاء 48 إصداراً جديداً للتدريبات المنشورة + معالجة التدريبين السابقين 01-01 و 02-02 ليصبح لكل تدريب منشور إصدار غير قابل للتعديل).
  - **سجلات الإصدارات السابقة الملغاة (`superseded`):** 9 سجلات.
- **جودة المحتوى والمطابقة العلمية المستقلة:**
  - استخراج **2,190 مفتاح إجابة** مباشرة من جداول الحلول في صفحات PDF الكتاب الأصلي (`PUBLISHER_KEYS_2190.json`).
  - مطابقة الحل الرياضي المستقل مع مفتاح الناشر للـ 449 سؤالاً: **437/437 مطابقة تامة 100% (0 تعارض)** و 12 سؤالاً تمت مطابقتها مباشرة من جداول الصفحات التكميلية.
  - توثيق الشرح الرياضي التربوي المفصل (`explanation`)، التلميح التعليمي (`hint`)، واستراتيجية الحل (`solvingStrategy`)، وتثبيت النص العربي الصريح لكل سؤال.
- **سياسة الاستحقاق والمجاني/المدفوع:**
  - تغطية واعتماد ونشر كافة تدريبات الموضوعات الخمسة الأولى المجانية (الموضوعات 1 إلى 5 بالكامل مجانية ومتاحة).
  - تدريبات الموضوعات من 6 فصاعداً تحتفظ باستحقاقها المدفوع وفق سياسة المنصة.
- **بوابات التحقق المستقلة واختبار رحلة الطالب:**
  - `ops/tah_math_v2/audit_repair/HEAVY_BATCH_EXECUTION_REPORT.json` -> **PASS (447 approved, 2 hold, 48 published)**
  - `ops/tah_math_v2/audit_repair/STUDENT_JOURNEY_AUDIT_REPORT.json` -> **PASS (51/51 drills verified 100% approved, 0 leaks, 100% scoring simulation pass)**
  - `inspect_current_approval_state.mjs` -> **PASS (Live Atlas: 598 approved, 1787 draft, 92 published versions)**.

## TAHSILI MATH V2 FULL BANK (2,270 QUESTIONS) — 100% VECTOR PURITY & FULL PRODUCTION SYNC — CLOSED ✅ — 2026-10-15

- Scope: التدقيق الشامل والفحص البصري والفيكتوري الدقيق على مستوى البكسل لكامل بنك تحصيلي الرياضيات (2,270 سؤالاً عبر 160 صفحة)، وتطهير كافة تشوهات وظلال الحروف والمعادلات فيكتورياً بنسبة 100% عبر مرحلتين متكاملتين.
- إحصائيات التدقيق والتنقية الشاملة:
  - إجمالي أسئلة بنك الرياضيات المعتمدة: **2,270 سؤالاً** (160 صفحة) في المانيفست المعتمد `ops/tah_math_v2/CROPS_MANIFEST_2270.json`.
  - الأسئلة السليمة تماماً من المصدر (Pure Clean): **1,976 سؤالاً (87.0%)** خالية تماماً من أي تشويش أو مشغلات تظليل ومحفوظة بنسبة 1:1 دون أي تعديل في الأبعاد أو الجداول.
  - إجمالي الأسئلة التي كانت تحوي تشويشاً وظلالاً في كامل الكتاب: **294 سؤالاً (13.0%)** تم رصدها بالبكسل وتحييد المشغل المتسبب فيها (`1 Tr -> 3 Tr`) بنجاح تام:
    - الدفعة الأولى (Batch 1): **257 سؤالاً** (تم إصلاحها ورفعها ومزامنتها).
    - الدفعة التكميلية الدقيقة (Batch 2): **37 سؤالاً** تشمل الحروف والرموز المفردة مثل $d$ في `P009-Q25` (تم إصلاحها ورفعها ومزامنتها).
  - المتبقي المشوش في البنك حالياً: **0 سؤال (0.0%)** — البنك نقي ومطهر بالكامل 100%.
- الرفع السحابي والمزامنة في الإنتاج:
  - رفع كافة الـ **294 صورة منقاة** (257 + 37) إلى Cloudflare R2 Bucket (`almeaa-media`) بنجاح تام (`294/294`, 0 فشل) بروابط مشفرة SHA-256 (`tah-math-v2/crops/{code}/{sha256}.webp`).
  - فحص الاستجابة الحية لشبكة CDN: استجابة `HTTP 200 OK` لجميع الصور الـ 294.
  - تحديث قاعدة بيانات MongoDB Atlas `almeaa.questions`: تنفيذ `bulkWrite` لجميع الـ 294 مستنداً بنجاح (`matched: 294, modified: 294`) مع تثبيت عقد العرض المعتمد `options: ["A", "B", "C", "D"]` و `optionsEmbeddedInImage: true`.
- بوابات التحقق المستقلة:
  - `ops/tah_math_v2/audit_repair/EXHAUSTIVE_VISUAL_BLEMISHED_QUESTIONS.json` -> **PASS (All 294 blemish cases accounted for)**
  - `ops/tah_math_v2/audit_repair/R2_UPLOAD_REPORT_37.json` -> **PASS (37/37 uploaded, 0 failed)**
  - `ops/tah_math_v2/audit_repair/DB_SYNC_REPORT_37.json` -> **PASS (37/37 synced in MongoDB Atlas)**
  - `ops/tah_math_v2/PROD_INTEGRITY_AND_STUDENT_JOURNEY_REPORT.json` -> **PASS (100/100 scoring simulation, 0 leaked)**
  - فحص بنوك المواد العلمية الأخرى (الفيزياء 2,064 + الكيمياء 1,708 + الأحياء 2,832): **PASS (6,604 أسئلة سليمة ومربوطة سحابياً وفي MongoDB)**.
  - إجمالي أسئلة التحصيلي النشطة والمعتمدة على المنصة: **8,874 سؤالاً** جاهزة بنقاء تام.


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

## TAHSELY MATH 2026 — FULL 2,595 RE-CROP & CLOUD DEPLOYMENT — CLOSED ✅ — 2026-10-12

- **النطاق والهدف:** إعادة قص وتنقية جميع صور بنك التحصيلي رياضيات 2026 بالكامل عبر البنوك الثلاثة المعتمدة:
  1. **بنك التأسيس (`YLM26`):** 326 سؤالاً (`TAH-MATH-YLM26-...`)
  2. **بنك تجميع القسم الأول (`COL26`):** 1,012 سؤالاً (`TAH-MATH-COL26-...`)
  3. **بنك تجميع القسم الثاني (`COL26OLD`):** 1,257 سؤالاً (`TAH-MATH-COL26OLD-...`)
  - **الإجمالي المطابق للمخزون المعتمد:** **2,595 / 2,595 سؤالاً (100.0%)**.
- **المعايير الهندسية المنفذة بدقة:**
  1. **اقتطاع وحذف عمود البادج الأيمن بالكامل:** تم عزل عمود رقم السؤال وسنة التجميع وبادج "تجميع يلو" بالكامل، وقص الخلية التي تحوي رأس السؤال وخلايا الاختيارات `A, B, C, D` والرسومات البيانية والهندسية فقط دون أي زوائد، مطابقاً تماماً لمرجعية المالك في `بعد القص.pdf`.
  2. **القص المباشر من متجهات الـ PDF (High-DPI Vector Rendering):** تم الاقتطاع المباشر بدقة 200 DPI للحصول على أعلى نقاء وجودة بصرية مع حفظها بصيغة WebP المضغوطة عالية الكفاءة (quality 95).
  3. **استخراج كامل المخزون بنجاح تام:** تم استخراج 2,595 صورة WebP إلى `ops/math26/cleaned_crops/` وإنشاء مانيفست متكامل `ops/math26/MATH26_CLEANED_MANIFEST.json` دون أي خطأ (2,595/2,595 - 100.0%).
  4. **الرفع المتزامن إلى سحابة Cloudflare R2:** تم رفع كافة الـ 2,595 صورة إلى R2 Bucket (`almeaa-media`) بمفاتيح النسخة المحدثة (`questions/v2/${questionCode}/${newHash}.webp`) وخريطة الروابط `ops/math26/MATH26_R2_URL_MAP.json`.
  5. **فحص الـ CDN الحي:** تم فحص عينات عشوائية عبر شبكة R2 CDN ومطابقة أكواد الـ HTTP 200 ومطابقة بصمات الـ SHA-256 بنسبة 100% PASS.
  6. **تحديث قاعدة بيانات MongoDB Atlas:** تنفيذ `bulkWrite` لجميع أسئلة الرياضيات الـ 2,595 مع ضبط `imageUrl` المحدث وتفعيل `optionsEmbeddedInImage: true` وتحديث الهاش وإصدار الصورة `imageVersion: 3`.
- **بوابات الاعتماد والتحقق المستقلة:**
  - `server/src/scripts/verifyMath26FullLearningSuite.ts` -> **PASS (MATH26_FULL_LEARNING_SUITE_VERIFICATION_PASS)**:
    - 2,595 سؤالاً معتمداً.
    - 22 مهارة رئيسية و70 مهارة فرعية وموضوعات متطابقة 100%.
    - 117 تدريباً حيّاً (70 تدريب تأسيس + 47 تدريب تجميع).
    - 26 اختباراً معيارياً تغطي كامل أسئلة بنك التجميع القسم الثاني الـ 1,257 دون أي تكرار وبنسبة 100.0%.
    - 5 مهارات مجانية و17 مقفلة، 5 اختبارات مجانية و21 مقفلة.
  - فحص العينات الحية المستقلة (Canary Validation) عبر البنوك الثلاثة:
    - تأسيس: `TAH-MATH-YLM26-P005-Q01` (HTTP 200, WebP 725x109)
    - تأسيس: `TAH-MATH-YLM26-P006-Q06` (HTTP 200, WebP 725x109)
    - تأسيس: `TAH-MATH-YLM26-P088-Q12` (HTTP 200, WebP 695x109)
    - تجميع 1: `TAH-MATH-COL26-P005-Q01` (HTTP 200, WebP 704x905)
    - تجميع 1: `TAH-MATH-COL26-P036-Q08` (HTTP 200, WebP 713x1011)
    - تجميع 1: `TAH-MATH-COL26-P132-Q15` (HTTP 200, WebP 704x168)
    - تجميع 1: `TAH-MATH-COL26-P132-Q24` (HTTP 200, WebP 704x321)
    - تجميع 2: `TAH-MATH-COL26OLD-P007-Q19` (HTTP 200, WebP 704x893)
    - تجميع 2: `TAH-MATH-COL26OLD-P071-Q36` (HTTP 200, WebP 704x97)

## TAHSELY MATH 2026 — CLOUDFLARE R2 OLD OBJECTS PURGE — CLOSED ✅ — 2026-10-13

- **النطاق والهدف:** الحذف النهائي لجميع كائنات الصور القديمة غير المقصوصة جيداً من حاوية التخزين السحابي Cloudflare R2 (`almeaa-media`) لضمان عدم وجود أي ملفات قديمة معزولة وتنظيف التخزين بالكامل.
- **إجراءات الأمان والتدقيق قبل الحذف:**
  1. فحص تقاطع المفاتيح (Key Overlap Audit): تم التحقق من أن عدد المفاتيح المتقاطعة بين الصور القديمة والجديدة = **0** تماماً (انعدام أي تعارض).
  2. فحص قاعدة البيانات: تم التأكد من أن قاعدة بيانات MongoDB Atlas تحوي **0** إشارة أو رابط للصور القديمة.
- **التنفيذ:**
  - تم تشغيل `server/src/scripts/purgeAllOldMath26FromR2.ts` عبر بروتوكول AWS SigV4 Presigned DELETE.
  - إجمالي الكائنات المحذوفة: **2,595 / 2,595 (100.0%)**.
  - الأخطاء: **0**.
- **التحقق المستقل بعد الحذف:**
  - عينات فحص المفاتيح القديمة عبر الـ CDN الحي: **11/11 أكدت استجابة HTTP 404 Not Found**.
  - عينات فحص المفاتيح الجديدة عبر الـ CDN الحي: **11/11 أكدت استجابة HTTP 200 OK**.
  - تقرير الحذف المعتمد: `ops/math26/MATH26_PURGE_REPORT.json` بحالة `PURGE_SUCCESSFUL_VERIFIED`.

## TAH-MATH PURGE INCIDENT REMEDIATION & COL2627 FULL RESTORATION — CLOSED ✅ — 2026-10-13

- **تحليل الحادث والسبب الجذري:**
  - أثناء تنفيذ حذف رياضيات التحصيلي التجريبية القديمة في `execute_purge_old_math.mjs`، تطابق الفلتر `{ "sourceMeta.documentCode": { $regex: /^YLM|^COL26/i } }` مع بادئة `COL2627` التابعة للقدرات الكمي (`sub_1777779748206`).
  - أدى ذلك إلى حذف 946 سؤالاً من بنك القدرات الكمي المعتمد بالخطأ بالإضافة إلى أسئلة الرياضيات القديمة الـ 2,595 (إجمالي 3,541 سؤالاً).
  - بفضل حماية سكربت صور R2 لمسارات `/quant/`، لم تُحذف أي صورة تخص القدرات الكمي وبقيت جميع صور `COL2627` سليمة بنسبة 100%.

- **إجراءات الاسترداد المعتمدة والأرقام الدقيقة:**
  1. **مصدر الاسترداد الموثوق:** استرجاع البيانات بالكامل من الحزمة الأصلية المعتمدة `scratch/col2627_db_ready_import_batch.json` مع مطابقة تقرير القفل المعتمد `docs/audits/COL2627_CONTENT_LOCK_FINAL_2026-09-28.json`.
  2. **عدد السجلات المستعادة:** **946 / 946 سؤالاً** بالمعرفات الأصلية `_id` و`questionCode` ومفتاح الإجابة وتصنيف المهارات وروابط الصور وبصمات التشفير.
  3. **حالات الاعتماد المقفلة:**
     - **939 سؤالاً معتمداً (`approved`).**
     - **7 أسئلة معيبة من المصدر محجورة ومرفوضة (`rejected`):** (`QDR-QNT-COL2627-P009-Q05`، `P033-Q45`، `P033-Q46`، `P046-Q38`، `P050-Q32`، `P051-Q01`، `P053-Q07`).
     - **0 مسودة (`draft`).**
     - تصحيح مفتاح الإجابة للسؤال `QDR-QNT-COL2627-P074-Q08` إلى الخيار (د / 360).
  4. **إجمالي أسئلة القدرات الكمي في `almeaa.questions`:** عاد إلى **3,922 سؤالاً** (2,976 + 946) بنسبة 100%.

- **سلامة الصور وروابط R2 والاختبارات:**
  - فحص تدقيقي شامل لكافة صور `COL2627` الـ 946 عبر شبكة Cloudflare R2: **946 / 946 استجابة HTTP 200 OK (WebP)**، ونسبة الفشل **0.0%**.
  - فحص ارتباط الاختبارات والتدريبات: لا توجد أي إشارات معطلة أو مكسورة.

- **تنظيف المخلفات التجريبية لرياضيات التحصيلي القديمة:**
  - تم فحص وحذف **9 مهارات تجريبية** (`sk_sub_1777784609152_1_1` إلى `sk_sub_1777784609152_3_3`) و**3 أقسام تجريبية** (`sec_sub_1777784609152_1` إلى `sec_sub_1777784609152_3`) بعد التأكد من أنها تتبع المادة القديمة فقط ولا يرتبط بها أي سؤال.
  - تم الحفاظ الكامل على كائن مادة الرياضيات التحصيلي (`sub_1777784609152`) في جدول `subjects` لربطه بالهيكل الجديد.
  - بنك الرياضيات الجديد في `tah_math_v2_staging` لم يُمس نهائياً: **2,270 سؤالاً، 30 مهارة رئيسية، 245 فرعية، 110 موضوعات تأسيس** سليمة 100%.

- **حماية وتأمين بيانات الاتصال (Security Hardening):**
  - تم نقل بيانات الاتصال المباشرة بقاعدة بيانات MongoDB Atlas بالكامل إلى متغيرات البيئة الآمنة (`MONGODB_DIRECT_URI` في `server/.env`).
  - تم حذف أي نصوص اتصال أو كلمات مرور مكشوفة من ملفات السكربتات وسجلات التنفيذ.
