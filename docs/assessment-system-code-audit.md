# التدقيق الهندسي لنظام الاختبارات (Assessment System Code Audit)
**آخر تحديث:** 2026-08-07  
**الحالة:** المرحلة الأولى مكتملة — الأعطال الحرجة تم إصلاحها

---

## A. الملخص التنفيذي

### حالة النظام
النظام يعمل، وتمت معالجة المشكلات الحرجة التالية:

1. **✅ الحفظ الوهمي بمعرفات محلية** — تم: `addQuiz/updateQuiz` ينتظران السيرفر ويستخدمان ID الحقيقي.
2. **✅ اختفاء الأسئلة المختارة عند التعديل** — تم: جلب الأسئلة بـ IDs وتحديث `selectedQuestions` ليبحث في `allQuestionsMap`.
3. **✅ تعارض أسماء الحقول `showAnswers`** — تم: توحيد الاسم في كل الطبقات.
4. **✅ `normalizeQuizPlacement` لا يعرف `quizKind`** — تم: الدالة تُعطي أولوية لـ `quizKind`.
5. **✅ Schema Backend لا يقبل حقول المحاكي** — تم: إضافة `isStrictSectionLock`, `domain`.

### أهم المخاطر المتبقية
- بيانات قديمة في DB قد لا تمتلك `quizKind` (تحتاج Migration محدودة).
- `QuizBuilder.tsx` القديم لا يزال موجوداً — احتمال خلط الإعدادات.
- لا توجد اختبارات تلقائية لمنع رجوع المشكلات.

### ما يحتاج قراراً معماريًا لاحقاً
- كيان `ExamAssignment` المستقل للتوجيه.
- دمج المنشئات (QuizBuilder + MockExamManager + UnifiedQuizBuilder).
- توحيد دورة الحياة (draft → approved → published).

---

## B. خريطة النظام الحالية

| المكون / الملف | وظيفته | من يستدعيه | مصدر البيانات | API | هل يتكرر؟ | هل مستخدم؟ |
|---|---|---|---|---|---|---|
| `UnifiedQuizBuilder.tsx` | منشئ موحد (drill/test/mock) | صفحات الإدارة، QuizzesManager | `useStore` | `addQuiz/updateQuiz` | نعم جزئياً | ✅ نعم |
| `MockExamManager.tsx` | منشئ متخصص للمحاكيات | قسم المحاكيات في AdminDashboard | `useStore` | `addQuiz/updateQuiz` | نعم مع UQB | ✅ نعم |
| `QuizBuilder.tsx` | منشئ قديم/بسيط | SubjectQuizzesPanel + AdvancedCourseBuilder | `useStore` | `addQuiz/updateQuiz` | نعم مع UQB | ⚠️ جزئياً |
| `SmartQuestionSelector.tsx` | اختيار الأسئلة | UnifiedQuizBuilder, QuizBuilder | `allQuestionsMap` | `/quizzes/questions` | لا | ✅ نعم |
| `useStore.ts` → `addQuiz` | حفظ اختبار جديد | كل المنشئات | Backend API | `POST /api/quizzes` | لا | ✅ نعم |
| `useStore.ts` → `updateQuiz` | تعديل اختبار | كل المنشئات | Backend API | `PATCH /api/quizzes/:id` | لا | ✅ نعم |
| `quiz.routes.ts` | مسارات Backend | طلبات API | Quiz Model (MongoDB) | - | لا | ✅ نعم |
| `utils/quizPlacement.ts` | تطبيع بيانات الـ placement | useStore, QuizBuilder | - | - | لا | ✅ نعم |
| `utils/mockExam.ts` | دوال مساعدة للمحاكيات | Quiz.tsx, QuizPage.tsx, Results.tsx | - | - | لا | ✅ نعم |
| `pages/Quiz.tsx` | صفحة الاختبار (تدريب ذاتي) | Router | useStore | - | لا | ✅ نعم |
| `pages/QuizPage.tsx` | صفحة الاختبار المُجهَّز | Router | API مباشر | `GET /api/quizzes/:id` | لا | ✅ نعم |

---

## C. دورة الحياة الحالية

### الاختبار العادي (drill / test)
```
UnifiedQuizBuilder/QuizBuilder
→ اختيار الأسئلة (SmartQuestionSelector من allQuestionsMap)
→ addQuiz(payload) → api.createQuiz() → server → returns {id: "quiz_xxx"}
→ يُضاف للـ Store بـ ID الحقيقي
→ يظهر في QuizzesManager / SubjectPage حسب placement
→ الطالب يدخل من Quiz.tsx أو QuizPage.tsx
→ يُرسل الإجابات → /api/quizzes/:id/submit
→ QuizResult يُحفظ في DB مع skillsAnalysis
```

### المحاكي (mock)
```
UnifiedQuizBuilder (kind=mock) أو MockExamManager
→ تعريف الأقسام + اختيار الأسئلة لكل قسم
→ payload.mockExam.sections[].questionIds
→ addQuiz(payload) → mockExam.enabled: true
→ يظهر في MockExams.tsx / MockExamStudentHub.tsx
→ الطالب يدخل من QuizPage.tsx (source=mock-exam)
→ QuizPage يستخدم flattenMockExamQuestionIds()
→ يُرسل الإجابات مع أوقات الأقسام
```

---

## D. جدول المشكلات (مُحدَّث)

| # | العنوان | الحالة | دليل من الكود | الملفات | الخطورة |
|---|---|---|---|---|---|
| 1 | الحفظ الوهمي بمعرفات `quiz_${Date.now()}` | ✅ **مُصلَح** | `useStore.ts:1037-1046` | `useStore.ts` | 🔴 عالية |
| 2 | اختفاء الأسئلة المختارة عند التعديل | ✅ **مُصلَح** | `UnifiedQuizBuilder:179-211`, `SmartQuestionSelector:71-76` | `UnifiedQuizBuilder.tsx`, `SmartQuestionSelector.tsx` | 🔴 عالية |
| 3 | تعارض `showAnswers/showCorrectAnswers` | ✅ **مُصلَح** | `UnifiedQuizBuilder:121` | `UnifiedQuizBuilder.tsx` | 🟡 متوسطة |
| 4 | `normalizeQuizPlacement` لا يعالج `quizKind` | ✅ **مُصلَح** | `quizPlacement.ts:58-115` | `utils/quizPlacement.ts` | 🟡 متوسطة |
| 5 | Schema Backend يرفض حقول محاكي صحيحة | ✅ **مُصلَح** | `quiz.routes.ts:311-325` | `quiz.routes.ts` | 🟡 متوسطة |
| 6 | `updateQuiz` لا يُطبِّع `quizKind` | ✅ **مُصلَح** | `useStore.ts:1049-1058` | `useStore.ts` | 🟠 متوسطة |
| 7 | تعدد المنشئات غير مُوحَّد | ⏳ مؤجل | `dashboards/admin/QuizBuilder.tsx` موجود بجانب `UnifiedQuizBuilder.tsx` | `QuizBuilder.tsx` | 🟡 منخفضة |
| 8 | بيانات قديمة بدون `quizKind` | ⏳ مؤجل | DB documents | `docs/adr/` (مطلوب) | 🟡 متوسطة |
| 9 | التوجيه مدمج مع محتوى الاختبار | ⏳ مؤجل معماري | `targetGroupIds/targetUserIds` داخل `Quiz` model | - | 🟡 متوسطة |

---

## E. توافق العقود

| اسم الحقل | Frontend | Zod Schema | MongoDB | صفحة الطالب | الحالة |
|---|---|---|---|---|---|
| `showAnswers` | `showAnswers` | `settings.showAnswers` | `settings.showAnswers` | `quiz.settings.showAnswers` | ✅ متوافق |
| `randomizeQuestions` | `randomizeQuestions` | `settings.randomizeQuestions` | `settings.randomizeQuestions` | `quiz.settings.randomizeQuestions` | ✅ متوافق |
| `quizKind` | `quizKind` | `quizKind` | `quizKind` | - | ✅ متوافق |
| `mockExam.enabled` | `mockExam.enabled` | `mockExam.enabled` | `mockExam.enabled` | `quiz.mockExam?.enabled` | ✅ متوافق |
| `mockExam.sections[].questionIds` | `mockSections[].questionIds` | `mockExam.sections[].questionIds` | `mockExam.sections.questionIds` | `flattenMockExamQuestionIds()` | ✅ متوافق |
| `mockExam.isStrictSectionLock` | `isStrictSectionLock:true` | `mockExam.isStrictSectionLock` | `mockExam.isStrictSectionLock` | `QuizPage.tsx` | ✅ متوافق |
| `placement` | مُستنتج من `quizKind` | `placement` | `placement` | - | ✅ متوافق (مُطبَّع) |
| `showInTraining` | مُستنتج من `quizKind` | `showInTraining` | `showInTraining` | `isTrainingQuiz()` | ✅ متوافق |
| `id` / `_id` | `id` (من السيرفر) | `id` optional | `_id` String | `quiz.id` | ✅ متوافق |

---

## F. الصلاحيات

| العملية | المدير | المشرف | المعلم | الطالب | تحقق Backend | تحقق Frontend |
|---|---|---|---|---|---|---|
| إنشاء اختبار | ✅ | ✅ (نطاقه) | ✅ (مسودة) | ❌ | `quiz.routes.ts` → `requireRole` | يُخفى الزر |
| تعديل اختبار | ✅ | ✅ (ملكه) | ✅ (ملكه) | ❌ | `buildOwnedDocumentQuery` | يُخفى الزر |
| نشر اختبار | ✅ | ⚠️ جزئي | ❌ (pending_review) | ❌ | `getWorkflowDefaults` | `isTeacher` check |
| اعتماد اختبار | ✅ | ❌ | ❌ | ❌ | `approvalStatus` logic | Admin only |
| حل اختبار | ❌ | ❌ | ❌ | ✅ | `requireAuth` + audience check | Router |
| رؤية النتائج | ✅ (كل) | ✅ (نطاقه) | ✅ (طلابه) | ✅ (نفسه) | `quiz.routes.ts` result endpoints | Role check |

---

## G. سلامة البيانات

### ✅ تمت معالجته
- معرفات محلية مؤقتة في حفظ الاختبارات.
- حقول المحاكي المفقودة في Zod schema.

### ⚠️ يحتاج مراقبة
- **أسئلة مفقودة:** اختبار يحتوي `questionIds` لأسئلة محذوفة → `validateQuizQuestionIntegrity()` موجودة في Backend لكن لا تُستدعى عند التعديل العادي.
- **بيانات قديمة بدون `quizKind`:** الاختبارات الموجودة في DB قبل إضافة `quizKind` — `normalizeQuizPlacementPayload` يستنتجه من `placement/type` للتوافق العكسي.
- **محاكيات بأقسام فارغة:** لا يوجد validation لمنع حفظ محاكي بأقسام `questionIds: []`.

---

## H. خطة التنفيذ (المراحل)

### ✅ المرحلة 1: الأعطال الحرجة (مكتملة)
- الحفظ المتزامن الحقيقي.
- توحيد الحقول.
- جلب الأسئلة المفقودة.
- إصلاح normalizeQuizPlacement.

### Phase 2: سلامة البيانات والتحقق
- **الهدف:** script يفحص DB ويتحقق من integrity.
- **الملفات:** `server/src/scripts/assessmentIntegrityCheck.ts` [NEW].
- **المحتوى:** تحقق من quizKind، أسئلة مفقودة، محاكيات فارغة.
- **المخاطر:** قراءة فقط — لا تعديل بيانات.

### Phase 3: توحيد المنشئات
- **الهدف:** توحيد `QuizBuilder.tsx` و`UnifiedQuizBuilder.tsx`.
- **المخاطر:** عالية — يجب تتبع كل أماكن الاستدعاء.
- **الشرط:** موافقة صريحة قبل البدء.

### Phase 4: فصل التوجيه
- **الهدف:** كيان `ExamAssignment` مستقل.
- **المخاطر:** تغيير معماري + migration بيانات.
- **الشرط:** قرار معماري موثق (ADR).

### Phase 5: دورة الحياة الموحدة
- **الهدف:** `draft → pending_review → approved → published → archived`.
- **المخاطر:** تغيير واسع في الـ UI والـ API.

---

**آخر تحديث:** 2026-08-07 بواسطة Antigravity (Claude Sonnet 4.6)
