# ALMEAA Command Center — خطة التنفيذ المعتمدة

> الحالة: ACTIVE IMPLEMENTATION
> التاريخ: 2026-10-05

## القرار المعماري

لا نبني مساعدًا منفصلًا لكل جزء من المنصة.

المعمارية المعتمدة:

**One Command Center → One Tool Layer → Many Interfaces**

الواجهات:
1. لوحة المدير داخل ALMEAA.
2. Remote MCP للوكلاء الخارجيين مثل ChatGPT / Claude / Gemini / Codex.
3. Developer Agent لمهام الكود فقط.
4. Smart Teacher / Smart Whiteboard كقدرات داخل نفس المنظومة، لا كأنظمة مستقلة.

## قواعد غير قابلة للكسر

- لا وصول مباشر من AI إلى MongoDB.
- كل تنفيذ يمر بأداة Domain محددة.
- المحتوى المولد: Draft → Validate → Human Review → Publish.
- External agents لا يملكون Publish مباشرًا.
- أي عملية حساسة تسجل Audit.
- Idempotency إلزامية للدفعات الكبيرة قبل التوسع.
- الحسابات الرسمية مثل scoring/mastery/RBAC تبقى deterministic.
- GitHub يستخدم لتعديل الكود، وليس لإدارة المحتوى اليومي.

## مجالات Command Center

- Questions & Question Banks
- Skills & Topics
- Quizzes & Mock Exams
- Courses & Lessons
- Media & Library
- Schools & Classrooms
- Users & Assignments
- Reports & Operations
- Smart Classroom
- Smart Teacher
- Smart Whiteboard
- Developer / Codex

## المراحل

### CC-1 — Foundation
- Command Tool Registry.
- Admin/API principal boundary.
- Scoped permissions.
- Audit trail.
- Idempotency.
- Draft/Review foundation.
- Read-only skill tree.

### CC-2 — Question & Quiz Operations
- question batch drafts.
- duplicate detection.
- multi-subskill validation.
- quiz composition/update plans.
- publish adapter بعد الموافقة.

### CC-3 — Course Operations
- create course structure.
- sections/topics/lessons.
- attach videos/files.
- link skills.
- lesson training.
- section/final quizzes.
- complete course audit.

### CC-4 — Schools
- create school setup plans.
- classes.
- student imports.
- teacher/supervisor assignments.
- safe apply with school scope.

### CC-5 — Workflow Engine
- Plan → Execute → Verify.
- resumable jobs.
- batch progress.
- per-step audit.
- failure recovery.

### CC-6 — External MCP
- expose the same Tool Registry over Remote MCP.
- no duplicate business logic.
- scoped credentials.
- read + draft-write first.

### CC-7 — Smart Teacher / Whiteboard
- lesson orchestration.
- formative questions.
- classroom session support.
- existing Smart Classroom remains authority for session state.

### CC-8 — Developer Agent
- diagnose code issue.
- reproduce.
- patch through GitHub/Codex.
- CI and PR.
- never mix source-code writes with content writes.

## الحالة الحالية

تم بدء CC-1 على الفرع:
feat/almeaa-command-center-foundation-2026-10-05

الهدف من CC-1 هو إنشاء أساس آمن يمكن توسيعه دون إعادة بناء لاحقًا.
