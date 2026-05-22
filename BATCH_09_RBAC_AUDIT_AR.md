# BATCH_09_RBAC_AUDIT_AR

**التاريخ:** 2026-05-17  
**اسم الدفعة:** BATCH 09 — RBAC Security Audit Plan  
**نوع الدفعة:** تدقيق أمني فقط (بدون أي تعديل كود)

## منهجية التدقيق
- تمت قراءة:
  - `docs/NEXT_SESSION_HANDOVER_AR.md`
  - `docs/SPARK_BATCH_LEDGER_AR.md`
  - `server/src/middleware/auth.ts`
  - `server/src/routes/index.ts`
  - جميع ملفات `server/src/routes/*.ts`
- معيار التصنيف:
  - **LOW**: endpoint عام أو محمي بشكل مناسب وبلا أثر صلاحيات حساس.
  - **MEDIUM**: endpoint محمي لكن يحتاج مراقبة تشغيلية/فحص إضافي.
  - **HIGH**: احتمال وصول غير مفترض أو scope غير محكوم بشكل كافٍ.
  - **CRITICAL**: endpoint حساس قد يسمح بتعديل/كشف عالي التأثير خارج النطاق المقصود.

## خلاصة تنفيذ الحماية (Middleware)
- `requireAuth`: يفرض التوثيق (Bearer أو Cookie) ويرفض غير الموثق.
- `requireRole([...])`: يجلب دور المستخدم محدثًا من DB ثم يفرض الدور.
- `optionalAuth`: يسمح بالوصول العام ويُرفق هوية المستخدم فقط إن وُجدت.

## جدول التدقيق الكامل (Method + Path + حماية + مستوى)

### 1) `auth.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| POST | /api/auth/register | عام | لا يوجد | MEDIUM | تسجيل عام طبيعي؛ يحتاج rate-limit (موجود على مستوى عام بالخادم). |
| POST | /api/auth/login | عام | لا يوجد | MEDIUM | تسجيل دخول عام؛ خطر brute-force يعتمد على rate-limit وسياسات القفل. |
| GET | /api/auth/google/start | عام | لا يوجد | LOW | بدء OAuth عام متوقع. |
| GET | /api/auth/google/callback | عام | لا يوجد | LOW | Callback OAuth متوقع. |
| GET | /api/auth/google/call | عام | لا يوجد | LOW | alias للـcallback. |
| POST | /api/auth/logout | عام | لا يوجد | LOW | logout وإزالة cookie. |
| POST | /api/auth/forgot-password | عام | لا يوجد | MEDIUM | عام متوقع؛ يجب الإبقاء على رسائل generic (موجود). |
| POST | /api/auth/reset-password | عام | لا يوجد | MEDIUM | يعتمد على token reset. |
| POST | /api/auth/email/verify | عام | لا يوجد | LOW | تفعيل عبر token. |
| POST | /api/auth/email/resend-verification | أي مستخدم مسجل | requireAuth | LOW | محمي بالتوثيق. |
| POST | /api/auth/admin/users | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/auth/admin/users | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| PATCH | /api/auth/admin/users/:id | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/auth/me | أي مستخدم مسجل | requireAuth | LOW | محمي جيدًا. |
| PATCH | /api/auth/me/preferences | أي مستخدم مسجل | requireAuth | LOW | محمي جيدًا. |
| POST | /api/auth/me/purchase | أي مستخدم مسجل | requireAuth | LOW | endpoint blocked (GONE) مع audit log. |
| POST | /api/auth/me/redeem-access-code | أي مستخدم مسجل | requireAuth | LOW | محمي، ويتطلب كود صالح. |

### 2) `health.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/health/live | عام | لا يوجد | LOW | endpoint صحة عام. |
| GET | /api/health/ready | عام | لا يوجد | LOW | جاهزية تشغيلية. |
| GET | /api/health/scale-ready | عام | لا يوجد | LOW | جاهزية التوسع. |
| GET | /api/health | عام | لا يوجد | LOW | health عام. |

### 3) `taxonomy.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/taxonomy/bootstrap | عام/اختياري | optionalAuth | LOW | عرض taxonomy عام. |
| POST/PATCH/DELETE | /api/taxonomy/paths* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST/PATCH/DELETE | /api/taxonomy/levels* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST/PATCH/DELETE | /api/taxonomy/subjects* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST/PATCH/DELETE | /api/taxonomy/sections* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST/PATCH/DELETE | /api/taxonomy/skills* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |

### 4) `course.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/courses | عام/اختياري | optionalAuth | LOW | قراءة عامة مع فلاتر رؤية. |
| GET | /api/courses/:id | عام/اختياري | optionalAuth | LOW | قراءة عامة مع visibility filter. |
| POST | /api/courses | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | الكتابة متاحة لأدوار متعددة؛ تعتمد على ownership checks لاحقًا. |
| PATCH | /api/courses/:id | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | يستخدم buildOwnedCourseQuery (أفضل من query عام). |
| DELETE | /api/courses/:id | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | محمي لكن دور supervisor واسع نسبيًا. |

### 5) `quiz.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/quizzes/questions | عام/اختياري | optionalAuth | LOW | للعرض مع sanitize/non-staff controls. |
| POST/PATCH/DELETE | /api/quizzes/questions* | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | يوجد `buildOwnedDocumentQuery` + `assertTeacherManagedScope`. |
| GET | /api/quizzes | عام/اختياري | optionalAuth | LOW | list عام. |
| GET | /api/quizzes/analytics/overview | أي مستخدم مسجل | requireAuth | HIGH | حساس تحليلي؛ غير مقيد بـrequireRole مباشرة، يعتمد على logic داخلي للنطاق. |
| GET | /api/quizzes/results | أي مستخدم مسجل | requireAuth | MEDIUM | scoped حسب المستخدم/الدور داخل المنطق. |
| GET | /api/quizzes/results/scoped | أي مستخدم مسجل | requireAuth | MEDIUM | scoped logic داخلي. |
| GET | /api/quizzes/skill-progress | أي مستخدم مسجل | requireAuth | LOW | user-scoped. |
| GET | /api/quizzes/question-attempts | أي مستخدم مسجل | requireAuth | LOW | user-scoped. |
| POST | /api/quizzes/question-attempts | أي مستخدم مسجل | requireAuth | LOW | server-side correctness check. |
| GET | /api/quizzes/results/latest | أي مستخدم مسجل | requireAuth | LOW | user-scoped. |
| POST | /api/quizzes | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | مع managed scope checks. |
| POST | /api/quizzes/:id/submit | أي مستخدم مسجل | requireAuth | LOW | submit مسموح للمخولين فقط (check داخلي). |
| PATCH/DELETE | /api/quizzes/:id* | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | ownership + managed-scope checks. |
| POST | /api/quizzes/results | أي مستخدم مسجل | requireAuth | LOW | blocked endpoint (GONE). |

### 6) `quizResults.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/quiz-results/my | أي مستخدم مسجل | requireAuth | LOW | يمنع تمرير studentId مختلف (403). |
| GET | /api/admin/quiz-results | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |

### 7) `payment.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/payments/settings | عام/اختياري | optionalAuth | MEDIUM | يعيد public-safe لغير admin. |
| PATCH | /api/payments/settings | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/payments/settings/presets | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/payments/settings/apply-country-preset | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/payments/requests | أي مستخدم مسجل | requireAuth | LOW | admin يرى الكل، غير admin يرى طلباته فقط. |
| GET | /api/payments/requests/summary | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/payments/discount-codes | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/payments/discount-codes/preview | أي مستخدم مسجل | requireAuth | LOW | معاينة خصم للمستخدم الموثق. |
| POST | /api/payments/discount-codes | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| PATCH | /api/payments/discount-codes/:code | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/payments/requests | أي مستخدم مسجل | requireAuth | LOW | منطق server-verified للأسعار/العناصر. |
| POST | /api/payments/webhooks/payment | عام (بـsignature) | لا auth + تحقق HMAC | MEDIUM | يعتمد على التوقيع فقط؛ صحيح تصميميًا لكن عالي الحساسية. |
| PATCH | /api/payments/requests/:id/review | Admin فقط | requireAuth + requireRole([admin]) | LOW | منح الوصول مقيد بالأدمن فقط. |

### 8) `content.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/content/homepage-settings | عام/اختياري | optionalAuth | LOW | قراءة عامة. |
| PATCH | /api/content/homepage-settings | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/content/platform-font-settings | عام/اختياري | optionalAuth | LOW | قراءة عامة. |
| PATCH | /api/content/platform-font-settings | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/content/bootstrap | عام/اختياري | optionalAuth | MEDIUM | payload كبير ومتعدد المجالات. |
| POST/PATCH/DELETE | /api/content/study-plans* | أي مستخدم مسجل | requireAuth | LOW | userId scoped للمالك نفسه. |
| POST/PATCH/DELETE | /api/content/topics* | Admin/Teacher/Supervisor | requireAuth + requireRole | **HIGH** | يستخدم `buildDocumentQuery` (بدون ownership scope) للتعديل/الحذف. |
| POST/PATCH/DELETE | /api/content/lessons* | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | يستخدم `buildOwnedDocumentQuery`. |
| POST/PATCH/DELETE | /api/content/library-items* | Admin/Teacher/Supervisor | requireAuth + requireRole | MEDIUM | يستخدم `buildOwnedDocumentQuery`. |
| POST/PATCH/DELETE | /api/content/groups* | Admin/Teacher/Supervisor | requireAuth + requireRole | **HIGH** | update/delete عبر `buildDocumentQuery` بدون ownership scope واضح. |
| POST/PATCH/DELETE | /api/content/b2b-packages* | Admin/Supervisor | requireAuth + requireRole | **HIGH** | لا تحقق واضح لنطاق supervisor في عمليات CRUD. |
| GET | /api/content/announcement-ads | عام/اختياري | optionalAuth | LOW | قراءة عامة. |
| POST/PATCH/DELETE | /api/content/announcement-ads* | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST/PATCH/DELETE | /api/content/access-codes* | Admin/Supervisor | requireAuth + requireRole | **HIGH** | CRUD يستخدم `buildDocumentQuery`، بينما list فقط فيه school-scope checks. |
| GET | /api/content/schools/:id/report | Admin/Supervisor | requireAuth + requireRole | **HIGH** | لا شرط واضح يمنع supervisor من مدرسة أخرى عند جلب التقرير. |
| POST | /api/content/schools/:id/import-students | Admin/Supervisor | requireAuth + requireRole | **CRITICAL** | إدخال طلاب/حسابات مدرسية بدون school-scope gate قوي (بخلاف endpoint relations). |
| GET | /api/content/access-codes | Admin/Supervisor | requireAuth + requireRole | MEDIUM | يحتوي منع صريح supervisor خارج نطاق المدرسة (403). |
| GET | /api/content/access-code-redemptions | Admin/Supervisor | requireAuth + requireRole | MEDIUM | يحتوي منع صريح supervisor خارج نطاق المدرسة (403). |
| GET | /api/content/platform-integrations | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي + masking. |
| PATCH | /api/content/platform-integrations | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/content/platform-integrations/history | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي + mask snapshot. |
| GET | /api/content/platform-integrations/setup-checklist | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي. |
| GET | /api/content/platform-integrations/runtime-audit | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي. |
| POST | /api/content/platform-integrations/history/:id/restore | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي. |
| GET | /api/content/public-contact-widget | عام/اختياري | optionalAuth | LOW | public-safe widget. |
| POST | /api/content/schools/:id/relations | Admin/Supervisor | requireAuth + requireRole | MEDIUM | يحتوي check صريح `You cannot manage this school` (أفضل من import/report). |

### 9) `notification.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/notifications/me | أي مستخدم مسجل | requireAuth | LOW | user-scoped. |
| PATCH | /api/notifications/:id/read | أي مستخدم مسجل | requireAuth | LOW | user-scoped by recipientUserId. |
| GET/POST | /api/notifications/admin/templates | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/notifications/admin/deliveries | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/notifications/admin/send | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/notifications/admin/process-pending | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/notifications/admin/test-delivery | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |

### 10) `operations.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/operations/status | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/operations/audit | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/operations/delivery-readiness | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/operations/integrations-readiness | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/operations/client-events | عام/اختياري | optionalAuth | MEDIUM | endpoint intake للأخطاء من الواجهة؛ يجب ضبط rate-limit/log size. |
| GET | /api/operations/client-events | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/operations/admin-audit-logs | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| PATCH | /api/operations/client-events/:id/resolve | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/operations/client-events/resolve-all | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/operations/repair | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |

### 11) `backup.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/backups/learning/status | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/backups/learning | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/backups/learning/snapshots | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/backups/learning/activity | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/backups/learning/snapshots | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/backups/learning/snapshots/:id | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/backups/learning/snapshots/:id/restore | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| DELETE | /api/backups/learning/snapshots/:id | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/backups/learning/restore | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |

### 12) `ai.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/ai/status | عام | لا auth | MEDIUM | يكشف حالة providers/config metadata؛ يحتاج ضبط ما يُكشف. |
| GET | /api/ai/readiness | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| GET | /api/ai/interactions | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/ai/providers/test | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/ai/chat | عام/اختياري | optionalAuth | MEDIUM | endpoint عام عالي الاستهلاك؛ يتطلب rate-limit جيد. |
| POST | /api/ai/admin-assistant | Admin فقط | requireAuth + requireRole([admin]) | LOW | محمي جيدًا. |
| POST | /api/ai/study-plan | عام | لا auth | MEDIUM | endpoint مفتوح، يلزم rate-limit/abuse control. |
| POST | /api/ai/learning-path | عام | لا auth | MEDIUM | endpoint مفتوح، يلزم rate-limit/abuse control. |
| POST | /api/ai/remediation-plan | عام | لا auth | MEDIUM | endpoint مفتوح، يلزم rate-limit/abuse control. |
| POST | /api/ai/question | عام | لا auth | MEDIUM | endpoint مفتوح، يلزم rate-limit/abuse control. |
| POST | /api/ai/course-summary | عام | لا auth | MEDIUM | endpoint مفتوح، يلزم rate-limit/abuse control. |

### 13) `seo.routes.ts`
| Method | Path | الوصول | الحماية | المستوى | الملاحظة |
|---|---|---|---|---|---|
| GET | /api/seo/status | عام | لا auth | LOW | معلومات SEO عامة. |
| GET | /api/seo/sitemap.xml | عام | لا auth | LOW | متوقع. |
| GET | /api/seo/robots.txt | عام | لا auth | LOW | متوقع. |
| GET | /api/seo/manifest.json | عام | لا auth | LOW | متوقع. |

## إجابات الأسئلة المطلوبة

### 1) هل يستطيع الطالب الوصول إلى admin endpoints؟
- **عمليًا لا** على endpoints التي تستخدم `requireRole(["admin"])` (تُرجع 403 بعد التوثيق، أو 401 بدون توثيق).
- لكن توجد endpoints حساسة غير admin-only وتعتمد على scope logic داخلي (مثل بعض analytics)، لذا تحتاج فحصًا دقيقًا مستمرًا.

### 2) هل يستطيع supervisor الوصول إلى بيانات مدرسة أخرى؟
- **هناك مخاطر حقيقية** في بعض endpoints داخل `content.routes.ts`:
  - `POST /api/content/schools/:id/import-students` (CRITICAL)
  - `GET /api/content/schools/:id/report` (HIGH)
  - CRUD لبعض الموارد (`topics`, `groups`, `b2b-packages`, `access-codes`) حيث scope supervisor ليس محكومًا بشكل موحد في كل المسارات.
- بالمقابل، endpoints الترقيم الجديدة لأكواد الوصول/redemptions تحتوي check واضح لـ school scope.

### 3) هل توجد endpoints حساسة غير محمية؟
- لا توجد endpoints تعديل إداري واضحة بدون auth/role في ملفات routes.
- لكن توجد endpoints عامة/optionalAuth ذات أثر تشغيلي (خصوصًا AI وعمليات client-events intake) وتحتاج مراقبة abuse/rate-limit.

## أهم المخاطر (Top Risks)
1. **CRITICAL**: `POST /api/content/schools/:id/import-students` يسمح لدور supervisor مع تحقق scope غير كافٍ مقارنة بحساسية العملية.
2. **HIGH**: CRUD على `topics/groups/b2b-packages/access-codes` ليس موحدًا في ownership/school scoping عبر كل المسارات.
3. **HIGH**: `GET /api/content/schools/:id/report` لدور supervisor يحتاج school ownership gate صريح مشابه endpoint relations.
4. **MEDIUM**: مجموعة endpoints AI عامة قد تكون هدف abuse إن لم تكن ضوابط المعدل صارمة وفعالة.

## توصية الدفعة التالية (بدون تنفيذ الآن)
- **BATCH 10 — RBAC/API Hardening Batch 1**
  - توحيد scope enforcement لـ supervisor على كل endpoints المدرسية الحساسة.
  - إضافة guards صريحة موحدة (school ownership / managed scope) قبل أي CRUD حساس.
