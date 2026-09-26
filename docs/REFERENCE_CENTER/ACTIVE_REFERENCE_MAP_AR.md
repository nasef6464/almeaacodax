# ALMEAA — Active Reference Map

> هذا الملف خريطة بشرية سريعة. السجل الآلي المقابل: `REFERENCE_REGISTRY.json`.

## المستوى A — مراجع يجب معرفتها

| المرجع | الدور |
|---|---|
| `AGENTS.md` | قواعد التنفيذ والـdelivery |
| `docs/REFERENCE_CENTER/README_AR.md` | نقطة الدخول الوحيدة للتوثيق |
| `docs/architecture/CODEX_EXECUTION_STATE.md` | الحالة التنفيذية والأدلة الحالية |
| `docs/architecture/CHAT_EXECUTION_GOALS_AR.md` | ترتيب أهداف المنتج والتنفيذ |
| `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md` | الرؤية والمعمار |
| `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md` | ملكية المجلدات والوحدات |
| `docs/product/STUDENT_JOURNEY_PHILOSOPHY_AR.md` | فلسفة رحلة الطالب |

## المستوى B — مراجع Domain

### Questions / Review / Tutor
- `docs/architecture/QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md`
- `docs/architecture/QUESTION_BANK_V2_INGESTION_CONTRACT_AR.md`
- `docs/architecture/QUESTION_VOICE_EXPLANATION_V1_AR.md`

### Adaptive Mastery
- `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
- `docs/architecture/ADAPTIVE_MASTERY_AGENT_OPERATING_PROTOCOL_AR.md`
- Phase evidence files 1–11 تستخدم كدليل، لا كخطة مستقلة.

### Assessment
- `docs/architecture/ASSESSMENT_COMPLETION_REPORT_AR.md`
- `docs/architecture/ASSESSMENT_TEST_ROADMAP_AR.md`
- `docs/assessment-platform-v1-handoff.md`

### Schools / Roles
- `docs/architecture/SCHOOLS_RBAC_AUDIT_AR.md`
- `docs/architecture/SCHOOL_MVP_COMPLETION_REPORT_AR.md`
- `docs/architecture/ROLE_SCOPE_CONTRACT_AR.md`

### Smart Classroom
- `docs/architecture/SMART_CLASSROOM_AGENT_ENTRY_AR.md`
- `docs/architecture/SMART_CLASSROOM_EXECUTION_MASTER_AR.md`
- `docs/architecture/SMART_CLASSROOM_MASTER_SPEC_AR.md`

### Production / Ops
- `docs/architecture/ALMEAA_MASTER_PRODUCTION_CHECKPOINT_2026-09-23_AR.md`
- `docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`
- `docs/architecture/RELEASE_HARDENING_CURRENT_STATE.md`
- `docs/architecture/DISASTER_RECOVERY_RUNBOOK.md`

## المستوى C — تاريخي/مرجعي فقط

هذه أمثلة لملفات لا يجب استخدامها كحالة حالية دون مراجعة:
- `docs/CURRENT_DEVELOPMENT_STATUS_AR.md` — مايو 2026.
- `docs/MASTER_DELIVERY_STATUS_AR.md` — مايو 2026.
- ملفات `BATCH_*` القديمة.
- `docs/archive_reports/*`.
- handoffs القديمة التي تم إغلاقها لاحقًا.
- أي ملف قديم يحمل `FINAL` أو `CURRENT` لكن تاريخه أقدم من المرجع النشط.

## قرار التعارض

إذا وجدت معلومتين متعارضتين:
1. افحص Git HEAD.
2. افحص `CODEX_EXECUTION_STATE.md`.
3. افحص Evidence الحديثة.
4. عامل الأقدم كتاريخ حتى يثبت العكس.
