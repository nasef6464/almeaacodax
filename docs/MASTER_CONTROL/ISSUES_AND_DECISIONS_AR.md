# ALMEAA — Issues & Decisions Register

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
