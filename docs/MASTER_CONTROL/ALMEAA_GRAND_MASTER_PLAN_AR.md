# ALMEAA — Grand Master Execution & Market Readiness Plan

> المرجع التنفيذي الأعلى بعد توحيد تقرير المراجعة العميقة، Release Hardening، Adaptive 0–11، Student Review، AI Platform، Production Closure، مراجعة الفروع، والخطط السابقة.

## الهدف النهائي

الوصول إلى نسخة سوقية من ALMEAA تكون:
- مستقرة وقابلة للاستعادة.
- آمنة ومعزولة الصلاحيات.
- سريعة وقليلة الباندويث.
- Modular Monolith واضح.
- رحلة الطالب فيها كاملة E2E.
- Question Bank موثوق بصريًا ومرجعيًا.
- Adaptive/Mastery/Reports صحيحة متعددة المسارات.
- AI موحد منخفض التكلفة مع quota/budget/failover/ledger.
- النشر محكوم ببوابات CI وPR ولا يعتمد على ادعاءات غير مثبتة.
- Market Readiness مبني على Evidence فقط.

## التسلسل الرسمي

### PLAN 0 — Master Control & Safe Delivery
**الحالة: CLOSED ✅**

تم:
- اعتماد هذا المجلد + Issue #269 كمرجع تنفيذي وحيد.
- جرد الفروع القديمة وتصنيف merged / superseded / real gaps.
- تفعيل GitHub Ruleset `Protect main` على default branch.
- PR مطلوب قبل الدمج.
- منع force push والحذف.
- Required checks:
  - `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
  - `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
  - `Cross-phase + handover regression`
- Vercel Preview Branch Tracking معطل للفروع غير المعيّنة.
- Production branch بقي `main`.
- اختبار Vercel: commit `ab30963e0fd9e45e94bed31bd24499e107e609ad` → **0 deployment records**.
- الخطة القديمة لم تعد تقود التنفيذ؛ تبقى Evidence/Supporting فقط.

**Exit Gate: PASS.**

---

### PLAN 1 — Repository Reconciliation & Missing-Work Closure
**الحالة: CLOSED ✅**

الهدف: ضمان أن `main` يحتوي كل الوظائف المعتمدة، بدون دمج فروع قديمة بالجملة.

المهام:
1. إغلاق فجوة PR #260 فقط:
   - backend يعيد `voiceExplanation`.
   - STT/TTS + QuestionAssistantPanel + session isolation موجودة.
   - المطلوب فقط إظهار `QuestionVoiceExplanationPlayer` داخل `ReviewSession` دون إفساد UI الحالي.
2. مراجعة `chatgpt/r2-v2-audit`:
   - `.github/workflows/col2627-r2-v2-audit.yml`
   - `scripts/audit-col2627-r2-v2.mjs`
   وإعادة التطبيق clean فقط إذا كان متوافقًا مع #264.
3. إثبات أن Adaptive 0–11، Student Review، AI Platform، sidebar، quant image parity، production closure tooling ممثلة على main.
4. لا merge wholesale لأي فرع diverged تاريخي.

تم:
- إعادة تطبيق فجوة PR #260 فقط: teacher voice playback داخل `ReviewSession` مع الحفاظ على Smart Tutor والـmobile quant UI.
- تمديد smoke contract لتثبيت هذا السلوك.
- إعادة تطبيق R2 V2 reachability tooling بشكل يدوي current-compatible، مع فصل reachability عن visual correctness وربطه بقواعد #264.
- توثيق matrix للـPRs والفروع التاريخية وإثبات أن الأعمال المعتمدة ممثلة على main.
- عدم دمج أي stale/diverged branch wholesale.

Evidence:
`docs/MASTER_CONTROL/PLAN_1_RECONCILIATION_EVIDENCE_AR.md`

**Exit Gate: PASS عند دمج PR الخاص بالخطة بعد required CI.**

---

### PLAN 2 — Production Closure / Runtime / DR / Governance
**الحالة: NEXT**

المهام الرئيسية:
- #234 Runtime integrations: Redis / Sentry / R2 / Google OAuth live evidence.
- #235 DR: scheduled backup، off-site، full isolated restore، RPO/RTO.
- #236 Performance/Topology: Render↔Atlas topology + production-like evidence.
- #237 Governance/Network: branch/ruleset أصبح جزءه GitHub مغلقًا؛ يكمل ما بقي من network/allowlists/release operations.
- post-deploy smoke + release identity.
- لا Production cutover بلا rollback/restore proof.

**Exit Gate:** #234–#237 مغلقة بالأدلة الحية.

---

### PLAN 3 — Speed, Bandwidth & Runtime Footprint
**الحالة: WAITING / tracked by #268**

المهام:
- route-specific bootstrap.
- on-demand lessons/library/questions.
- قياس request count + transferred bytes + payload.
- p50/p95/p99.
- Zustand persist allowlist.
- static assets WebP/AVIF + budget guard.
- R2/CDN direct delivery وcache policy.
- منع preload غير الضروري.
- regression budgets للواجهة والـAPI.

**Exit Gate:** before/after evidence مع عدم كسر Student/Reports/Adaptive/Review.

---

### PLAN 4 — Data Model & Storage Hardening
**الحالة: WAITING FOR DR BASELINE**

المهام:
- LessonProgress normalization خارج User تدريجيًا.
- تنظيف legacy favorites/reviewLater بعد إثبات ReviewCard كـserver truth.
- QuestionRevision immutable/deduplicated للحفاظ على تاريخ المحاولة.
- QuizResult يخزن attempt facts + revision references بدل تكرار snapshot كامل حيث تسمح الهجرة.
- `id/_id` compatibility migration تدريجيًا.
- document growth budgets.
- additive → dual write → backfill → shadow read → cutover → cleanup.

**Exit Gate:** هجرات قابلة للعكس + parity proof + لا فساد لنتائج تاريخية.

---

### PLAN 5 — Residual Architecture / Modularity
**الحالة: PARTIALLY COMPLETE / WAITING**

لا نعيد:
- content route decomposition.
- store decomposition baseline.
- quiz modules التي تم فصلها.

المتبقي:
- auth.routes decomposition.
- residual quiz.routes decomposition.
- App.tsx route/bootstrap ownership split.
- residual store ownership.
- module-boundary tests.
- منع God files جديدة.
- لا Microservices لمجرد التنظيم.

**Exit Gate:** bounded modules + architecture gates + unchanged contracts.

---

### PLAN 6 — Student Journey & Learning Loop Certification
**الحالة: MOSTLY MERGED / REGRESSION PROGRAM**

الحلقة:
Dashboard → Content/Test → Question → Attempt → Result → Review → Saved/Mistake → Voice/Smart Tutor → Remediation → SkillProgress → Next Best Action.

الثوابت:
- One Question → One Image → One Code.
- Quant image choices: أ/ب/ج/د فقط.
- ReviewCard server truth.
- multi-track / subject scope.
- mobile-first density.
- wrong/review-later flows.
- create practice from mistakes.
- voice tutor in result/review.
- direct SkillProgress evidence.
- AI لا يقرر scoring/mastery/routing وحده.

**Exit Gate:** full current-main E2E بعد تغييرات الخطط السابقة.

---

### PLAN 7 — AI Platform Live Certification
**الحالة: PRE-PRODUCTION ENGINEERING CLOSED / LIVE PROVIDER PENDING**

الموجود:
- unified backend gateway.
- free-first/quota pools.
- budgets/spend caps.
- usage ledger.
- Control Center.
- bounded tutor sessions.
- low-cost browser STT/TTS.
- deterministic readiness foundation.

المتبقي:
- real provider/quota pool.
- per-pool tests.
- 429/failover evidence.
- real token/cost accounting.
- no-AI fallback live.
- Student/Question Tutor live proof.
- Qiyas predicted score يظل gated حتى calibration dataset + MAE/calibration evidence.

**Exit Gate:** LIVE PROVIDER CERTIFIED بلا كشف أسرار أو تكلفة غير منضبطة.

---

### PLAN 8 — Question Bank / Content Integrity
**الحالة: ACTIVE DOMAIN / sequenced here**

الثوابت:
- ALMEAA V1 للقدرات الكمي: 25 main / 95 subskills؛ ممنوع اختراع IDs جديدة.
- PDF/source visual truth قبل ربط الصور.
- A/B/C/D order proof.
- correctOptionIndex يطابق الاختيار المرئي.
- questionCode/source/page provenance.
- R2 content-addressed media.
- لا base64 أو image duplication في Mongo.
- FND26 + COL2627 batches.
- counters والـskills coverage على كامل البنك، لا أول page فقط.

**Exit Gate:** لا سؤال منشور بمصدر بصري غير موثوق أو mapping غير مثبت.

---

### PLAN 9 — Final Global Certification & Market Readiness
**الحالة: BLOCKED BY 1–8**

يشمل:
- typecheck/build.
- security/RBAC/tenant isolation.
- Student/Teacher/Supervisor/Admin/School journeys.
- assessment/payments/entitlements.
- Smart Classroom.
- Reports/Adaptive/Review/Voice/AI.
- DR full restore.
- realistic staged load.
- frontend performance/Core Web Vitals.
- error rate/observability.
- rollback.
- privacy/data lifecycle.
- accessibility/mobile/RTL.

الناتج النهائي فقط:
- NOT READY
- CONTROLLED PILOT READY
- PRODUCTION READY

لا تُستخدم كلمة Production Ready بدون evidence كاملة.

## Foundations مثبتة ولا تُعاد من الصفر

- Release Hardening through Batch 14.
- Adaptive/Mastery 0–11 (#211/#212).
- Student sidebar (#224).
- Question Voice (#248).
- Student Review (#256/#257).
- AI Platform (#258).
- Mobile quant review (#259/#262).
- Voice tutor session isolation (#263).
- production repository closure work (#254/#255/#265/#266).
- Google OAuth frontend routing #267.
- content route modularization.
- store decomposition baseline #185.
- structural audit #186.

## قاعدة الانتقال

بعد كل مهمة:
```
Plan:
Task:
Baseline SHA:
Branch/PR:
Status: DONE | IN PROGRESS | BLOCKED
Changed:
Tests/CI:
Live proof:
Problems found:
Decision:
Remaining:
Next exact action:
```
