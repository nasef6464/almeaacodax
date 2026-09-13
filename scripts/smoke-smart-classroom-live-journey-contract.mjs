import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const teacherRoutes = read('server/src/routes/classroom/registerClassroomTeacherRoutes.ts');
const studentRoutes = read('server/src/routes/classroom/registerClassroomStudentRoutes.ts');
const aggregateRoutes = read('server/src/routes/classroom/registerClassroomAggregateRoutes.ts');
const supervisorRoutes = read('server/src/routes/classroom/registerClassroomSupervisorRoutes.ts');
const routeSupport = read('server/src/routes/classroom/classroomRouteSupport.ts');
const reportBuilder = read('server/src/modules/schools/application/classroomSupervisorReport.ts');
const authContext = read('contexts/AuthContext.tsx');
const requireAuth = read('components/auth/RequireAuth.tsx');
const studentPage = read('pages/ClassroomStudentLive.tsx');
const floatingWidget = read('components/classroom/SmartClassroomFloatingWidget.tsx');
const realtime = read('hooks/useClassroomRealtime.ts');
const scheduler = read('components/classroom/SmartClassroomSessionSchedulerModal.tsx');
const pushModal = read('components/classroom/ClassroomPushQuestionsModal.tsx');
const participantModel = read('server/src/models/ClassroomParticipant.ts');
const responseModel = read('server/src/models/ClassroomResponse.ts');
const sessionModel = read('server/src/models/ClassroomSession.ts');

const checks = [];
const check = (name, condition) => {
  checks.push({ name, pass: Boolean(condition) });
  assert.ok(condition, name);
};

check('teacher can create an empty session', teacherRoutes.includes('optional().default([])') && teacherRoutes.includes('canonicalQuestionIds.length > 0 ? 0 : null'));
check('scheduler exposes explicit empty-session mode', scheduler.includes("'empty'") && scheduler.includes('ابدأ الحصة فارغة'));
check('teacher can append and auto-publish a new batch', teacherRoutes.includes('/append-questions') && teacherRoutes.includes('publishedQuestionIds = newQuestionIds'));
check('question batches are persisted on the session', sessionModel.includes('questionBatches') && sessionModel.includes('activeBatchId'));
check('new pushed questions create a numbered batch', teacherRoutes.includes('newBatchId = randomUUID()') && teacherRoutes.includes('label: `الدفعة ${session.questionBatches.length + 1}`'));
check('switching batches closes the previous active batch', teacherRoutes.includes('closeActiveBatch(session') && teacherRoutes.includes('activateBatchForQuestion'));
check('ending the session closes the active batch', routeSupport.includes('activeBatch.endedAt = endedAt') && routeSupport.includes('session.activeBatchId = ""'));
check('canonical report includes per-batch totals', reportBuilder.includes('durationSeconds') && reportBuilder.includes('accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null'));
check('canonical batch report carries skill ids', reportBuilder.includes('skillIds = Array.from(new Set(batchQuestions.flatMap'));
check('live push UI previews standalone question images', pushModal.includes('question.imageUrl'));
check('student current-question read requires explicit participant', studentRoutes.includes('Join the session before viewing questions'));
check('student answer requires explicit participant', studentRoutes.includes('Join the session before answering'));
check('aggregate does not auto-create student participation', !aggregateRoutes.includes('ClassroomParticipantModel.updateOne'));
check('participant uniqueness is protected in Mongo', participantModel.includes('{ sessionId: 1, studentId: 1 }, { unique: true }'));
check('response uniqueness is protected in Mongo', responseModel.includes('{ sessionId: 1, questionId: 1, studentId: 1 }, { unique: true }'));
check('one live session per class has a partial unique index', sessionModel.includes('partialFilterExpression: { status: "live" }'));
check('actual live start time is persisted', sessionModel.includes('startedAt: { type: Date') && teacherRoutes.includes('const liveStartedAt = payload.autoStart ? new Date() : null') && teacherRoutes.includes('if (!session.startedAt) session.startedAt = publishAt'));
check('canonical report derives duration from actual live start', reportBuilder.includes('session.startedAt || session.createdAt') && reportBuilder.includes('durationMinutes'));
check('classroom routes participate in cookie-backed auth bootstrap', authContext.includes("'/classroom'") && authContext.includes('shouldBootstrapInitialAuth'));
check('auth redirect waits while bootstrap is running', requireAuth.indexOf('if (loading)') >= 0 && requireAuth.indexOf('if (loading)') < requireAuth.indexOf('if (!user)'));
check('student refresh can recover through idempotent instant join', studentPage.includes('instantJoinClassroomSession(sessionId)'));
check('student receives an explicit ended-session state', studentPage.includes('انتهت الحصة الذكية') && studentPage.includes('handleSessionEnded'));
check('floating widget clears stale joined session state', floatingWidget.includes('clearJoinedSession') && floatingWidget.includes('انتهت الحصة الذكية'));
check('realtime exposes session-ended callback', realtime.includes('onSessionEnded') && realtime.includes("socket.on('session:ended'"));
check('realtime reconnect rejoins the room and refreshes canonical state', realtime.includes("socket.io.on('reconnect', joinWorkspace)") && realtime.includes('onChange();'));
check('ending a session persists a canonical report snapshot', routeSupport.includes('session.reportSnapshot = report'));
check('ended history reuses immutable report snapshot', reportBuilder.includes('session.reportSnapshot') && reportBuilder.includes('return session.reportSnapshot'));
check('teacher active-session lookup is school scoped for teachers', teacherRoutes.includes('schoolId is required for teacher active session lookup') && teacherRoutes.includes('ensureTeacherSchoolAccess(req.authUser!, schoolId)'));
check('teacher history requires an entitled assigned school', supervisorRoutes.includes('schoolId is required for teacher history') && supervisorRoutes.includes('ensureTeacherSchoolAccess(req.authUser!, requestedSchoolId)') && supervisorRoutes.includes('resolveSchoolEntitlement(requestedSchoolId, "SMART_CLASSROOM")'));

console.log(`Smart Classroom live journey contract: PASS (${checks.length}/${checks.length})`);
