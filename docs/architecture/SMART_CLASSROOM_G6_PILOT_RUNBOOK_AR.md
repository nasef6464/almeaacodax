# ALMEAA Smart Classroom — G6 Controlled Pilot Runbook

> الحالة: `PREPARED / NOT AUTHORIZED TO RUN`
>
> هذا المستند يجهز تجربة Pilot ولا يمثل موافقة على بيئة حية أو بيانات مدرسة. لا
> يشغّل أي Agent اختبارًا على عنوان خارجي أو حساب حقيقي بمجرد قراءة هذا الملف.

## 1. قرار المالك المطلوب قبل البدء

يرسل المالك هذه القيم في رسالة واحدة. أي قيمة فارغة تعني أن التجربة لا تبدأ:

```text
PILOT_ENVIRONMENT: staging-disposable | production-approved
PILOT_API_BASE: عنوان API المحدد صراحةً
PILOT_SCHOOL_IDS: مدرستان محددتان أو مدرسة واحدة بفصلين محددين
PILOT_CLASS_IDS: فصلان على الأقل
PILOT_TEACHER_IDS: معلمان على الأقل
PILOT_DATA: synthetic-only | named-approved-records
PILOT_WINDOW: التاريخ والوقت والمنطقة الزمنية
PILOT_WRITE_AUTHORIZATION: نعم / لا
PILOT_CLEANUP_OWNER: الاسم أو الفريق المسؤول عن حذف بيانات الاختبار
PILOT_MAX_CONCURRENT_STUDENTS: رقم يبدأ منه القياس
PILOT_WEAK_NETWORK_SCENARIO: وصف متفق عليه (انقطاع/عودة أو تقييد شبكة)
```

- `production-approved` يتطلب إقرارًا صريحًا بكتابة بيانات Pilot؛ لا يستنتج من
  وجود حساب مدير أو رابط production.
- لا تستخدم `scripts/run-production-load-autocannon.mjs`: له عنوان حي افتراضي
  ولا يقيس رحلة Smart Classroom المطلوبة.
- لا تضع كلمات مرور أو bearer tokens أو PINs في هذا المستند أو في Git أو تقرير
  Pilot. تحفظ فقط في قناة الأسرار المتفق عليها.

## 2. نطاق Pilot المقبول

الحد الأدنى ليس اختبار ضغط عامًا:

1. معلمان، فصلان على الأقل، ومدرستان إن أتاح التفويض ذلك.
2. كل معلم ينشئ جلسة من سؤالين إلى خمسة أسئلة معتمدة داخل فصله المكلّف به.
3. الطلاب المصرح لهم ينضمون عبر PIN/QR؛ طالب من المدرسة/الفصل الآخر يحاول
   الدخول ويجب أن يرفض.
4. الطالب يجيب ثم يقطع الاتصال ويعود ويقرأ الحالة الخادمة من جديد.
5. المشرف يقرأ التقرير وذكاء المدرسة، ينشئ تدخلًا واحدًا، ثم يقيسه لاحقًا.
6. سيناريو شبكة ضعيفة واحد على الأقل موثق بالوقت وطريقة المحاكاة، لا بادعاء عام.

لا تشمل G6 فيديو داخلي أو Whiteboard أو عقد فوترة أو migration أو rollup. أي
توسعة من ذلك تسجل قرارًا مستقلًا.

## 3. ما نقيسه

| القياس | مصدر الدليل | وحدة القياس | لا نستنتجه منه |
|---|---|---|---|
| Join latency | وقت الطلب في العميل + HTTP status | ms (p50/p95) | قدرة production القصوى |
| Answer write latency | وقت `PUT answer` الناجح | ms (p50/p95) | صحة الإجابة وحدها |
| Write integrity | `accepted` مقابل عدد `ClassroomResponse` والتقرير | count / ratio | حضور مدرسي رسمي |
| Reconnect recovery | عدد إعادة الاتصال ثم room rejoin الناجحة | count / ratio | جودة الإنترنت العامة |
| Concurrent live students | ذروة المشاركين المصرح لهم في الجلسة | count | حد مبيعات نهائي دون قياس آخر |
| Report availability | فتح التقرير والذكاء والتدخل ضمن نطاق المشرف | success/fail + ms | blended learning score |
| Weak-network behavior | وصف التقييد + timestamps + outcome | scenario record | ضمان لكل شبكات العملاء |

يجب تسجيل العينة الخام، عددها، نافذة الزمن، النسخة/commit، والمنهج. لا يوجد رقم
قبول عالمي hard-coded هنا: limits التجارية تُقترح فقط من القياس الفعلي، ويوافق
المالك عليها بعد التقرير.

## 4. خطوات التشغيل

### أداة القياس المقيدة

الأداة `scripts/run-smart-classroom-pilot.mjs` تقرأ سيناريو من ملف محلي وتكتب
JSON لا يحتوي tokens أو PINs. المثال هو
`SMART_CLASSROOM_G6_SCENARIO.example.json`؛ لا تحفظ عليه بيانات مدرسة حقيقية.

لا تعمل الأداة إلا عند وجود كل القيم التالية صراحةً:

```text
PILOT_ALLOW_EXTERNAL_RUN=YES
PILOT_WRITE_AUTHORIZATION=YES
PILOT_API_BASE=https://approved-api.example/api
PILOT_SCENARIO_FILE=/absolute/path/to/approved-scenario.json
PILOT_OUTPUT_FILE=/absolute/path/to/pilot-report.json
PILOT_CLASS_A_STUDENT_TOKEN=...  # secret channel only
PILOT_CLASS_A_PIN=...            # secret channel only
PILOT_CLASS_B_STUDENT_TOKEN=...
PILOT_CLASS_B_PIN=...
GIT_COMMIT_SHA=<deployed runtime sha>
```

تشغّل فقط بعد إكمال preflight:

```text
node scripts/run-smart-classroom-pilot.mjs
```

تسجل الأداة join/current/answer/aggregate، وتفرض reconnect ثم room rejoin لكل
سيناريو. كما تنفذ `negativeJoins` من ملف السيناريو وتفشل إذا لم يرجع رفض النطاق
المتوقع (403 افتراضيًا). لا تسجل body أو token أو PIN في تقريرها.

### Preflight (بدون كتابة بيانات)

1. وثّق `GIT_SHA` ونسخة frontend/backend وبيئة Pilot.
2. تأكد أن health/ready للبيئة المحددة سليم، وأن وحدتي `SMART_CLASSROOM` و
   `INTERVENTION_CENTER` مفعّلتان للمدارس المعتمدة فقط.
3. تحقق من TeachingAssignment وSchoolMembership للمعلمين والطلاب؛ لا تصلح
   بيانات المدرسة أثناء Pilot إلا بتفويض كتابة منفصل.
4. سجل baseline: زمن عينة صغيرة، عدد الجلسات/الطلاب المتوقع، وnetwork scenario.

### Execution (يحتاج `PILOT_WRITE_AUTHORIZATION: نعم`)

1. نفذ السيناريو في القسم 2، وسجل timestamps عند create/join/publish/answer/
   reconnect/end/report/intervention.
2. لا تعِد إرسال الإجابة عمدًا إلا لاختبار idempotency المحدد؛ سجّل كل إعادة.
3. لا تعرض أسماء أو correct/wrong فردي على Projector.
4. إذا ظهر تسرب نطاق أو إجابة مفقودة أو correct-answer leak: أوقف Pilot، احفظ
   الحد الأدنى من الأدلة، ولا تتابع إلى قياسات الحمل.

### Postflight

1. يراجع مالك cleanup السجلات التي سمح بها فقط؛ لا delete واسع أو تلقائي.
2. أنشئ التقرير التالي من القياس الفعلي، مع `NOT PROVEN` لأي خانة لم تقاس.
3. القرار التالي واحد من: تثبيت limit محدد، تحسين reconnect/latency، أو تقييم
   schedule الخفيف/rollup/Live Tutoring. لا تبنِ أيًا منها بلا دليل.

## 5. قالب تقرير القبول

```text
PILOT ID / WINDOW / TIMEZONE:
ENVIRONMENT / API / GIT SHA:
AUTHORIZED DATA AND CLEANUP OWNER:
SCHOOLS / CLASSES / TEACHERS / STUDENTS:
SCENARIOS EXECUTED:
SECURITY NEGATIVE RESULTS:
JOIN LATENCY (n, p50, p95):
ANSWER WRITE LATENCY (n, p50, p95):
WRITE INTEGRITY (requests, persisted, duplicate-safe):
RECONNECT (attempts, recovered, failed):
PEAK CONCURRENT LIVE STUDENTS:
WEAK-NETWORK METHOD AND OUTCOME:
REPORT / INTELLIGENCE / INTERVENTION RESULTS:
OBSERVED COMMERCIAL LIMIT PROPOSAL:
NOT PROVEN:
INCIDENTS / OWNER DECISIONS:
CLEANUP EVIDENCE:
GO / FIX / REPEAT DECISION:
```

## 6. G6 Exit Evidence

G6 لا يغلق إلا بتقرير مكتمل من بيئة مفوضة يثبت السيناريوهات السابقة، مع أرقام
مقاسة لاتصال ضعيف وتزامن وlatency/reconnect/write volume، وقرار واضح حول limits.
نجاح CI المعزول أو build محلي لا يساوي Pilot أو production-scale evidence.
