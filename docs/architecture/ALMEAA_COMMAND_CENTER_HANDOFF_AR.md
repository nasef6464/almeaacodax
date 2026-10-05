# ALMEAA Command Center — Handoff / Execution State

> آخر تحديث: 2026-10-05
> الفرع التنفيذي: `feat/almeaa-command-center-foundation-2026-10-05`
> Issue: #386
> PR: #387
> الحالة: **ACTIVE — NOT MERGED TO MAIN YET**

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
- [ ] Publish adapter after approval.
- [ ] Existing-quiz update plan/diff tool.

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
- [ ] Approved-draft → canonical Course/Lesson/Quiz service apply adapter.
- [ ] Course audit after apply.
- [ ] Missing-content suggestion/generation workflow.

## ما لم يبدأ بعد

### CC-4 Schools & Classrooms
- [ ] school setup draft.
- [ ] class creation plan.
- [ ] student import plan.
- [ ] teacher/supervisor assignment plan.
- [ ] ownership/scope validation.
- [ ] safe apply adapter.

### CC-5 Workflow Engine
- [ ] Plan → Execute → Verify job model.
- [ ] resumable multi-step jobs.
- [ ] progress tracking.
- [ ] retry/failure recovery.
- [ ] per-step audit.

### CC-6 Remote MCP
- [ ] MCP transport adapter.
- [ ] expose same registry, no duplicate business logic.
- [ ] scoped credentials.
- [ ] ChatGPT connection proof.
- [ ] Gemini/Claude connection proof.

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

1. إنهاء CI/TypeScript/contract checks للـPR #387.
2. إصلاح أي gate يفشل على exact head.
3. إكمال CC-3 rich course composer + apply adapter.
4. CC-4 school tools.
5. CC-5 workflow engine.
6. CC-6 Remote MCP.
7. CC-7 Smart Teacher/Whiteboard.
8. CC-8 Developer Agent.

## ملاحظة الدمج

حتى كتابة هذه الوثيقة، PR #387 مفتوح ولم يتم دمجه في `main`.
أي Agent لاحق يجب أن يفحص حالة الـPR والـrequired checks قبل الدمج.
