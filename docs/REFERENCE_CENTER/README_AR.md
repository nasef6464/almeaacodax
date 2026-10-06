# ALMEAA — مركز المرجع الموحد للمطورين والوكلاء

> **START HERE — نقطة الدخول الوحيدة للتوثيق النشط**
>
> آخر تحديث: 2026-09-26

## نقطة التنفيذ العليا

قبل أي خطة أو تقرير، اقرأ:

1. `docs/MASTER_CONTROL/README_AR.md`
2. `docs/MASTER_CONTROL/ALMEAA_GRAND_MASTER_PLAN_AR.md`
3. `docs/MASTER_CONTROL/CURRENT_EXECUTION_STATUS_AR.md`

**Master Control هو المرجع التنفيذي الوحيد.**  
أي خطة قديمة مثل `CHAT_EXECUTION_GOALS_AR.md` أو execution handoff قديمة أو Batch plan تبقى Evidence/Supporting ولا تحدد وحدها ما نعمله الآن.

## ترتيب مصدر الحقيقة

1. Git `main` الحالي.
2. `AGENTS.md`.
3. `docs/MASTER_CONTROL/*`.
4. هذا الملف + `REFERENCE_REGISTRY.json`.
5. مرجع الـDomain المتخصص.
6. Evidence/PR/CI/Live evidence.
7. التقارير القديمة عند التحقيق التاريخي فقط.

لا تعتمد على ملف قديم لمجرد أن اسمه يحتوي FINAL أو MASTER أو CURRENT.

## مراجع الـDomain النشطة

### Architecture / ownership
- `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md`
- `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`

### Student Journey
- `docs/product/STUDENT_JOURNEY_PHILOSOPHY_AR.md`

### Questions / Review / Tutor
- `docs/architecture/QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md`
- `docs/architecture/QUESTION_BANK_V2_INGESTION_CONTRACT_AR.md`
- `docs/architecture/QUESTION_VOICE_EXPLANATION_V1_AR.md`

### Adaptive Mastery
- `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
- `docs/architecture/ADAPTIVE_MASTERY_AGENT_OPERATING_PROTOCOL_AR.md`

### AI Platform
- `docs/architecture/AI_PLATFORM_OPERATING_MODEL_AR.md`
- `docs/architecture/AI_PLATFORM_EXECUTION_PLAN_AR.md`
- `docs/architecture/AI_PLATFORM_CERTIFICATION_AR.md`

### Production / DR / Ops
- `docs/architecture/ALMEAA_MASTER_PRODUCTION_CHECKPOINT_2026-09-23_AR.md`
- `docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`
- `docs/architecture/DISASTER_RECOVERY_RUNBOOK.md`
- `docs/BACKUP_RESTORE_PRODUCTION.md`

### Schools / Roles
- `docs/architecture/SCHOOLS_RBAC_AUDIT_AR.md`
- `docs/architecture/ROLE_SCOPE_CONTRACT_AR.md`

### Smart Classroom
- `docs/architecture/SMART_CLASSROOM_AGENT_ENTRY_AR.md`
- `docs/architecture/SMART_CLASSROOM_MASTER_SPEC_AR.md`

## معنى الحالات

- **CANONICAL**: مرجع معتمد.
- **ACTIVE**: يستخدم حاليًا داخل Domain.
- **ACTIVE EVIDENCE**: إثبات حديث، وليس خطة مستقلة.
- **SUPPORTING**: مرجع مساعد.
- **HISTORICAL / SUPERSEDED**: لا يقود التنفيذ.
- **ARCHIVE**: تاريخ فقط.

## قاعدة الوثائق القديمة

لا نحذف التاريخ بالجملة لأن ذلك يكسر روابط PR/CI/Handoff.  
بدلًا من ذلك:
- Master Control يحدد الخطة الحالية.
- Registry يحدد الحالة.
- الملفات القديمة تبقى Evidence.
- نقلها للأرشيف يتم تدريجيًا عند لمس الـDomain، وليس كـbulk destructive cleanup.

## للمطور أو Agent الجديد

```
Git HEAD
  ↓
AGENTS.md
  ↓
docs/MASTER_CONTROL/README_AR.md
  ↓
CURRENT_EXECUTION_STATUS_AR.md
  ↓
المرجع المتخصص للمهمة
  ↓
افحص الكود الحقيقي
  ↓
نفّذ + اختبر + سجل الدليل
```

إذا تعارض ملف قديم مع Git HEAD أو Master Control، الأولوية لـGit HEAD ثم Master Control ثم evidence الحديثة.
