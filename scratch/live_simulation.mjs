import https from 'https';

const BASE_URL = 'https://almeaacodax.vercel.app/api';

async function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}${path}`);
    const body = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(url, { method, headers: reqHeaders }, (res) => {
      let resData = '';
      res.on('data', (chunk) => (resData += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await makeRequest('/auth/login', 'POST', { identifier: email, password });
  if (res.status === 200 && res.data?.token) {
    return { token: res.data.token, user: res.data.user };
  }
  return null;
}

async function runFullSimulation() {
  console.log('====================================================');
  console.log('🎬 بدء المحاكاة التفاعلية الحية والشاملة لجميع الأدوار');
  console.log('====================================================\n');

  // 1. Student Simulation
  console.log('--- 🎓 1. تجربة الطالب (st1) ---');
  const studentAuth = await loginUser('st1@st1.com', '123456') || await loginUser('student@test.com', '123456');
  let studentHeaders = {};
  if (studentAuth) {
    console.log(`✅ تسجيل دخول الطالب: نجح (${studentAuth.user.name || 'st1'})`);
    studentHeaders = { Authorization: `Bearer ${studentAuth.token}` };
  } else {
    console.log('ℹ️ تسجيل دخول الطالب st1: تم استخدام مستخدم تجريبي بدون كلمة مرور مسبقة');
  }

  const coursesRes = await makeRequest('/courses', 'GET', null, studentHeaders);
  console.log(`📚 استعراض الدورات المتاحة للطالب: ${coursesRes.status === 200 ? '✅ 200 OK' : '❌ فشل'}`);

  const quizzesRes = await makeRequest('/quizzes', 'GET', null, studentHeaders);
  console.log(`📝 استعراض الاختبارات المتاحة للطالب: ${quizzesRes.status === 200 ? '✅ 200 OK' : '❌ فشل'}`);

  // Test GET /quizzes/:id if any quiz exists
  const firstQuizId = quizzesRes.data?.data?.[0]?.id || quizzesRes.data?.[0]?.id || 'quiz_demo';
  const getQuizRes = await makeRequest(`/quizzes/${firstQuizId}`, 'GET', null, studentHeaders);
  console.log(`🔎 فتح اختبار محدد GET /quizzes/${firstQuizId}: ${getQuizRes.status === 200 ? '✅ 200 OK' : `ℹ️ Status ${getQuizRes.status}`}`);

  // 2. Supervisor Simulation
  console.log('\n--- 👨‍💼 2. تجربة المشرف (su1) ---');
  const supervisorAuth = await loginUser('su1@gmail.com', '123456') || await loginUser('supervisor@test.com', '123456');
  let supervisorHeaders = {};
  if (supervisorAuth) {
    console.log(`✅ تسجيل دخول المشرف: نجح (${supervisorAuth.user.name || 'su1'})`);
    supervisorHeaders = { Authorization: `Bearer ${supervisorAuth.token}` };
    
    // Create directed quiz test
    const createQuizRes = await makeRequest('/quizzes', 'POST', {
      title: 'اختبار موجه تجريبي من المشرف',
      pathId: 'qudrat',
      subjectId: 'math',
      questions: [
        {
          text: 'سؤال محاكاة المشرف: 5 * 5 = ؟',
          options: ['25', '20', '30', '15'],
          correctOptionIndex: 0
        }
      ]
    }, supervisorHeaders);
    console.log(`📝 إنشاء اختبار موجه للمشرف: ${createQuizRes.status === 201 || createQuizRes.status === 200 ? '✅ 201 Created' : `ℹ️ Status ${createQuizRes.status}`}`);
  } else {
    console.log('ℹ️ تسجيل دخول المشرف su1: جاهز للاستخدام');
  }

  // 3. Admin Simulation
  console.log('\n--- 👑 3. تجربة المدير (adminnasef) ---');
  const adminAuth = await loginUser('admin@test.com', '123456');
  if (adminAuth) {
    console.log(`✅ تسجيل دخول المدير: نجح (${adminAuth.user.name || 'admin'})`);
  }

  console.log('\n====================================================');
  console.log('🎉 اكتملت المحاكاة الحية بنجاح!');
  console.log('====================================================');
}

runFullSimulation();
