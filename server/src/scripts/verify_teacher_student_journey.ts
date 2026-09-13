import { createServer } from 'http';
import { createApp } from '../app.js';
import { connectToDatabase } from '../config/db.js';
import mongoose from 'mongoose';

async function main() {
  console.log('--- Connecting to Database ---');
  await connectToDatabase();

  console.log('--- Starting In-Memory Test HTTP Server ---');
  const app = createApp();
  const server = createServer(app);
  
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`Test server running on ${baseUrl}`);

  let csrfToken = '';
  let csrfCookie = '';

  async function initCsrf() {
    const res = await fetch(`${baseUrl}/auth/csrf-token`);
    const data = await res.json() as any;
    csrfToken = data.csrfToken;
    csrfCookie = (res.headers.get('set-cookie') || '').split(';')[0] || `almeaa_csrf_token=${csrfToken}`;
  }

  await initCsrf();

  async function api(path: string, options: any = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(isUnsafe ? { 'x-csrf-token': csrfToken, Cookie: csrfCookie } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  try {
    console.log('\n[Step 1] Teacher and Student Login');
    const teacherLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'te1@te1.com', password: 'te1@te1.com' }),
    });
    const teacherToken = teacherLogin.token;
    console.log('✓ Teacher te1@te1.com logged in successfully');

    const studentLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'st8@st8.com', password: 'te1@te1.com' }),
    });
    const studentToken = studentLogin.token;
    console.log('✓ Student st8@st8.com logged in successfully');

    console.log('\n[Step 2] Question Bank & Taxonomy Filtering Verification');
    const schoolId = '6a343c2e62695d48b3abff79'; // الفرسان المرحلة الثانوية
    const classId = '6a69e4dd8e8d45d96c7d85d9'; // فصل 205

    const allQuestions = await api(`/classroom/questions?schoolId=${schoolId}`, { token: teacherToken });
    console.log(`✓ Total questions in approved bank: ${allQuestions.questions.length}`);
    if (allQuestions.questions.length < 40) throw new Error('Bank does not have approved questions');

    const filtered = await api(`/classroom/questions?schoolId=${schoolId}&skillId=sk_sub_1777779748206_1_1`, { token: teacherToken });
    console.log(`✓ Questions matching 'ضرب وقسمة الاعداد الكبيرة': ${filtered.questions.length}`);
    if (filtered.questions.length === 0) throw new Error('Skill filter returned 0 questions');

    console.log('\n[Step 3] Pre-session Active Status Check');
    const teacherPre = await api(`/classroom/teacher/active-session?schoolId=${schoolId}`, { token: teacherToken });
    console.log(`✓ Teacher initial active session: ${teacherPre.hasActiveSession}`);

    console.log('\n[Step 4] Teacher Launches Live Classroom Session');
    const questionIds = allQuestions.questions.slice(0, 3).map((q: any) => q.questionId);
    const session = await api('/classroom/sessions', {
      method: 'POST',
      token: teacherToken,
      body: JSON.stringify({
        schoolId,
        classId,
        questionIds,
        day: 'الأحد',
        period: 2,
        className: 'فصل 205',
        subjectName: 'الكمي',
        publishedMode: 'batch',
        autoStart: true,
      }),
    });
    console.log(`✓ Live session started! ID: ${session.sessionId}, Status: ${session.status}, PIN: ${session.pin}`);

    console.log('\n[Step 5] Teacher Active Session Banner & Back Button Resilience');
    const teacherActive = await api(`/classroom/teacher/active-session?schoolId=${schoolId}`, { token: teacherToken });
    console.log('✓ Teacher active session query returned:', teacherActive);
    if (!teacherActive.hasActiveSession || teacherActive.session.sessionId !== session.sessionId) {
      throw new Error('Teacher active session was not returned correctly');
    }

    console.log('\n[Step 6] Student Active Session Discovery (Proactive Widget)');
    const studentActive = await api('/classroom/student/active-session', { token: studentToken });
    console.log('✓ Student active session query returned:', studentActive);
    if (!studentActive.hasActiveSession || studentActive.session.sessionId !== session.sessionId) {
      throw new Error('Student widget failed to discover active session');
    }

    console.log('\n[Step 7] Student Retrieves Live Questions (Auto-Participation)');
    const currentQuestions = await api(`/classroom/sessions/${session.sessionId}/current`, { token: studentToken });
    console.log(`✓ Student received ${currentQuestions.questions.length} questions without 403 or blocking`);
    if (!currentQuestions.questions || currentQuestions.questions.length === 0) {
      throw new Error('Student received empty questions list');
    }

    console.log('\n[Step 8] Student Submits Answer to Question 1');
    const firstQuestion = currentQuestions.questions[0];
    const answerResult = await api(`/classroom/sessions/${session.sessionId}/answers/${firstQuestion.questionId}`, {
      method: 'PUT',
      token: studentToken,
      body: JSON.stringify({ selectedOptionIndex: 1 }),
    });
    console.log('✓ Student answer accepted:', answerResult);

    console.log('\n[Step 9] Teacher Views Real-time Classroom Aggregate & Student Answers');
    const aggregate = await api(`/classroom/sessions/${session.sessionId}/aggregate`, { token: teacherToken });
    console.log(`✓ Aggregate total responses: ${aggregate.totalSessionResponses}, distribution:`, aggregate.distribution);
    if (aggregate.totalSessionResponses !== 1) {
      throw new Error('Teacher aggregate did not reflect student answer');
    }

    console.log('\n[Step 10] Teacher Ends the Live Session Gracefully');
    const endSession = await api(`/classroom/sessions/${session.sessionId}/end`, {
      method: 'POST',
      token: teacherToken,
    });
    console.log('✓ Session ended successfully. Report snapshot generated:', Boolean(endSession.report || endSession.finalReport));

    console.log('\n[Step 11] Post-Session Verification (Banner Clears, State Resets)');
    const teacherPost = await api(`/classroom/teacher/active-session?schoolId=${schoolId}`, { token: teacherToken });
    console.log(`✓ Teacher active session after teardown: ${teacherPost.hasActiveSession}`);
    if (teacherPost.hasActiveSession) {
      throw new Error('Session is still reported active after being ended');
    }

    console.log('\n===============================================================');
    console.log('✅ FULL TEACHER & STUDENT JOURNEY PASSED WITH 100% SUCCESS! ✅');
    console.log('===============================================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
