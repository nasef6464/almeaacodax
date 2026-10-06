# ALMEAA Command Center — Handoff / Execution State

> **AUTHORITATIVE LATEST CHECKPOINT — 2026-10-06 18:33 Asia/Riyadh**  
> PR #405 — merged into `main`: `3a38e0a8329c28848d7a95c7f38a215266d867df`  
> PR #393 — closed as superseded; do not merge.  
> PR #397 — merged earlier: `7c21eca9016146c380b861447967eae399805a1c`.  
> Smart Teacher/Whiteboard code path from PR #395 is merged.  
> Developer/Codex code-only bridge is merged.  
> Quiz update planning is now exposed through the shared Command Tool Layer by PR #405.  
> GitHub exact-head checks for #405 were green before merge.  
> Current closure blocker remains external: trusted Production OAuth 2.1 IdP configuration + live Remote MCP client proof.  
> Do not claim CLOSED until production deploy verification and external MCP proof pass.  

> تحديث تنفيذي بعد دمج Developer Bridge — 2026-10-06 13:04 Asia/Riyadh  
> Developer/Codex + Remote MCP PR #397 — merged: `7c21eca9016146c380b861447967eae399805a1c`  
> Vercel Production: READY on exact merge SHA.  
> Render `almeaacodax-codex`: LIVE on exact merge SHA.  
> Remote MCP Live Certification run #1: **FAILED CLOSED** at OAuth protected-resource metadata because production returned HTTP 404 while `ALMEAA_MCP_ENABLED` is not active.  
> Root cause: production OAuth/IdP configuration remains an owner/provider configuration gate; code routes and OAuth resource-server verification are merged.  
> Safety: MCP remains disabled rather than exposing an unconfigured OAuth surface. No RBAC/CSRF/server-authority relaxation was made.  
> External connection proof: BLOCKED until a trusted OAuth 2.1 IdP issuer/audience/scopes are configured.  
> Issue: #386 remains OPEN.  
> الحالة: **CODE MERGED + VERCEL READY + RENDER LIVE — OAUTH IDP/EXTERNAL MCP PROOF BLOCKED**

> آخر تحديث: 2026-10-06 10:54 Asia/Riyadh  
> Foundation PR #387 — merged: `686763d09c40d279b0879ce93943503018c21571`  
> Execution/MCP PR #390 — merged: `79e518bc7bd54cb5c10087fb466dde55db11d1c2`  
> Content Ops PR #392 — merged: `9a40dac7268cbe4f1424223203ec2637c311ef55`  
> Smart Teacher PR #395 — merged: `12b971a37f7f09924e5fb93ab164052c171cd64a`  
> أحدث main عند بدء دفعة Developer Bridge: `ac03c73b72c9bd20bd72becd047f66932b237307`  
> الفرع الحالي: `feat/almeaa-command-center-developer-bridge-2026-10-06`  
> PR الحالي: #397 — exact-head CI pending  
> Issue: #386  
> الحالة: **SMART TEACHER MERGED/DEPLOYED — DEVELOPER BRIDGE ACTIVE — EXTERNAL OAUTH/MCP PROOF PENDING**

## checkpoint الحالي

تم في هذه الدفعة:
- دمج PR #395 بعد نجاح exact-head CI؛ Smart Teacher merge SHA هو `12b971a37f7f09924e5fb93ab164052c171cd64a`.
- Vercel Production أصبح READY على Smart Teacher SHA، ثم أصبح أحدث main `ac03c73...` READY أيضًا.
- Render أصبح LIVE على Smart Teacher SHA؛ أحدث main دخل auto-deploy بعده.
- فتح PR #397 لإضافة Developer/Codex bridge للكود فقط.
- Developer bridge يستخدم نفس CommandCenterDraft/Audit/scopes/idempotency ولا ينشئ Gateway موازيًا.
- المستودع المسموح ثابت: `nasef6464/almeaacodax`.
- External MCP يستطيع إنشاء Developer Task Draft وقراءة handoff بعد موافقة بشرية فقط.
- لا توجد أدوات MCP للـmerge/deploy/publish/delete، وDeveloper Draft لا يمر عبر content Apply adapter.
- اختبار `smoke-command-center-execution-mcp-contract.mjs` تم توسيعه لتثبيت هذه الحدود داخل CI.

المتبقي قبل CLOSED:
1. إغلاق exact-head CI لـ#397 وإصلاح أي failure ثم merge.
2. تحقق Vercel + Render + live E2E بعد merge النهائي.
3. إعداد Production OAuth IdP الحقيقي (issuer/audience/scopes) وتشغيل Remote MCP tool scan فعلي.
4. إثبات اتصال ChatGPT الخارجي، ثم Gemini/Claude إذا سمحت إعدادات الحساب/المزود.
5. تحديث Issue #386 بنتيجة الإغلاق وتعطيل المهمة المجدولة فقط بعد تحقق جميع البنود.

## الهدف النهائي

بناء مركز قيادة واحد للمنصة:
- يعمل من داخل لوحة المدير.
- ويُعرض لاحقًا عبر Remote MCP إلى ChatGPT / Gemini / Claude / Codex.
- يستخدم نفس Tool Layer.
- لا يعطي أي LLM وصولًا مباشرًا إلى MongoDB.
- المحتوى المولد أو المعدل آليًا يمر عبر Draft → Validate → Review → Publish.

## ما تم فعليًا

### CC-1 Foundation
- [x] Command Tool Registry.
- [x] Admin session principal.
- [x] External API-key principal.
- [x] Scoped permissions.
- [x] Timing-safe API key comparison.
- [x] Audit model + audit service.
- [x] Draft model.
- [x] Idempotency key uniqueness.
- [x] Human-only draft review.
- [x] Read-only canonical skill-tree tool.
- [x] Command Center routes mounted at `/api/command-center`.
- [x] OpenAPI starter.
- [x] Admin navigation renamed to `مركز قيادة المنصة`.
- [x] Unified operations panel added to the existing AI manager surface.
- [x] Frontend Command Center API client added.

### CC-2 Questions & Quizzes
- [x] Question batch draft schema.
- [x] Main-skill validation.
- [x] Multi-subskill validation under selected main skill.
- [x] Correct option bounds validation.
- [x] Exact normalized duplicate detection against live bank.
- [x] Exact duplicate detection inside incoming batch.
- [x] Question batch writes go to CommandCenterDraft only.
- [x] Quiz draft validation against existing question IDs/path/subject.
- [x] Quiz draft writes go to CommandCenterDraft only.
- [ ] Near-duplicate semantic scoring.
- [x] Approved Quiz Draft apply adapter (creates unpublished canonical quiz).
- [ ] Publish adapter remains intentionally separate.
- [x] Existing-quiz diff + reviewable update draft + optimistic-concurrency apply adapter.
- [x] Conservative near-duplicate detection (0.92 trigram similarity threshold) blocks highly similar incoming drafts.

### CC-3 Courses — Reuse-first
- [x] Read reusable course inventory by path/subject/section.
- [x] Inventory includes existing lessons/videos, quizzes, library files and skills.
- [x] Course draft references existing platform content.
- [x] Scope validation for lessons/quizzes/files/skills.
- [x] Duplicate lesson reference detection.
- [x] Derived course skills from reused content.
- [x] Policy fixed as:
  - `reuse_first`
  - `existing_platform_content`
  - `generate_only_when_missing`
- [x] Course output remains Draft and unpublished.
- [x] Admin Command Center shows command safety status, tool registry and draft queue.
- [ ] Rich course composer UI from inventory.
- [x] Approved Course Draft → canonical unpublished Course apply adapter.
- [x] Apply is idempotent and tracked separately from approval/publish.
- [ ] Course audit after apply.
- [ ] Missing-content suggestion/generation workflow.

## ما لم يبدأ بعد

### CC-4 Schools & Classrooms
- [x] school setup draft.
- [x] class creation plan.
- [x] existing-student placement validation.
- [x] teacher assignment validation.
- [x] supervisor validation.
- [x] duplicate class-name/key detection.
- [x] reuse-existing-accounts policy.
- [x] explicit-only account creation policy.
- [ ] CSV/XLSX import parser.
- [x] cross-school assignment guard before apply.
- [x] safe idempotent apply adapter for school/classes/existing users.
- [x] Command Center UI reuses audited CSV/TSV/XLSX school parser to create validated school setup drafts.
- [ ] Teacher/supervisor import columns in Command Center school file workflow (student/class import is wired now).

### CC-5 Workflow Engine
- [x] Plan → Execute → Verify model.
- [x] resumable multi-step execution.
- [x] progress tracking.
- [x] idempotent step retries / failure recovery.
- [x] per-step audit.
- [x] external workflow allowlist excludes approve/apply/publish/delete.
- [x] natural-language Admin planner creates validated workflow plans inside ALMEAA.

### CC-6 Remote MCP
- [x] MCP modern stateless 2026-07-28 transport.
- [x] legacy 2025-11-25 compatibility path.
- [x] same Command/Workflow services; no duplicate domain logic.
- [x] OAuth 2.1 resource-server verification (issuer/audience/JWKS/scopes).
- [x] protected-resource metadata endpoints.
- [x] scoped service API-key fallback for controlled clients/tests.
- [x] profile tool + read/draft/workflow tools.
- [x] Apply/Approve/Publish/Delete intentionally not exposed through MCP.
- [ ] configure production OAuth Identity Provider + issuer/audience.
- [ ] deploy exact branch and run ChatGPT tool scan/connection proof.
- [ ] Gemini/Claude connection proof after deployment.

### CC-7 Smart Teacher / Smart Whiteboard
- [x] Smart Teacher orchestration path merged.
- [x] lesson/session planning path merged.
- [x] formative support integrated without taking authority from Smart Classroom.
- [x] Smart Classroom remains authority for session state.
- [x] Smart Whiteboard integration path merged.
- [ ] final live production certification stays part of overall closure evidence.

### CC-8 Developer Agent
- [x] code-issue routing.
- [x] GitHub/Codex code-only bridge.
- [x] investigate → patch → test → pull_request handoff contract.
- [x] Developer tools remain separate from platform content Apply/Publish.
- [x] Remote MCP does not expose merge/deploy/publish/delete for Developer tasks.

## قواعد الاستمرار لأي Agent أو مطور

1. لا تُنشئ مساعدًا جديدًا موازيًا.
2. أضف capability جديدة إلى Command Tool Registry.
3. لا تجعل external agent يكتب live collections مباشرة.
4. لا تعطي external key صلاحية approval.
5. reuse-first للدورات: استخدم محتوى المنصة الموجود قبل إنشاء أي محتوى جديد.
6. GitHub للكود فقط، وليس لإدارة المحتوى اليومي.
7. scoring/mastery/RBAC تظل deterministic.
8. أي batch write يجب أن يكون idempotent.
9. كل sensitive action يجب أن يظهر في Audit.
10. لا تُعلن Production closure قبل merge + required CI + exact-head verification.

## الترتيب التالي المعتمد

1. تحقق post-merge لـ `3a38e0a...`: Vercel READY + Render LIVE + health/live + required post-deploy gates.
2. إعداد trusted Production OAuth 2.1 IdP الحقيقي وتعبئة issuer/audience/scopes بدون اختراع أسرار أو تعطيل الحماية.
3. تشغيل Remote MCP live certification: protected-resource metadata → server/discover → tools/list → fail-closed unauthenticated.
4. إثبات اتصال ChatGPT الخارجي، ثم Gemini/Claude إذا سمحت الحسابات.
5. تنظيف أي وثائق/تعليقات قديمة بعد نجاح live proof.
6. إغلاق Issue #386 وتعطيل المهمة المجدولة فقط بعد اكتمال جميع أدلة الإنتاج والـexternal proof.

## حالة الدمج

PR #387 تم دمجه في `main` بعد نجاح exact-head CI.
Merge commit:
`686763d09c40d279b0879ce93943503018c21571`

المرحلة الحالية تعمل على فرع التنفيذ/MCP الجديد ولا يجوز اعتبارها Production قبل PR جديد + CI + merge + deploy verification.
