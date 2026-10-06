# ALMEAA Command Center — Handoff / Execution State

> آخر تحديث: 2026-10-06
> الفرع السابق المدموج: `feat/almeaa-command-center-foundation-2026-10-05`  
> Merge SHA: `686763d09c40d279b0879ce93943503018c21571`  
> الفرع الحالي: `feat/almeaa-command-center-execution-mcp-2026-10-06`
> Issue: #386
> PR foundation: #387 (merged)  
> PR execution/MCP: #390 — OPEN, exact-head CI active
> الحالة: **FOUNDATION MERGED — EXECUTION + MCP ACTIVE**

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
- [x] High-confidence normalized token similarity guard for near-duplicates (live bank + incoming batch).
- [x] Approved Quiz Draft apply adapter (creates unpublished canonical quiz).
- [ ] Publish adapter remains intentionally separate.
- [x] Existing-quiz question diff/update draft tool with exact/near-duplicate skipping and skill coverage before/after.
- [x] Published quizzes are never mutated by update apply; an unpublished replacement is created instead.

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
- [x] Existing safe CSV/XLSX school parser reused inside Command Center.
- [x] Roster + relation rows adapt into validated School Setup Draft input.
- [ ] Explicit missing-account creation draft remains separate by policy.

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
- [ ] teacher orchestration tools.
- [ ] lesson/session planning.
- [ ] formative question selection.
- [ ] Smart Classroom session integration.
- [ ] whiteboard actions.
- Existing Smart Classroom remains authority for session state.

### CC-8 Developer Agent
- [ ] code-issue routing.
- [ ] GitHub/Codex bridge.
- [ ] reproduce → patch → tests → PR workflow.
- Source code actions must remain separate from content actions.

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

1. PR #390 مفتوح؛ أغلق exact-head CI على نفس الـSHA النهائي.
2. أصلح أي gate يفشل ثم ادمج #390.
3. إعداد Production OAuth IdP وتشغيل MCP tool scan الفعلي.
4. ربط XLSX/CSV school import بمسودة Command Center.
5. إضافة semantic near-duplicate + existing-quiz diff tools.
6. CC-7 Smart Teacher/Whiteboard.
7. CC-8 Developer Agent.
8. Production deploy verification + end-to-end external connection proof.

## الدفعة الحالية — Final Closure

- [x] Approved Question Batch → canonical Question apply adapter.
- [x] Resumable/idempotent partial batch healing through deterministic identities.
- [x] `subSkillIds[]` persisted canonically alongside primary `subSkillId` and combined `skillIds[]`.
- [x] Near-duplicate guard added before draft creation.
- [x] Existing Quiz diff/update Draft added.
- [x] Published quiz update creates hidden replacement and leaves original unchanged.
- [x] School XLSX/CSV import UI reuses existing safe parser and produces Drafts only.
- [ ] exact-head CI + merge for this final-closure branch.
- [ ] production deploy verification after merge.
- [ ] external OAuth MCP connection proof after production IdP configuration.

## حالة الدمج

PR #387 تم دمجه في `main` بعد نجاح exact-head CI.
Merge commit:
`686763d09c40d279b0879ce93943503018c21571`

المرحلة الحالية تعمل على فرع التنفيذ/MCP الجديد ولا يجوز اعتبارها Production قبل PR جديد + CI + merge + deploy verification.
