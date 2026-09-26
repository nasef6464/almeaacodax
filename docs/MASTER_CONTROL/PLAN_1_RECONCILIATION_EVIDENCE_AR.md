# PLAN 1 — Repository Reconciliation Evidence

Baseline: `main@72193436ac77df781ce9cc1382737fba00cbc8a2`

## الهدف

إثبات أن الأعمال المعتمدة تاريخيًا موجودة على `main`، وإعادة تطبيق الفجوات الحقيقية فقط بدون merge لفروع قديمة بالجملة.

## A — PR #260: الفجوة الحقيقية

الحالة التاريخية:
- PR #260 أُغلق بدون دمج.
- STT/TTS موجودان على main.
- `QuestionAssistantPanel` موجود داخل `ReviewSession`.
- عزل tutor session لكل سؤال موجود من #263.
- backend في `studentReviewRoutes` و`review.routes` يعيد `voiceExplanation`.

الفجوة التي كانت باقية:
- `ReviewSession` لم يكن يعرض `QuestionVoiceExplanationPlayer`.

الإغلاق في PLAN 1:
- أضيف المشغل إلى `ReviewSession` بشكل مستقل قبل المعلم الذكي.
- يتم تمرير `current.question.voiceExplanation`.
- component keyed by questionId حتى يُلغى speech القديم عند الانتقال للسؤال التالي.
- UI الحالي للأسئلة الكمية والصور وأ/ب/ج/د لم يتغير.
- Smoke contract أصبح يمنع رجوع هذه الفجوة.

## B — R2 V2 audit tooling

الفرع التاريخي `chatgpt/r2-v2-audit` احتوى:
- `.github/workflows/col2627-r2-v2-audit.yml`
- `scripts/audit-col2627-r2-v2.mjs`

قرار PLAN 1:
- لا merge للفرع القديم.
- السكربت مفيد لإثبات reachability للكائنات ذات hashes المعروفة.
- الـworkflow القديم كان مربوطًا بفرع تاريخي فقط، لذلك لم يعد صالحًا كتشغيل مستمر.
- أعيد تطبيق الأداة كـ`workflow_dispatch` يدوي فقط.
- تم توضيح أن reachability **لا يثبت** صحة الصورة بصريًا ولا يجيز الربط.
- #264 يظل المرجع الوحيد لقواعد visual/source integrity.
- P060 يظل unresolved؛ لا hash مخترع ولا relabel.

## C — أعمال معتمدة مثبت أنها مدمجة

| المجال | PRs / evidence | النتيجة |
|---|---|---|
| Adaptive 0–11 | #211 + #212 | merged؛ فروع phase النهائية ahead=0 مقابل main |
| Student sidebar | #224 | merged |
| Question Voice | #248 | merged |
| Student Review | #256 + #257 | merged |
| AI Platform | #258 | merged |
| Mobile quant review | #259 | merged |
| QuizPage image-option parity | #262 | merged؛ branch ahead=0 |
| Voice tutor session isolation | #263 | merged؛ branch ahead=0 |
| Production repository closure | #265 + #266 | merged |
| Google OAuth direct Render | #267 | merged |
| Batch 14 store decomposition | #185 | accepted baseline؛ لا إعادة |
| Structural residual audit | #186 | accepted baseline؛ لا إعادة |

## D — الفروع القديمة

التصنيف:
- branches ذات `ahead=0`: contained بالكامل في main.
- branches diverged بعد squash/rebase: لا تعتبر missing work تلقائيًا.
- planning-only tutor branches: superseded بواسطة مراجع AI/Review الحالية.
- `chatgpt/r2-v2-audit`: أعيد تطبيق الأدوات المفيدة فقط.
- PR #260: أعيد تطبيق الفجوة الوحيدة المثبتة فقط.

## Exit Gate

PASS عند:
1. Voice playback gap موجود على exact PLAN 1 head.
2. R2 reachability tooling موجود بصيغة current-compatible/manual.
3. required CI green على exact head.
4. PR مدمج إلى main.
5. لا feature معتمدة معروفة بقيت فقط في branch قديم.

بعد ذلك:
**PLAN 1 = CLOSED**  
**NEXT = PLAN 2 — Production Closure / Runtime / DR / Governance**

## E — CI كشف regression قائمًا على main في عدادات المهارات

أثناء PLAN 1 كشف `Refactor V2 Safety Gate` أن `smoke-question-skill-full-coverage-contract` لا يطابق تعديل `e60a8f...`.

المراجعة أثبتت نقطة سلوكية فعلية:
- قبل اكتمال/عند فشل server coverage يمكن استخدام fallback محلي للحفاظ على responsive UI.
- بعد نجاح server coverage يجب أن يكون السيرفر هو الحقيقة؛ غياب subskill من map يعني `0`، وليس الرجوع لأسئلة محلية/صفحة حالية.

تم:
- تعديل `SkillsTreeManager` ليستخدم `0` من server truth بعد تحميل coverage.
- تحديث smoke contract ليحمي هذا السلوك الجديد.
- لم يتغير API ولا taxonomy ولا بيانات production.
