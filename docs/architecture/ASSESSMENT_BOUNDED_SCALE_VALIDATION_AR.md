# تحقق الأداء والتوسع المحدود للاختبارات

## الغرض

هذا التحقق دليل CI محدود يثبت أن مسارات القراءة العامة التي تدخل رحلة الاختبار لا تنهار تحت حمل متزامن صغير على API معزول. لا يقيس Render أو Atlas أو Redis الإنتاجيين، ولا يمنح شهادة سعة إنتاجية أو جاهزية 500/1000/10k مستخدم.

## البيئة والحدود

- الهدف مقيد برمجيًا إلى `127.0.0.1` أو `localhost` أو `::1`.
- workflow `platform-v3-deep-premerge-e2e-gate.yml` يشغّل API للـcommit نفسه مع Mongo مؤقت وبيانات fixtures وcredentials مؤقتة.
- لا توجد كتابة: الطلبات هي `GET /api/health` وtaxonomy compact وcontent learning bootstrap فقط.
- لا يختبر submission أو login في ضغط متكرر؛ لذلك لا يغير attempts أو يضغط rate limit أو يحمل سياسة وصول الإنتاج.

## معيار القبول

يشغّل `scripts/run-isolated-scale-validation.mjs` كل endpoint بصورة مستقلة عند 25 worker لمدة 30 ثانية (حد أقصى 50 worker و120 ثانية).

لكل endpoint يلزم:

- طلب ناجح واحد على الأقل؛
- error rate أقل من 2%؛
- p95 أقل من 2000ms.

يحفظ التقرير JSON تحت `audit-artifacts/deep-premerge/isolated-scale.json` ويرتبط بـcommit الذي شغله workflow.

## ما يثبت وما لا يثبت

النجاح يثبت استقرار read path داخل CI بعد seed وstartup للـcommit الدقيق. لا يثبت cold start، أو سعة الشبكة، أو CPU/memory في Render، أو Atlas connection limits، أو Redis fan-out، أو أي مستوى إنتاجي. تظل مراحل 100/500/1000 في `load-tests/` مشروطة ببيئة staging/production-like ومراقبة البنية التحتية، ولا تنفذ ضد الإنتاج ضمن هذه الخطة.
