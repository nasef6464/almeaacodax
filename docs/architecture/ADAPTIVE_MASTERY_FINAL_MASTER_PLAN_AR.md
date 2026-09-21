# ALMEAA — الخطة النهائية الشاملة للتعلم التكيفي والإتقان والتقارير

> Canonical execution plan for Adaptive Learning / Mastery / Foundation / Skill Analytics / AI Question Assistant.
> اعتمدت 2026-09-21. عند التعارض في حالة التنفيذ استخدم GitHub/CI exact-head؛ وعند التعارض في تصميم هذه المنظومة تكون هذه الوثيقة المرجع حتى تحديثها صراحة.

## 1) الهدف
بناء حلقة تعلم كاملة قليلة التكلفة:
Question/Attempt -> Evidence -> SkillProgress -> Diagnosis -> Next Best Action -> Foundation content -> Short Practice -> Re-measurement -> Mastery update -> Spaced Review -> Student/School Reports.
المحرك Internal-first؛ AI مساعد اختياري عند الطلب فقط.

## 2) ثوابت البيانات
- Backend هو مصدر الحقيقة. لا حذف/إعادة تسمية destructive ولا تغيير scoring/RBAC أثناء الترحيل.
- Question وSkill وFoundation Topic كيانات مستقلة. المهارة مستقرة للتحليل، وموضوع التأسيس قابل للتحرير.
- الربط explicit IDs مع compatibility fallback مؤقت أثناء migration، ثم إزالة fallback بعد إثبات التغطية.
- Foundation target المفضل للمهارة الفرعية: topic_sub_${skillId} أو mapping محفوظ صراحة.
- كل تغيير schema additive أولًا، backfill dry-run افتراضيًا، verification، ثم cutover.
- منع double-counting بأثر idempotency/evidence identity لمحاولة/سؤال.

## 3) المحتوى والوسائط
- الفيديوهات روابط YouTube؛ لا ترفع/تمر bytes الفيديو عبر Render. نخزن metadata + URL/videoId فقط، thumbnail/lazy embed عند الفتح، وعدم تحميل player لكل البطاقات.
- الأسئلة اللفظية Text-first؛ لا media request بلا حاجة.
- صور الأسئلة تبقى على التخزين الحالي Guide Fair كما هو الآن؛ لا migration في هذه الدفعة. لاحقًا StorageAdapter/CDN migration مستقلة بعد قياس التكلفة والتوافق، مع عدم كسر الروابط القديمة.
- ملفات الدعم/الصور المستقبلية: metadata في API والملف من storage/CDN مباشرة حيث أمكن.

## 4) تقرير المهارات الصحيح
- لا يعتمد على آخر اختبار فقط.
- recent window الافتراضي آخر 5 اختبارات ذات evidence للمهارة، configurable policy.
- الحساب evidence-weighted على مستوى الأسئلة، وليس متوسط درجات الاختبارات.
- يعرض cumulative mastery + recent mastery + evidenceCount + trend + confidence.
- إذا الأدلة غير كافية: «يحتاج قياسًا/بيانات غير كافية»، لا Weak زائف.
- evidence types: assessment | remediation | recheck | mastery_review.
- trend: improving | stable | declining، محسوب داخليًا.
- buildSkillStatus/domain policy مصدر واحد للحالات والحدود.

## 5) ما بعد الاختبار وTest Details
Submit -> scoring server truth -> skill evidence -> idempotent SkillProgress update -> result/Test Details.
لكل مهارة إجراءات:
- شرح: يفتح parent foundation topic ويحدد subtopic ويعرض كل فيديوهات/شروحات الموضوع الفرعي.
- تدريب: نفس subtopic على short quizzes.
- دعم: support tab.
- قياس: recheck قصير مستقل.
الروابط موحدة في Results/Reports/Test Details/SmartLearningPath.

## 6) الحلقة العلاجية
Diagnosis -> explanation -> practice -> recheck -> decision.
القرار:
- mastered: next skill/spaced review.
- improved but not mastered: focused practice ثم recheck.
- still weak: alternate explanation/support + practice.
- insufficient evidence: measurement first.

## 7) Smart Learning Path / Next Best Action
- لا AI لاختيار المسار.
- ranking داخلي من mastery + recent trend + evidence/confidence + recency/review due + prerequisite/importance عند توفرها.
- يعرض إجراء أساسي واحد الآن مع إمكانية رؤية الباقي.
- server truth + version/fingerprint؛ لا recompute عند كل dashboard mount.
- لا hard-coded path/subject fallback في الحالة النهائية؛ الرابط من mapping الفعلي.

## 8) خصائص الإتقان المعتمدة
1. Mastery levels مفهومة للطالب، مع الاحتفاظ بالنسبة والأدلة داخليًا.
2. Mastery goals قصيرة/طويلة: topic/section/path، للطالب والمعلم.
3. Diagnostic/mock entry: يبدأ المسار من الفجوات المثبتة.
4. Internal Readiness: mastery + coverage + evidence + recency، تفسيره ظاهر، بلا AI وبلا ادعاء تنبؤي.
5. Next Best Action.
6. Mastery Challenge + spaced/spiral review باستخدام ReviewCard/SM-2: مراجعة مهارات سبق تعلمها، mix صغير، توقيت حسب الاستحقاق والإتقان. لا نسخ أرقام/عتبات منصة أخرى حرفيًا؛ تضبط بسياسة ALMEAA وbenchmark تربوي.
هذه الأفكار تستفيد من مبادئ mastery/spaced review/goals مع تنفيذ خاص بالمنصة.

## 9) تقارير الطالب والمدرسة
Student: current/recent mastery، trend، evidence، next action، progress over time، الاختبارات التي ساهمت في التشخيص.
Supervisor/teacher: school -> class -> student -> skill، وskill -> classes -> students.
«الأكثر احتياجًا للدعم» = coverage/confidence + support rate + recent trend، لا average خام ولا عينات صغيرة.
aggregates incremental/precomputed عند تغير النتائج؛ dashboard لا يعمل full-history scan.
pagination/projection/indexes في drill-down.

## 10) AI Question Assistant
- explicit click فقط في مراجعة السؤال/الاختبار.
- AI لا يصحح ولا يحدد mastery.
- context minimization: questionId، النص/الاختيارات اللازمة، student answer، skill، trusted explanation عند الحاجة؛ لا full test/history.
- progressive help: hint -> stronger hint -> concept -> steps -> follow-up.
- per-question conversation scope، dedupe/cache، token cap، rate limit، timeout، telemetry cost.
- AI Gateway provider-agnostic: provider A ثم sequential fallback provider B عند failure/quota وفق policy؛ ممنوع parallel fan-out المدفوع.
- circuit breaker + provider health + per-user/per-school budget.
- لا نخزن أسرار providers في frontend.

## 11) الصوت لاحقًا
Voice فوق نفس AI Gateway وليس نظام تعلم منفصل.
push-to-talk/short turn؛ STT -> text assistant -> TTS عند الطلب.
إذا المطلوب قراءة trusted explanation فقط: TTS بدون LLM.
limits للمدة/الحجم، وعدم streaming دائم بلا طلب.

## 12) ميزانية bandwidth/server/AI
- YouTube bytes لا تمر عبر API.
- lazy-load embeds/thumbnails؛ لا player grid.
- text-first للفظي.
- no full question bank/full attempt history في reports.
- indexed query shapes، pagination، projections، bulk read/write عند ثبوت N+1.
- incremental aggregates، ETag/cache عند الملاءمة.
- AI calls = صفر للmastery/trend/readiness/routing/reports/challenges.
- sequential AI fallback فقط.
- لا optimization تخميني: baseline -> change -> evidence.

## 13) التقسيم المعماري
Modular Monolith؛ حدود مقترحة لا أسماء إلزامية:
- skill-evidence domain
- mastery policy/service
- recommendation/next-action domain
- foundation mapping/navigation
- mastery-review scheduler/domain
- student skill read model
- school skill aggregate read model
- AI gateway/question tutor adapter
Presentation components لا تملك business authority. لا God files جديدة؛ التقسيم عند responsibility boundary فقط.

## 14) ترتيب التنفيذ
Phase 0: إغلاق PR #186 exact-head green وتحديث docs/evidence.
Phase 1: Data integrity audit: كل Question/Skill/Foundation mapping + counts/coverage؛ إثبات فعلي لا ادعاءات.
Phase 2: Skill evidence/idempotency + recent-5 analytics + indexes + double-count audit.
Phase 3: Test Details/Results/Reports actions والعقد الموحد للروابط.
Phase 4: Treatment/recheck loop.
Phase 5: SmartLearningPath internal-first + Next Best Action + fingerprint/cache.
Phase 6: Mastery levels/goals/readiness.
Phase 7: Mastery Challenge/spaced review.
Phase 8: school/class/student skill aggregates and drill-down.
Phase 9: AI Question Assistant Gateway؛ الصوت عقد/مرحلة مستقلة.
Phase 10: bandwidth/server/DB/AI benchmark + security/resource hardening.
Phase 11: full E2E and Batch 15 final integration/production certification.

## 15) الاختبارات ومعايير القبول
- unit/domain tests للmastery/trend/recommendation/idempotency.
- contract tests للروابط والمappings.
- integration submit -> SkillProgress -> report.
- E2E: test -> weak skill -> foundation lessons -> short practice -> recheck -> mastery changes -> path refresh -> spaced review.
- supervisor E2E: school weakest-needs -> class -> student -> evidence attempts.
- regression: question center/skill center global counts and skill-link filter.
- performance assertions: bounded payload/query counts وعدم تحميل media في التقارير.
- AI tests mock provider/failover/budget؛ لا live tokens في CI الافتراضي.

## 16) تقرير الموارد الإلزامي
قبل/بعد لكل مرحلة حرجة:
- HTTP request count وtransferred bytes/payload p50/p95.
- API latency p50/p95.
- DB query count/slow queries/index usage؛ COLLSCAN/N+1 findings.
- CPU/memory عندما تتوفر metrics.
- media bandwidth source (YouTube/storage/API).
- AI calls/input-output tokens/cache hits/provider failover.
تصنيف كل بند VERIFIED | PARTIAL | NOT PROVEN | BLOCKED.

## 17) استراتيجية التنفيذ الآمنة
الأفضل تنفيذ الكود الثقيل محليًا/Worktree ثم commits صغيرة إلى GitHub، وليس تعديلات ضخمة مباشرة على GitHub.
GitHub يبقى source of truth وCI evidence. يمكن استخدام GitHub connector للتعديلات الصغيرة/الوثائق والإصلاحات المحدودة؛ أما migrations/refactors متعددة الملفات فتُنفذ محليًا مع targeted tests/typecheck/build ثم push وCI.
لا merge قبل exact-head required gates. لا weakening tests. لا destructive migration. rollback واضح لكل batch.

## 18) Definition of Done
لا تعتبر المنظومة مكتملة إلا إذا:
- mappings/coverage مثبتة.
- تقارير آخر 5 + cumulative/trend/confidence تعمل.
- الأزرار شرح/تدريب/دعم/قياس صحيحة.
- adaptive loop وNext Best Action يعملان بدون AI.
- mastery goals/review/readiness تعمل.
- school analytics تعمل من aggregates خفيفة.
- AI tutor اختياري ولا يؤثر على core عند تعطله.
- resource report موثق.
- full E2E + typecheck/build/server/security/architecture gates المطلوبة Green.
- canonical handoff/current-state/module maps محدثة بالـSHA/PR/CI evidence.


## 19) تعدد المسارات والمواد — عقد التحليلات والتعلم التكيفي

### نموذج النطاق
الطالب قد يكون مسجلاً في مسار واحد أو أكثر في الوقت نفسه. أمثلة المنتج الحالية:
- القدرات: نطاقات/مواد مثل الكمي واللفظي.
- التحصيلي: مواده وأقسامه المستقلة.
- نافس: مواده وأقسامه المستقلة.
لا يجوز أن يفترض أي تقرير أو Adaptive Engine أن للطالب path واحدًا فقط.

### مفتاح التحليل
كل Evidence/SkillProgress/Read Model يجب أن يحافظ على scope الفعلي:
`userId + pathId + subjectId + skillId`
مع section/topic عند الحاجة للتصفح، لا كبديل عن هوية المهارة.
إذا كانت نفس المهارة المنطقية مشتركة بين أكثر من مسار، لا نخلط نتائجها تلقائيًا؛ aggregation cross-path يكون عرضًا صريحًا فوق بيانات scoped، وليس overwrite لسجل واحد.

### مستويات التقرير
1. **المسار الحالي**: الأداء والإتقان داخل القدرات أو التحصيلي أو نافس فقط.
2. **المادة داخل المسار**: مثل كمي/لفظي أو مادة نافس.
3. **المهارة**: cumulative + recent window + trend/confidence.
4. **كل تعلم الطالب**: Portfolio summary يجمع المسارات المسجل بها الطالب للعرض فقط، مع إبقاء كل رقم منسوبًا لمساره/مادته.

### نافذة «آخر 5 اختبارات»
- ليست آخر خمسة اختبارات للطالب عالميًا.
- الافتراضي: آخر 5 محاولات مؤهلة **داخل scope التقرير الحالي** والتي تحتوي evidence للمهارة/المادة محل القياس.
- عند تقرير مهارة: آخر 5 اختبارات فيها evidence لهذه المهارة في path/subject المحدد.
- عند تقرير مادة: آخر 5 اختبارات مؤهلة في تلك المادة.
- عند تقرير مسار: آخر 5 اختبارات مؤهلة في المسار، مع drill-down للمواد والمهارات.
- Portfolio لا يخلط درجات اختبارات غير متجانسة في mastery واحد؛ يعرض summaries مستقلة لكل مسار.
- recentWindowSize policy قابلة للتعديل؛ 5 default وليست hard-coded.

### نوع الاختبار وسياق الأدلة
نسجل source/context كي لا تتساوى كل المحاولات دلاليًا:
`diagnostic | regular | mock | remediation | recheck | mastery_review`.
الـmastery يبنى من evidence على مستوى الأسئلة؛ نوع الاختبار يستخدم للتفسير/التقارير والسياسات، لا لخلط درجات خام مختلفة.

### لوحة الطالب متعددة المسارات
- تعرض المسارات المسجل بها فقط.
- لكل مسار summary خفيف: التقدم، المهارات المحتاجة دعمًا، المهارات المتقنة، trend، Next Best Action، وموعد مراجعة عند وجوده.
- اختيار المسار يثبت context لكل Results/Reports/SmartLearningPath/Foundation links.
- إذا كان الطالب مسجلاً في القدرات والتحصيلي معًا، لكل منهما Smart Path وReadiness مستقلان؛ ويمكن Portfolio أعلى الصفحة أن يعرض الحالة العامة بدون دمج mastery بينهما.
- لا تحميل تفاصيل كل المسارات عند أول فتح؛ summary endpoint صغير، والتفاصيل lazy عند فتح المسار.

### المدرسة/المشرف
التدرج:
`school -> path -> subject -> class/group -> student -> skill`
مع إمكان العرض العكسي:
`path/subject/skill -> classes/groups -> students`.
كل aggregate يحمل denominator/coverage/confidence، ويمنع مقارنة أو ترتيب مواد/مسارات مختلفة بمتوسط خام غير متجانس.

### الأداء والبيانات
- فهارس واستعلامات التقارير يجب أن تبدأ بـ user/school + path + subject حسب query shape.
- aggregates منفصلة scoped ومحدثة incrementally بعد result events.
- لا scan لكل نتائج الطالب لتغيير المسار في الواجهة.
- لا preload للكمي واللفظي والتحصيلي ونافس معًا؛ route/tab scoped fetch + cache.
- YouTube/video metadata وFoundation content يحمّل فقط للمسار/الموضوع المفتوح.

### اختبارات قبول إضافية
- طالب مسجل قدرات فقط.
- طالب مسجل قدرات + تحصيلي، ولا تتسرب أدلة أحدهما للآخر.
- طالب نافس متعدد المواد.
- تقرير كمي لا يتأثر باختبار لفظي لا يحمل evidence لنفس scope.
- تقرير مهارة يستخدم آخر 5 محاولات مؤهلة لها، لا آخر 5 محاولات عالمية.
- تغيير المسار يحدث SmartLearningPath/Readiness/Reports بدون إعادة تحميل بيانات المسارات الأخرى.
- supervisor aggregation يحافظ على path/subject scope.
