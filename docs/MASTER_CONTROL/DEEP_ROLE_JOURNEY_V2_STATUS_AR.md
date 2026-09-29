# ALM-E2E-ROLE-002 — Deep Role Journey V2

> **Source of truth for continuation**
>
> GitHub Issue: #304  
> Working branch: `chatgpt/deep-role-journey-v2`  
> Baseline main SHA: `cc359e5fb77e4a1fbb77e86d6fd986bf555878de`  
> Started: 2026-09-29  
> Status: **IN PROGRESS**

## لماذا هذه المهمة؟

الاختبارات السابقة أثبتت أن صفحات الأدوار تعمل وأن رحلة الطالب/المشرف قوية، لكن آخر `Platform V3 Live Role Gate` على PR #303 كان **SKIPPED** بسبب شروط الـworkflow. لذلك لا نساوي بين نجاح البيئة المعزولة وبين Production certification.

## baseline المثبت قبل V2

على PR #303 head `00b6ab8346eb8811b70068c6d69e99bd5013f0ae`:

- All role pages Desktop + Mobile: **48/48 PASS**
- Student Learning Space: **21/21 PASS**
- Results/report actions: **10/10 PASS**
- School from scratch: **12/12 PASS**
- Deep Pre-Merge E2E: **SUCCESS**
- Standalone Live Role Gate: **SKIPPED**

## نطاق Deep Journey V2

### الطالب
- [x] رحلة تعليمية عميقة موجودة: `scripts/live-student-learning-deep-audit.mjs`
- [x] Desktop + Mobile
- [x] نتائج وتقارير وإجراءات
- [ ] إعادة التشغيل على head الخاص بهذه المهمة
- [ ] Live-safe Production pass على SHA المنشور

### ولي الأمر
- [x] canonical authority contract موجود
- [x] reports role/action coverage موجود
- [ ] Journey متسلسلة: dashboard → results → weak skills → simple report → profile
- [ ] Desktop + Mobile
- [ ] منع الوصول لطالب غير مرتبط مثبت في runtime/API evidence
- [ ] Live-safe Production pass

### المعلم
- [x] reports role/action coverage موجود
- [ ] Journey متسلسلة: school workspace → classes/live classroom → prepared bank → reports/skills → assessments → profile
- [ ] Desktop + Mobile
- [ ] منع الوصول لطالب/فصل خارج التكليف مثبت في runtime/API evidence
- [ ] Live-safe Production pass

### المشرف
- [x] Supervisor school command audit موجود
- [x] RBAC school scope contracts موجودة
- [x] reports actions موجودة
- [ ] إعادة التشغيل على head الخاص بهذه المهمة
- [ ] cross-school denial runtime evidence
- [ ] Live-safe Production pass

## قواعد الحكم

1. لا يوجد PASS نهائي إذا كان الاختبار `SKIPPED`.
2. Isolated PASS لا يسمى Production PASS.
3. أي 5xx = FAIL.
4. أي 4xx غير متوقع داخل رحلة مصرح بها = FAIL.
5. أي تسرب صلاحيات أو عبور مدرسة/طالب خارج النطاق = FAIL حرج.
6. Mobile horizontal overflow = FAIL.
7. Loading لا ينتهي / blank page / mojibake ظاهر = FAIL.
8. لا ننفذ عمليات مدمرة على Production.
9. كل إصلاح يجب أن يعاد اختباره على نفس السيناريو قبل إغلاق البند.

## ملفات التنفيذ

- `scripts/live-student-learning-deep-audit.mjs`
- `scripts/live-role-pages-audit.mjs`
- `scripts/live-report-actions-audit.mjs`
- `scripts/live-supervisor-school-command-audit.mjs`
- `server/src/scripts/backendIntegrationGate.ts`
- **V2:** `scripts/live-parent-teacher-deep-audit.mjs`
- Workflow: `.github/workflows/platform-v3-deep-premerge-e2e-gate.yml`

## سجل التنفيذ

| المرحلة | الحالة | الدليل |
|---|---|---|
| تثبيت Issue + branch | ✅ | Issue #304 + `chatgpt/deep-role-journey-v2` |
| توثيق baseline | ✅ | هذا الملف |
| Parent/Teacher Deep Audit | ⏳ | جاري |
| ربط V2 بالـDeep Gate | ⏳ | جاري |
| تشغيل CI على exact head | ⏳ | بعد فتح PR |
| تحليل أي FAIL وإصلاحه | ⏳ | لا يغلق قبل rerun |
| Production live-safe audit | ⏳ | بعد isolated green |
| Final manifest | ⏳ | exact deployed SHA مطلوب |

## تعليمات لمن يكمل بعدي

ابدأ من Issue #304 وهذا الملف. لا تعِد بناء الاختبارات القديمة. اقرأ آخر PR/run، ثم:
1. أصلح فقط الـFAIL الفعلي.
2. أعد نفس السيناريو.
3. حدث هذا الملف وIssue #304.
4. لا تغلق المهمة إذا بقي `SKIPPED` أو `BLOCKED` في Production live-safe pass.
