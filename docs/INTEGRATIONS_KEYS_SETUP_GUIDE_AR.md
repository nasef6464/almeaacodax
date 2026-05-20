# دليل ربط التكاملات والمفاتيح — منصة المئة (ALMEAA)
تاريخ التحديث: 2026-05-20

## 1) القاعدة الذهبية قبل أي ربط
- لا تضع أي مفتاح داخل الكود أو GitHub.
- كل المفاتيح توضع فقط في `Render Environment Variables`.
- بعد أي تعديل مفاتيح: اعمل `Manual Deploy` أو أعد تشغيل الخدمة على Render.
- اختبر من لوحة المدير ثم اختبر API/Smoke.

---

## 2) أين يتم الربط داخل المشروع؟
عندك مستويين:
1. **Runtime (السيرفر)** عبر Render env vars.
2. **لوحة المدير**:
   - تبويب **التكاملات**: إدارة القيم/الإعدادات.
   - تبويب **إدارة المساعد الذكي**: مراقبة الحالة واختبار المزود.

المسار الموصى به دائمًا:
1. أضف المفاتيح في Render.
2. افتح لوحة المدير > التكاملات لتأكيد الإعدادات.
3. افتح إدارة المساعد > اختبر المزود.

---

## 3) GitHub
### منين أجيب المفتاح؟
- GitHub > Settings > Developer settings > Personal access tokens.
- أنشئ Token جديد (يفضل Fine-grained) بالصلاحيات المطلوبة فقط.

### الربط
- في Render أضف:
  - `GITHUB_TOKEN=...`
- (اختياري) إن كنت تستخدمه داخل التكاملات الإدارية، أضفه أيضًا في بطاقة التكامل داخل لوحة المدير.

---

## 4) Vercel
### منين أجيب المفاتيح؟
- [Vercel Dashboard](https://vercel.com/dashboard) > Settings > Tokens.
- أنشئ Token جديد.
- Project ID من صفحة المشروع.

### الربط
- في Render:
  - `VERCEL_TOKEN=...`
  - `VERCEL_PROJECT_ID=...`

---

## 5) Render
### منين أجيب المفتاح؟
- [Render Dashboard](https://dashboard.render.com/) > Account Settings > API Keys.
- Service ID من صفحة الخدمة (مثل `srv-...`).

### الربط
- في Render env vars:
  - `RENDER_API_KEY=...`
  - `RENDER_SERVICE_ID=...`

---

## 6) MongoDB Atlas
### منين أجيب رابط الاتصال؟
- [MongoDB Atlas](https://cloud.mongodb.com/) > Database > Connect > Drivers.
- خذ `mongodb+srv://...`.

### الربط
- في Render:
  - `MONGODB_URI=...`

ملاحظة: للإطلاق القوي يفضل ترقية الخطة من M0 عند زيادة الحمل.

---

## 7) Redis (Upstash) — مهم للأداء
### منين أجيب الرابط؟
- [Upstash Console](https://console.upstash.com/) > أنشئ Redis DB.
- انسخ رابط `rediss://...`.

### الربط
- في Render:
  - `REDIS_URL=rediss://...`

### التحقق
- `/api/health` لازم يظهر:
  - `redis.rateLimit = ready`
  - `redis.queue = ready`

---

## 8) Sentry
### منين أجيب DSN؟
- [Sentry](https://sentry.io/) > Project Settings > Client Keys (DSN).

### الربط
- في Render:
  - `SENTRY_DSN=...`
  - `SENTRY_ENVIRONMENT=production`
  - `SENTRY_RELEASE=<git-commit>`

---

## 9) أدوات الذكاء الاصطناعي (الأهم)
## 9.1 مفاهيم أساسية
- `AI_PROVIDER_ORDER` يحدد ترتيب المزودات.
- أول مزود متاح بمفتاح صحيح يتم استخدامه.
- لو كل المزودات فشلت، النظام يرجع إلى `local-fallback` (رد احتياطي داخلي).

صيغة مثال:
- `AI_PROVIDER_ORDER=gemini,openrouter,qwen,deepseek,openai`

---

## 9.2 أفضل ترتيب مجاني عملي (مقترح)
1. `gemini`
2. `openrouter` (موديلات free عند التوفر)
3. `qwen`
4. `local-fallback`

مثال:
- `AI_PROVIDER_ORDER=gemini,openrouter,qwen,local-fallback`

---

## 9.3 Gemini (ممتاز كبداية مجانية)
### منين أجيب المفتاح؟
- [Google AI Studio](https://aistudio.google.com/) > Get API Key.

### الربط
- في Render:
  - `GEMINI_API_KEY=...`
  - `GEMINI_MODEL=gemini-2.5-flash`

---

## 9.4 OpenRouter (يدعم free models)
### منين أجيب المفتاح؟
- [OpenRouter Keys](https://openrouter.ai/keys)

### الربط
- في Render:
  - `OPENROUTER_API_KEY=...`
  - `OPENROUTER_MODEL=qwen/qwen3-235b-a22b:free`

---

## 9.5 Qwen
### منين أجيب المفتاح؟
- من Alibaba Model Studio (حسب حسابك).

### الربط
- في Render:
  - `QWEN_API_KEY=...`
  - `QWEN_MODEL=qwen-plus`
  - `QWEN_BASE_URL=...` (إذا مطلوب من المزود)

---

## 9.6 DeepSeek / OpenAI (اختياري مدفوع)
- DeepSeek:
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_MODEL=deepseek-chat`
- OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL=gpt-4.1-mini` (أو ما تعتمدونه)

---

## 9.7 Ollama / LM Studio (محلي فقط)
- مناسب للتجارب على جهازك.
- غير مناسب عادةً لاستضافة Render المجانية كخدمة طلاب مستقرة.
- متغيرات:
  - `OLLAMA_BASE_URL` / `OLLAMA_MODEL`
  - `LM_STUDIO_BASE_URL` / `LM_STUDIO_MODEL`

---

## 10) ربط المساعد الذكي من لوحة الإدارة
1. ادخل `لوحة المدير`.
2. افتح `التكاملات`:
   - أضف/حدّث موفري AI (إن لزم).
   - تأكد من `ai-global` وقيم الترتيب.
3. افتح `إدارة المساعد الذكي`:
   - راقب حالة كل مزود (مفعل/غير مفعل).
   - نفّذ `اختبار المزود`.
4. إذا فشل مزود:
   - راجع env var الخاص به في Render.
   - أعد النشر.
   - أعد الاختبار.

---

## 11) قائمة متغيرات Render المقترحة (نسخة جاهزة)
> عدّل القيم فقط وضعها في Render كما هي بالمفاتيح نفسها.

```env
NODE_ENV=production
APP_BASE_URL=https://almeaacodax.vercel.app
CLIENT_URL=https://almeaacodax.vercel.app

MONGODB_URI=
REDIS_URL=
SENTRY_DSN=
SENTRY_ENVIRONMENT=production

GITHUB_TOKEN=
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
RENDER_API_KEY=
RENDER_SERVICE_ID=

AI_PROVIDER_ORDER=gemini,openrouter,qwen,local-fallback
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=qwen/qwen3-235b-a22b:free
QWEN_API_KEY=
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=
```

---

## 12) خطوات التحقق بعد الربط
1. Render deploy ناجح.
2. `GET /api/health` = `ready=true`.
3. Redis status = `ready`.
4. لوحة المدير > إدارة المساعد > اختبار المزود PASS.
5. اختبار حي من الموقع: أرسل سؤال للمساعد وتحقق من الرد.

---

## 13) إدارة دوران المفاتيح (لما الرصيد يخلص)
1. أنشئ مفتاح جديد من نفس المزود.
2. بدّل القيمة في Render.
3. أعد النشر.
4. اختبر من لوحة المساعد.
5. احذف المفتاح القديم من المزود.

---

## 14) أخطاء شائعة وحلها
- **المساعد يرد fallback دائمًا**:
  - `AI_PROVIDER_ORDER` خطأ أو المفاتيح ناقصة.
- **مزود غير مفعل في اللوحة**:
  - المفتاح غير موجود في Render أو اسمه غلط.
- **يعمل قبل الريفرش ثم يتعطل**:
  - تغييرات لم تُنشر على السيرفر.
- **429 / quota exceeded**:
  - ضع مزود احتياطي ثاني في `AI_PROVIDER_ORDER`.

---

## 15) سياسة أمان سريعة
- لا تشارك المفاتيح في المحادثات أو الصور.
- أي مفتاح ظهر علنًا: اعمل له Rotate فورًا.
- احفظ المفاتيح في مدير أسرار أو Render فقط.
