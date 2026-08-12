# تقرير تدقيق نظام الاختبارات — ALMEAA Codax
**تاريخ التدقيق:** 2026-08-12  
**المُدقِّق:** Antigravity AI  
**النطاق:** المشكلات الحرجة فقط — لا إعادة بناء

---

## A. الملخص التنفيذي

### حالة النظام الحالية
النظام قائم ويعمل. يوجد:
- `UnifiedQuizBuilder.tsx` — منشئ موحد للاختبارات العادية والمحاكيات
- `MockExamManager.tsx` — مدير المحاكيات القديم (لا يزال مستخدماً)
- `SmartQuestionSelector.tsx` — منتقي الأسئلة داخل المنشئ
- `QuizzesManager.tsx` — مركز الاختبارات (admin-dashboard?tab=quizzes)

### أهم 5 مشكلات (مؤكدة من الكود)

| # | المشكلة | الخطورة |
|---|---------|---------|
| 1 | **SmartQuestionSelector يقرأ من Store فارغ بدل API** | حرجة ✅ مُصلَحة |
| 2 | موضع `mock` مستخدم بمعنيين (placement vs mockExam.enabled) | عالية |
| 3 | تبويبات العنوان العلوي (اختبارات نافس / محاكية) موجودة لكن توجيه الاختبارات غائب | متوسطة |
| 4 | `crypto.randomUUID()` يُستخدم لإنشاء sections قبل الحفظ | متوسطة |
| 5 | نتائج المحاولات مرتبطة بالاختبار الحي وليس snapshot | منخفضة (مؤجلة) |

### ما تم إصلاحه الآن
- **SmartQuestionSelector** — يجلب الأسئلة من `api.getQuestions({pathId, subjectId})` بدل Store

### ما يحتاج قراراً معمارياً لاحقاً
- كيان `ExamAssignment` المستقل
- مركز الاختبارات الموحد الكامل
- نظام snapshot للنتائج

---

## B. خريطة المكونات الحالية

| المكون / الملف | الوظيفة | من يستدعيه | نوع الاختبار | مستخدم فعلاً؟ |
|---------------|---------|-----------|-------------|-------------|
| `QuizzesManager.tsx` | مركز الاختبارات للمدير | AdminDashboard tab=quizzes | كلاهما | ✅ نعم |
| `UnifiedQuizBuilder.tsx` | إنشاء/تعديل الاختبارات | QuizzesManager | كلاهما | ✅ نعم |
| `SmartQuestionSelector.tsx` | اختيار الأسئلة | UnifiedQuizBuilder | كلاهما | ✅ نعم (مُصلَح) |
| `MockExamManager.tsx` | إدارة المحاكيات | AdminDashboard tab=mock-exams | محاكي | ✅ نعم |
| `QuizBuilder.tsx` | منشئ قديم | SubjectQuizzesPanel | عادي | ⚠️ جزئي |
| `QuestionBankManager.tsx` | إدارة بنك الأسئلة | AdminDashboard | كلاهما | ✅ نعم |
| `SupervisorTestsManager.tsx` | اختبارات المشرف | AdminDashboard | عادي | ✅ نعم |
| `PublicBarcodeTestsManager.tsx` | اختبارات الباركود | AdminDashboard | عادي | ✅ نعم |
| `MockExamStudentHub.tsx` | محاكيات الطالب | pages/MockExams | محاكي | ✅ نعم |
| `ExamsHubTab.tsx` | مركز الاختبارات للطالب | Dashboard | كلاهما | ✅ نعم |

---

## C. المشكلة #1 — SmartQuestionSelector (مُصلَحة ✅)

### السبب
```ts
// السطر 29 — القديم ❌
const { questions: allQuestions } = useStore();
// يعتمد على allQuestions في Store الذي يُحمَّل فقط عند فتح QuestionBankManager
// عند فتح UnifiedQuizBuilder مباشرة → Store فارغ → "لا توجد أسئلة"

// pathQuestions فارغ ← filteredQuestions فارغ ← "لا توجد أسئلة"
const pathQuestions = allQuestions.filter(q => q.pathId === pathId && ...)
```

### الحل المطبق
```ts
// useEffect جديد يجلب من API عند تغيير pathId أو subjectId
useEffect(() => {
  if (!pathId) return;
  setLoadingQuestions(true);
  api.getQuestions({ pathId, subjectId, limit: 200 })
    .then(res => { setApiQuestions(res); })
    .catch(() => setLoadError("تعذر تحميل الأسئلة. حاول مجدداً."))
    .finally(() => setLoadingQuestions(false));
}, [pathId, subjectId]);

// الفلترة تعمل على apiQuestions بدل pathQuestions
const filteredQuestions = useMemo(() => {
  let result = apiQuestions;
  // ... فلاتر على النتيجة المُجلبة
}, [apiQuestions, ...]);
```

### ملاحظات إضافية
- `selectedQuestions` تُبنى من `allQuestionsMap` (Store + API) لضمان ظهور المختارة مسبقاً
- إضافة loading/error/retry states
- تنبيه واضح عند عدم اختيار مسار بدل "لا توجد أسئلة"
- زر "إعادة المحاولة" عند خطأ الشبكة

---

## D. المشكلة #2 — ازدواجية كلمة "mock" (لم تُصلَح بعد)

### الدليل من الكود
```ts
// في Quiz model — placement قد يكون "mock" أو اسم قسم
placement: "mock" // معناه: اختبار عادي في قسم المحاكيات

// في UnifiedQuizBuilder
mockExam: { enabled: true, sections: [...] } // معناه: محاكي حقيقي
```

### المخاطر
اختبار عادي placement="mock" يظهر في قسم المحاكيات دون أن يكون محاكياً حقيقياً.

### الحل المقترح (مؤجل)
دالة مركزية `isActualMockExam(quiz)`:
```ts
const isActualMockExam = (quiz: any) => quiz?.mockExam?.enabled === true;
```

---

## E. المشكلة #3 — توجيه الاختبارات (مؤجل معمارياً)

### الوضع الحالي
التوجيه موجود داخل حقل `targetGroupIds`/`targetUserIds` في نموذج الاختبار نفسه.
هذا يعني أن نفس الاختبار لا يمكن توجيهه لمجموعتين بإعدادات مختلفة.

### الرؤية المطلوبة (تنفيذ مستقبلي فقط)
```ts
ExamAssignment {
  examId; targetIds; availableFrom; dueAt;
  attemptsAllowed; resultPolicy; status;
}
```

---

## F. مصفوفة الصلاحيات (الوضع الحالي)

| العملية | المدير | المشرف | المعلم | الطالب | تحقق Backend |
|---------|--------|--------|--------|--------|-------------|
| إنشاء اختبار | ✅ | ✅ | ✅ | ❌ | ✅ requireRole |
| اعتماد اختبار | ✅ | ⚠️ نطاقه | ❌ | ❌ | ✅ |
| نشر عالمي | ✅ | ❌ | ❌ | ❌ | ✅ |
| توجيه | ✅ | ⚠️ نطاقه | ⚠️ نطاقه | ❌ | ⚠️ جزئي |
| مشاهدة نتائج | ✅ | ⚠️ نطاقه | ⚠️ نطاقه | نتائجه فقط | ✅ |

---

## G. خطة مراحل التنفيذ

### المرحلة الحرجة (منجزة ✅)
- [x] إصلاح SmartQuestionSelector لجلب الأسئلة من API

### المرحلة 2 (قريبة)
- [ ] دالة `isActualMockExam()` مركزية
- [ ] ضمان تبويب "توجيه الاختبارات" في QuizzesManager
- [ ] إظهار رسالة واضحة للأسئلة المفقودة في تعديل الاختبار القديم

### المرحلة 3 (متوسطة)
- [ ] توحيد أسماء حقول showCorrectAnswers/showAnswers
- [ ] معاينة المحاكي تجمع أسئلة كل الأقسام

### المرحلة 4 (معمارية — تحتاج موافقة)
- [ ] كيان ExamAssignment المستقل
- [ ] Snapshot للاختبار عند بداية المحاولة
- [ ] Migration placement="mock"
