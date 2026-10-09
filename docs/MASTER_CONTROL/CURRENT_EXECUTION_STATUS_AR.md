# ALMEAA — Current Execution Status

متابعة ظهور تكليفات المعلم — 2026-10-09: القراءة الفعلية أثبتت أن اختبار المشرف الفردي متاح للمعلم لكنه غائب عن قائمة تكليفاته. تعديل محدود يربط التوجيه الفردي والمدرسي بقائمة طلاب الفصول المسندة الحالية، ويبقي النشر/الملكية وعزل المدرسة والفصل، بحد100 وبدون polling أو قراءة أسئلة.7حالات جمهور ضمن اختبارHTTP الحقيقي. الحالةPARTIAL حتىCI والنشر وإعادة الواجهة. الدليل `docs/audits/TEACHER_DIRECTED_ASSESSMENT_DISCOVERY_2026-10-09.md`.

إغلاق الاختبارات الموجهة وربط الأدوار — 2026-10-09: #493 مدمج ومنشورcb4c49d5، رأس الكود25852c16:22SUCCESS4SKIPPED وكل3فحوص مطلوبةPASS. رحلة الإنتاجVERIFIED بحد5أسئلة/طالبين مستهدفين/طالب واحد أكمل: قائمة المشرف وتقريره1/2=50% ودرجة40، مراجعة الطالب محفوظة، تذكير الغائب فقط، وعزل النتيجة والتقرير403. أنشئ مدير تجريبي بتفويض المالك، تسجيل الدخول وربط المدرسة والمعلم والفصل وظهور الاختبار الفردي ناجحة. طلب ملخص واحد ومراجعة واحدة حسب الحاجة، وموبايل المشرف/الطالب بلا تجاوز عرض. Post Deploy/Live RoleعلىmainSUCCESS بعد إطلاق يدوي لأن رسالةsquashورثتskip-ciتوثيقية. لا شهادة ضغط مدرسة كاملة. الدليل: `docs/audits/SUPERVISOR_DIRECTED_RESULTS_AND_SCHOOL_LINKAGE_2026-10-09.md`.

تحديث الاختبارات الموجهة وربط المدرسة — 2026-10-09: رحلة اختبار5أسئلة لحسابَي التدقيق أثبتت ظهور الاختبار والحل وحفظ النتيجة ورفض طالب آخر. كشف الإنتاج أن شاشة المشرف تقرأ نتائج حسابه الشخصية بدل نتائج طلابه؛ الإصلاح يستخدم قارئ النطاق الحالي في حالة منفصلة وصفحات100، ويصحح جمهور التحليل وأحدث المحاولات ومسار التذكير. أنشئ مدير تجريبي وربط بالمدرسة بتفويض المالك؛ قراءة المدير والعزل نجحا عبرAPI. تصحيح رؤية المدير للتوجيه الفردي قيد CI/النشر. الحالة PARTIAL. الدليل: `docs/audits/SUPERVISOR_DIRECTED_RESULTS_AND_SCHOOL_LINKAGE_2026-10-09.md`.

تحديث التسليم الفعلي للحصة — 2026-10-09: نُشر #487/#490/#491، والإصدار58b3f5afada2 على الواجهة والخادم، والجاهزية وRedis وفحوص الأدوار والنشر ناجحة. رحلة واجهة مدرس وطالب ناجحة: بدء منتظر،3دفعات×5 تصل تلقائيًا، تسليم وعودة للانتظار بعد كل دفعة، ثم تقرير ظاهر ومحفوظ15إجابة/3دفعات/1مشارك من24طالبًا في القائمة. قراءة جديدة تطابقت والطالب رُفض403 من تقرير المعلم. قُسم انتظار الطالب وإرسال الدفعات وخُففت الطلبات المتكررة. الحالة VERIFIED لهذا المسار المحدود؛20أجهزة/الضغط الفعلي NOT PROVEN. الدليل docs/audits/CLASSROOM_WAITING_AND_PREPARED_BATCHES_2026-10-09.md.

تحديث مسار الاتصال — 2026-10-09: #490 دُمج بعد16فحصًا ناجحًا. توجيه القناة يعمل لكن الموقع يقبل المسار دون الشرطة المائلة الأخيرة، بينما الخادم المباشر يحتاجها. تعديل صغير في العميل يطابق كل بيئة، واختبار فعلي لكلا المسارين ناجح محليًا. إعادة رحلة الطالب والمدرس بعد CI والنشر ما زالت مطلوبة؛ الحالة PARTIAL.

تحديث توصيل الدفعات تلقائيًا — 2026-10-09: #487 دُمج ونُشر بعد18فحصًا ناجحًا، لكن التجربة الفعلية كشفت404 لقناة التحديث من الموقع رغم عملها على الخادم. أُغلقت حصة الاختبار فقط بأمان. تعديل توجيه قناة Socket.IO الحالية واختبار مشاركة الاتصال وتمرير ملفات الدخول والأحداث ناجح محليًا؛ CI والإعادة الفعلية قيد التسليم. الحالة PARTIAL حتى ظهور الدفعات تلقائيًا لدى الطالب.

آخر تحديث: 2026-09-27

## الحالة المختصرة

تحديث توضيح هدف الحصة — 2026-10-09: الحصة للتقويم بين أجزاء الشرح على السبورة الفعلية. يبدأ الطلاب في انتظار، ثم دفعات مهارية محضرة داخل الحصة نفسها. بإذن المالك جُرّبت ثلاث دفعات×5 على فصل موجود مع طالب واحد؛ الانتظار والتسليم والتقرير المحفوظ بعد دخول جديد ناجحة، دون حذف بيانات قديمة. تعديل الواجهة للبدء المنتظر وإرسال الحزم من داخل الحصة وتقسيم انتظار الطالب إلى مكوّن مستقل قيد CI والتسليم. الدليل `docs/audits/CLASSROOM_WAITING_AND_PREPARED_BATCHES_2026-10-09.md`؛ لا ادعاء20متصفح/أجهزة فعلية.

تحديث استعادة Redis وتبسيط بدء الحصة — 2026-10-09: #485 دُمج ونُشر؛ الفحوص المطلوبة على رأس الكود نجحت. استأنف المالك Redis وأصبح فحص الجاهزية200 واتصال قاعدة البيانات والطوابير وحماية الطلبات ناجحًا. دخول المدرس والطالب والمشرف3/3 ناجح. تعديل متابعة محدود يعالج انتظار تحميل الفصول والضغط المتكرر وطلب الحصة المفتوحة دون المدرسة؛ CI النهائي قيد التسليم. الرحلة الكاملة لم تُثبت بعد؛ حساب الفحص مرتبط بفصل فعلي وينتظر تحديد المالك قبل إرسال حصة إليه. الدليل: `docs/audits/CLASSROOM_RECOVERY_AND_START_EASE_2026-10-09.md`.

تحديث تقييم المعمل — 2026-10-09: دُمج #484 لتجميع تحديثات الإجابات بعد نجاح جميع الفحوص المطلوبة. طلب المالك تقريرًا محفوظًا لكل طالب ومهاراته بعد إرسال خمس أسئلة؛ يعمل الفرع `codex/classroom-lab-evaluation` على هذا الامتداد باستخدام الطوابير والدفعات والتقارير الحالية. الدليل `docs/audits/CLASSROOM_LAB_EVALUATION_2026-10-09.md`؛ إغلاق الإنتاج ما زال متوقفًا على Redis واختبار الرحلة الفعلية.

تحديث نطاق الحصة واستهلاك الخادم — 2026-10-09: تعديل محدود لجمع تحديثات إجابات الطلاب في شاشة المدرس والعرض، وفحوص محلية ناجحة؛ CI على الرأس النهائي قيد التسليم. عاد خادم التطبيق للعمل، لكن Redis الحالي ما زال موقوفًا ومحاولتا الاستعادة عبر Render رجعتا500؛ فحص جاهزية التوسع ودخول الأدوار لم ينجحا. الحالة PARTIAL/BLOCKED وليست إغلاق إنتاج. الدليل: `docs/audits/CLASSROOM_SERVER_EFFICIENCY_2026-10-09.md`.

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
| 8 — Question Bank Integrity | DOMAIN ACTIVE | #264 + FND26/COL2627 |
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
- #475 runtimeb708f77b CI18SUCCESS3SKIPPED requiredPASS; mergec4234fc6 deployed API/readiness/Vercel6932622086/PostSmoke37760638879 PASS. Real division Arabic/reply/English3/3 complete/no fallback, raw procedural hints safe, output204/95/191. Manual review found only unit-digit result, missing full quotient. Follow-up codex/teaching-board-reference-result appends the existing authorized review reference answer only to final lesson scene/narration; no hints/replies/grades/auth change. Complete-reference result audit pending; physical voice/mic/science coverage NOT PROVEN.
- #474 head80e98836 passed19SUCCESS3SKIPPED; merge0a400e3a deployed with API/readiness/Vercel6932207460/PostDeploySmoke37758187637 PASS. Matching owned division UI replay confirms old hint replacement and prose n cleanup. Fresh provider audit fell back (438 output, incomplete JSON). Follow-up codex/teaching-board-bounded-prompts removes conflicting legacy verbose/Arabic-only rules from structured requests and bounds solution to1–3 short items, existing450 cap. Not closed pending real-provider proof; physical voice/mic and science review samples NOT PROVEN.
- #470 deployed138c037894b5: spoken-math preparation, exact-head CI18SUCCESS3SKIPPED and production identity/readiness/Vercel/Post Deploy Smoke/utterance replay PASS. Continuation from current main e35dd8af on codex/teaching-board-safe-hints replaces free provider checkpoint hints with local procedural coaching (including cached plans), removes hint generation tokens, and fixes observed prose n separators while preserving math notation. Real-provider hint/content validation after deployment pending; physical voice/mic and science samples remain NOT PROVEN.
- #466 deployed75d2d54ae533; production owned-review UI replay PASS with captured Arabic/reply/English responses and simulated speech completion, no additional inference. Continuation codex/teaching-board-spoken-math prepares math speech locally and selects matching voices. Additional real division audit3/3 complete, reference result309705 agrees, output435/116/323 within450. Available owned cards are quantitative only; broader science and audible-device certification remain PARTIAL.
- PR #465 exact head 4427ed91: 18 SUCCESS / 3 SKIPPED, all required PASS; deployed merge 50b0cd521148 with API/readiness/Vercel/Post Deploy Smoke PASS. Three real Gemini owned-review requests passed Arabic/reply/English structure, required practice and bounded actual usage (353/183/254 output tokens). Manual review: reference answer correct and hints do not reveal it. Mixed prose/formula rendering discovered; focused frontend repair on codex/teaching-board-mixed-content. Status PARTIAL pending this deployment and real phone/tablet voice/microphone and broader subject certification.
- PR #463 deployed a65412001bf0: Arabic/feedback returned valid plans; practice omission and incomplete English JSON still failed acceptance. Follow-up codex/teaching-board-structured-plans replaces prose-only layout generation with compact typed content and deterministic server assembly, within the existing cap. Production educational/audio certification remains PARTIAL.
- PR #459 deployed as 1984efca1074, readiness/Vercel PASS. Owned-review validation still fell back safely despite elimination of thinking-token gap; follow-up branch codex/teaching-board-live-validation bounds the plan to two scenes and adds private structural diagnostics. Production correctness/audio status remains PARTIAL.
- Real-provider continuation: Gemini connectivity PASS; 4 bounded live-chat samples were truncated. Focused board-only Flash generation repair is on PR #459; owned-review post-deploy audit remains required. See docs/audits/TEACHING_BOARD_REAL_PROVIDER_2026-10-08.md.
- Owner-directed scope: current AI gateway integration and browser-side interactive board; baseline main@f40a785e, branch codex/smart-teacher-live-board.
- Status: PARTIAL; no production closure or deployment. Existing Master Control plan exit gates remain as recorded.
- Added validated versioned plans, local deterministic playback, narration adapter, contextual follow-up board and saved main-lesson resume. Existing authorization, budgets, scoring and image policy preserved.
- Evidence and remaining live-provider/voice checks: docs/audits/INTERACTIVE_TEACHING_BOARD_V1_2026-10-08.md. Exact-head CI is tracked on the attached PR.
- متابعة السبورة 2026-10-08: نشر #476 بالنسخة `3751d5fdbc08` وفحوص الإنتاج ناجحة بعد إعادة بناء Render؛ الشرح العربي يعرض وينطق 309705 كاملة، لكن التجربة الثلاثية فشلت بسبب رد مزود فارغ ثم JSON ناقص في إعادة واحدة. متابعة `codex/teaching-board-fallback-budget` تضبط تفكير النموذج البديل 3.8 بميزانية محدودة وتسجل اسمه الحقيقي؛ CI والتحقق المنشور لم يكتملَا. الحالة PARTIAL، ولا اعتماد للصوت الفعلي أو جميع المواد.
- ضمن #478: إصلاح أوامر LaTeX الظاهرة وسط النثر العربي محليًا في المتصفح، وإضافة صيغة الرد المنشور إلى الاختبار. إعادة عرض الرد المرجعي أثبتت استكمال الدرس دون طلب ذكاء جديد؛ اكتمال الردود الحقيقية والصوت الفعلي ما زالا قيد التحقق.
- نشر #478 بالنسخة `6e45e281f46e` ناجح؛ تجربة القسمة الحقيقية 3/3 بالعربية والمراجعة والإنجليزية بلا fallback، والإجابة 309705 كاملة والتلميحات إرشادية. فحص الصورة كشف التحام أرقام السطور في المعادلات الخالصة؛ متابعة `codex/teaching-board-formula-lines` تفصل كل سطر محليًا وتعيد استخدام الردود الملتقطة بلا طلب ذكاء جديد. اعتماد الصوت الفعلي وبقية المواد ما زال PARTIAL.

- مراجعة المدرسة والحصة 2026-10-08: فرع `codex/school-assignment-classroom-audit` من `main@877940bda4b4`؛ إصلاح توسعة نطاق مشرف الفصل في ثلاث واجهات وحالات التذكير، واستعادة تشغيل رحلة المشرف والطالب المعزولة في CI. الفحوص المحلية ناجحة؛ exact-head CI والنشر قيد التحقق. الحالة PARTIAL، ولا بيانات تعليمية إنتاجية منشأة. الدليل: `docs/audits/SCHOOL_ASSESSMENT_CLASSROOM_JOURNEY_2026-10-08.md`.

- School audit PR #481: unchanged runtime c32a49b9 passed isolated backend integration and Smart Classroom Hardening (25 HTTP students, 83 requests, 4 sockets; not browser/production pressure). Admin source smoke updated to call the verified extracted helper and run behavioral parity; final-head CI tracked on https://github.com/nasef6464/almeaacodax/pull/481/checks. Production certification remains PARTIAL.
