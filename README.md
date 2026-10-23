# صياغة (Siyagah) - مساعدك الذكي لتحسين النص العربي

أداة خفيفة وسريعة لإعادة صياغة النصوص العربية بالذكاء الاصطناعي مع دعم التحكم في اللهجة (الفصحى والمصرية)، الأسلوب، وشدة الصياغة.

---

## خطوات النشر والتشغيل (Deployment Guide)

### الخطوة 1: إعداد Cloudflare Worker
1. قم بإنشاء حساب على [Cloudflare](https://dash.cloudflare.com/).
2. انتقل إلى **Workers & Pages** > **Create Application** > **Create Worker**.
3. سمّ الخدمة `siyagah-api` ثم اضغط **Deploy**.
4. اضغط على **Edit Code** وانقل كود الملف `worker/worker.js` المرفق في هذا المشروع ثم اضغط **Save and Deploy**.
5. من لوحة تحكم الـ Worker، اذهب إلى **Settings** > **Variables** > **Environment Variables**.
6. أضف متغيراً سرياً (Secret):
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** مفتاح Gemini API الخاص بك من [Google AI Studio](https://aistudio.google.com/).
7. في إعدادات Worker، أضف متغيراً عادياً باسم `ALLOWED_ORIGIN` وقيمته أصل موقع GitHub Pages، مثل `https://YOUR-USERNAME.github.io` (بدون مسار المستودع). لا تستخدم `*` في موقع عام.

### الخطوة 2: ربط الواجهة الأمامية بالخادم
1. افتح ملف `js/app.js`.
2. حدد السطر الأول واستبدل قيمة `API_URL` برابط الـ Worker الخاص بك:
   ```javascript
   const API_URL = "https://siyagah-api.YOUR-SUBDOMAIN.workers.dev/rewrite";
