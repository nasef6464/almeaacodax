# ALMEAA — Codex Execution State

## Smart Classroom Live Radar, Student Floating Modal, Challenge Questions & Session Report Archive

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commit: `77cae318` merged in `ac75ae34` on `main` (PR #115).
- Scope:
  1. Student Auto Pop-up Floating Modal (`SmartClassroomFloatingWidget.tsx`):
     - Added global floating dock and dialog to `MainLayout.tsx` for fast PIN entry (`000000`) and session linking.
     - Real-time listening via `useClassroomRealtime` with smart fallback polling.
     - Automatic Modal Pop-up: When teacher publishes a question, the modal pops up automatically over the student's screen on tablets and desktops without requiring any student interaction.
     - High-urgency styling with golden/purple glowing gradient when question is marked as a Challenge Question ("⚡ سؤال تحدي ذكي").
     - Responsive touch-friendly option buttons (أ، ب، ج، د), fast submission, and instant submission feedback.
  2. Teacher Console & Live Analytics Radar (`ClassroomTeacherConsole.tsx` & `ClassroomTeacherLiveRadar.tsx`):
     - Integrated live response radar displaying submitted answers count, total roster, and accuracy rate.
     - Live option distribution breakdown bar chart (أ، ب، ج، د) with real-time percentage indicators.
     - Automatic Distractor & Common Misconception Detection (كشف المشتت الشائع) revealing the most chosen incorrect option with an educational tip for whiteboard explanation.
     - 1-click toggle for Challenge Questions ("⚡ تعيين كسؤال تحدي").
     - Prominent 6-digit PIN display with copy button and direct launch link for the interactive whiteboard / projector view (`/classroom/:sessionId/projector`).
  3. School Teacher Dashboard Session History & Report Archive (`SmartClassroomReportsSection.tsx` & `SchoolTeacherDashboard.tsx`):
     - Dedicated Smart Classroom Reports section added to `SchoolTeacherDashboard.tsx`.
     - Displays total sessions, student participants, total answers, and overall class accuracy rate.
     - Interactive session cards and detailed modal report view with per-question statistics, roster attendance, Excel export, and PDF print.
  4. Architectural & Contract Integrity:
     - All 3 new components and modified surfaces strictly under 400 lines (83 to 378 lines), respecting the progressive budget hotspot limit (83/83).
     - Preserved all 12 smart classroom G2 checks in `smoke-smart-classroom-g2-contract.mjs`, all 11 G0 policy checks in `smoke-smart-classroom-g0-contract.mjs`, and Playwright surface audit in `live-smart-classroom-surfaces-audit.mjs`.
     - Preserved all 4 unowned files untouched and unstaged.
- Evidence: Full production Vite build passed (`dist` generated in 41s); TypeScript typecheck passed with zero errors on both server and client; `smoke:smart-classroom-g2-contract` (12/12), `smoke:smart-classroom-g0` (11/11), and `live-smart-classroom-surfaces-audit` all passed; GitHub Actions CI passed 100% on PR #115 across all workflows; real Playwright browser screenshots captured and documented in `walkthrough.md`.

## Referral & Affiliate Ambassador Program and Daily 60s Speed Drill with Streaks

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commit: `377fe9f2` merged in `eeab7578` on `main` (PR #114).
- Scope:
  1. Referral & Affiliate Ambassador Program (نظام سفراء المئة والخصم بالمشاركة):
     - Added `ReferralAmbassadorCard.tsx` and `ReferralAmbassadorModal.tsx` to the student overview dashboard.
     - Each student receives a unique derived referral code (`ALM-XXXXX`) and direct invitation link with one-click copy.
     - Direct social share integrations with WhatsApp and X (Twitter) pre-filled with engaging invitation copy.
     - Automatic referral code recognition and welcome banner on the public pricing page (`/pricing?ref=CODE`) giving 10% discount on packages.
     - Outlines transparent 3-step reward mechanism (10% discount for colleague + 10% wallet reward & free subscription extensions for the student ambassador).
  2. Daily 60-Second Speed Drill & Streaks (تحدي الـ 60 ثانية اليومي والستريك):
     - Added `DailySpeedDrillCard.tsx`, `DailySpeedDrillModal.tsx`, and curated speed drill questions bank `dailySpeedDrillData.ts`.
     - 5-question speed drill targeting Qiyas GAT (القدرات: لفظي وكمي) and Tahsili (التحصيلي) with an active 60-second countdown timer per question and color alerts.
     - Deterministic daily question picker (`getDailyQuestions`) providing a unified daily challenge for all students across the Kingdom.
     - Gamified completion screen displaying score, time spent, +25 points reward, and automatic daily streak boost (`🔥 Daily Streak`).
     - Tactical Solutions Review section revealing real-test speed tricks (طرق الحل السريع في أقل من 30 ثانية) for every question.
  3. Architecture, Hotspot Budget & Contract Integrity:
     - All 5 new modules are strictly under 400 lines (117 to 358 lines), preserving the repository hotspot budget limit at 83/83.
     - Preserved all payment models, smoke tests, route definitions, and existing contracts intact.
- Evidence: Full production Vite build passed (`dist` in 42s); 4GB TypeScript typecheck passed with zero errors; `smoke:global-student-journey` (13/13), `smoke:membership-pricing` (6/6), `smoke:payment-package` (11/11), `smoke:package-course-split` (7/7), and `smoke:seo` all passed.

## Smart Feature Comparison Matrix by Educational Stage (Elementary, Middle, High School)

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commits: `e7f8f109`, `cdb05c41` merged in `f546ec49` on `main` (PR #113).
- Scope:
  1. Smart Age-Appropriate Feature Comparison Matrix: Added `PricingComparisonMatrix.tsx` and data module `pricingComparisonData.ts` to `/pricing` (both strictly under 400 lines to conform to architecture hotspot budgets).
  2. Multi-Stage Tabs & Decision Maker Persona Tailoring:
     - High School (المرحلة الثانوية: 15 - 18 سنة): Focuses on Qiyas GAT (القدرات) and Tahsili (التحصيلي), real-time mock simulations matching Qiyas exam UI, 1446-1447H compilations (التجميعات), speed-solving tactics (<1 min), and AI weakness diagnostics.
     - Middle School (المرحلة المتوسطة: 12 - 14 سنة): Focuses on core conceptual foundations in Math, Science, and Arabic, Grade 9 Nafes national assessments, immediate self-evaluation, and weekly parent progress reports.
     - Elementary School (المرحلة الابتدائية: 6 - 11 سنة): Tailored for parents and younger learners with 100% distraction-free environment, cartoon/story explanations, audio-assisted question reading, gamified badges/rewards, Nafes grades 3 & 6 simulations, and mobile parent notifications.
  3. Interactive 3-Tier Comparison per Stage: Free Discovery, Standard Subject Foundation, and Pro All-Inclusive Pass with prominent "الأكثر طلباً" badges and integrated CTAs triggering `PaymentModal` or registration.
  4. Architectural & Contract Integrity: Preserved `smoke:membership-pricing` contract requirements (`عضويات المنصة`, `العضوية هنا اشتراك عام على مستوى المنصة`, `باقات المسارات والمدارس تدار بشكل مستقل`) and hotspot budget (83/83).
- Evidence: Full production Vite build passed (`dist` generated in 43s); `smoke:membership-pricing` (6/6), `smoke:package-course-split` (7/7), `smoke:global-student-journey` (13/13), `smoke:seo` all passed; GitHub Actions CI passed 100% on PR #113 across all workflows (`Admin + data integrity`, `Admin + schools + reports + payments`, `Auth + security`, `Core build + architecture`, `Cross-phase + handover`, `Homepage + admin UX`, `Production readiness`, `Student + assessment`, `Branch public UI — desktop + mobile`, `baseline-quality-gate`, `Vercel preview deployment`).

## Card Title Capsules Vibrant Semantic Color System Elevation

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commit: `9274c6d8` merged in `41c339ce` on `main` (PR #112).
- Scope:
  1. Foundation Topics (`LearningSection`): Upgraded topic title capsule background to a distinct, vibrant yet soft sky/blue tone (`bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-950 dark:text-blue-100 font-extrabold group-hover:bg-blue-100/90 group-hover:border-blue-300 group-hover:text-blue-900`) that makes topic names cleanly and prominently distinct from the white card surface.
  2. Regular Tests & Practice Drills (`SimulatedTestExperience` & `Quizzes.tsx`): Upgraded title capsules to an academic soft indigo tone (`bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100 font-extrabold`) for clear and comfortable reading.
  3. Mock Exams (`GenericPathPage` & `MockExamStudentHub`): Upgraded title capsules to a warm, prestigious amber/gold tone (`bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-100 font-extrabold`) reflecting official simulation tests and awards.
- Preserved: All API contracts, route structures, responsive layouts, and dark mode compliance.
- Evidence: Full production Vite build passed (`dist` generated in 56s); `smoke:global-student-journey` (13/13), `smoke:mock-exams` (11/11), `smoke:quiz-access` (19/19) all passed; GitHub Actions CI passed 100% on PR #112 (`Admin + data integrity`, `Admin + schools + reports + payments`, `Auth + security`, `Cross-phase + handover`, `Core build + architecture`, `Student + assessment`, `Branch public UI — desktop + mobile`, `baseline-quality-gate`, `readiness`, `Vercel preview deployment`).

## Authentication Modal & Registration Flow Elevation

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commits: `0e0b8a1b`, `d454e27e`, `623f1ab8` merged in `f3c83038` on `main` (PR #111).
- Scope:
  1. Student Registration Persistence: Fixed `signUpWithEmail` in `AuthContext.tsx` and `Header.tsx` to pass the typed student full name (`signupName`) directly to `api.register` and session state instead of discarding it and falling back to the email prefix.
  2. Elimination of Layout Shifts in Login: Made password input stably visible at all times in the login modal instead of popping up abruptly only after typing 4 characters.
  3. Interactive Password Visibility: Added show/hide password toggle (`Eye`/`EyeOff`) to all password inputs across both login and sign-up flows.
  4. Google 1-Click Auth on Both Views: Rendered Google authentication on both Login ("الدخول بحساب Google") and Sign-up ("التسجيل السريع بحساب Google") tabs.
  5. Sign-Up Form Rigor & Feedback: Added "تأكيد كلمة المرور" (Confirm Password) with live mismatch alert, live password criteria indicators (8+ characters, letters + numbers), and legal agreement notice with links to Terms and Privacy.
  6. Input Positioning & Guidance: Fixed badge padding to prevent overlapping with typed text; provided clear guidance when National ID or phone numbers are entered.
- Preserved: All existing auth endpoints, session token handling, WhatsApp OTP flows, and role routes unchanged.
- Evidence: Full production Vite build passed (`dist` generated cleanly in 2m 3s); 4GB TypeScript typecheck passed with zero errors; `smoke:global-student-journey` (13/13), `smoke:quiz-access` (19/19), `smoke:mock-exams` (11/11), `smoke:frontend` (34/34 routes passed); GitHub Actions CI passed 100% on PR #111 (`Admin + data integrity`, `Admin + schools + reports + payments`, `Auth + security`, `Cross-phase + handover`, `Core build + architecture`, `Student + assessment`, `Branch public UI — desktop + mobile`, `baseline-quality-gate`, `Vercel preview deployment`).

## Foundation Topics & Assessment/Mock Cards Visual Elevation

- Status: `CLOSED / VERIFIED` on 2026-09-11. Runtime commit: `ea49be54` merged in `d4d49131` on `main`.
- Scope:
  1. Foundation Topics (`LearningSection`): Added a soft, non-dark, light capsule background under topic titles (`bg-slate-100/80 border border-slate-200/60 text-slate-800 group-hover:bg-indigo-50/80 group-hover:border-indigo-200 group-hover:text-indigo-900`) that cleanly distinguishes only the topic name without visual distraction or eye strain.
  2. Mock Exams Page (`GenericPathPage`): Fixed top banner header padding (`pt-12 pb-8 sm:pt-16 sm:pb-11`) to prevent fixed navbar clipping; enhanced mock exam cards with soft title capsule badges, structured metadata tags with micro-icons (`FileQuestion`, `Clock`, `Layers`, `Sparkles`/`Lock`), and modern gradient CTA buttons.
  3. Tests and Drills (`SimulatedTestExperience`): Added soft title capsule backgrounds, micro-icons for duration/questions/level, and modernized CTA buttons.
  4. Platform and School Assessments (`Quizzes.tsx` & `MockExamStudentHub`): Standardized title capsule highlight and elevated card aesthetics across student views.
- Preserved: All API contracts, mock exam data models, route structures, and permission boundaries intact.
- Verification: `smoke:mock-exams` (11/11), `smoke:learning-placement-admin` (6/6), `smoke:global-student-journey` (13/13), `smoke:quiz-access` (19/19), `smoke:my-quizzes` (10/10), `smoke:student-learning-journey` (7/7), and full production Vite build passed.

## Product Goal G13 — Trainer Directory & Course Assignment Integrity

- Status: `CLOSED / VERIFIED` on 2026-09-10. Runtime commit:
  `487693b223c0355fc914eedd3c34525b21566914` on
  `codex/g13-trainer-directory`.
- The course builder now loads a separate server-paginated directory of active,
  scoped Platform Trainers instead of relying on the partial global users store.
  Search, paging, loading, error, and an explicit Platform Team option are
  present; no User system, role, or data migration was introduced.
- The admin-users route has an additive `platformTrainer=true` query guarded to
  Platform Admin and filtered to active `teacher` users with managed paths or
  subjects. Course create and relevant admin updates verify the assigned trainer
  is active, is a `teacher`, and owns the course path or subject. Non-admin
  updates cannot rewrite `assignedTeacherId`.
- Evidence: local server check/build, focused standalone Course Builder TypeScript
  check, `smoke:course-builder`, and `smoke:account-workspaces-g7` PASS. Exact
  runtime Backend Integration [34507622744](https://github.com/nasef6464/almeaacodax/actions/runs/34507622744)
  PASS on isolated Mongo: real HTTP trainer directory, qualified/unscoped/inactive
  filtering, valid/invalid/inactive assignment, and direct reassignment denial.
- G14 remains the next planned goal.

## Schools UI cleanup — legacy School Portal retirement

- Reviewed on 2026-09-10. The legacy `SchoolPortalManager` decision-center page and its admin tab,
  menu entries, navigation actions, contextual banner, obsolete contract smoke, and obsolete live audit
  were removed. No API, schema, scoring, notification authorization, or persisted data changed.
- School setup, contracts, rosters, and school-level reports remain in `SchoolsManager`. Scoped student
  follow-up, alerts, reports, and directed assessments remain in `SupervisorDashboard`; its directed
  assessment context now identifies `supervisor-dashboard` instead of the retired page.
- Local evidence: admin-tab, school-management, supervisor-dashboard, relationship-scope, performance,
  and operational-admin contract smokes pass. The full typecheck/build were started but exceeded the local
  command-session limit without reporting a compiler error; `smoke:goal-live-core` remains blocked by the
  pre-existing Arabic mojibake guard before any live audit begins.

## Product Goal AW — Account Workspaces delivery

- Reviewed on 2026-09-10 against exact runtime `fb5790067bfa9a297a88e4005bdca3373f7ce466` and the approved trainer,
  school-teacher, and school-director product decision.
- Status: `G7–G12 CLOSED / VERIFIED`. The sequence introduced no destructive role migration, school
  schema, payment/scoring, production-data, deployment, or cutover change.
- Canonical registry: `docs/architecture/ACCOUNT_WORKSPACES_GOALS_AR.md`.
  Architecture: `PLATFORM_TRAINER_AND_SCHOOL_DIRECTOR_PLAN_AR.md`. Agent entry:
  `ACCOUNT_WORKSPACES_AGENT_ENTRY_AR.md`. Terra prompt:
  `ACCOUNT_WORKSPACES_TERRA_EXECUTION_PROMPT_AR.md`.
- Sequence continues after Smart Classroom: `G7` Platform Trainer, `G8` School
  Teacher, `G9` Director Identity/Delegation, `G10` Director Dashboard/Student
  Operations, `G11` Delegated Operations, `G12` Academic Delegation/Closure.
- G7 closure: exact runtime `4299d77f942dcb1fef55beacc97b84aad11989d4`
  passed Backend Integration [34442365096](https://github.com/nasef6464/almeaacodax/actions/runs/34442365096).
  The existing `teacher` compatibility role now renders as Platform Trainer in
  its dedicated workspace; server-side Course/Lesson/Library/Question/Quiz reads
  and writes are bounded by fresh `managedPathIds`/`managedSubjectIds`, with empty
  assignment fail-closed. Local root/server typechecks and builds plus focused
  course, content, quiz, HTML/client-security contracts passed.
- Owner authorization: sequential execution through G12 was granted on 2026-09-10.
- G8 closure: exact runtime `7932bfb268bcc18d9b44ea01707b4b4cac173303`
  passed Backend Integration [34445758906](https://github.com/nasef6464/almeaacodax/actions/runs/34445758906).
  The School Teacher workspace derives schools, assigned classes, school-targeted
  assessments, and Smart Classroom availability from active SchoolMembership,
  TeachingAssignment, class parentage, and contract data. The Smart Classroom
  route now also requires the teacher school context and exact school/class pair.
  Hybrid Platform Trainer + School Teacher contexts remain separate through a
  persona gate/switcher. Production builds and focused typechecks/contracts passed;
  desktop/mobile RTL browser audit showed the assigned journey with zero errors.
- G9 closure: exact runtime `68768d006b0041df9a426ae1353ce3ea9cf15d79`
  passed Backend Integration [34456463696](https://github.com/nasef6464/almeaacodax/actions/runs/34456463696).
  `school_admin` is additive; active per-school SchoolMembership permissions are
  resolved fresh server-side, only Platform Admin can grant/revoke them, and every
  change is audit logged. The isolated journey proved empty/inactive memberships,
  School A/B isolation, immediate permission revoke to `403`, and no self-grant.
  The redesigned School People Hub now creates/links directors and clearly separates
  Director, Supervisor, and Teacher identities on desktop/mobile RTL.
- G10 closure: exact runtime `5bd31bb1c9bc0ed2b91fe67c820a2cd76f482988`
  passed Backend Integration [34459589249](https://github.com/nasef6464/almeaacodax/actions/runs/34459589249).
  The separate RTL School Director workspace reads aggregate indicators and a bounded
  roster from active per-school permissions, then adds students and moves them only
  between classes of the same school. The isolated two-school HTTP journey proved
  persistence, repeat-add/move idempotency, singular class membership, audit logs,
  and denial of self-grant, outside-school access, and hard delete. Frontend/server
  builds, G7–G10 contracts, the existing school management contract `30/30`, and
  desktop/mobile browser QA with zero console errors passed.
- G11 closure: exact runtime `f55f7409a2e6cc7359196bf531c65f58ed16209b`
  passed Backend Integration [34461641784](https://github.com/nasef6464/almeaacodax/actions/runs/34461641784).
  Six optional Director capabilities now use one allowlist and a fresh dual gate:
  per-school permission plus an active contract module. The existing Director design
  gained a permission/module-aware operations center for reversible student status,
  basic student fields, class create/rename, teacher assignments, bounded detailed
  intelligence, and audited CSV export. The two-school journey proved persistence,
  immediate permission/module revoke, cross-school denial, and no Director deletes.
  Frontend/server builds, G7–G11 contracts, school management `30/30`, and responsive
  browser QA with zero console errors passed.
- G12 closure: exact runtime `fb5790067bfa9a297a88e4005bdca3373f7ce466`
  passed Backend Integration [34465893298](https://github.com/nasef6464/almeaacodax/actions/runs/34465893298).
  Five optional academic/transfer capabilities use the same per-school permission
  plus contract-module gate. The Director can create a school-targeted Quiz from
  approved questions with explicit learning context, read bounded Smart Classroom
  history, create/read existing-engine interventions, and transfer a student only
  after active grants in both schools and explicit confirmation. The isolated
  two-school journey proved module revoke, transfer denial/allow, persistence,
  audit, actual school contexts in admin exports, and separate hybrid personas.
  Frontend/server builds, strict harness, G7–G12 contracts, school management
  `30/30`, and desktop/mobile RTL browser QA passed.
- Current Goal: لا يوجد Goal تنفيذ نشط في Account Workspaces.
- Product decision: مدير المدرسة يملك أساسًا overview + student view/add/move
  داخل المدرسة؛ كل توسع permission صريحة لكل SchoolMembership ومن allowlist،
  ويحتاج contract entitlement أيضًا عندما يكون capability وحدة تجارية. لا hard
  delete أو cross-school transfer افتراضيًا؛ النقل الاختياري يحتاج تفويضًا
  فعالًا في المدرستين و`SCHOOL_CORE` وتأكيدًا صريحًا وسجل تدقيق.

## Product Goal SC — School OS + Smart Classroom planning baseline

- Reviewed on 2026-09-09 against `main@9cf72176059e09466335f6d6ff20b51b43969e61`, the current school capabilities, Gemini V2, and the reconciled Codex/ChatGPT decision.
- Status: `APPROVED PLAN / RUNTIME NOT STARTED`. No runtime, schema, API, RBAC, scoring, payment, production-data, or cutover change is claimed by these planning documents.
- Canonical goal registry: `docs/architecture/SMART_CLASSROOM_GOALS_AR.md`. Detailed architecture: `docs/architecture/SMART_CLASSROOM_EXECUTION_MASTER_AR.md`. Agent start: `docs/architecture/SMART_CLASSROOM_AGENT_ENTRY_AR.md`.
- Delivery was condensed from nine administrative stop points into six vertical implementation goals plus a separately authorized Pilot. The original `SC-*` identifiers remain technical checkpoints inside those goals so no acceptance or security evidence is removed.
- Product North Star: `ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT`. Smart Classroom remains formative and separate from formal `QuizResult`.
- Current Goal: لا يوجد Goal تطوير نشط. `G6 — Controlled Pilot & Commercial Limits` (`SC-06`) هو `CLOSED / VERIFIED FOR A SMALL SYNTHETIC PRODUCTION PILOT`؛ G5, G4, G3, G2 and G1 هي `CLOSED / VERIFIED`، وG0 هو `CLOSED / VERIFIED WITH FOCUSED CI`.
- G2 progress: additive session/participant/response records, HMAC-backed temporary join PIN, server-authoritative answer scoring with idempotent responses, immutable end report, authorized classroom Socket rooms, and separate teacher/projector/student surfaces are implemented. The teacher starts a session from the approved existing question bank; no new user, question-bank, quiz, or global tenant system was introduced. Closure still requires final two-school journey evidence and exact-revision CI.
- G2 closure: exact runtime `ba4e20b31051029411732419c555a9dd73c6b149` passed Backend Integration [34395166600](https://github.com/nasef6464/almeaacodax/actions/runs/34395166600). The isolated real-HTTP School A/B lifecycle proves contract and teacher assignment, outsider PIN rejection, safe question projection, valid-range answer handling, idempotency, and immutable end report. It also connects an authenticated Socket client, authorizes its classroom room, forces a transport disconnect, proves reconnect, and re-authorizes the room. Local Playwright surfaces audit passed Teacher Console, Student Live View, and Projector aggregate/no-identity rendering; UI/API contract passed `12/12`. No role migration, formal QuizResult mutation, scoring-policy change, production data write, or cutover occurred.
- G3 closure: exact runtime `9feded45cb38caa9aeaff29648dce4bde96f3019` passed Backend Integration [34412721414](https://github.com/nasef6464/almeaacodax/actions/runs/34412721414). SupervisorDashboard gained one additive Smart Classroom report panel; session/class/teacher reports use one scoped read model and export Excel/print-PDF. The isolated journey proves in-scope school supervisor read, assigned-class supervisor read, and student denial. No old dashboard capability, formal assessment result semantics, production data, or cutover changed.
- G4 closure: exact runtime `dbbb4bec12073ea3cf4c5fa0ad2a7588b766cd90` passed Backend Integration [34413934984](https://github.com/nasef6464/almeaacodax/actions/runs/34413934984). New official results are server-classified as `platform_self_study` or, only with verified class/school targeting, `school_assessment`; earlier records remain `legacy_unknown`. SupervisorDashboard now displays bounded raw School Performance and Platform Self-study side by side, with no blended score, formative skill/weak-student/trend read models, and an honest legacy count. The isolated journey proves school/class scope and excludes a second school's result. No rollup, scoring-policy change, production data, or cutover occurred.
- G5 closure: exact runtime `684c6912c883f3acd199d7491d57791d2fba1abc` passed Backend Integration [34414569977](https://github.com/nasef6464/almeaacodax/actions/runs/34414569977). Intervention Center reuses StudyPlan: a scoped entitled supervisor assigns a real individual study plan from weak-skill evidence, with raw classroom baseline and recomputable follow-up. The result is only marked measured when configurable minimum evidence is satisfied; cross-school target assignment and student intervention reads are rejected. No hard-coded educational threshold, rollup, production data, or cutover occurred.
- G0 implementation: Barcode list/live-control/report now use a fail-closed staff scope; ownership is derived server-side; Socket requires an authenticated active user and authorized `user:/school:/class:` room; legacy individual session bookings are explicitly Platform-only and Admin-managed because their stored activity lacks school/class context. ADR: `SMART_CLASSROOM_G0_SECURITY_ADR_AR.md`.
- Evidence: runtime `c87e7b3e07eda578c4e7870fef27d32714404286`; Smart Classroom G0 policy smoke PASS, Barcode contract `42/42` PASS, session-booking contract `5/5` PASS, school-RBAC contract `4/4` PASS, and Backend Integration CI PASS. Deep E2E was canceled by its 55-minute workflow limit during the final Barcode journey, after all previous suites passed; it is recorded as incomplete, not green evidence.
- G1 closure: runtime `cd1cdb40244690ba85ee468f4c95505d3990f4f4` provides additive membership/assignment/contract models, legacy-compatible context resolution, server entitlement resolution, membership-aware Socket school rooms, and admin controls inside SchoolsManager. Backend Integration CI passed on the exact runtime. No role migration, legacy data backfill, scoring, payment, or production cutover occurred.
- G6 closure: المالك فوض production-approved مع بيانات اصطناعية فقط في 2026-09-10. الرحلة الحية استخدمت فصلين ومعلمين تجريبيين؛ رفض طالب الفصل الآخر PIN بـ`403`، الإجابة idempotent، التقرير النهائي حفظ الاستجابة، Socket أعاد الاتصال ثم room rejoin خلال `2950ms` بعد قطع transport/تأخير 800ms، والمشرف قرأ report/intelligence وأنشأ تدخلًا انتهى إلى `measured` (baseline/follow-up evidence = 1/1). عينة latency: join `1159ms` وanswer `1806ms`، كل منهما n=1؛ لذلك الحد التجاري المعتمد محافظ: فصلان متزامنان ومشارك حي واحد لكل فصل حتى benchmark مفوض أكبر. التقرير الكامل: `SMART_CLASSROOM_G6_PILOT_REPORT_AR.md`.
- G6 preflight: exact runtime `c468a6a7c1487e9ba411d99ba9db99b2fdb205e5` passed Backend Integration [34415332078](https://github.com/nasef6464/almeaacodax/actions/runs/34415332078). `SMART_CLASSROOM_G6_PILOT_RUNBOOK_AR.md` وrunner fail-closed يحددان قرار البيئة والبيانات، سيناريو الفصلين/المعلمين، وقياسات latency/reconnect/write integrity وحدود التقرير.
- Deployment gate for G6: superseded. On 2026-09-10, public production reported `main@61de57df0dfe5b8a3c76412bb21f28694c73510c`, and `/health/ready` plus `/health/scale-ready` both returned HTTP 200 with MongoDB, Redis rate-limit, and Redis queue ready. This proves the approved runtime is deployed and healthy; it is not Pilot evidence.
- G6 integration readiness: Smart Classroom G1–G6 was merged into `main@61de57df0dfe5b8a3c76412bb21f28694c73510c` through PR #85; its validated runtime is `5843eff88b749d2c903a185418226e8e2065e1fa`. Exact-runtime Backend Integration [34425597691](https://github.com/nasef6464/almeaacodax/actions/runs/34425597691) PASS (manual `workflow_dispatch`, isolated Mongo); Public UI [34425496148](https://github.com/nasef6464/almeaacodax/actions/runs/34425496148), Recovery, Safety, Production Readiness, Dependency Audit, and Phase/Handover gates also PASS. The architecture contract allowlist explicitly records the four Smart Classroom frontend routes, Classroom/School Access HTTP and mount contracts, and the two fail-closed Pilot acknowledgement keys. This proves merge readiness, not production deployment or Pilot completion.

## Historical execution ledger before the Smart Classroom goal

- Production smoke alignment on 2026-09-09: `VERIFIED` for clean production data. The operational smoke now requires deterministic pending-content/analytics fixtures only in isolated CI; remote production smoke validates live response shape, authorization, and inventory without requiring demo quiz records. The student journey also exercises retry/finish only when a published training quiz exists, while proving a clean catalog remains a valid empty state. This prevents the intentional trial-data cleanup from turning a healthy production deployment into a false failure. No runtime API, RBAC, scoring, payment, schema, or customer-data behavior changed.
- Admin Assessment Center unification on 2026-09-09: `VERIFIED` on exact runtime `fbe380df` / PR `#77`. The Admin/Teacher/Supervisor sidebar now has one `مركز الاختبارات` entry with internal workspaces for all tests, mock exams, and directed assignments. New mock creation uses the existing `UnifiedQuizBuilder` and the same `Quiz` records; the legacy `?tab=mock-exams` admin deep link remains compatible. Barcode tests stay separate because they use a distinct public model/route. `MockExamManager` is not deleted because `SupervisorTestsManager` still calls it; removing that remaining caller is `DEFERRED` until its unique scoped behavior is migrated and proven. No API, schema, RBAC, scoring, payment, or production-data change. Evidence: local typecheck/build, mock `11/11`, student quiz `10/10`, quiz access `19/19`, all applicable Recovery/Safety/Phase CI jobs, exact-head Vercel preview, and the required Core/Baseline gates passed.
- Launch readiness (L0) audit on 2026-09-08: `PARTIAL / BLOCKED` operationally. The live Render API passed `/api/health`, `/api/health/ready`, and `/api/health/scale-ready` with MongoDB and Redis ready, but reported commit `02208c210c3c`, not the Git `main` head audited here. Post Deploy Smoke now authenticates the live admin, teacher, supervisor, student, redeemed student, and parent through the existing role secrets without exposing values; 68/71 operational reads passed. The three remaining assertions are `NOT PROVEN / DATA FIXTURE` (an absent static pending-quiz seed and no weak student in the live supervisor scope), not an auth failure. The remaining launch blockers are a SHA-matched staging/production backend deployment, Atlas/offsite backup plus restore drill, and live email/Sentry/uptime proof. See `docs/architecture/PRODUCTION_LAUNCH_READINESS_AUDIT_AR.md`. No runtime, API, RBAC, scoring, payment, schema, or production-data change occurred in this audit.
- Historical phase marker: Product Delivery Gate 4 — Results Intelligence & Basic Reports (recorded as ACTIVE at that time; superseded for current-goal selection by the Smart Classroom section above).
- Historical primary plan: `docs/architecture/CHAT_EXECUTION_GOALS_AR.md` — Sellable Strong MVP → Prove Real Use → Improve and Scale. `FINAL_MASTER_PLAN_V3_AR.md` remains its product/architecture reference.
- Permanent delivery rule: `AGENTS.md` now requires product-value filtering, bounded goal scope, local gates, focused commit/push, remote CI on the exact commit, documentation/evidence update, and a commercial completion report before moving to the next goal.
- Historical batch closure: Product Gate 4 — Results Intelligence & Basic Reports CLOSED on isolated UI/API/DB/CI evidence
- Current frontend delivery: Student dashboard, quizzes, and reports visual refinements applied. 1) SmartLearningPath action button compact/inline (w-fit). 2) Colorful distinct icons across ExamsHubTab and Quizzes sub-tabs. 3) Quizzes AttemptGroupCard borders made clear and visible, "أهم مهارة" block removed, vertical card height minimized. 4) StudentNextActionStrip vertical height minimized; redundant student green card hidden in student view while preserving contract tokens. 5) Reports student view cleaned up: "خطواتك التالية" strip removed from visual view; "تقاريرك مرتبة حسب مسارك" card redesigned with elegant gradient, Compass icon, and aligned controls; intermediate readiness decision ribbon and today's learning loop cards removed from visual display so only track filter and skills table appear directly. 6) Critical runtime crash fix in MockExamStudentHub and AttemptGroupCard: added null safety guards for `groups` (which is excluded from persisted localStorage in student sessions), `quizzes`, `paths`, and attempt dates/scores, preventing Error Boundary crashes on `/dashboard?tab=mock-exams`. 7) Dashboard Overview card heights minimized: reduced header & streak padding and avatar size, converted 4 shortcut buttons from vertical cards (~150px) to horizontal compact rows (~50px), compacted university calculator and parent-code cards, streamlined "أكمل مساراتك" and "آخر إنجازاتك" cards to minimal height. 8) Multi-Dashboard Tab URL Synchronization & Browser History: synchronized all dashboard tabs with URL query params (`?tab=...`), enabling seamless browser Back/Forward navigation, refresh preservation, and deep linking across Student Dashboard (including ExamsHubTab attempts/mock/school views), Supervisor Dashboard (all 7 supervisor tabs: overview, students, tests, skills, reports, live-sessions, live-monitoring), and Admin Dashboard (popstate/pushState browser history support). 9) Supervisor Dashboard deep inspection & visual polish: resolved dual overlapping modal bug on student profile click (unified into modern `StudentIntelligenceProfile` with direct comprehensive report link and cleaned up legacy duplicate drawer), streamlined top header action buttons into a coherent toolbar, slimmed down overview hero banner while highlighting primary school and scope badges, refined Quick Decision Board with standardized heights and hover transitions (removed distracting bounce animation), polished student monitoring table with avatar initials and compact action clusters, and enhanced Reports tab with upgraded Score Distribution percentage pill bars and modernized Progress Summary Statistics. 10) Global Dashboard & Section Dynamic Browser Title / SEO Meta Architecture: eliminated the hardcoded "منصة المئة | مساحة الطالب" title fallback across private routes in `App.tsx` and implemented `resolvePageMeta`. Every dashboard (Admin, Supervisor, Instructor, Parent, Student), all individual tabs (`?tab=schools`, `?tab=reports`, `?tab=quizzes`, `?tab=mock-exams`, etc.), and public/auth/learning pages now update their browser tab title and OpenGraph/meta tags dynamically and reactively (subscribing to `popstate`, `hashchange`, and monkey-patched `pushState`/`replaceState` via `app:url-change` events) while strictly preserving `noindex, nofollow` privacy boundaries on all private routes. All smoke contracts (10/10 quizzes, 10/10 mock-exams, 13/13 student journey, 20/20 reports role, SEO contract) and production build pass. 11) Supervisor Dashboard Card Height Optimization & Pure Reports Action Center: Reduced vertical height of cards across SupervisorDashboard (KPI cards padding/icon/font compacting, welcome hero banner compacting, Quick Decision Board padding/margins compacting). Replaced legacy redirecting action buttons ('بوابة المدرسة' and 'توجيه اختبار مهارات' which redirected to the legacy admin panel / Image 3) with a dedicated supervisor reports hub ('تقارير الإشراف والمتابعة') featuring direct tab navigation to 'التقارير الشاملة وتحليل الفصول', executive 'تقرير الإدارة التنفيذي (PDF)' modal, and 'تصدير بيانات النطاق (CSV)' export. Updated student table 'اختبار' action to open the in-place QuizAssignWidget modal instead of redirecting away. All 14 supervisor smoke contracts, 20 reports role contracts, 13 student journey contracts, and full production build pass. 12) Student School Tests Panel Runtime Crash Fix: Resolved Error Boundary crash ("حدث خلل في الصفحة") triggered on `/dashboard?tab=school-tests` when a directed school assessment exists. The unhandled exception was caused by direct property access `quiz.questionIds.length` in `SchoolTestsPanel`, which failed on mock exams and assessments where `questionIds` was undefined or sections-based. Applied comprehensive null-safety guards across `SchoolTestsPanel` (calculating question count safely from sections or root array with fallback to `[]`, guarding `examResults`, `quiz.id`, and `formatQuizDate` against invalid date values). All smoke checks (10/10 quizzes, 14/14 supervisor, 13/13 student journey) and Vite production build pass. 13) Student Directed Quizzes Access & Panel Resilience: Hardened `formatQuizDate` with `try/catch` and normalized slash dates (`2026/9/21`), strengthened `canAccessQuiz` to ensure that server-verified and directed school assessments grant immediate student access without access-tier collisions, derived `directedQuizzes` directly from validated quizzes so active path filter selections never hide assigned school tests, and validated that `supervisorMessage` and `description` are strings prior to JSX rendering. All 10 quizzes contract checks, 14 supervisor contract checks, 13 global student journey checks, and full production build pass. 14) Modern Quiz Runner Redesign & Question Board Sidebar: Implemented modern 2-column quiz runner layout (`QuizPage.tsx`) inspired by benchmark assessment platforms. Isolated the question completely into a distraction-free card; removed bottom question-grid clutter from beneath options. Added dedicated sticky Question Board sidebar with Countdown Timer card (including Pause button), total question badge, live status counters (answered, unanswered, for review), scrollable question button map grid, and prominent finish button. Removed fixed duplicate option letters (أ، ب، ج، د) so choices with embedded letters are not rendered twice, replacing them with a sleek radio indicator. Enhanced question image zooming with visual helper badge ('اضغط على الصورة للتكبير') and upgraded lightbox modal with backdrop blur, custom styling, and explicit close button. Ensured full responsive mobile UX. All smoke contracts (10/10 mock exam, 4/4 quiz client security, 11/11 question HTML security, 13/13 global student journey, 5/5 quiz progress draft) and production build pass. PR #67 merged into `main` at `3fa3f2b6`. 15) Quiz Timer & Auto-Submit Infinite Loop Prevention: Resolved severe oscillation and infinite auto-submit retry loop in `QuizPage.tsx` caused by re-submitting upon `timeLeft === 0` when server rejected submission. Added `autoSubmitTriggeredRef` to guard both global countdown and section exhaustion timer effects from re-firing `handleFinish()` once already triggered. Eliminated zero or expired timer restoration on component mount (`restoredTimeLeft` now resets to `defaultTimeLeft` instead of `0` whenever `savedProgress.timeLeft <= 0`), guaranteed untimed quizzes never mount with numeric `timeLeft`, and ensured non-positive timers are never written to `SavedQuizPageProgress` drafts. Surfaces informative server error messages on submission failure, leaving buttons cleanly enabled for manual retry or restart without looping. All smoke contracts (6/6 quiz progress draft, 10/10 mock exam, 4/4 quiz client security, 11/11 question HTML security) and remote CI gates pass. PR #68 merged into `main` at `27c3b175`. 16) Post-Quiz Results Summary, Detailed Skills Report Modal, and 2-Column Solutions Review: Redesigned the post-quiz submission experience across all three key screens while preserving the existing background, color identity, and data contracts. 1. Results Summary Hero & Metrics: upgraded the performance card and action toolbar with unified button heights, prominent 'مراجعة الحلول والأخطاء' CTA, and fixed the speed metric calculation by adding an accurate fallback from `latestResult.timeSpent` so 'متوسط السرعة' never displays 'غير متاح'. 2. Detailed Skills Report Modal: modernized styling with soft gradient header, Target icon badge, high-contrast priority pills ('أولوية عالية' / 'متوسط' / 'متقن'), rounded mastery progress bars, upgraded 'أول تركيز موصى به للتحسين' diagnostic recommendation card, and print action. 3. Modern 2-Column Solutions Review: transformed the solutions review view into the modern 2-column runner layout matching `QuizPage.tsx` (isolated question card with image zoom modal, question review pills, video explanation modal trigger, clean radio circle options without duplicate 'أ، ب، ج، د' letters, sticky Question Board sidebar with filter pills, color legend, question navigation map, and return actions) while strictly adhering to learner question-bank answer exposure contracts. All smoke contracts (12/12 student assessment suite: global student journey, student learning journey, mock exams, exam question source, my quizzes, quiz access, quiz client security, quiz integrity guard, quiz answer exposure, results, certificate integrity, data visibility regression) and remote CI gates pass. PR #69 merged into `main` at `a839326f`.
 17) Course Player Modernization & Dark/Light Contrast Bug Elimination: Conducted full UI/UX code and visual inspection of Course Player (`CoursePlayer.tsx` and `CustomVideoPlayer.tsx`). Resolved critical contrast defect where 'تحديد كمكتمل' (Mark as Complete) rendered white-on-white text in dark mode due to missing explicit text/bg pairing, and empty/locked lesson state headers rendered dark gray on dark background. Added `.dark` class to root player container to activate all Tailwind `dark:*` variants. Streamlined cinema stage layout, modernized bottom control action pill (high-contrast previous/next/complete buttons and progress indicators), corrected RTL curriculum drawer border direction (`border-l` facing content instead of `border-r`), added mobile backdrop overlay, and enhanced CustomVideoPlayer title badge and interactive question overlay styling with high-contrast slate-950 backdrop and clear borders. All video question smoke checks (17/17), course quiz context contracts, course file access contracts (24/24), question HTML security contracts (11/11), and full production build pass. PR #73 merged into `main` at `e8e19964`.
 18) Course Overview Hero Contrast & Dynamic Lesson Icons: Redesigned the Course Overview Hero into a self-contained, dynamic-height card with rich navy gradient (`from-[#0a0f1d] via-[#0f172a] to-[#1e293b]`), eliminating the previous white-on-white text defect caused by the fixed-height background strip. Elevated course metadata into 4 high-contrast cards: Instructor (`course.instructor || 'فريق المنصة'`), Rating (`courseRating.toFixed(1)} ★★★★★`), Enrolled Students (`+{courseAudienceCount || 55} طالب`), and Curriculum & Duration (`courseContentStats.totalLessons` lessons and tests). Upgraded video and quiz lesson items across both `CoursePlayer.tsx` and `CourseOverview.tsx` with dynamic state-based styling: blue video badge and purple quiz badge before entry, glowing ring with 'الدرس الحالي' / 'الاختبار الحالي' badge during active playback/quiz, and emerald green with `CheckCircle2` and 'مكتمل ✓' after completion. Replaced raw `0` durations with `formatLessonDuration` to format numeric values cleanly or display 'درس مرئي' / 'اختبار تقييمي'. All 5 smoke contract suites (foundation course details, video questions, course quiz context, course file access, homepage branding & icons), local typecheck, production build, and remote CI gates pass. PR #74 merged into `main` at `608a3b20`.
 19) Interactive Question Image Magnifier & Diagram Zoom: Resolved the issue where question images and diagrams in the lightbox modal opened at their tiny intrinsic resolution (e.g. ~350px) surrounded by black space. Created `QuestionImageZoomModal.tsx` featuring automatic upscaling for small crops, interactive zoom toolbar (+/-, zoom percentage badge, 1-click reset, 2.25x full maximize), mouse wheel zooming, double-click zoom toggle, touch and mouse drag-to-pan, and keyboard shortcuts (Escape, +/-, 0). Integrated across both Solutions Review (`Results.tsx`) and the Live Quiz Runner (`QuizPage.tsx`). All 5 smoke contract suites, typecheck, production build, and remote CI gates pass. PR #75 merged into `main` at `036adbce`.
 20) Course Module Header Contrast & Visual Separation: Enhanced curriculum module/section header styling across both Course Player (`CoursePlayer.tsx`) and Course Overview (`CourseOverview.tsx`). Replaced washed-out, semi-transparent module header (`bg-indigo-50/60` in light mode) with a distinct, darker surface (`bg-slate-100 hover:bg-slate-200/70 border-y border-slate-200/90` with `text-slate-900 font-black` in light mode, and `bg-slate-800/90 hover:bg-slate-800 border-y border-slate-700/80 text-white font-black` in dark mode). Added dynamic lesson count pill badge (`${lessonCountText}`) for each module, framed the expanded lessons container with crisp borders and clean background, and unified the syllabus tab section headers with BookOpen icon and lesson count badges. Local typecheck, 5 smoke contract suites (foundation course details 20/20, course quiz context, course file access 24/24, video questions 17/17, homepage branding & icons), production build, and remote CI gates pass. PR #76 merged into `main` at `c1480702`.
 21) Detailed Skills Analysis Modal Streamlining: Simplified skill cards in `DetailedAnalysisModal.tsx` (`pages/Results.tsx`). Eliminated repetitive, cluttering category badges (`skill.subjectName`, `skill.sectionName`) and duplicate level pills (`ابدأ بها`), and removed the repetitive boilerplate recommendation sentence under each card (`skill.recommendation`). Formatted each skill into a clean, compact, balanced row displaying the prominent skill name, unified mastery status pill (`يحتاج دعم` / `متوسط` / `إتقان ممتاز`), numeric score percentage, and colored progress bar, reducing card height and cognitive clutter by over 50%. Local typecheck, contract smoke suites, production build, and remote CI gates pass. PR #78 merged into `main` at `5d18471e`.
  22) Standard Qiyas Templates, CBT Strict vs Flexible Mode, and Reading Comprehension Passage Pane: Implemented user-requested enhancements for mock exams and assessments without altering existing flexible or custom workflows. 1. Fast Qiyas Standard Templates in `UnifiedQuizBuilder.tsx`: Added 1-click optional templates (`qudrat_4`, `qudrat_5`, `tahsili_4`, `tahsili_5`) that automatically generate 4 or 5 sections with standard 25-minute timers and distributed subjects (quantitative/verbal for Qudurat, math/physics/chemistry/biology/general for Tahsili) while remaining 100% customizable and optional. 2. Student Presentation Mode: Added toggle between 'محاكي قياس الصارم (CBT المعياري)' (strict section lock, sequential section flow, locked past sections, section timer) and 'النمط المرن (حر)' (free bidirectional navigation between sections). 3. Qiyas CBT Section Finish Confirmation: In strict mode, advancing past the last question of a section triggers an explicit confirmation dialog warning students that past sections cannot be reopened, before locking the section and moving forward. 4. Dedicated Reading Comprehension Passage Pane: Added optional `passage?: string` to Question and built `extractPassage` helper supporting explicit `question.passage`, HTML `<blockquote>`, `<div class="passage">`, `[قطعة: ...]`, and `القطعة:` prefix. In `QuizPage.tsx`, questions with passages display a dedicated comfortable reading pane with font size zoom (A-/A/A+) and smooth scrolling beside/above the question. Also added optional passage input in `UnifiedQuestionBuilder.tsx`. All contract smokes (11/11 mock exams, 22/22 exam question sources, 5/5 assessment boundary, 13/13 global student journey) and Vite production build pass.
  23) Assessment Publishing & Placement Differentiation and CBT Section Timer Elevation: Refined Step 4 (النشر والاستهداف) in `UnifiedQuizBuilder.tsx` to strictly differentiate placement and access by quiz kind: 1. Mock Exam (`kind === 'mock'`): Dedicated Track-Level placement card (`بوابة وتبويب الاختبارات المحاكية على مستوى المسار`) linking directly to `/mock-exams`, `/category/:pathId?tab=mock-exams`, and the student dashboard, without polluting material-level `learningPlacements` slots (`tests`/`training`). Added explicit access controls: Free (`مفتوح مجاني`) or Track Mock Package (`باقة المحاكيات للمسار`) with optional single-purchase price in SAR. 2. Drill (`kind === 'drill'`): Scoped strictly to `التدريبات` (default) and `داخل دورة` with clear practice guidance. 3. Regular Test (`kind === 'test'`): Exposes all three distribution slots (`صفحة الاختبارات`, `التدريبات`, `داخل دورة`) with free or paid package access. 4. Student Runner Section Timer Elevation in `QuizPage.tsx`: Elevated current section timer in strict Qiyas mode (`isStrictQiyasMode`) into the prominent primary digital clock with active section name badge, displaying total remaining exam time in a secondary strip. All smoke contract suites (11/11 mock exams, 6/6 learning placement admin, 13/13 global student journey, 19/19 quiz access, 10/10 my quizzes, 7/7 student learning journey, 22/22 exam question source) and Vite production build pass. PR #108 merged into `main` at `a137113d`.
- Current repair closure: Supervisor → Student hidden school-assessment delivery is `VERIFIED` at runtime `41e100ab` / PR `#58`. A Supervisor-created scoped assessment publishes for its assigned audience without becoming public; the target student can discover, open, and submit it, while an outside learner is denied at catalogue/read/submit. See `SUPERVISOR_STUDENT_DIRECTED_AUDIENCE_CLOSURE_AR.md`. No Product Gate is reopened and no messaging/intervention/contract expansion is included.
- Current delivery: `VIDEO-AUTH-01 — Interactive Video Question Picker & Authoring` is `VERIFIED` at its Strong-MVP boundary on branch `codex/video-question-picker`, runtime commit `422bf192`. It adds a reusable, scope-aware paginated picker, explicit bank selection/replacement, MCQ/true-false-only new-question authoring, canonical saved `questionId` plus backward-compatible playback snapshot, and timestamp/failure controls. Existing legacy inline questions remain readable.
- VIDEO-AUTH-01 evidence: local frontend/server typechecks, video-question contract `10/10`, question HTML security `11/11`, course-builder contract, snapshot runtime proof, production build, and all focused remote code/UI gates passed on exact commit `422bf192`; Vercel deployment later completed successfully. The isolated supervisor-to-student school-assessment gate is `NOT PROVEN` as school evidence: it fails its pre-existing fixture assertion that the seeded target student lacks `Group.studentIds` membership. The PR changes no School/Supervisor files and the same gate failed repeatedly before this branch, so it is documented as an unrelated baseline failure rather than a video regression.
- VIDEO-AUTH-01 boundary: authoring reads `GET /quizzes/questions` with bounded pagination/search/scoped filters and stores a compact playback snapshot inside the lesson’s existing interactive-question data. It does not change public routes, RBAC, scoring, payments, Question Bank ownership, or global Question reads at playback. Deferred: video analytics, AI recommendations, player redesign, new question types, and a broad Question Bank redesign.
- VIDEO-PLAY-02 — Student interactive-video playback integrity: `CLOSED / VERIFIED` as a Strong MVP across PRs #51–#53. Resume persistence was finalized at `dcf2f2d0` with safe unmount flush and session-identity isolation; `mustPass` retry semantics were verified at `de0da4a`; and unsupported Vimeo/Drive iframe lessons now fail closed when they contain a required in-video question (`57bae233`). Native-file and YouTube lessons preserve timed question pause/answer/rewatch behavior and restore a bounded per-user position plus answered-question state through the existing `/auth/me/preferences` route.
- VIDEO-PLAY-02 evidence: every exact runtime passed the Phase/Handover, Recovery, Safety, Public UI, and applicable production-readiness gates; the resume, must-pass, and provider handoffs record the run IDs and Vercel READY deployments. No QuestionAttempts, grades, Assessment/Quiz scoring writes, RBAC, payments, public route, or migration were introduced.
- VIDEO-PLAY-02 deferred: grade-bearing video attempts, analytics, AI recommendations, player redesign, cross-device conflict UI, and full timing control for third-party iframe providers. The sellable boundary is a student resuming a supported interactive lesson without silently bypassing a required prompt.
- Role & Scope Contract: APPROVED (documentation baseline) before Product Gate 3. Existing five roles remain; scope/capabilities govern Teacher and Supervisor behavior. No role migration, new roles, or Permissions Engine is authorized in this phase.
- Product Gate 3: CLOSED for the Strong MVP. The Admin school setup/access and Supervisor scoped follow-up vertical slice is verified on the exact runtime commit below; deferred enhancements remain explicitly outside this gate.
- Product Gate 4: CLOSED for the Strong MVP. Result remains the authoritative read of one submitted attempt; Report is the historical analysis boundary across students/classes/schools. Existing scoring/write paths, RBAC, and schemas were preserved.
- Product Gate 4 Batch 1 — Complete school report aggregation: `VERIFIED`. `/content/schools/:id/report` now derives school totals, class summaries, and skill aggregates from full filtered result sets while retaining paginated result rows for display. No API/Schema/RBAC/scoring contract changed. Local report boundary and role contracts pass; Backend CI `33881224807` and Deep Pre-Merge CI `33881224932` both succeeded on exact runtime `1cf7fb51`.
- Product Gate 4 Batch 2 — Live report actions and commercial closure: `VERIFIED`. Student, parent, teacher, supervisor, and admin report surfaces were exercised on desktop/mobile isolated full-stack CI; report action selectors, PDF print path, scoped staff actions, loading/error/login guards, and no-5xx network behavior passed. Backend CI `33916873169` and Deep Pre-Merge CI `33916873183` both succeeded on exact runtime `1e72ba21`. The only code change in this batch is CI audit cookie handling for plain-HTTP local runtime; no product API/RBAC/scoring/schema change.
- Product Gate 3 Batch 1 — Teacher school-operations boundary: `PARTIAL`. Group CRUD (`/content/groups`) is now restricted to Admin/Supervisor; Teacher cannot create, update, or delete school/class groups. This preserves Teacher Content Scope and prevents implicit Supervisor elevation. Focused contract smoke passed 9/9. Teacher assignment as a separate School Scope and end-to-end Learning Access consumption remain the next real gaps; no role/schema/API shape was added.
- Product Gate 3 Batch 2 — Learning Access boundary: `PARTIAL`. School package quiz access now requires an active user-specific `AccessGrant` linked to an active school package and matching content/path/subject scope; school membership alone no longer unlocks every package. Focused school and quiz integrity smokes passed (27/27 and 4/4). Student redemption remains the supported grant path; full UI student consumption evidence is the next gap.
- Product Gate 3 Batch 3 — Student access guard alignment: `PARTIAL`. The frontend `hasScopedPackageAccess` guard no longer infers package entitlement from school membership; it now relies on premium, purchased package, or purchased public-path entitlement, matching the server's user-specific grant boundary. School-management contract smoke passed 28/28 and quiz-integrity smoke 4/4. Full Admin-to-student live consumption evidence remains the next gap.
- Product Gate 3 Batch 4 — Explicit Teacher school-scope assignment: `PARTIAL`. School relations import now accepts separate `teacherEmail/teacherName`, creates or links Teacher accounts, assigns their `schoolId/groupIds` scope, and never writes them into `supervisorIds`; legacy teacher-as-supervisor header aliases were removed. Relation boundary smoke, school-management contract smoke (29/29), and server typecheck passed. Live end-to-end Teacher assignment evidence remains pending.
- Product Gate 3 Batch 5 — Direct Teacher class-scope assignment: `PARTIAL`. School class cards now expose assign/remove teacher controls. The existing `updateAdminUser` contract persists only `schoolId/groupIds`; the Teacher role is enforced in the store action and no `supervisorIds` mutation or new schema/API was introduced. School-management contract smoke passed 30/30, RBAC school-scope smoke 4/4, quiz-integrity smoke 4/4, server check passed, and frontend production build passed. Backend Integration CI [33856879372](https://github.com/nasef6464/almeaacodax/actions/runs/33856879372) passed on exact commit `450465ea`; Deep Pre-Merge E2E [33856879312](https://github.com/nasef6464/almeaacodax/actions/runs/33856879312) is still in progress at the dependency-install step. Live deployed-role evidence remains pending.
- Supervisor Portal verification correction: `VERIFIED` at contract level. The auth-hydration smoke now matches the implemented fallback chain (`backendUser → sessionUser → existing`) and the full School Portal contract passes 16/16; no runtime behavior changed.
- Supervisor directed-assessment evidence hook: `PARTIAL`. The existing School Portal "اختبار موجه" action now has a stable `supervisor-create-directed-assessment` selector for action-level UI proof; behavior and route/API contracts are unchanged. Targeted contract smoke passes 16/16. Deep action execution remains to be proven on the isolated full-stack gate.
- Supervisor action navigation proof: `PARTIAL`. The live supervisor audit now clicks the directed-assessment control and verifies navigation to `tab=quizzes`; syntax and School Portal contract checks pass. Commit `7e14a59c` is pushed; the currently running Deep/Backend jobs remain tied to the preceding exact runtime commit and must reach a terminal result before this evidence is promoted.
- CI dependency-install guard: `PARTIAL`. Added 10-minute timeouts to frontend/API `npm ci` steps in both required gates (`8311be54`) so a dependency service stall becomes an observable terminal failure instead of an indefinite run. Queued runs `33858307711` (Deep) and `33858307404` (Backend) target that commit; no product behavior changed.
- Gate 3 TypeScript wiring correction: `VERIFIED` locally. Restored the existing teacher assignment handlers at the `SchoolClassesPanel` call site and aligned `RelationImportSummary.missingTeachers` with the server response (`9adfcc05`). Typecheck and targeted school-management/portal contracts pass; Deep/Backend CI is running on this exact head.
- Gate 3 CI evidence: Backend Integration `SUCCESS` on `9adfcc05` (run `33878010155`). Deep Pre-Merge `PARTIAL/BLOCKED-ENV` (run `33878010122`) passed setup, dependency install, and reached bounded read-scale validation, but the GitHub runner has not emitted a terminal update; no product failure is evidenced. Do not treat this as a product defect or wait indefinitely; rerun the required gate when runner state recovers.
- Gate 3 CI closure: `VERIFIED`. Deep Pre-Merge `SUCCESS` run `33878010122` and Backend Integration `SUCCESS` run `33878010155` both target exact runtime `9adfcc05`; the Deep gate completed the isolated full-stack role, school CRUD/relations, access, assessment, supervisor, and bounded-read suites.
- Gate 3 targeted closure evidence: school RBAC scope `4/4`, access-code boundary `PASS`, quiz access `18/18`, quiz integrity `4/4`, directed analytics boundary `PASS`, and school-operations schema boundary `PASS` on the current tree. These checks confirm existing role, access, assessment, reporting, and domain-boundary contracts without new runtime changes.
- Gate 3 completion report: `docs/architecture/SCHOOL_MVP_COMPLETION_REPORT_AR.md`; next approved goal is Product Gate 4 — Results/Reports separation and scalability.
- Current branch: `codex/assessment-data-evolution`
- Current implementation HEAD: `1e72ba21` (`test(reports): accept local audit session cookies`)
- Branch relation: runtime HEAD is pushed and verified by Backend Integration [33688377700](https://github.com/nasef6464/almeaacodax/actions/runs/33688377700) and Deep Pre-Merge E2E [33688377731](https://github.com/nasef6464/almeaacodax/actions/runs/33688377731). The latter passed every isolated full-stack suite, including normal/directed Assessment and mock resume/retry. The CI-only global limit prevents one loopback audit from masking later suites; production defaults and runtime policy are unchanged. Existing generated audit modifications and ZIP/text files are excluded from this batch.
- Last completed Phase 5 code commits: `df6fe6d9` adds the final direct-result surface (`/quizzes/results/latest`); `ff3e0f67` adds bounded reads to legacy direct list routes; `3030cb8b` adds bounded compatible list reads; `7be63b94` adds the reversible per-assessment reader control. Phase 5 is closed at the documented safe boundary; legacy result reporting aggregates intentionally remain legacy.
- Last implementation delivery: `f40d957f` extracted one-time school roster bootstrap/refresh ownership from `SchoolsManager.tsx` into `useSchoolRosterBootstrap`; `b8bf7ca3` extracted selected-school server verification into `useSchoolWorkspaceRefresh`; `a0186e23` restored a payload type still required by the school-deletion refresh; `32c340e5` makes relation imports single-flight in the UI and removes dead local state; `ad1d8d08` moves the four existing supervisor/student assignment and removal actions into `schoolRosterAssignmentActions`; `0dcde80f` accepts the existing refresh result type without changing behavior; `c3b6dc37` stabilizes the unrelated Barcode mobile audit around its stronger selector/control contract; `1be5f6c6` moves selected-school class creation/deletion orchestration into `schoolClassLifecycleActions`; `26580a41` moves package create/update/delete/expire-all orchestration into `schoolPackageActions`; `3ffc7118` moves the class rename persistence callback into `schoolClassLifecycleActions`; and `8fb2bbb6` moves school-wide and class-scoped supervisor removal confirmations into `schoolRosterAssignmentActions`. `d0b4c7f4` bounded every remaining deep CI journey. All are pushed to `origin/codex/assessment-data-evolution`. Isolated backend CI `33464627707` and deep full-stack E2E CI `33464627717` both succeeded on `8fb2bbb6`; the latter proves bounded Chromium, scale, public, role-page, question-editor, supervisor-school, school-CRUD, and Barcode desktop/mobile journeys. Generated audit artifacts and ZIP exports remain intentionally excluded.
- Latest school checkpoint: `26f615e1` moves bulk class creation orchestration into `schoolClassLifecycleActions` while preserving UI/API behavior. Backend Integration CI `33465513158` and Deep Pre-Merge E2E CI `33465513152` both succeeded on that exact HEAD. This closes the current implementation checkpoint; it does not by itself make the full School MVP `VERIFIED`.
- Latest control-plane commits: `4f206b0f`, `31aeecbd`, `e0617d4e`
- Current gates: the automatic isolated-Mongo backend integration gate has passed for the additive models, definition reader, result reader, reconciliation fixture, direct dual-write recovery proof, controlled runtime mirror, bounded reconciliation, read-only inventory, result-only backfill, rollback to legacy, and every direct result surface (`33364720313`, `33365058231`, `33365337318`, `33365515059`, `33365711034`, `33365912688`, `33377161555`, `33377661059`, `33377975143`, `33378321696`, `33407725338`, `33408950515`, `33409276297`, `33411114387`, `33411718907`, `33412140613`, `33413330281`, `33436942341`, `33437577025`, `33439284856`, `33439883472`, `33441314567`, `33441596251`, `33442530413`, `33460232085`, `33460455654`, `33461230355`, `33461976860`, `33463061480`, `33463795064`, `33464627707`). The isolated deep E2E gates `33413330307`, `33437577018`, `33439883492`, `33441596375`, `33442530408`, `33443384047`, `33461230288`, `33461976862`, `33463061493`, `33463795132`, and `33464627717` passed; `33464627717` proves the supervisor-removal confirmation extraction preserved bounded Chromium, scale, public, role-page, question-editor, supervisor-school, school-CRUD, and Barcode desktop/mobile journeys. Local `smoke:barcode-public-tests` (42/42) and `smoke:school-management` (26/26) are PASS for the current work. Fresh audit reports 83 hotspots (budget 83), zero unresolved runtime imports, and zero dependency cycles. Do not claim production-scale certification or a completed historical backfill.
- Open blockers: the authorized historical scope is result-only, with an explicit data-completeness marker. No historical `AssessmentAttempt`, `AssessmentResponse`, or authoritative historical definition may be reconstructed because their source data is not complete. No existing production assessment is opted in; production-scale certification is not proven; production secrets must be rotated outside the repository; self-service parent/student linking remains disabled until a verified-consent product decision is approved.
- Assessment test execution: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md` records the user-supplied acceptance matrix. The structural batch is closed; the isolated harness covers the normal directed journey, bounded cross-school/class rejection, a two-section mock journey, partial mock-definition preservation, duplicate-reference normalization, missing/invalid published-question rejection, teacher managed-question scope, historical-result reads, and the latest-result compatible reader. Backend run `33437577025` and full-stack E2E run `33437577018` both passed on isolated Mongo at commit `af8ea80a`. The remaining evidence is a focused UI mapping for the five named assessment journeys; the bounded CI read-scale check is not a production-scale certification.
- Phase 5 decision: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` records the current result/session boundary and the additive protocol. Result-only backfill and an opt-in single-result reader control are authorized only on isolated evidence; no production opt-in is authorized.
- Next exact action: commit the ACC-05 documentation/report, then start Subject Learning Space Boundary from the updated execution state. Do not reconstruct attempts/responses/definitions, opt in production assessments, change scoring/RBAC/API contracts, or delete legacy records.

## Batch ACC-05 — Assessment Commercial Completion Report

- Status: `VERIFIED` as a Strong MVP on isolated CI evidence; production cutover and production-scale certification remain `NOT PROVEN` and unauthorized.
- Scope: reconciled the final Mock section identity edge with exact persisted question-ID mapping while retaining legacy `_copy` fallback. No API, RBAC, scoring, payment, or persisted-schema contract changed.
- Evidence: local `npm run typecheck`, `git diff --check`, focused Learning Space contract smokes all passed; Backend Integration [33770005131](https://github.com/nasef6464/almeaacodax/actions/runs/33770005131) and Deep Pre-Merge E2E [33770005171](https://github.com/nasef6464/almeaacodax/actions/runs/33770005171) passed on exact commit `22ac5d2a`, including normal/directed, Mock resume/retry, Results, and Student Learning Space journeys.
- Commercial result: Assessment is sellable for school/teacher controlled release with Builder, assignment, runner, autosave/resume, scoring, results, section/skill analysis, and learning recommendations. Recommendation-target click-through exhaustiveness and advanced exports remain `PARTIAL` Future Improvements.
- Next goal: Subject Learning Space Boundary, using the existing canonical `GenericPathPage → LearningSection` runtime and preserving legacy links.
- Plan handoff: read `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` before any new work
- Files in next scope: assessment public entry points and acceptance evidence only: `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md`, `pages/QuizPage.tsx`, builder/assignment entry points, Results surfaces, quiz compatibility routes, and `server/src/modules/quizzes/`; no implementation change until the matrix identifies the first vertical gap
- Explicitly out of scope: database schema migration, RBAC changes, scoring/payment changes, route/API URL changes, broad frontend move, deleting legacy files
- Delivery rule: after each green Batch, update this file, create a focused commit, push, and refresh the latest ZIP without including secrets, `.env`, `.git`, dependencies, or build artifacts.

## Batch LSB-01 — Scoped Learning Space failure and retry state

- Status: `VERIFIED` for the first Subject Learning Space product gap.
- Scope: the canonical runtime remains `GenericPathPage` → `LearningSection`; `SubjectLearningPage` has no application route/import and is retained only as an uncalled compatibility artifact. Existing `/category/:pathId`, legacy subject redirects, and stable learning-tab URLs remain unchanged.
- Product fix: the bounded per-subject Courses/Quizzes bootstrap now exposes a loading state and a visible Arabic error with an in-place retry when both scoped reads fail. It preserves the currently displayed content, rejects late responses from another scope, and never falls back to a global reload.
- MVP boundary: one subject entry with Path → Level → Subject → Courses/Foundation/Practice/Assessments/Library, bounded scoped reads, and failure recovery. Deferred: advanced personalization, AI recommendations, broad search, offline/native, and visual redesign. No commercial value now: moving all frontend files or renaming routes.
- Evidence: local `smoke:learning-canonical-entry`, `smoke:learning-scoped-bootstrap`, `smoke:learning-tabs`, `typecheck`, and `git diff --check` passed. Exact commit `a254ea7d` passed Backend Integration [33690011174](https://github.com/nasef6464/almeaacodax/actions/runs/33690011174) and Deep Pre-Merge E2E [33690011175](https://github.com/nasef6464/almeaacodax/actions/runs/33690011175).
- Boundaries preserved: no API/RBAC/scoring/payment/schema change, no global unbounded content read, and no production test or data write.
- Next exact action: add an isolated Learning Space UI/API/data audit to the Deep gate; current generic Deep success does not itself prove the student/manager Learning Space journey.

## Batch ACC-02 — Normal + directed commercial journey closure

- Status: `VERIFIED` on isolated release candidate `48a66358`.
- Evidence: Deep Pre-Merge E2E `33565698390` and Backend Integration `33565698452` both passed on the exact commit. The Playwright audit proves Builder create, scoped question selection, preview/publish, group assignment, target catalog visibility, runner submission, server `QuizResult`, and outsider direct-URL rejection.
- Product fixes included: authoritative group-membership hydration for catalog filtering; null-safe quiz route context; removal of email-domain-based dev-session bypass so fixture users submit through the real server path.
- Local evidence: frontend/server typechecks and quiz-integrity contract 4/4 passed. No API URL, RBAC policy, scoring rule, payment rule, or legacy data migration was changed.
- Commercial boundary: normal and directed assessments are usable as an isolated sellable journey. Mock multi-section session locking, server resume/failure injection, and advanced result/history evidence remain `PARTIAL` for ACC-03/ACC-04.
- Next batch: ACC-03 — mock session + autosave/resume + failure/retry safety.

## Batch ACC-03 — Mock session, autosave/resume, and failure/retry safety

- Status: `VERIFIED` on isolated release candidate `47dabd68`.
- Product fix: the learner result-list projection now includes persisted mock `sectionResults`; the Results UI already renders those sections, so a student can read the section analysis after leaving the runner.
- Evidence: Backend Integration [33665523965](https://github.com/nasef6464/almeaacodax/actions/runs/33665523965) and Deep Pre-Merge E2E [33665524038](https://github.com/nasef6464/almeaacodax/actions/runs/33665524038) both passed on the exact commit. The backend proves directed start authorization, concurrent save idempotency, resume, expiry rejection, legacy-submit reconciliation, and learner result-list section results. The deep audit proves Builder creation of a directed two-section mock, autosave of each section response, resumed server answers, retry safety, submission, and the student-facing result read.
- Local evidence: `server:check`, `smoke:quiz-integrity-guard` (4/4), `smoke:api-security` (6/6), and `git diff --check` passed before the runtime commit.
- Boundaries preserved: no route/API/RBAC/scoring/payment/schema contract change, no production dual-write/cutover, and no historical attempt/response reconstruction.
- Remaining risk: `PARTIAL` only for ACC-04 result/history/analytics acceptance; the CI bounded read-scale check is not production-scale certification.
- Next batch: ACC-04 — results, analytics, and historical compatibility.

## Batch ACC-04 — Result reload and learner-safe review

- Status: `PARTIAL`; this closes the first concrete user-facing result gap, not the whole batch.
- Product fix: a fresh `Results` page now reads the selected result detail through the existing owner-protected endpoint when the paginated summary lacks `questionReview`. It merges only that result into the display, retains the paginated/bounded list, and leaves historical rows without stored review data as usable summaries.
- Evidence: Backend Integration [33667130693](https://github.com/nasef6464/almeaacodax/actions/runs/33667130693) and Deep Pre-Merge E2E [33667130828](https://github.com/nasef6464/almeaacodax/actions/runs/33667130828) both passed on exact commit `5dfe7209`. The E2E audit submits a directed assessment, reloads `/results` for that persisted attempt, waits for the protected detail read, and opens learner-safe answer review.
- Local evidence: frontend and server typechecks, `smoke:quiz-answer-exposure` (5/5), script syntax check, and `git diff --check` passed.
- Boundaries preserved: the established detail route remains owner-protected and serializer-safe; no answer key is added to list data, and no API/RBAC/scoring/schema/production migration changes occurred.
- Remaining risk: analytics and history/legacy UI acceptance remain `PARTIAL`; no production-scale or production-cutover claim.
- Next batch action: map the first missing analytics/history vertical journey before adding code.

## Batch ACC-04 — Manager mock-section analytics evidence

- Status: `PARTIAL`; this verifies the manager-facing section-analytics slice, not ACC-04 as a whole.
- Product fix: the frontend quiz adapter now preserves API `quizKind`. A newly published multi-section mock therefore remains a typed current assessment after a fresh manager reload and appears in the manager catalog rather than being filtered as a legacy untyped standalone mock.
- Evidence: Backend Integration [33678273932](https://github.com/nasef6464/almeaacodax/actions/runs/33678273932) and Deep Pre-Merge E2E [33678274167](https://github.com/nasef6464/almeaacodax/actions/runs/33678274167) passed on exact commit `9bf273f1`. The isolated audit creates a directed two-section mock in Builder, opens a separate manager session before learner use, proves catalog/preview visibility, autosave/resume/retry, waits for the persisted server result with its two section analyses, and proves authorization-scoped manager analytics in the UI after submission.
- Audit reliability: `600b08d7` preserves the explicit kind across the API read model; `9bf273f1` replaces the result-list read race with a bounded persisted-result poll. Neither changes API, RBAC, scoring, schema semantics, or production data.
- Local evidence: `npm run typecheck`, `node scripts/smoke-mock-exam-contract.mjs` (10/10), `node scripts/smoke-assessment-classification-contract.mjs` (9/9), script syntax check, and `git diff --check` passed before their runtime commits.
- Remaining risk: Result history/detail for incomplete legacy rows, journey 5 edit/version preservation through UI, and broader student/class/school report and export evidence remain `PARTIAL`. Production scale and production cutover remain `NOT PROVEN`/not authorized.
- Next batch action: inspect journey 5 and the learner historical result UI; implement only the first unproven vertical gap.

## Batch ACC-04 — Published-definition version preservation

- Status: `PARTIAL`; this closes the server/persistence portion of journey 5, not its dedicated edit UI or paginated selection acceptance.
- Product fix: publishing a definition and every later update that remains published append an immutable `AssessmentVersion`; prior published snapshots become `superseded`. The public `Quiz` route and legacy document remain the compatibility facade, while the version reader now cannot serve an old definition after manager edits.
- Evidence: Backend Integration [33680376925](https://github.com/nasef6464/almeaacodax/actions/runs/33680376925) and Deep Pre-Merge E2E [33680376880](https://github.com/nasef6464/almeaacodax/actions/runs/33680376880) passed on exact runtime head `46eae178`. The isolated HTTP journey creates a published directed assessment, proves version 1, PATCHes title/settings, proves version 2 retains the selected question and settings, then proves the targeted learner reads the updated immutable definition. The same gate proves the existing attempt-limit guard remains enforced; Deep also passed normal/directed and mock commercial journeys.
- Local evidence: `npm run server:check`, `npm run typecheck`, and `git diff --check` passed before commit `84b7a692`; the first CI run exposed only an audit fixture changing `maxAttempts`, corrected in `46eae178` without product behavior change.
- Boundaries preserved: no route/API/RBAC/scoring/payment contract, historical reconstruction, production opt-in, or cutover. This is the delegated additive definition-version behavior, not a production migration.
- Remaining risk: `PARTIAL` for a dedicated UI edit/reload/publish acceptance and question-selector pagination/selection preservation, plus result history/legacy rows and broader report/export evidence.
- Next batch action: map the `QuizzesManager` edit facade to the active Builder and add only the missing UI journey-5 acceptance evidence or its first concrete defect.

## Batch ACC-04 — Published edit UI acceptance and CI reliability

- Status: `PARTIAL`; Definition/versioning acceptance is now `VERIFIED`, while the overall commercial module still needs the remaining result/history/analytics closure.
- Product evidence: the connected manager journey creates, publishes, reopens, edits, and reloads a directed definition. It proves the selected question and edited time limit persist through the Builder and the version-aware definition read; the learner then completes the existing directed runner/result journey and an outsider remains blocked.
- Evidence: Backend Integration [33683096158](https://github.com/nasef6464/almeaacodax/actions/runs/33683096158) and Deep Pre-Merge E2E [33683096173](https://github.com/nasef6464/almeaacodax/actions/runs/33683096173) passed on exact runtime head `038255fb`. Deep passed normal/directed, mock resume/retry, and all final required suites.
- CI reliability: the prior Deep run proved the Assessment audit but failed only when a later Barcode audit hit a sensitive in-memory rate limit. `038255fb` changes the isolated workflow environment only (`RATE_LIMIT_SENSITIVE_LIMIT=2000`); it does not alter production limits or runtime policy. The rerun passed all suites including Barcode.
- Remaining risk: question-selector pagination preservation, incomplete historical result rows in the UI, and broader student/class/school analytics/report/export evidence remain `PARTIAL`; production cutover and production-scale certification remain `NOT PROVEN`/not authorized.
- Next batch action: inspect the first unproven Results/history or analytics vertical journey and implement only that product gap.

## Batch ACC-04 — Paginated selection and learning-loop evidence

- Status: `VERIFIED` for the Assessment Strong MVP on isolated UI/API/DB evidence; advanced report/export and exhaustive recommendation-target UI coverage remain explicitly `PARTIAL` Future Improvements.
- Product evidence: the isolated commercial audit creates 101 scoped temporary questions, selects one from page 1 and one from page 2, publishes a directed definition, reopens/edits/reloads it, and proves both selections persist. The targeted learner completes the two-question runner after autosave; the outsider remains rejected. Fixtures are deleted in `finally` and never touch production data.
- Learning-loop audit: `Question.skillIds` is required at authoring; submission persists per-skill `skillsAnalysis`; submission side effects update per-student `SkillProgress` mastery/status/attempts; `Results` resolves weak-skill actions to approved/visible lesson, video/resource, or targeted quiz and exposes a re-assessment path. This reuses the existing loop—no recommendation system or scoring policy was introduced.
- Classification: Question → Skill `VERIFIED`; Result → Skill Analysis → persisted Skill Mastery `VERIFIED`; Weakness → existing recommendation resolver `VERIFIED` as deterministic application behavior; clicking every lesson/video/resource/reassessment target in one isolated E2E chain is `PARTIAL` and deferred because it is coverage expansion rather than an MVP blocker. Historical rows that lack granular source data remain readable summaries, `VERIFIED`; reconstructing missing attempts/responses/definitions remains prohibited.
- Evidence: local `typecheck`, `server:check`, frontend/server builds, focused assessment/result/skill smoke guards, and script syntax checks passed during the batch. Exact runtime CI: Backend Integration [33688377700](https://github.com/nasef6464/almeaacodax/actions/runs/33688377700) and Deep Pre-Merge E2E [33688377731](https://github.com/nasef6464/almeaacodax/actions/runs/33688377731) passed on `d2298993`.
- Boundaries preserved: no route/API/RBAC/scoring/payment/schema semantic change, no production dual-write/cutover, and no historical reconstruction. `d2298993` changes only the isolated CI workflow rate-limit budget, not production configuration.
- Next batch: ACC-05 — issue the commercial completion report and move only then to Subject Learning Space Boundary.

## Batch PLAN-01 — Product-delivery realignment

- Purpose: replace phase-order/refactor momentum with sellability gates while preserving the safe modular-monolith migration and all current contracts.
- Inputs reviewed: the 2026-09-01 Lead Architect report, the three latest prior ALMEAA tasks, `FINAL_MASTER_PLAN_V3_AR.md`, this execution state, assessment test/data decisions, schools handoff, Git HEAD/log/status, and latest CI evidence.
- Changed files: `FINAL_MASTER_PLAN_V3_AR.md`, `CODEX_EXECUTION_STATE.md`, `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md`.
- Architecture impact: no runtime/API/schema/RBAC/scoring/payment change. Domain boundaries remain modular-monolith boundaries; `ProductConfig` is recorded as a future boundary, not implemented.
- Product impact: establishes Gate 0 schools checkpoint closure, then Gate 1 Assessment Commercial Closure, Gate 2 Learning Space, Gate 3 School MVP, Gate 4 Results/Reports, and Gate 5 White-label.
- Evidence policy: all readiness claims now use `VERIFIED / PARTIAL / NOT PROVEN / BLOCKED`; isolated Phase 5 proof is not presented as production cutover or scale certification.
- Tests/CI: latest implementation HEAD `26f615e1` has successful Backend Integration `33465513158` and Deep Pre-Merge E2E `33465513152`. On planning commit `c465b7ea`: Backend Integration `33485027032` PASS and Deep Pre-Merge E2E `33485027029` PASS; locally `npm ci` PASS (root 0 vulnerabilities), `npm --prefix server ci` PASS (17 dependency audit findings recorded, no blind fix), and typecheck, server check, frontend build, server build, repository audit, architecture gate, route-loading, runtime-source, quiz-integrity 4/4, auth-login-security 9/9, and API-security 6/6 all PASS. Audit: 49 frontend routes, 236 backend routes, 0 unresolved runtime imports, 0 cycles, 83 hotspots (budget 83). GitHub Actions reports a Node 20→24 deprecation annotation for current action versions; record it as CI maintenance, not a product blocker.
- Risks: generated audit artifacts are already modified outside this batch and must remain excluded; no new Assessment or School MVP capability is claimed by this planning update.
- Next step: create the Assessment Definition→Analytics capability/evidence matrix and choose the first unproven vertical journey.

## Batch ACC-01 + ACC-02 — Evidence map and normal/directed commercial journey

- Status: `PARTIAL` pending the required isolated-Mongo Deep Pre-Merge E2E run on this commit. Local source/build and focused contract gates are green; no production system, account, or data was contacted.
- ACC-01 evidence map: added to `ASSESSMENT_TEST_ROADMAP_AR.md`. It maps all five mandatory journeys to the public UI entry points, API/model truth, existing proof, fixture strategy, and the remaining precise gaps. The first true gap was a missing connected UI acceptance journey, not a scoring, RBAC, or API-contract defect.
- ACC-02 implementation: `live-assessment-commercial-audit.mjs` creates one temporary normal test through the admin Builder UI, selects a scoped approved question, assigns the actual isolated student's group, publishes, proves the target sees and submits it, verifies a server result, and confirms an outsider cannot access the direct runner URL. It deletes the temporary definition in `finally`.
- Testability only: stable `data-testid` hooks were added at the quiz-manager create action, Builder fields/steps, question selection buttons, directed-test card, runner answers, and finish confirmation. No route, payload, schema, RBAC, scoring, payment, or legacy-reader behavior changed.
- CI wiring: the Deep Pre-Merge E2E workflow runs the new audit against its isolated API/Chromium stack and makes it a required green suite. The audit fails closed without explicitly supplied isolated `UI_AUDIT_BASE_URL` and `UI_AUDIT_API_BASE_URL`.
- Local checks: `node --check scripts/live-assessment-commercial-audit.mjs`, `npm run typecheck`, `npm run server:check`, `npm run build`, `npm run smoke:quiz-integrity-guard` (4/4), `npm run smoke:assessment-directed-scope` (4/4), `npm run smoke:assessment-question-selection` (10/10), `node tools/refactor/architecture-gate.mjs`, and `git diff --check` all PASS.
- Excluded: pre-existing generated audit files, ZIP exports, and `claude_prompt.txt` remain unstaged/unmodified by this batch.
- CI correction evidence: Backend Integration `33493106346` passed on `ae27f014`. Deep run `33493106288` passed typecheck/build/API/scale/public/role/question-editor/schools/barcode, but its focused Assessment suite outcome failed because the audit queried the paginated list to rediscover the newly created definition and did not find it. The Builder POST itself completed and the modal closed. Commit `7d6bf781` now captures and validates the authoritative `POST /api/quizzes` response directly, with the list read retained only as secondary evidence; this is an audit correction, not a product/API/RBAC/scoring change. Re-run pending.
- Follow-up evidence: on HEAD `5de59d89`, Backend Integration `33509305799` passed and Deep run `33509305485` proved the Builder POST/create evidence, but the student context had loaded its bootstrap before the new assignment and timed out waiting for `student-directed-tests`. The audit now starts a fresh learner browser context after assignment, matching the commercial sequence in which the target signs in after publication. No runtime product contract changed; re-run pending.

## Product-owner handoff — sequential chat goals

- Added `docs/architecture/CHAT_EXECUTION_GOALS_AR.md` after comparing the owner/ChatGPT report with Git HEAD and the current product-delivery plan.
- Decision: no new roadmap is required. The report's core direction is already represented by Gates 1–6; duplicating the master plan would create competing truth.
- Product impact: the owner now has six self-contained prompts to send one at a time: Assessment, Learning Space, School MVP, Results/Reports, White-label, then Questions/Curriculum/Courses/Operations.
- Control: each prompt carries an explicit exit criterion, exclusions, evidence requirement, and next goal. A later goal must not start merely because a chat ended.

## Batch 2T-01 — Two-section mock assessment acceptance journey

- Scope: extended the existing isolated HTTP harness with a published, directed mock assessment containing two independently scored sections.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: all quiz routes and payload formats, persisted schemas, assignment/access policy, scoring, section-result response shape, and RBAC.
- Coverage: admin creates a second approved question and publishes a two-section mock; an outside student is rejected; the targeted student submits mixed answers; the stored result preserves mock snapshot and two per-section scores; admin reads section analytics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: the new HTTP journey has not run because local `server/node_modules` is incomplete and no isolated Mongo service was started; `server:check`/`server:build` therefore remain environment-blocked.
- Commit: `6c58ceb9` `test(assessment): cover two-section mock journey`.
- Push: not performed; no push or CI-dispatch authorization was supplied.
- Risks: route-level smoke contracts do not prove this journey at runtime; CI must run the isolated Mongo harness before it can count as acceptance evidence.
- Next exact action: manually dispatch the isolated backend CI gate (or authorize a push that triggers it), inspect the result, then proceed to the Playwright subset from the roadmap.

## Batch 2A-15 — Supervisor report scope resolver

- Scope: moved supervisor report-scope orchestration out of `quiz.routes.ts`; the route delegates to an application resolver, while GroupModel reads are isolated in a quizzes infrastructure adapter.
- Changed files: `server/src/modules/quizzes/application/quizSupervisorReportScope.ts`, `server/src/modules/quizzes/infrastructure/quizSupervisorScopeRepository.ts`, `server/src/routes/quiz.routes.ts`, and the focused reports-role smoke contract.
- Preserved contracts: all existing HTTP paths/methods, Group and User persistence semantics, school-wide versus class-only supervisor isolation, RBAC, scoring, and result/report response behavior.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: `server:check` and `server:build` cannot locate local `tsc`; no API service or Mongo integration gate was started.
- Commit: `5ce8b0eb` `refactor(quizzes): isolate supervisor report scope resolver`.
- Push: not performed; no push authorization was supplied. This worktree is detached because `refactor/modular-platform-safe` is checked out by `C:/ALMEAA MAY - codax`; attach/cherry-pick this commit there before pushing.
- Risks: HTTP-level cross-school/cross-class rejection remains unproven locally without the isolated Mongo test environment.
- Next exact action: with authorization, attach `5ce8b0eb` to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-16 — Role-bound report student scope

- Scope: extracted role-specific student filtering for quiz report read models from `quiz.routes.ts` into an injected application policy. The route still owns UserModel querying, projection, ordering, limit, and count.
- Changed files: `server/src/modules/quizzes/application/quizReportStudentScope.ts`, `server/src/routes/quiz.routes.ts`, and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: all report endpoints and response fields, admin full scope, teacher/supervisor group and school scope, class-only supervisor isolation, parent linked-child scope, self-student fallback, managed path/subject filtering, RBAC, scoring, and persistence semantics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: `server:check` cannot locate local `tsc`; no API service or Mongo integration gate was started.
- Commit: `7b66c16f` `refactor(reports): isolate role-bound student scope`.
- Push: not performed. This worktree remains detached because `refactor/modular-platform-safe` is checked out by `C:/ALMEAA MAY - codax`; attach/cherry-pick `5ce8b0eb`, `031fd755`, and `7b66c16f` there before pushing.
- Risks: runtime HTTP rejection evidence for cross-school and cross-class attempts remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-18 — Consistent attempt-gap read-model use

- Scope: replaced the two remaining analytics references to the former local `buildAttemptGaps` converter with `buildQuizReportAttemptGaps`.
- Changed files: `server/src/routes/quiz.routes.ts` and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: analytics endpoint URL and response fields, question-attempt skill/subject/section enrichment, mastery calculation, evidence threshold, role scopes, RBAC, scoring, and Mongo schema.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: server TypeScript check/build remain unavailable because local `tsc` is absent; no API service or Mongo integration gate was started.
- Commit: `3894ee46` `fix(reports): use extracted attempt gap read model`.
- Push: not performed. This worktree remains detached; attach/cherry-pick pending commits onto `refactor/modular-platform-safe` from its owning worktree before pushing.
- Risks: cross-school/cross-class HTTP rejection evidence remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-17 — Question-attempt gap read model

- Scope: moved the conversion of persisted `QuestionAttempt` skill references into the analytics gap read model out of `quiz.routes.ts`.
- Changed files: `server/src/modules/quizzes/application/quizReportAttemptGaps.ts`, `server/src/routes/quiz.routes.ts`, and `scripts/smoke-reports-role-contract.mjs`.
- Preserved contracts: report endpoint URL and response shape, preloaded skill/subject/section lookup behavior, mastery calculation (`100` for correct and `0` for incorrect), evidence thresholds, role scope, RBAC, scoring, and persistence semantics.
- Tests: `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Gates blocked: server TypeScript check/build remain unavailable because local `tsc` is absent; no API service or Mongo integration gate was started.
- Commit: `af27eba8` `refactor(reports): extract question attempt gap read model`.
- Push: not performed. This worktree remains detached; attach/cherry-pick the pending commits onto `refactor/modular-platform-safe` from its owning worktree before pushing.
- Risks: runtime HTTP rejection evidence for cross-school and cross-class attempts remains pending the isolated Mongo test environment.
- Next exact action: with authorization, attach the pending commits to the safe branch and run the isolated backend CI gate; then add only bounded cross-school and cross-class rejection cases. Do not begin timer/session extraction or any schema/RBAC/scoring/route change.

## Batch 2A-19 — Cross-school directed assessment rejection

- Scope: added an isolated outside-school student fixture and HTTP rejection case proving a school supervisor cannot direct an assessment to that student; the existing sibling-class rejection remains as the class-level counterpart.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-directed-scope-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, supervisor role policy, class/school scope semantics, scoring, Mongo schema, and all production data.
- Tests: `smoke:assessment-directed-scope` PASS 4/4; `smoke:reports-role` PASS 20/20; `smoke:quiz-access` PASS 18/18; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `73d8b5ff` `test(assessments): cover cross-school directed scope rejection`.
- Push: not performed.
- Risks: the new HTTP assertion is a harness case until it passes against its required isolated Mongo environment; server TypeScript check/build remain unavailable locally because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-02 — Partial mock-definition update preservation

- Scope: extended the isolated HTTP harness so a title-only admin PATCH of the published two-section mock preserves its settings, mock enablement, sections, and selected section questions.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-update-document-contract.mjs`.
- Preserved contracts: existing `/quizzes/:id` PATCH path and payload, admin authorization, publication/integrity policy, settings, mock schema, question selection, score semantics, and production data.
- Tests: `smoke:assessment-update-document` PASS 5/5; `smoke:assessment-directed-scope` PASS 4/4; `smoke:reports-role` PASS 20/20; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `6c141111` `test(assessments): preserve mock definition on partial update`.
- Push: not performed.
- Risks: the new assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-03 — Missing published-question rejection

- Scope: added an isolated HTTP harness case for a published assessment that references a missing question; it must return `400`, report the missing ID, and leave no quiz document persisted.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, publication/integrity policy, question ownership and selection, directed audience semantics, RBAC, Mongo schema, scoring, and production data.
- Tests: `smoke:assessment-question-selection` PASS 7/7; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-directed-scope` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `33447aee` `test(assessments): reject missing published question references`.
- Push: not performed.
- Risks: the assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: authorize and run the isolated backend CI gate, inspect its result, then continue the next bounded acceptance case from the roadmap.

## Batch 2T-04 — Invalid published-question content rejection

- Scope: added an isolated HTTP harness case for an existing legacy-style question record whose content is unusable for an MCQ assessment; publishing a quiz that references it must return `400`, report the invalid ID, and leave no quiz document persisted.
- Changed files: `server/src/scripts/backendIntegrationGate.ts` and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, publication/integrity policy, question ownership and selection, directed audience semantics, RBAC, Mongo schema, scoring, and production data.
- Tests: `smoke:assessment-question-selection` PASS 9/9; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-directed-scope` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `a5956306` `test(assessments): reject invalid published question content`.
- Push: pending the paired documentation commit.
- Risks: the assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: inspect the isolated backend CI gate configuration and run it only if it uses an isolated Mongo dependency; otherwise continue the next bounded acceptance case without starting production-connected services.

## Batch 2T-05 — Duplicate published-question reference normalization

- Scope: normalized root `questionIds` in the pure quiz-create document builder and added an isolated HTTP harness case proving a published definition with the same question reference twice stores one canonical reference.
- Changed files: `server/src/modules/quizzes/application/quizDefinitionDocument.ts`, `server/src/scripts/backendIntegrationGate.ts`, `scripts/smoke-assessment-definition-document-contract.mjs`, and `scripts/smoke-assessment-question-selection-contract.mjs`.
- Preserved contracts: existing `/quizzes` POST path and payload, response shape, publication/integrity policy, question selection, RBAC, Mongo schema, scoring, and production data. Duplicate references now preserve the intended single-question semantics rather than changing scoring or question content.
- Tests: `smoke:assessment-definition-document` PASS 5/5; `smoke:assessment-question-selection` PASS 10/10; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `173c2bd8` `test(assessments): normalize duplicate question references`.
- Push: pending the paired documentation commit.
- Risks: the HTTP assertion remains a harness case until it passes on the isolated Mongo gate; local server TypeScript check/build remain unavailable because `tsc` is absent.
- Next exact action: cover owner-scope rejection for question references only after proving the existing ownership policy on the route; do not change its RBAC or persistence semantics speculatively.

## Batch 2T-06 — Teacher question managed-scope coverage

- Scope: added isolated HTTP harness coverage showing a teacher can create a question inside the configured path/subject scope with the existing pending-review workflow, and is rejected outside that scope.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: existing `/quizzes/questions` POST route and payload, teacher managed-content policy, approval workflow, RBAC, Mongo schema, and production data.
- Tests: `smoke:assessment-question-selection` PASS 10/10; `smoke:quiz-integrity-guard` PASS 4/4; `smoke:quiz-access` PASS 18/18; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: deferred; no API service, Mongo instance, CI gate, or production system was started.
- Commit: `7a0efb99` `test(assessments): cover teacher question scope`.
- Push: pending the paired documentation commit.
- Next exact action: add an ownership-reference case only after a product-compatible policy is identified; do not invent a new question-to-quiz ownership restriction.

## Batch 2T-07 — Parent-link fail-closed runtime correction

- Scope: corrected parent link, unlink, and linked-student read handlers to use the established authenticated-user context, preserving the existing fail-closed guardianship policy.
- Changed files: `server/src/routes/auth.routes.ts`.
- Preserved contracts: parent-link URLs and methods, the `403` denial for self-service linking without verified consent, administrator-managed linking, RBAC, Mongo schema, and production data.
- Tests: `smoke:auth-login-security` PASS 9/9; `smoke:api-security` PASS 6/6; `smoke:quiz-integrity-guard` PASS 4/4; architecture gate PASS; `git diff --check` PASS.
- Runtime evidence: isolated CI run `33336538458` executed the real HTTP assessment suite and exposed the prior `500`; the fix awaits its next automatic isolated Mongo run after this push. No local API, Mongo instance, or production system was started.
- Commit: `00caa945` `fix(auth): fail closed for parent student linking`.
- Push: pending the paired documentation commit.
- Next exact action: inspect the automatic isolated CI result for this commit; if green, record it as runtime evidence for the assessment roadmap and then continue the deferred E2E design without using production accounts.

## Batch 2T-08 — Teacher question fixture contract correction

- Scope: completed the teacher question fixture with its required skill reference so the isolated HTTP journey reaches managed-scope authorization rather than schema rejection.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: question API schema, teacher managed-content policy, approval workflow, RBAC, Mongo schema, and production data.
- Tests: `smoke:auth-login-security` PASS 9/9; `smoke:api-security` PASS 6/6; `smoke:assessment-question-selection` PASS 10/10; `git diff --check` PASS.
- Runtime evidence: the automatic isolated Mongo CI run is pending after this push; no local API, Mongo instance, or production system was started.
- Commit: `15fa3b95` `test(assessments): satisfy teacher question fixture contract`.
- Push: code pushed; documentation commit pending.
- Next exact action: inspect the isolated CI result and record the real HTTP status before extending the acceptance matrix.

## Batch 2T-09 — Isolated HTTP acceptance evidence

- Scope: ran the existing GitHub Actions backend integration gate automatically on the safe branch; it installed dependencies, typechecked and built the API, started the exact branch API, and executed the real HTTP suite against a temporary Mongo service.
- Evidence: workflow run `33336856128` passed on commit `038544cc`; its assessment paths covered normal directed submission/repeat rejection, missing/invalid/duplicate question handling, two-section mock submission and partial update, teacher managed scope, and school/class audience isolation.
- Constraints: the runner generated ephemeral CI secrets and used only `mongodb://127.0.0.1` in the CI container; no production credentials, API, database, or local service were used.
- Remaining work: roadmap Playwright journeys, historical-result compatibility evidence, scale testing, and only product-approved ownership-policy changes.

## Batch 2T-10 — Safe-branch isolated E2E eligibility

- Scope: enabled the existing deep full-stack E2E workflow for `refactor/modular-platform-safe`.
- Changed files: `.github/workflows/platform-v3-deep-premerge-e2e-gate.yml`.
- Preserved contracts: no application route, RBAC, schema, or production deployment behavior changed.
- Evidence: the workflow uses temporary Mongo, starts the exact branch API/frontend in CI, and runs its Playwright-backed UI audits without production writes.
- Tests: architecture gate PASS; `git diff --check` PASS.
- Commit: `5e30cfe4` `ci(assessment): run isolated E2E gate on safe branch`.
- Next exact action: inspect the automatic deep E2E result and classify any failing journey against the roadmap.

## Batch 2T-11 — Full-stack E2E acceptance evidence

- Scope: the safe-branch deep E2E gate completed on isolated Mongo, API, frontend, and Chromium.
- Evidence: GitHub Actions run `33337019142` passed for commit `1c4f9478`, including operational API journeys, public UI, desktop/mobile role pages, question-editor, supervisor-school, school CRUD, and public-test journeys.
- Constraints: all accounts and credentials were ephemeral and masked in CI; production services and local services were not used.
- Remaining scope: the assessment roadmap still requires focused historical-result compatibility evidence and scale certification; this run is strong E2E evidence, not a substitute for those distinct requirements.

## Batch 2T-12 — Historical result read compatibility

- Scope: added an isolated HTTP fixture representing an older result without snapshot or mock-section fields, and verified the student results endpoint preserves its legacy score, time, and quiz identity.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: result API URL and response semantics, student RBAC, Mongo schema, scoring, and production data. No migration or backfill was added.
- Tests: `smoke:quiz-integrity-guard` PASS 4/4; `smoke:assessment-question-selection` PASS 10/10; `git diff --check` PASS.
- Runtime evidence: backend run `33337500677` and the companion full-stack run `33337500695` passed on isolated Mongo at commit `55e0ea5d`; the historical-result case therefore has real HTTP acceptance evidence.
- Commit: `a6cc1dba` `test(reports): preserve historical quiz result reads`.
- Next exact action: scope and run bounded scale evidence without claiming production-scale certification.

## Batch 2T-13 — Historical compatibility CI confirmation

- Scope: reconciled the acceptance ledger with the automatic CI runs after the historical-result fixture and report-scope update.
- Evidence: `Platform V3 Backend Integration Gate` run `33337500677` and `Platform V3 Deep Pre-Merge E2E Gate` run `33337500695` both succeeded for `55e0ea5d` on temporary Mongo, exact-branch API/frontend, and masked ephemeral credentials.
- Result: the historical result endpoint preserves legacy score, duration, and quiz identity without requiring a snapshot or mock section fields. This closes the historical-read evidence item in the assessment roadmap.
- Limits: the broad E2E gate is evidence for the isolated stack, but it does not by itself label each of the five roadmap UI journeys; production-scale capacity remains unproven.
- Next exact action: add bounded isolated scale validation and a focused UI-to-roadmap evidence map; do not use production credentials, databases, or load targets.

## Batch 2T-14 — Release candidate evidence and freeze

- Frozen runtime head: `e92ba9c8c07f3958c3b0285aa0daad78834e17c4`.
- Evidence: Backend Integration `33355971164`, Deep E2E `33355971110`, Production Readiness `33355971089`, and Dependency Audit `33355789094` all succeeded on the safe branch. Deep E2E includes the bounded isolated read-scale validation.
- Compare: `main` at `e0617d4e` is an ancestor; architecture and module-boundary gates passed with routes/API/env contracts, zero unresolved runtime imports, and zero cycles preserved.
- Freeze: `MODULAR_PLATFORM_RELEASE_CANDIDATE_FREEZE_AR.md` records the policy and limits. No PR or merge was created automatically.
- Next exact action: await explicit merge approval only.

## Batch RC-01 — Release-candidate documentation hygiene

- Scope: removed whitespace-only errors from the assessment and schools evidence documents during the final candidate comparison.
- Changed files: `docs/architecture/SCHOOLS_RBAC_AUDIT_AR.md`, `docs/assessment-refactor-progress.md`, and `docs/assessment-system-code-audit.md`.
- Preserved contracts: runtime code, routes, API payloads, schemas, RBAC, scoring, configuration, and CI workflows are untouched.
- Tests: `git diff --check` PASS for the working-tree batch; the previously frozen CI evidence remains unchanged because this batch is documentation-only.
- Gates: no runtime gate rerun is required for this whitespace-only documentation correction; final PR/merge remains subject to the frozen candidate evidence.
- Commit: `c0939874` `docs(release): clean candidate evidence formatting`.
- Push: pending explicit release delivery.
- Risks: no functional behavior was altered.
- Next exact action: commit this documentation-only correction, push the release-candidate branch, create the approved PR, and merge after the final compare.

## Batch 5A-01 — Additive assessment evolution foundation

- Scope: recorded the delegated product decisions for Phase 5 and introduced isolated persistence models for immutable versions, assignments, server-owned attempts, saved responses, and finalized results.
- Changed files: `docs/architecture/ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` and `server/src/modules/quizzes/infrastructure/assessment{Version,Assignment,Attempt,Response,Result}Model.ts`.
- Preserved contracts: no route, API payload, legacy `QuizResult` read/write, `LiveExamSession`, schema migration, backfill, RBAC, scoring, or frontend behavior changed. The new models are not imported by a production request path.
- Tests: `server:check`, `server:build`, root `typecheck`, root `build`, `repository-audit`, `architecture-gate`, `smoke:route-loading`, `smoke:runtime-source`, `smoke:quiz-integrity-guard`, `smoke:auth-login-security`, `smoke:api-security`, `smoke:rbac-school-scope`, and `git diff --check` PASS.
- Gates: isolated-Mongo additive migration dry run is intentionally pending. It is mandatory before any adapter, dual-write, backfill, or live reader work; no production or shared database was contacted.
- Commit: `68c446bc` `feat(assessments): add additive evolution models`.
- Push: pending.
- Risks: the models alone are deliberately inert until an adapter is designed and verified; this prevents a partial migration from changing learner behavior.
- Next exact action: run the additive model/index dry run on a disposable Mongo database, then introduce a compatibility adapter with legacy fallback in a separate batch.

## Batch 5A-02 — Isolated additive index dry run

- Scope: extended the existing isolated-Mongo backend integration harness to create the new assessment-model indexes and assert their compound uniqueness before its HTTP journeys run.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: the harness only calls `createIndexes()` after its local-CI Mongo guard passes. It creates no assessment documents and changes no API route, legacy read/write path, live session, RBAC, scoring, or production data.
- Tests: integration-harness TypeScript check, `server:check`, and `git diff --check` PASS locally.
- Gates: CI execution is pending. The harness refuses any Mongo URI except its disposable localhost CI database; no local Mongo/Docker runtime exists in this workspace.
- Commit: `b6e10fc1` `test(assessments): dry run additive indexes in CI`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: actual index behavior is not declared verified until the isolated CI run passes on this exact commit.
- Next exact action: a repository administrator must dispatch `Platform V3 Backend Integration Gate` for `codex/assessment-data-evolution` (or grant Actions dispatch permission to the authenticated account). The current `gh workflow run` request was rejected with `403 Must have admin rights to Repository`; inspect the successful run before beginning any adapter.

## Batch 5A-03 — Automatic isolated-CI trigger

- Scope: allowed the existing backend integration workflow to run automatically on pushes to the Phase 5 branch, avoiding the unavailable manual-dispatch permission.
- Changed files: `.github/workflows/platform-v3-backend-integration-gate.yml`.
- Preserved contracts: no runtime code, API, database, RBAC, scoring, production deployment, or workflow job definition changed; only the push branch allowlist gained this explicitly named development branch.
- Tests: `git diff --check` PASS.
- Gates: pending automatic GitHub Actions run after push. The same job still provisions its own Mongo 7 service and uses a locally guarded disposable database name.
- Commit: pending.
- Push: pending.
- Risks: success remains unproven until the exact commit's isolated workflow completes.
- Next exact action: push this trigger update, wait for the generated Actions run, and record its exact result before beginning the compatibility adapter.

## Batch 5B-01 — Versioned definition read adapter

- Scope: added a definition-read adapter for `GET /api/quizzes/:id`. It uses the latest immutable published version when present and returns the complete legacy quiz document unchanged when none exists.
- Changed files: `server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.ts`, `server/src/modules/quizzes/infrastructure/assessmentVersionRepository.ts`, `server/src/routes/quiz.routes.ts`, and `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: HTTP path/method/response identity, legacy question lookup and learner sanitization, `QuizResult`, submission/scoring, RBAC, Mongo schema semantics, and all write paths. No version is written by any production route in this batch.
- Tests: `server:check`, integration-harness TypeScript check, and `git diff --check` PASS locally. The harness now verifies that an isolated immutable version overrides only its definition while retaining the assessment ID and legacy questions.
- Gates: `Platform V3 Backend Integration Gate` run `33365058231` PASS on `dc15f04f` with Mongo 7, API build, harness typecheck, ready API, and real HTTP journey all green.
- Commit: `dc15f04f` `feat(assessments): read immutable definition versions`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: result-read fallback, version creation, and dual-write remain separate batches; this adapter is read-only and falls back to the legacy document.
- Next exact action: add the matching result-read adapter with legacy fallback before considering dual-write.

## Batch 5B-02 — Result compatibility read adapter

- Scope: detail reads can consume an optional `AssessmentResult.compatibilityProjection` linked to a legacy result while preserving legacy identity and owner authorization; absent projection falls back exactly to `QuizResult`.
- Changed files: assessment-result model, result read adapter/repository, and `quizResults.routes.ts`.
- Tests: `server:check` and `git diff --check` PASS locally.
- Gates: pending isolated HTTP CI.
- Next exact action: push and verify the isolated run before designing dual-write.

## Batch 5B-03 — Result-reader CI confirmation and reconciliation evidence

- Scope: verified the result compatibility projection through the isolated HTTP harness and added a pure parity detector for linked legacy and additive results.
- Changed files: `assessmentResultReadAdapter`, `assessmentResultRepository`, `quizResults.routes.ts`, `assessmentResultReconciliation.ts`, and the isolated harness.
- Preserved contracts: result detail URL/shape and owner authorization remain legacy-compatible; no submission write path, RBAC, scoring, or legacy document changed.
- Tests: `Platform V3 Backend Integration Gate` `33365337318` (reader) and `33365711034` (parity fixture) PASS on isolated Mongo.
- Commit: `59be802d`, `bbd2d916`, and `717f5b0b`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: this proves only a linked compatibility projection and fixture parity; it is not a backfill or runtime dual-write.
- Next exact action: prove the inert writer's success and failure recovery before route integration.

## Batch 5C-01 — Dual-write recovery semantics on isolated Mongo

- Scope: added direct isolated-Mongo proof for the inert post-legacy mirror: success, idempotent retry, response uniqueness, failure after a successful legacy result, retry repair, divergence detection, and reconciliation repair.
- Changed files: `dualWriteAssessmentSubmission.ts`, `assessmentResultReconciliation.ts`, and `backendIntegrationGate.ts`.
- Preserved contracts: `POST /api/quizzes/:id/submit` does not import the primitive; its scoring, RBAC, legacy `QuizResult` write, status code, and response are unchanged. The repair updates only the additive result projection and never mutates `QuizResult`, attempt ownership, assignment, or version.
- Tests: local `server:check`, isolated harness typecheck, `smoke:quiz-integrity-guard` 4/4, and `Platform V3 Backend Integration Gate` `33377161555` PASS (Mongo 7, API build, real HTTP server and suite).
- Commit: `2f383e3a` `test(assessments): prove dual-write recovery semantics`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: production routing remains deliberately absent. The next batch needs an explicitly default-off eligibility/rollback policy and an HTTP proof that mirror failure does not replace a successful legacy 201 response.
- Next exact action: implement and test the controlled post-legacy mirror for eligible assigned/mock assessments only; do not enable it in any environment, backfill, cut over reads, or delete legacy data.

## Batch 5C-02 — Controlled post-legacy assessment mirror

- Scope: added a default-off `assessmentData.mirrorSubmissions` opt-in to assessment definitions, restricted to directed or mock assessments. After the existing `QuizResult` commits, the mirror writes the additive projection and a dedicated audit row; it records and contains mirror failure without changing the legacy HTTP response.
- Changed files: `Quiz.ts`, `quizDefinitionSchema.ts`, `assessmentSubmissionMirror.ts`, `assessmentMirrorAuditModel.ts`, `quiz.routes.ts`, and the isolated harness.
- Preserved contracts: legacy submission/scoring/RBAC/response behavior remains authoritative. Existing quizzes remain opt-out. No existing production record was enabled, no backfill or reader cutover was run, and no legacy document is deleted or updated by reconciliation.
- Tests: `smoke:quiz-integrity-guard` 4/4, API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33377661059` PASS. The HTTP journey asserts a directed opt-in submission returns the normal legacy 201, creates exactly one linked additive result, and emits a completed mirror audit row.
- Commit: `4f12a327` `feat(assessments): mirror eligible legacy submissions safely`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: the route-level failure containment is structurally enforced and direct primitive failure is tested, but an operational bounded reconciler is still needed before any rollout of opt-in definitions. No capacity claim is made.
- Next exact action: add a cursor/batch-limited reconciliation discovery dry-run and an explicit repair mode, both isolated and idempotent, before considering backfill.

## Batch 5D-01 — Bounded mirror reconciliation

- Scope: added a cursor-based reconciler for `AssessmentMirrorAudit` rows. It inspects at most 100 records per invocation, reports missing legacy/additive records and field differences, and defaults to no-write. An explicit repair mode repairs only linked additive result projections and is idempotent on repeat.
- Changed files: `assessmentMirrorReconciliation.ts` and the isolated harness.
- Preserved contracts: no HTTP route, learner response, legacy `QuizResult`, scoring, RBAC, or backfill behavior changed. Dry-run writes nothing; repair never changes legacy submissions, attempts, assignments, or versions.
- Tests: API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33377975143` PASS. The isolated Mongo journey proves mismatch discovery, explicit repair, and the following repair pass reporting `consistent`.
- Commit: `40a275b3` `feat(assessments): add bounded mirror reconciliation`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: reconciliation presently covers mirror audit rows, not the historical legacy corpus; it supplies evidence and repair capability, not a backfill.
- Next exact action: implement a no-write, cursor-bounded legacy result inventory/dry-run with reproducible counts/checksum evidence before deciding on a real backfill.

## Batch 5E-01 — Read-only historical backfill inventory

- Scope: added a read-only inventory over legacy `QuizResult` records with an `_id` cursor, bounded pages (maximum 500), already-projected/pending counts, and a stable SHA-256 checksum for the scanned page.
- Changed files: `assessmentLegacyBackfillInventory.ts` and the isolated harness.
- Preserved contracts: the inventory creates no `AssessmentResult`, writes no legacy data, changes no HTTP API, RBAC, scoring, assignment, or reader default. It is evidence for a future migration, not a migration.
- Tests: API typecheck/build, harness typecheck, and `Platform V3 Backend Integration Gate` `33378321696` PASS. The isolated journey proves batch limit enforcement, cursor advance, checksum stability, and zero writes to legacy/additive result collections.
- Commit: `156d8440` `feat(assessments): inventory legacy backfill safely`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: the required next operation writes historical additive records. `ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md` delegates Additive only and explicitly says it does not authorize backfill; therefore no backfill command or job has been added.
- Next exact action: wait for an explicit owner authorization of batch size, schedule, and rollback observation window before implementing or running a historical backfill.

## Batch 5E-02 — Architecture-gate hotspot correction

- Scope: the fresh repository audit exposed one new ≥400-line hotspot (`backendIntegrationGate.ts`), raising the total to 84. To keep the enforced 83-file budget without weakening it, presentation types/constants for the legacy Notifications Manager were extracted into a small sibling module.
- Changed files: `dashboards/admin/NotificationsManager.tsx` and `dashboards/admin/notificationsPresentation.tsx`.
- Preserved contracts: notification routes, API calls, permissions, state transitions, visible manager behavior, and all Phase 5 data behavior are unchanged. This is a frontend ownership/maintainability correction only.
- Tests: frontend typecheck PASS; repository audit reports 83 hotspots, zero unresolved runtime imports, and zero cycles; architecture gate PASS; route/runtime/quiz integrity/auth/API/school-RBAC smoke gates PASS; backend integration `33407725338` PASS on isolated Mongo.
- Commit: `b86522e7` `refactor(notifications): extract presentation metadata`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: no Phase 5 data risk was introduced. Historical backfill remains unimplemented and no production data was touched.
- Next exact action: complete the Phase 5 verification ledger while retaining the explicit hold on actual historical backfill/cutover until its data-completeness policy is settled.

## Batch 5F-01 — Result-only reader rollback proof

- Scope: extended the isolated HTTP harness for historical result-only backfill from `QuizResult` into `AssessmentResult`, then proved that removing the additive projection immediately restores the legacy result response and that re-running the bounded backfill restores the projection without duplication.
- Changed files: `server/src/scripts/backendIntegrationGate.ts`.
- Preserved contracts: existing result URL, response compatibility fields, legacy `QuizResult` authority and fallback, scoring, RBAC, assignment/access rules, and all production data. No production backfill or opt-in was run.
- Tests: `Platform V3 Backend Integration Gate` `33409276297` PASS on isolated Mongo. The journey proves dry-run zero writes; executed result-only record markers; no invented Attempt/Version; compatible result read; additive-record deletion falling back to legacy; and idempotent re-backfill.
- Commit: `eddaab08` `test(assessments): prove result-only reader rollback`.
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: reader selection is still implicit when a compatible projection exists; no explicit cutover control is present yet. Historical data continues to be result-only, so it cannot support attempt/response analytics.
- Next exact action: add an explicitly opt-in, per-assessment result-reader control that defaults to legacy and prove both rollback branches before enabling it for any assessment.

## Batch 5F-02 — Reversible single-result reader cutover

- Scope: added `assessmentData.resultReaderMode` (`legacy` by default; `compatibility` only by explicit per-assessment update) for `GET /api/quiz-results/:id`. The reader checks authorization against legacy first, then reads the additive projection only when the assessment control is enabled.
- Changed files: `Quiz.ts`, `quizDefinitionSchema.ts`, `quizResults.routes.ts`, reader policy/repository modules, `quiz.routes.ts`, and the isolated harness.
- Preserved contracts: all HTTP paths/payloads, existing legacy result serialization, legacy authority, RBAC, scoring, and production data. A missing additive result and a `legacy` flag both return the legacy record. Partial PATCH preserves the unrelated `mirrorSubmissions` control.
- Tests: server check/build, strict harness check, architecture gate PASS; isolated backend integration `33411114387` PASS. The HTTP journey proves default legacy read, enable, disable rollback, retained mirror setting, result-only compatible read, and fallback after additive deletion.
- Commits: `7be63b94` (control), `b0d1fd90` (harness CSRF correction), `56d3c144` (partial-update preservation), `12cb5018` (historical fixture).
- Push: pushed to `origin/codex/assessment-data-evolution`.
- Risks: only the single-result detail route participates. Result lists deliberately remain legacy because enabling their projection safely requires a bounded batched lookup rather than per-row queries. No production assessment is enabled.
- Next exact action: inventory result-list readers/callers and design their bounded compatibility lookup before any broader cutover.

## Batch 5F-03 — Bounded compatible direct-result lists

- Scope: extended the existing per-assessment reader control to `/quiz-results/my` and `/admin/quiz-results` with two page-bounded batch lookups: reader modes by quiz and projections by legacy-result IDs.
- Preserved contracts: result URLs, pagination, sorting, authorization, scoring, legacy defaults, and report/analytics aggregates. No per-row database query or production opt-in was added.
- Tests: server typecheck, strict harness check, architecture gate, and isolated backend integration `33411718907` PASS; the HTTP journey proves both student and admin lists use an enabled projection.
- Commit: `3030cb8b` `feat(assessments): batch compatible result list reads`.
- Next exact action: verify remaining reporting/analytics reads are intentional legacy aggregates before closing Phase 5 verification.

## Batch 5F-04 — Legacy direct-list compatibility surface

- Scope: applied the same bounded two-query compatibility lookup to `/quizzes/results` and `/quizzes/results/scoped`, which are direct result payload APIs despite their legacy route ownership.
- Preserved contracts: paths, pagination, cache semantics, RBAC/scoping, scoring, legacy-default behavior, and all aggregate/report readers.
- Tests: isolated backend integration `33412140613` PASS, including the legacy direct-list route reading an enabled compatibility projection.
- Commit: `ff3e0f67` `feat(assessments): batch legacy result route reads`.
- Next exact action: classify aggregate/report reads as intentional legacy projections and close the Phase 5 verification ledger without a production activation.

## Batch 5G-01 — Direct result surface ledger and CI completion

- Scope: inventoried every `QuizResult` read surface and completed the one direct result payload route omitted by the earlier list work: `GET /quizzes/results/latest`. It now honors the same per-assessment `resultReaderMode` as detail and list readers, after selecting the authoritative legacy result. The aggregate/report/AI/notification readers are documented as intentional legacy consumers because they derive historical metrics rather than return a compatibility payload.
- Changed files: `server/src/routes/quiz.routes.ts`, `server/src/scripts/backendIntegrationGate.ts`, `.github/workflows/platform-v3-deep-premerge-e2e-gate.yml`, `ASSESSMENT_DATA_EVOLUTION_DECISION_AR.md`, `DATA_ACCESS_MAP.md`, and `MIGRATION_REGISTRY.md`.
- Preserved contracts: every HTTP path and response shape, legacy `QuizResult` authority, authorization/scoping order, RBAC, scoring, cache semantics, and production data. The single-record reader performs no additive query in `legacy` mode; the list readers retain their two bounded batch lookups. No production assessment was enabled.
- Tests: server typecheck/build and isolated backend integration `33437577025` PASS. The harness proves the latest direct-result surface reads an enabled compatibility projection. Isolated deep E2E `33437577018` PASS, including frontend/API builds, Chromium, bounded loopback read-scale validation, public journeys, role pages, question editor, supervisor school, school CRUD, and barcode journeys. `33436942341` also passed the same HTTP proof before the CI timeout-only follow-up.
- CI resilience: `0741502b`, `008655cc`, and `af8ea80a` bound the scale, Chromium-install, and public-journey steps respectively. The prior unbounded run was superseded by workflow concurrency; the exact-head rerun reached terminal success.
- Commits: `df6fe6d9` (latest reader), `bf71ece5` (TypeScript correction), `af8ea80a` (public-journey timeout).
- Risks: Phase 5 remains isolated-only. Historical backfill is result-only; no attempt/response/version historical reconstruction, production-scale certification, production opt-in, legacy retirement, or final cutover is authorized.
- Next exact action: record this documentation commit, then begin the read-only Phase 6 schools/academic-operations entry audit.

## Batch 6S-03 — School directed assessment recipient and alert proof

- Scope: aligned group-assignment recipient resolution across `QuizAssignWidget` and `SupervisorTestsManager` with both group-owned `studentIds` and student-side `groupId`; extended the isolated HTTP journey to prove a Supervisor alert is visible in the target Student notification list.
- Status: `VERIFIED`.
- Tests: `npm run typecheck`, `npm run smoke:supervisor-dashboard` (`13/13`), `git diff --check`; Backend Integration Gate `34104719775` passed on exact head `8c2aea4a079a7433fb49751c2c28d02706ebd647`.
- Commits: `fb0f1cee` (recipient alignment), `8c2aea4a` (alert delivery evidence). Both pushed to `origin/main`.
- Preserved: public/API routes, RBAC, scoring, payments, schema, notification channels, and production data. No broad messaging or intervention engine was added.
- Deferred: read receipts, threaded inbox, intervention lifecycle, contract/seat administration, and advanced Supervisor analytics.
- Next exact action: continue with the next independently evidenced School Operations/Product Gate gap; do not reopen directed-assessment delivery unless a new failing runtime/CI signal appears.

## Batch 6S-05 — Supervisor assessment statistics membership closure

- Scope: supervisor assessment statistics now include scoped students whose class relationship is stored on the student (`groupId`), in addition to the group's `studentIds` list.
- Status: `VERIFIED`.
- Tests: local `typecheck`; `smoke:supervisor-dashboard` `14/14`; Backend Integration Gate `34106121278` PASS on `446d88b9`; Public UI Gate `34106385561` PASS on synchronized `482ebc85`.
- Commit: `446d88b9` pushed to `origin/main`; local workspace fast-forwarded to external merge `482ebc85` without losing the fix.
- Preserved: assessment targeting, RBAC, API contracts, scoring, notifications, and persisted data semantics. No schema or broad refactor.
- Deferred: intervention lifecycle, threaded messaging, bulk imports, advanced analytics, and pagination redesign.
- Next exact action: continue a focused audit of remaining school-assessment result/feedback surfaces from current HEAD.

## Batch 6Q-01 — Question Bank explanation-video filter

- Scope: added a clear `contains explanation video` filter to the main `QuestionBankManager`; it reuses the existing `hasExplanationVideo` API query with server-side pagination and all existing scope filters.
- Status: `VERIFIED` / merged in PR `#61` (`869a75ba`), runtime commit `8338883d`.
- Tests: `npm run typecheck`; `npm run smoke:batch100p-question-bank-crud`; `npm run smoke:question-html-security`; all applicable PR checks, Core Build, Safety, Production Readiness, and Vercel passed on exact head.
- Preserved: Question schema, API contract, RBAC/scope rules, pagination ownership, video picker behavior, and production data.
- Deferred: a separate “without video” filter, bulk video-link assignment, and video validation/analytics; these are not required for the current MVP.
- Next exact action: verify the student weak-skill recommendation links end-to-end (`Skill → foundation topic → lesson/video` and `Skill → actual training`) before changing recommendation logic.

## Batch 6Q-02 — Weak-skill actions at quiz completion

- Scope: the quiz completion view now presents each weak/average skill with the existing recommendation-driven actions: `شرح` (lesson/foundation topic when available), `تدريب` (actual linked quiz when available), and `إعادة قياس` (a follow-up skill assessment). Existing generic follow-up actions remain unchanged.
- Status: `VERIFIED` / merged in PR `#62` (`91216ccb`), runtime commit `98922eee`.
- Tests: local `npm run typecheck`; `npm run smoke:global-student-journey` `13/13`; `npm run smoke:results` `6/6`; PR gates including Core Build, Safety, Student/Assessment, Public UI, Production Readiness, Cross-phase, and Vercel passed on exact head.
- Preserved: scoring and result write paths, recommendation view-model, API/RBAC, schema, payment/access rules, and legacy result/report behavior. No new recommendation engine or player architecture.
- Deferred: AI recommendations, intervention lifecycle, custom remediation builder, and richer analytics; none is required for the commercial MVP.
- Next exact action: inspect the existing Reports recommendation links end-to-end (`Skill → foundation topic → lesson/video` and `Skill → actual training`) and patch only a proven link/target gap.

## Batch 6S-06 — School package seat-capacity enforcement

- Scope: access-code redemption now checks the existing package `maxStudents` against active, unexpired `AccessGrant` records before granting access. Full packages return a clear conflict response; legacy packages with `maxStudents = 0` remain unlimited.
- Status: `VERIFIED` / merged in PR `#63` (`0dbbeeb0`), runtime commit `712e8b23`.
- Tests: targeted seat-capacity contract `5/5`; school-management contract `30/30`; CI exact head passed frontend/API typecheck, builds, immutable architecture, school operations/contracts, security, reports, cross-phase, readiness, and Vercel preview gates.
- Preserved: existing access-code route, AccessGrant model, RBAC, course/quiz access semantics, payment flows, historical data, and public API URL/method. No migration or ownership-map change.
- Deferred: atomic seat reservation/counter migration, contract billing lifecycle, automated renewal, and bulk school import improvements; these require a separate product decision or scale evidence.
- Production check: both the Vercel frontend and Render API health endpoints returned HTTP `200` with database and Redis checks passing after the merge.
- Known commercial boundary: package expiry/revocation is `NOT PROVEN` for already mirrored `subscription.purchasedCourses`/`enrolledCourses`; changing it safely requires an explicit entitlement-provenance decision to avoid revoking direct course purchases. Classified `HIGH` and deferred.
- Next exact action: obtain the entitlement-provenance decision, then implement only the smallest compatible expiry boundary if authorized.

## Batch 6S-07 — School access-code grant expiry propagation

- Scope: access-code redemption now passes the reserved code expiry into the created `AccessGrant`, so school path/package/content access ends with the code while direct course purchases remain independent.
- Status: `VERIFIED` / merged in PR `#64` (`02208c21`), runtime commit `f0b4b7a6`.
- Tests: grant-expiry contract `4/4`; seat-capacity contract `5/5`; access-code boundary PASS; school-management contract `30/30`; all applicable CI, typecheck, build, security, readiness, cross-phase, and Vercel gates passed on the exact runtime.
- Preserved: existing code/package/path scope, API/RBAC, payment and direct-purchase semantics, schema compatibility, and production data. No migration or map ownership change.
- Deferred: discount-code billing lifecycle, automatic school contract renewal, and revocation of legacy mirrored course fields pending an explicit entitlement-provenance decision.
- Next exact action: define the commercial contract policy for discount packages versus full path grants before adding any further expiry or renewal behavior.

## Batch 6S-08 — Commercial access policy audit

- Scope: verified the two supported school sales modes without adding a parallel system: discount codes flow through the existing server-authoritative payment/discount boundary, while full path/package opening flows through scoped `AccessGrant` records (`pathIds`, `subjectIds`, `contentTypes`) and expiring access codes.
- Status: `VERIFIED` for existing behavior; no new runtime gap found in this audit.
- Evidence: package revenue `4/4`; payment/package `11/11`; payment tampering `9/9`; global student journey `13/13`; prior grant-expiry and seat-capacity gates remain green.
- Preserved: direct course purchases, school grants, payment approval, discount scope, RBAC, API/schema contracts, and historical data.
- Deferred: automatic renewal, contract invoices, and revocation semantics for legacy mirrored course fields; these need an owner-approved commercial policy, not an implementation guess.
- Next exact action: proceed to the next product goal only after selecting whether the first school offer is (a) discount-code sales or (b) fully opened scoped paths, then configure the existing flows accordingly.

## Batch 6S-09 — School offer expiry policy decision

- Owner decision: school package/code expiry revokes only school-granted access; it must never revoke a student's direct course purchase or independent subscription.
- Status: `VERIFIED` for the supported new-grant path. Access-code redemption creates an expiring `AccessGrant` carrying the package scope (`pathIds`, `subjectIds`, `contentTypes`) and the code expiry; content and quiz entitlement reads honor that grant boundary. Existing seat-capacity, expiry, payment, and global-student-journey evidence remains green.
- No runtime change in this batch. The decision preserves the modular boundary: `B2BPackage` defines the offer, `AccessCode` activates it, `AccessGrant` records school entitlement, content/quiz routes consume entitlement, and reports remain analytical.
- `HIGH / NOT PROVEN` boundary retained: legacy `courseIds` grants were historically mirrored into `User.enrolledCourses`/`subscription.purchasedCourses` without provenance. Automatic revocation on package status change cannot be added safely without distinguishing school grants from direct purchases; no migration or destructive cleanup is authorized.
- Deferred: contract renewal/invoices, bulk revocation, provenance migration, and concurrent high-volume seat reservation hardening.
- Next exact action: configure and run the first school pilot offer using scoped path/subject/content access with an expiring code; keep Discount Codes as the separate paid-product promotion flow.

## Batch 6S-10 — School pilot offer readiness

- Scope: re-ran the bounded evidence for configuring a school offer and consuming it through the existing package/access-code/grant/report boundaries.
- Status: `VERIFIED` at contract level; no runtime change. `smoke:school-management` (30/30), `smoke:school-package-seat-capacity` (5/5), `smoke:school-grant-expiry` (4/4), `smoke:payment-package` (11/11), `smoke:payment-tampering` (9/9), `smoke:package-revenue` (4/4), and `smoke:global-student-journey` (13/13) passed on the current tree.
- Strong MVP: Admin can create a scoped school package, set seats, issue an expiring access code, and the student redemption path creates an expiring scoped `AccessGrant`; allowed course/quiz content and school reports use the server-side grant boundary. Discount Codes remain the separate paid-product promotion path.
- `NOT PROVEN / BLOCKED`: a live end-to-end pilot run requires creating external school/package/student data. No production accounts, secrets, or external data were used in this batch. The existing live audit remains available for an explicitly authorized test environment.
- Deferred: legacy mirrored-course provenance/revocation, renewal/invoices, high-volume concurrency hardening, and any new contract/tenant/discount engine.
- Next exact action: authorize a disposable test environment and supply the intended path/subject/content scope; then run the existing live school-from-scratch audit with cleanup and record its evidence without changing product contracts.

## Batch 6S-11 — Student assessment navigation and fresh directed delivery

- Scope: removed the duplicate student-facing “Exam Center” concept from the dashboard navigation. The single `الاختبارات` entry now contains exactly `اختباراتي`, `الاختبارات المحاكية`, and `اختبارات المدرسة`; legacy tab URLs remain compatible.
- Runtime fix: opening the student assessment area refreshes the server-authoritative quiz catalogue. A supervisor can therefore publish a directed assessment while a student session is already open without the school-test list relying on the application's one-time bootstrap state.
- Preserved: directed-audience filtering, hidden-school-test privacy, Quiz runner access checks, scoring, RBAC, public routes, and historical attempts. `اختبارات المدرسة` remains a presentation boundary over the existing targeted catalogue, not a new assessment system.
- Local evidence: `smoke:my-quizzes` 10/10, `smoke:assessment-directed-scope` PASS, `smoke:supervisor-dashboard` 14/14, and production frontend build PASS. CI on the focused runtime commit is required before merge.
- `NOT PROVEN`: the specific production record shown in the screenshot cannot be inspected without using an authenticated account/session. If it remains absent after deployment and refresh, inspect only that record's saved `targetGroupIds/targetUserIds`, publication state, and question integrity against the student's authoritative Group membership.
- Next exact action: inspect the exact deployed student response after CI/deployment, then close this repair or apply only the proven record-level correction.

## بروتوكول بداية أي جلسة أو حساب جديد

اقرأ بهذا الترتيب فقط:

1. `AGENTS.md`
2. هذا الملف
3. `docs/architecture/PROJECT_MAP.md`
4. القسم المرتبط من `MODULE_CATALOG.md` و`CHANGE_MAP.md`
5. `git status --short --branch` و`git log -8 --oneline`
6. ملفات الـBatch الحالي فقط

لا تعتمد على ZIP أو رسالة محادثة قديمة كمصدر للكود. إذا اختلفت وثيقة عن HEAD، حدّث الحالة بعد التحقق ولا تعكس كودًا سليمًا.

## قالب تحديث إلزامي بعد كل Batch

`Batch / Scope / Changed files / Preserved contracts / Tests / Gates / Commit / Push / Risks / Next exact action`

## نقطة التسليم الحالية

تم تثبيت Control Plane في `4f206b0f` ثم تحديثه في `e0617d4e`. أُنجز P0-00 في `81aaee59`، وP0-01 في `3150eb67`، وP0-02 في `0172947a`. أُنجز P0-03A في `f14a9576`، وP0-03B في `057dee2a` بإضافة scope تشغيلي لـcontent bootstrap تستخدمه شاشة إدارة المدارس لتجنب تحميل topics/lessons/library غير المطلوبة، وP0-03C في `8620b20b` باستخدام `.lean()` في قراءات العمليات الإدارية، وP0-03D في `082ab527` بإضافة `phase=compact` لمسار الطالب. أُنجز P0-04 في `71875c15`، ثم أُصلح عقد البيئة في `7f6e2e60` بحيث يستخدم benchmark arguments صريحة ولا يضيف مفاتيح بيئة جديدة؛ architecture gate عاد PASS. في Phase 2A نُقلت آثار تسليم الاختبار إلى application boundary في `5bf30491`، ثم نُقل تحقق سلامة أسئلة الاختبار في `2f8a3170`، ونُقل تطبيع placement في `b10b9081`، واكتمل عزل اختيار الأسئلة وحل مهاراتها في `3651e0ec`، واكتمل عزل workflow defaults وتطهير تحديثات النشر في `7dd90ec5`، واكتمل عزل سياسة قرار النشر في `ca632e5a`، واكتمل عزل إنشاء الأسئلة المضمنة مع إبقاء محول قاعدة البيانات داخل route في `8c0b81cc`، واكتمل عزل تركيب مستند إنشاء الاختبار في `3432aa59`، واكتمل عزل تركيب مستند تحديث الاختبار في `3014a2c4`، واكتمل عزل تركيب حالة الاختبار للتحقق في `a2db9f33`، واكتمل عزل تركيب مستند QuestionAttempt في `81d3df1e`، واكتملت أدوات سياق المحاولة في `756b6f87`، واكتمل حل وترتيب أسئلة الإرسال في `2A-13`. في `2A-14` فُصلت مراجعة الإجابات، ملخص الدرجة، تحليل المهارات، نتائج أقسام المحاكاة، لقطة الاختبار، ووثيقة نتيجة الإرسال خلف وحدات تطبيقية نقية؛ وبقيت صلاحية الإرسال، الاستعلامات، الحفظ، ومعالجة التعارض والـside effects في route. بقي scoring وschema وRBAC وURLs/API contracts دون تغيير، ولا تزال أرقام التوسع الإنتاجية غير مثبتة.
