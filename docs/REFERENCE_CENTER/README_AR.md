# ALMEAA — مركز المرجع الموحد للمطورين والوكلاء

> **START HERE — نقطة الدخول الوحيدة للتوثيق النشط**
>
> آخر تحديث: 2026-09-24  
> الغرض: منع تشتت المطور أو الـAgent بين مئات الخطط والتقارير القديمة والمتعارضة.

يوجد في المستودع عدد كبير من ملفات `docs/` تراكمت عبر مراحل التطوير. **وجود ملف في `docs/` لا يعني أنه ما زال مصدر حقيقة.**  
من الآن، هذا المجلد هو البوابة الرسمية التي تحدد ما يجب قراءته وما هو تاريخي فقط.

## ترتيب مصدر الحقيقة

أي مطور أو Agent يعمل على ALMEAA يتبع هذا الترتيب:

1. **Git HEAD الحالي** — الحقيقة الأولى للكود.
2. **`AGENTS.md`** — قواعد التنفيذ والحماية.
3. **هذا الملف** — خريطة الوثائق النشطة.
4. **`REFERENCE_REGISTRY.json`** — سجل آلي لحالة المراجع.
5. الوثيقة المتخصصة المرتبطة بالمجال الذي تعمل عليه.
6. التقارير القديمة فقط عند الحاجة التاريخية أو التحقيق في قرار سابق.

لا تعتمد على تقرير قديم لمجرد أن اسمه يحتوي `FINAL` أو `MASTER` أو `CURRENT`.

---

## اقرأ هذه الملفات أولًا

### 1) حالة التنفيذ الحالية
- `docs/architecture/CODEX_EXECUTION_STATE.md`
- الاستخدام: ما تم فعليًا، آخر أدلة، وأين وصل التنفيذ.
- الحالة: **CANONICAL / ACTIVE**

### 2) خطة التنفيذ التجارية
- `docs/architecture/CHAT_EXECUTION_GOALS_AR.md`
- الاستخدام: ترتيب الأهداف والـGates وقواعد الإغلاق.
- الحالة: **CANONICAL / ACTIVE**

### 3) الرؤية والمعمار الرئيسي
- `docs/architecture/FINAL_MASTER_PLAN_V3_AR.md`
- الاستخدام: رؤية المنتج، الحدود المعمارية، واتجاه المنصة.
- الحالة: **CANONICAL / REFERENCE**

### 4) خريطة الملكية والملفات الحالية
- `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md`
- `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`
- الاستخدام: أين يعيش كل Domain حاليًا وما الدين المعماري المتبقي.
- الحالة: **CANONICAL / ARCHITECTURE**

### 5) رحلة الطالب
- `docs/product/STUDENT_JOURNEY_PHILOSOPHY_AR.md`
- الاستخدام: فلسفة رحلة الطالب، UI، الاختبارات، المراجعة، Smart Tutor، Voice، remediation، spaced review.
- الحالة: **CANONICAL / PRODUCT**

### 6) السؤال الموحد والمراجعة والمعلم الذكي
- `docs/architecture/QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md`
- الاستخدام: One Question → One Image → One Code، وعدم تكرار السؤال/الصورة، ReviewCard، AI context.
- الحالة: **CANONICAL / DOMAIN**

### 7) Adaptive Mastery
- `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
- `docs/architecture/ADAPTIVE_MASTERY_AGENT_OPERATING_PROTOCOL_AR.md`
- الاستخدام: الإتقان، الأدلة، Next Best Action، وحدود الذكاء الاصطناعي.
- الحالة: **CANONICAL / DOMAIN**

### 8) نظام الذكاء الاصطناعي الموحد
- `docs/architecture/AI_PLATFORM_OPERATING_MODEL_AR.md`
- الاستخدام: المزودات، المفاتيح، التوكنز، الميزانيات، Student/Question/Admin/Voice Tutor، routing والمراقبة.
- الحالة: **CANONICAL / ACTIVE**

### 9) الإنتاج والجاهزية التشغيلية
- `docs/architecture/ALMEAA_MASTER_PRODUCTION_CHECKPOINT_2026-09-23_AR.md`
- `docs/architecture/ALM_PRD_001_PRODUCTION_CLOSURE_2026-09-22_AR.md`
- الاستخدام: ما هو مثبت إنتاجيًا، ما هو غير مثبت، والحواجز التشغيلية.
- الحالة: **ACTIVE EVIDENCE / OPERATIONS**

---

## خريطة حسب المهمة

| لو ستعمل على | ابدأ بـ |
|---|---|
| رحلة الطالب / Dashboard / Learning Space | `STUDENT_JOURNEY_PHILOSOPHY_AR.md` |
| Question Bank / الصور / ingest | `QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md` + `QUESTION_BANK_V2_INGESTION_CONTRACT_AR.md` |
| اختبارات / Assessment / Results | `CHAT_EXECUTION_GOALS_AR.md` + `ASSESSMENT_COMPLETION_REPORT_AR.md` |
| Adaptive / Mastery / Smart Path | `ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md` |
| AI / Question Assistant / Tokens / Keys | `AI_PLATFORM_OPERATING_MODEL_AR.md` + `QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md` |
| مدارس / RBAC | `SCHOOLS_RBAC_AUDIT_AR.md` + School completion references |
| Smart Classroom | `SMART_CLASSROOM_AGENT_ENTRY_AR.md` |
| Refactor / modularity | `CURRENT_DIRECTORY_AND_MODULE_MAP.md` + `DEEP_MODULARITY_AND_RESOURCE_AUDIT.md` |
| Production / Render / Vercel / Atlas / R2 | `ALMEAA_MASTER_PRODUCTION_CHECKPOINT_2026-09-23_AR.md` |
| DR / Backup | `DISASTER_RECOVERY_RUNBOOK.md` + `BACKUP_RESTORE_PRODUCTION.md` |
| متابعة آخر شغل | `CODEX_EXECUTION_STATE.md` |

---

## معنى حالات الوثائق

- **CANONICAL**: مرجع معتمد يجب قراءته.
- **ACTIVE EVIDENCE**: تقرير حديث يثبت حالة أو رحلة بعينها.
- **SUPPORTING**: مفيد عند العمل في مجال محدد لكنه ليس نقطة البداية.
- **HISTORICAL**: سجل قديم؛ لا يستخدم لتحديد الوضع الحالي.
- **SUPERSEDED**: تم استبداله بمرجع أحدث.
- **ARCHIVE**: محفوظ للتاريخ والتحقيق فقط.

السجل الآلي موجود في:
`docs/REFERENCE_CENTER/REFERENCE_REGISTRY.json`

---

## قاعدة مهمة جدًا: لا تقرأ 300 ملف قبل أن تبدأ

المستودع يحتوي مئات التقارير. **ممنوع على Agent جديد أن يقوم بمسح كل `docs/` ثم يبني خطة جديدة من الصفر.**

الخط الصحيح:

```
Git HEAD
  ↓
AGENTS.md
  ↓
REFERENCE_CENTER/README_AR.md
  ↓
CODEX_EXECUTION_STATE.md
  ↓
المرجع المتخصص للمهمة فقط
  ↓
افحص الكود الحقيقي
  ↓
نفّذ + اختبر + حدّث المرجع
```

---

## ماذا نفعل بالملفات القديمة؟

لا ننقل أو نحذف مئات الملفات دفعة واحدة لأن ذلك قد يكسر:
- روابط داخلية.
- مراجع PRs/issues.
- أدلة CI.
- handoff links.
- روابط محفوظة لدى Agents آخرين.

بدل ذلك:

1. **المركز الحالي يحدد ما هو معتمد.**
2. الملفات القديمة تبقى في مكانها كأرشيف تاريخي.
3. عند لمس Domain معين، يمكن نقل تقاريره القديمة تدريجيًا إلى `docs/archive_reports/`.
4. أي نقل يجب أن يحدث في PR منفصل خاص بالتوثيق، مع تحديث الروابط.
5. لا ننشئ ملف خطة جديد إذا كان يمكن تحديث مرجع Canonical قائم.

---

## قاعدة إنشاء وثائق جديدة

من الآن:

- لا تنشئ `MASTER_PLAN_2` أو `FINAL_FINAL` أو `CURRENT_NEW`.
- إن تغيرت الخطة الرئيسية: حدّث المرجع الرئيسي وسجل التاريخ داخله.
- Evidence مؤقتة/مرحلية تبقى في `docs/architecture/` أو مجلد domain المناسب.
- كل وثيقة جديدة مهمة يجب أن تسجل في `REFERENCE_REGISTRY.json`.
- كل Agent handoff يجب أن يشير إلى هذا المركز بدل سرد عشرات الملفات.
- التقرير الذي لا يغير مصدر الحقيقة لا يصبح Canonical تلقائيًا.

---

## آخر إغلاق مهم مرتبط برحلة الطالب

Student Review + Smart Tutor E2E تم إغلاقه على بيئة معزولة:
- Deep Pre-Merge E2E: Green.
- Student Review saved + mistakes: Green.
- Question Assistant من result/saved/mistake: Green.
- Teacher Voice surface: Green.
- remediation + spaced reschedule: Green.
- لا Production writes في هذه الجولة.

التفاصيل:
`docs/product/STUDENT_JOURNEY_PHILOSOPHY_AR.md`

---

## للمطور أو الـAgent الجديد في 60 ثانية

اقرأ بالترتيب:

1. `AGENTS.md`
2. هذا الملف.
3. `docs/architecture/CODEX_EXECUTION_STATE.md`
4. المرجع المتخصص للمهمة من الجدول أعلاه.
5. افحص Git HEAD والكود قبل أي استنتاج.
6. لا تثق في حالة قديمة لمجرد أنها مكتوبة في ملف قديم.
7. لا تغير Production أو بيانات حقيقية من أجل إثبات محلي/CI.

**إذا تعارض ملف قديم مع Git HEAD أو سجل المرجع الحالي، Git HEAD والسجل الحالي لهما الأولوية.**
