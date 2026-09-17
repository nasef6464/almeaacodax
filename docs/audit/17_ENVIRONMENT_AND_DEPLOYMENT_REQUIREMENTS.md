# دليل متطلبات البيئة وخطوات النشر الإنتاجي (Environment & Deployment Guide)
**تاريخ التدقيق:** 17 سبتمبر 2026  
**الفرع:** `chatgpt/batch-01-build-baseline`  
**Commit SHA:** `0e7baad6`  

---

## 1. البنية التحتية الموصى بها للإنتاج (Recommended Architecture)
نظراً لأن منصة Render المجانية تعاني من قيود سقف نقل البيانات (5GB Bandwidth Quota) والنوم التلقائي (Cold Starts)، فإن المعمارية الإنتاجية الموصى بها هي:
- **خادم افتراضي مستقل (Dedicated VPS):**
  - **الخيار الأول (المجاني تماماً):** سيرفر Oracle Cloud Always Free (معمارية Ampere ARM حتى 4 أنوية OCPU و 24 جيجابايت رام مجاناً مدى الحياة وباندويث 10,000GB شهرياً).
  - **الخيار الثاني (التجاري الاقتصادي):** خادم Hetzner CPX21 أو DigitalOcean بمواصفات (4GB RAM, 2 vCPUs) بتكلفة تبدأ من 7 إلى 12 دولار شهرياً.
  - **الخيار الثالث (منصات PaaS):** منصة Koyeb أو Railway بنظام الحساب المدفوع البسيط لتفادي انقطاعات الباندويث.

---

## 2. جدول المتغيرات البيئية الإنتاجية (`.env.production`)

| اسم المتغير (Variable) | القيمة المقترحة | الوصف والهدف |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | تفعيل وضع الإنتاج وتحسين سرعة Express وإخفاء الـ Stack Traces |
| `PORT` | `4000` | المنفذ الداخلي الذي يستمع عليه خادم Node.js |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/almeaa?retryWrites=true&w=majority` | رابط الاتصال بقاعدة بيانات MongoDB Atlas |
| `JWT_SECRET` | `توليد مفتاح عشوائي طويل (64 حرفاً)` | لتشفير وتوقيع رموز جلسات المستخدمين |
| `SESSION_SECRET` | `توليد مفتاح عشوائي طويل (64 حرفاً)` | لتشفير وتأمين ملفات تعريف الارتباط |
| `CSRF_SECRET` | `توليد مفتاح عشوائي طويل (64 حرفاً)` | لحماية المنصة من هجمات التزوير عبر المواقع |
| `CORS_ORIGIN` | `https://almeaa.com` (نطاقك الفعلي) | حصر قبول الطلبات على اسم نطاق موقعك فقط ومنع النطاقات الغريبة |
| `DEV_LOCAL_ADMIN_BYPASS`| `false` | **مهم جداً:** تعطيل أي تجاوزات برمجية للمدير وفرض التحقق الأمني الكامل |
| `REDIS_URL` | `redis://localhost:6379` | تسريع الجلسات والحد من معدل الطلبات (Rate Limiting) |

---

## 3. خطوات النشر خطوة بخطوة على خادم مستقل (VPS Deployment Steps)

### الخطوة 1: الاتصال بالخادم وتثبيت المتطلبات
```bash
ssh root@YOUR_SERVER_IP
# تحديث النظام وتثبيت Docker و Git
apt-get update && apt-get upgrade -y
apt-get install -y git curl ufw
curl -fsSL https://get.docker.com | sh
```

### الخطوة 2: استنساخ المستودع وبناء الصور (Docker Build)
```bash
git clone https://github.com/nasef6464/almeaacodax.git /opt/almeaa
cd /opt/almeaa
git checkout chatgpt/batch-01-build-baseline

# إعداد ملف البيئة الإنتاجي
cp .env.example .env.production
nano .env.production # ضع قيم المتغيرات أعلاه
```

### الخطوة 3: تشغيل المنصة عبر ملف تشغيل الإنتاج
```bash
# بناء وتشغيل الحاويات في الخلفية
docker compose -f docker-compose.prod.yml up -d --build

# التحقق من أن السيرفر يعمل وحالته الصحية جاهزة
curl http://localhost:4000/api/health/ready
```

### الخطوة 4: ضبط النطاق وتثبيت شهادة SSL مجانية عبر Nginx
```bash
apt-get install -y nginx certbot python3-certbot-nginx
certbot --nginx -d almeaa.com -d www.almeaa.com
systemctl restart nginx
```
