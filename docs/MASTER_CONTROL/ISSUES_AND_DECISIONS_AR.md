## Read-only relationship/retention refresh — 2026-10-14
Do not treat stale canonical authority or missing current question/lesson/quiz references as automatic deletion candidates. The previously documented11membership-reference gap persists;3teaching-reference gaps were measured now (the prior teaching note had no exact count);6parent/student rows resolve. Nine missing-current-quiz results retain object snapshots; content reconstruction was not certified. AI sample451/1001without date-valued expiry is a bounded-sample finding, not an approved bulk deletion count. Source-only TTL declarations and index name/key do not certify live expiry options/execution. Retention policy requires approved durations and provenance-safe dry-run before destructive enforcement; native metadata DNS failure is not a production outage. Preserve history and authority tombstones; no new cleanup/migration/erasure performed. See docs/audits/DATABASE_RELATIONSHIPS_RETENTION_2026-10-14.json.
## Shared-network account budgeting resolved within scope — 2026-10-14
PR546 head a7bdcd0a98e7c53faf0f695e31e5eaedc53e7a67, merge 8d9dbd1c2d3d9e44a8d299ee22b1bad07ca937e4; 18 successful checks, 4 expected conditional skips, all three required checks PASS. Automatic Render live (dep-db7gsku7bikc73d0nojg) and Vercel READY (dpl_CasQ3sTdkYev3gsxAUSFhzHzRzy4) match this merge. Two distinct existing authorized accounts pass 10 ordinary scripted GETs including live/ready health: each account's global and sensitive counter decreases only for its own interleaved read. Actual global/sensitive limits global:600, sensitive:60. Authentication-helper reads/login are excluded from scripted count. Zero domain-record writes, no production budget exhaustion, no bulk fixture replay or load test. This closes the shared-network account-keying repair within these limits; full Redis-failure, multi-instance, forwarding topology and capacity remain NOT PROVEN. Signed IDs partition only budgets; current authentication remains authoritative, login guards remain source/account-bound and both coarse/heavy source ceilings are retained. No Mongo principal lookup, new provider/service or persisted-history change. See docs/audits/SHARED_NETWORK_REQUEST_PROTECTION_2026-10-14.json.

## 2026-10-14 — إغلاق نقص تغطية التقرير العام ضمن النطاق
PR544/mergeb8f8fd8c/all3requiredPASS والنشر المطابق؛التقرير يجمع كامل نطاق الصلاحية فيMongo ثم يحد الصفوف النهائية،دون قائمةطلاب فيNode أو تغييرالإتقان/السجلات.168/168منشورًا و10000طالبمعزولًاPASS؛userId_1فهرس غيرفريد مبرر بقياس1100→1ولا حذففهارس/تعديلسجلات. هذا يغلق حد1000لهذا التقرير فقط؛حمايةالمصدرالمشترك/العلاقات/الاحتفاظ/سعةالإنتاج وسباقHTTPللأوامر باقية. ساهر القديم فشل3فحوص من5بمرجع/توقعاتقديمة؛لا توليدمحتوى لتجاوزها. الدليل docs/audits/SCHOOL_REPORT_COMPLETE_SCOPE_2026-10-14.json.

## Command index gap resolved within scope — 2026-10-14
PR542/merge3fa30e47 repairs invalid sparse+partial declarations and qualifies literal queries. Production Atlas confirms unique/partial/not-sparse IXSCAN indexes on both empty command collections after normal initialization,0record writes or index drops. SourceCI21PASS/all3required and matching publication proved. Earlier2026-10-13 invalid-index deferral is superseded only for these two definitions/lookups. HTTP create-after-find race replay remainsunproven; shared-source sensitive budget and global1000reportcap stay separate. See docs/audits/DATABASE_INDEX_QUERY_SAFETY_2026-10-14.json.

## Isolated scale gaps — 2026-10-13
Mongo7.0.14 rejects CommandCenterWorkflow/Draft idempotencyKey indexes combining sparse with partialFilterExpression (code67). Source definitions reproduced on disposable Mongo; production index inventory/duplicates were not inspected, no index mutation authorized/performed. Plan a separate read-only inventory and compatible repair before declaring whole-database readiness. Default sensitive-action protection at app entry precedes route authentication, so shared-source submission bursts reached429 in isolated pressure. Benchmark uses explicit test-only budgets; do not infer production school-network capacity or change auth/protection in this report-reader slice. Unfiltered school-skill roster cap1000 remains PARTIAL. See docs/audits/SCHOOL_REPORT_FILTER_SCALE_2026-10-13.md.

# ALMEAA — Issues & Decisions Register

## Classroom shared-network login — 2026-10-10
Owner authorized separating legitimate class login from shared-source wrong-password protection after deployed20/15minlimit rejected trial setup. Preserve existing owner-selected ten-failure account lock; separate short source burst, normalized account limit and completed-failure source budget. Existing Redis connection/free infrastructure reused. Local40-account Mongo/Redis/cookie/CSRF testPASS; CI/live publication pending. Gatewayreport502remains an independent NOT_PROVEN cause; do not close whole-school stability from this login change. Details in `docs/audits/CLASSROOM_SHARED_NETWORK_LOGIN_2026-10-10.md`.

## D-001 — One canonical execution plan
**قرار:** Master Control هو الخطة التنفيذية الوحيدة.  
**سبب:** تعدد FINAL/MASTER/CURRENT/HANDOFF تسبب في تضارب الحالة وإعادة شغل مغلق.  
**أثر:** الخطط السابقة تبقى Evidence/Supporting فقط.

## D-002 — Do not merge stale branches wholesale
**قرار:** أي branch قديم diverged يُفحص على مستوى الفجوة، لا يُدمج كاملًا.  
**سبب:** squash/rebase/history قد يجعل branch ahead رغم أن الميزة موجودة على main، والدمج الكامل قد يعيد UI/Contracts قديمة.

## D-003 — PR #260
**حالة:** closed/not merged.  
**الموجود بالفعل على main:** STT، TTS، QuestionAssistantPanel، tutor session isolation.  
**الفجوة المثبتة:** `QuestionVoiceExplanationPlayer` غير ظاهر داخل `ReviewSession` رغم أن backend يعيد `voiceExplanation`.  
**قرار:** reapply minimal current-main-compatible change في PLAN 1.

## D-004 — R2 V2 audit branch
**حالة:** workflow/script موجودان خارج main.  
**قرار:** لا merge للفرع؛ افحص التوافق مع #264 ثم clean reapply إذا ما زال مطلوبًا.

## D-005 — Vercel preview isolation
**مشكلة:** `vercel.json` repository-only experiment لم يمنع Preview records.  
**حل مثبت:** تعطيل Preview Branch Tracking للفروع غير المعينة على مستوى Vercel project.  
**Evidence:** commit `ab30963e...` → 0 deployment records.  
**قرار:** إعداد Vercel project هو control الحقيقي؛ لا نعتمد على config تجريبي زائد.

## D-006 — GitHub main governance
**مشكلة سابقة:** main غير محمي، rulesets فارغة.  
**حل:** Ruleset `Protect main` active، PR-only، no force push، no deletion، required checks ثابتة.  
**قرار:** لا direct delivery إلى main.

## D-007 — Data model migrations
**قرار:** لا تبدأ User/QuizResult destructive normalization قبل DR/restore baseline.  
**نمط الهجرة:** additive → dual write → backfill → shadow read → cutover → cleanup.

## D-008 — QuizResult historical truth
**قرار:** لا نحول historical attempts إلى IDs-only إذا كان ذلك يفقد نص السؤال وقت المحاولة.  
**اتجاه:** immutable/deduplicated QuestionRevision + attempt facts.

## D-009 — AI readiness / Qiyas prediction
**قرار:** readiness deterministic ممكن؛ Qiyas score prediction لا يُفعّل تجاريًا قبل calibration dataset + MAE/calibration evidence.

## D-010 — ALMEAA quantitative taxonomy
**قرار:** 25 main / 95 subskills هي taxonomy الوحيدة لمسار القدرات الكمي V1؛ ممنوع إنشاء Skill IDs جديدة أثناء ingest.

## D-011 — Google OAuth runtime env contract
**المشكلة:** #267 أضاف `VITE_GOOGLE_OAUTH_API_BASE` إلى runtime لكن architecture allowlist لم تُحدَّث.  
**الأثر:** `Core build + architecture` يفشل على main/PRs اللاحقة رغم أن التغيير مقصود.  
**القرار:** إضافة المفتاح إلى `APPROVED_CONTRACT_EXTENSIONS.json` كامتداد runtime معتمد؛ لا تغيير لسلوك OAuth نفسه.

## D-012 — ReviewSession teacher voice gap
**المشكلة:** backend يعيد `voiceExplanation` لكن `ReviewSession` لا يعرضه.  
**القرار:** إضافة `QuestionVoiceExplanationPlayer` فقط، keyed by questionId، مع الإبقاء على `QuestionAssistantPanel` وكل UI الحالي. لا cherry-pick لـ#260.

## D-013 — R2 audit semantics
**المشكلة:** tooling القديم مفيد لكنه مربوط بفرع قديم، وreachability لا يساوي visual/source approval.  
**القرار:** clean-reapply كـmanual reachability audit فقط. الصور الناتجة Evidence للمراجعة البشرية؛ #264 وحده يحدد صحة المصدر/الترتيب/الإجابة قبل الربط.

## D-014 — Skill coverage authority after load
**المشكلة:** تعديل سابق سمح بالرجوع لعداد محلي حتى بعد نجاح full-bank server coverage عند غياب مفتاح subskill.  
**القرار:** fallback المحلي مسموح فقط عندما coverage غير متاح؛ بعد نجاحه يكون server map هو الحقيقة وغياب المفتاح = 0.  
**السبب:** منع رجوع عدادات أول صفحة/بيانات محلية باعتبارها Full-bank coverage.

## D-015 — Vercel preview CI gate follows delivery policy
**المشكلة:** Safety workflow كان ينتظر Vercel Preview بعد أن PLAN 0 عطّل Preview Branch Tracking رسميًا.  
**القرار:** إبقاء gate لكن جعله policy-aware؛ عندما previews disabled لا يحدث polling ويُعتبر الاختبار غير منطبق، وعند إعادة تمكينها يمكن قلب flag وإرجاع exact-head polling.  
**السبب:** منع CI hang/failure على مورد محظور عمدًا بدون إضعاف باقي Safety Gate.

## D-016 — Redis production activation
**الحالة قبل PLAN 2:** `REDIS_URL` كان مستخدمًا فعليًا بواسطة Socket/Realtime، لكن distributed rate-limit وBullMQ/scheduler كانا معطلين بالـflags.  
**القرار:** تفعيل `RATE_LIMIT_REDIS_ENABLED=true` و`NOTIFICATION_QUEUE_ENABLED=true` وconcurrency=5 على Render.  
**الدليل:** `scale-ready=200` وMongo/Redis checks كلها pass.

## D-017 — Post-deploy 429 handling
**المشكلة:** GitHub Runner حصل على 429 transient من edge، والـhelper المسمى `fetchWithRetry` كان يعيد أي 4xx فورًا.  
**القرار:** retry فقط لـ408/429/5xx مع bounded backoff/Retry-After؛ لا تغيير في حدود production ولا bypass أمني.

## D-018 — Frankfurt recovery is not production
**المشكلة:** وجود recovery cluster في Frankfurt قد يوحي أنه صالح للـcutover.  
**الدليل:** recovery لا يحتوي parity: 10 collections فقط مقابل 66؛ users/questions/quizresults=0.  
**القرار:** منع أي cutover إليه حتى full verified restore + parity + rollback.

## D-019 — Atlas topology change requires owner approval
**الخيارات:** paid Atlas Flex/M10 relocation إلى Frankfurt، أو full verified migration بعد DR.  
**القرار:** لا billing-impacting upgrade ولا destructive connection-string cutover ضمن تفويض ضمني. يلزم owner approval/evidence.

## D-020 — Atlas broad allowlist
**المشكلة:** `0.0.0.0/0` ما زالت موجودة رغم وجود Render CIDRs.  
**القرار:** حذفها فقط من owner/admin control ثم smoke فوري؛ connector الحالي لا يملك delete access-list action.


## D-021 — Shared learning bootstrap precompression
**المشكلة:** cached learning-core ظل يعيد JSON serialization/compression لكل request؛ c25/c50 تجاوزا p95 gate رغم 0% errors.  
**القرار:** serialize + gzip مرة واحدة لكل shared cached payload وإعادة استخدام نفس buffer بدون تغيير response shape أو RBAC.  
**الدليل:** c25 p95 2695.25→303.39ms، c50 p95 4889.23→674.51ms، latest Post Deploy PASS.

## D-022 — #236 closes on the alternate material-latency path
**الدليل:** authenticated c10/c25/c50 = PASS، 340 reads، 0% errors، p50/p95/p99 مسجلة؛ learning-core c50 p95 انخفض من 4889.23ms إلى 674.51ms، وcourses c50 p95 أصبح 832.96ms.  
**القرار:** نص #236 يسمح بـ co-location **أو** material latency reduction؛ لذلك #236 مغلق على المسار الثاني. Frankfurt↔Singapore يبقى optimization debt ولا يبرر paid migration أو cutover غير موثق.


## D-023 — Atlas allowlist must follow current Render outbound ranges
**الحادثة:** حذف `0.0.0.0/0` مع النطاقين التاريخيين فقط قطع Mongo عن Render.  
**الإجراء:** rollback فوري، ثم قراءة النطاقات الحالية من Render Connect → Outbound، إضافة `74.220.51.0/24` و`74.220.59.0/24`، ثم إعادة الحذف.  
**الدليل:** redeploy جديد من نفس SHA اتصل بـMongo من الصفر وأصبح Live.  
**القرار:** النطاقات القديمة لا تُعامل كمصدر حقيقة؛ Render UI الحالي هو مرجع outbound allowlist.

## D-024 — DR independent storage uses GitHub Actions Artifact
**المشكلة:** التصميم السابق احتاج مزود S3 خارجي ثانٍ وأربع Secrets إضافية فقط لإثبات independence.  
**القرار:** النسخة اليومية المستقلة تُرفع إلى private GitHub Actions Artifact لمدة 30 يومًا مع digest، ثم يعمل restore drill تلقائي في Mongo 8 وMinIO معزولين.  
**الأثر:** خفض متطلبات الإعداد من 9 Secrets إلى 5 Source Secrets فقط، مع بقاء fail-closed alerting وRPO/RTO evidence.
