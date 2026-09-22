# ALMEAA — Question Bank V2 Pilot Runtime Runbook

## الهدف
تشغيل أول دفعة تشغيلية من 40 سؤال قدرات كمي بعد اجتياز Pilot Closure Gate، مع فصل واضح بين التحقق المحلي، التحقق عبر API، Canary من 5 أسئلة، ثم بقية الدفعة.

## الدفعة المعتمدة
`QBANK-COL2627-PILOT40-20260922-V1`

## المراحل

### 1) Prepare — بدون شبكة
يفحص:
- وجود 40 Payload.
- وجود 40 صورة WebP.
- تطابق SHA256 لكل صورة مع `sourceMeta.imageHash`.
- عدم تكرار `questionCode` أو `sourceItemId`.

المتغيرات:
```bash
QUESTION_PILOT_MODE=prepare
QUESTION_PILOT_PAYLOAD_FILE=...
QUESTION_PILOT_IMAGE_DIR=...
QUESTION_PILOT_OUTPUT_FILE=...
npm run pilot:question-bank-v2
```

### 2) Dry Run — API Validation فقط
لا يرفع أي صورة ولا يكتب أي سؤال.
يطلب Presign intents فقط للحصول على المسارات الرسمية ثم يشغل:
`POST /api/quizzes/questions/import-batch` مع `dryRun=true`.

يتطلب:
```bash
PILOT_ALLOW_EXTERNAL_RUN=YES
PILOT_API_BASE=https://.../api
PILOT_ADMIN_TOKEN=...
QUESTION_PILOT_MODE=dry-run
```

لا يتطلب `PILOT_WRITE_AUTHORIZATION`.

### 3) Canary — أول 5 فقط
يرفع أول 5 صور إلى R2 ثم يعيد Dry Run، وبعد نجاحه يكتب 5 أسئلة فقط كـ:
- `source=imported`
- `approvalStatus=draft`
- نفس `importBatchId`

يتطلب صراحة:
```bash
PILOT_ALLOW_EXTERNAL_RUN=YES
PILOT_WRITE_AUTHORIZATION=YES
QUESTION_PILOT_MODE=canary
```

### 4) Full — بقية الـ35
لا يبدأ إلا بعد فحص Canary من لوحة الإدارة وAPI.
يرفع ويستورد العناصر من 6 إلى 40 تحت نفس Batch ID.

```bash
PILOT_ALLOW_EXTERNAL_RUN=YES
PILOT_WRITE_AUTHORIZATION=YES
QUESTION_PILOT_MODE=full
```

## حماية الهوية المصدرية
كل سؤال يجب أن يطابق:
- `questionCode`
- `sourceItemId`
- `documentCode`
- `pdfPageIndex`
- `printedPageNumber`
- `printedQuestionNumber`
- `sourceMeta.imageHash`

والـAPI يرفض أي عدم تطابق بين هذه الحقول.

## R2
صور Pilot الرسمية:
```
questions/v2/<questionCode>/<sha256>.webp
```

المسار Content-addressed؛ تغيير الصورة ينتج Hash ومسارًا جديدين.

## Rollback
الـAPI يسمح بحذف Batch كامل فقط إذا:
- كل أسئلته ما زالت `draft`.
- لا يوجد أي سؤال منها مرتبط بـ Quiz أو Mock Exam.

Endpoint:
`DELETE /api/quizzes/questions/import-batch/:batchId`

إذا أصبح سؤال معتمدًا أو مرتبطًا باختبار، يفشل Rollback ولا يحذف شيئًا.

## بوابة ما قبل أول كتابة
قبل تشغيل `canary` يجب أن تكون الشروط التالية كلها صحيحة:
- `prepare = PASS` على 40/40.
- `dry-run = PASS` على 40/40.
- `hashMismatches = 0`.
- `Taxonomy unresolved = 0`.
- لا توجد أي أسئلة سابقة تحمل نفس `questionCode` أو `sourceItemId`.
- لا توجد أي عناصر `FND26` داخل هذه الدفعة.
- نفس `batchId` يستخدم للـCanary وللعناصر الـ35 المتبقية حتى يمكن فحص الدفعة أو التراجع عنها كوحدة واحدة.

## محظورات Pilot
- لا MongoDB direct write.
- لا حذف أو تعديل للبنك القديم.
- لا `approved` أثناء الاستيراد.
- لا ربط Quiz قبل اعتماد الـ40 يدويًا.
- لا تشغيل `canary` أو `full` بدون التفويضين الصريحين.
