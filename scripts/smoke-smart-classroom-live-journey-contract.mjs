import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const teacherRoutes = read('server/src/routes/classroom/registerClassroomTeacherRoutes.ts');
const studentRoutes = read('server/src/routes/classroom/registerClassroomStudentRoutes.ts');
const aggregateRoutes = read('server/src/routes/classroom/registerClassroomAggregateRoutes.ts');
const competitionRoutes = read('server/src/routes/classroom/registerClassroomCompetitionRoutes.ts');
const competitionScoring = read('server/src/modules/schools/application/classroomCompetitionScoring.ts');
const supervisorRoutes = read('server/src/routes/classroom/registerClassroomSupervisorRoutes.ts');
const templateRoutes = read('server/src/routes/classroom/registerClassroomTemplateRoutes.ts');
const routeSupport = read('server/src/routes/classroom/classroomRouteSupport.ts');
const reportBuilder = read('server/src/modules/schools/application/classroomSupervisorReport.ts');
const authContext = read('contexts/AuthContext.tsx');
const requireAuth = read('components/auth/RequireAuth.tsx');
const teacherConsole = read('pages/ClassroomTeacherConsole.tsx');
const studentPage = read('pages/ClassroomStudentLive.tsx');
const examRunner = read('components/classroom/SmartClassroomExamRunner.tsx');
const floatingWidget = read('components/classroom/SmartClassroomFloatingWidget.tsx');
const reportsUi = read('components/classroom/SmartClassroomReportsSection.tsx');
const reportViewModel = read('components/classroom/classroomReportViewModel.ts');
const realtime = read('hooks/useClassroomRealtime.ts');
const scheduler = read('components/classroom/SmartClassroomSessionSchedulerModal.tsx');
const pushModal = read('components/classroom/ClassroomPushQuestionsModal.tsx');
const contentRenderer = read('components/classroom/QuestionContentRenderer.tsx');
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
check('direct teacher console also starts empty sessions live', teacherConsole.includes("autoStart: true") && teacherConsole.includes('ابدأ الحصة فارغة الآن') && !teacherConsole.includes('!selectedIds.length'));
check('direct teacher bank previews standalone images', teacherConsole.includes('question.imageUrl') && teacherConsole.includes('alt="صورة السؤال"'));
check('rich question renderer uses structural allowlist sanitization', contentRenderer.includes('ALLOWED_TAGS') && contentRenderer.includes('DOMParser') && contentRenderer.includes('element.removeAttribute'));
check('rich question renderer restricts executable and image urls', contentRenderer.includes('isSafeUrl') && contentRenderer.includes('SAFE_IMAGE_DATA_URL') && contentRenderer.includes("parsed.protocol === 'https:'"));
check('teacher can append and auto-publish a new batch', teacherRoutes.includes('/append-questions') && teacherRoutes.includes('publishedQuestionIds = newQuestionIds'));
check('question batches are persisted on the session', sessionModel.includes('questionBatches') && sessionModel.includes('activeBatchId'));
check('new pushed questions create a numbered batch', teacherRoutes.includes('newBatchId = randomUUID()') && teacherRoutes.includes('`الدفعة ${session.questionBatches.length + 1}`'));
check('switching batches closes the previous active batch', teacherRoutes.includes('closeActiveBatch(session') && teacherRoutes.includes('activateBatchForQuestion'));
check('ending the session closes the active batch', routeSupport.includes('activeBatch.endedAt = endedAt') && routeSupport.includes('session.activeBatchId = ""'));
check('canonical report includes per-batch totals', reportBuilder.includes('durationSeconds') && reportBuilder.includes('accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null'));
check('canonical batch report carries skill ids', reportBuilder.includes('skillIds = Array.from(new Set(batchQuestions.flatMap'));
check('teacher report UI surfaces batch accuracy duration and skills', reportsUi.includes('batch.totals.accuracy') && reportsUi.includes('formatClassroomDuration(batch.durationSeconds)') && reportsUi.includes('batch.skillIds.join') && reportViewModel.includes('durationSeconds'));
check('live push UI previews standalone question images', pushModal.includes('question.imageUrl'));
check('student current-question read requires explicit participant', studentRoutes.includes('Join the session before viewing questions'));
check('student answer requires explicit participant', studentRoutes.includes('Join the session before answering'));
check('student final submission is persisted server-side', participantModel.includes('finalizedSubmissionKeys') && studentRoutes.includes('/sessions/:id/submit') && studentRoutes.includes('$addToSet: { finalizedSubmissionKeys: submissionKey }'));
check('finalized submission blocks later answer mutation', studentRoutes.includes('تم التسليم النهائي لهذه الدفعة ولا يمكن تعديل الإجابات'));
check('current question read restores submitted state after refresh', studentRoutes.includes('submissionKey, submitted') && floatingWidget.includes('const serverSubmitted = Boolean(result?.submitted)'));
check('floating widget submits the published set atomically through the final endpoint', floatingWidget.includes('/submit') && floatingWidget.includes('finalAnswers'));
check('student school access uses authoritative school contexts', studentRoutes.includes('resolveSchoolContexts') && studentRoutes.includes('hasSchoolContext'));
check('student active-session discovery only searches entitled active school contexts', studentRoutes.includes('entitledSchoolIds') && studentRoutes.includes('schoolId: { $in: entitledSchoolIds }'));
check('student live routes recheck Smart Classroom entitlement', studentRoutes.includes('smartClassroomEnabled') && studentRoutes.match(/Smart Classroom is not enabled for this school/g)?.length >= 4);
check('teacher question/publish/append routes recheck Smart Classroom entitlement', teacherRoutes.includes('smartClassroomEnabled') && teacherRoutes.match(/Smart Classroom is not enabled for this school/g)?.length >= 4);
check('teacher live mutations require active school context and exact class assignment', teacherRoutes.includes('canTeacherControlSession') && teacherRoutes.includes('hasClassAssignment') && teacherRoutes.match(/canTeacherControlSession\(req\.authUser!, session\)/g)?.length >= 3);
check('template routes require active school access and Smart Classroom entitlement', templateRoutes.includes('ensureTeacherSchoolAccess') && templateRoutes.includes('smartClassroomEnabled') && templateRoutes.match(/Smart Classroom is not enabled for this school/g)?.length >= 3);
check('aggregate denies non-admin access when entitlement is disabled', aggregateRoutes.includes('req.authUser!.role !== "admin"') && aggregateRoutes.includes('resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM")'));
check('aggregate revalidates teacher class assignment', aggregateRoutes.includes('TeachingAssignmentModel.exists') && aggregateRoutes.includes('hasClassAssignment'));
check('aggregate remains staff-only and exposes no student branch', aggregateRoutes.includes('const isStaff = isTeacher || isSupervisor || isDirector') && aggregateRoutes.includes('Classroom analytics are staff-only') && !aggregateRoutes.includes('req.authUser!.role === "student"'));
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
check(
  'realtime connect/reconnect rejoins rooms and refreshes canonical state',
  realtime.includes("socket.on('connect', () => {") &&
    realtime.includes('sessionSubscribers.forEach((_, id) => joinSession(id));') &&
    realtime.includes("if (result?.ok) notifySession(id, 'connected');") &&
    realtime.includes('if (!handled) subscriber.onChange();'),
);
check('ending a session persists a canonical report snapshot', routeSupport.includes('session.reportSnapshot = report'));
check('ended history reuses immutable report snapshot', reportBuilder.includes('session.reportSnapshot') && reportBuilder.includes('return session.reportSnapshot'));
check('teacher active-session lookup is school scoped for teachers', teacherRoutes.includes('schoolId is required for teacher active session lookup') && teacherRoutes.includes('ensureTeacherSchoolAccess(req.authUser!, schoolId)'));
check('teacher history survives class reassignment but requires active school membership and entitlement', supervisorRoutes.includes('schoolId is required for teacher history') && supervisorRoutes.includes('hasActiveSchoolRole(req.authUser!, requestedSchoolId, "teacher")') && supervisorRoutes.includes('resolveSchoolEntitlement(requestedSchoolId, "SMART_CLASSROOM")'));
check('teacher and supervisor history expose finalized sessions only', supervisorRoutes.includes('status: { $in: ["ended", "archived"] }'));
check('supervisor today uses actual live timing and includes currently live sessions', supervisorRoutes.includes('{ status: "live" }') && supervisorRoutes.includes('{ startedAt: { $gte: start } }'));
check('competition leaderboard is staff scoped and server backed', competitionRoutes.includes('/sessions/:id/competition') && competitionRoutes.includes('staffCanViewCompetition') && competitionRoutes.includes('ClassroomResponseModel.find'));
check('competition scoring has one canonical server implementation', competitionRoutes.includes('buildClassroomCompetitionStandings') && competitionScoring.includes('score: entry.correct * 100'));
check('competition tie-break remains deterministic', competitionScoring.includes('b.correct - a.correct') && competitionScoring.includes('b.answered - a.answered') && competitionScoring.includes('lastSubmittedAt'));
check('challenge timer is persisted on the active batch', sessionModel.includes('challengeDurationSeconds') && sessionModel.includes('timerStartedAt') && sessionModel.includes('timerEndsAt'));
check('speed challenge config is written to the server', scheduler.includes('/competition/configure') && scheduler.includes('durationSeconds: challengeTimerSeconds'));
check('student challenge timer restores from server after refresh', studentPage.includes('/challenge-state') && studentPage.includes('deadlineAt=') && examRunner.includes('secondsUntil(deadlineAt)'));
check('expired server challenge blocks answer and final submit', studentRoutes.match(/activeChallengeExpired\(session\)/g)?.length >= 2);
check('competition metadata survives into immutable final report', reportBuilder.includes('competitionEnabled') && reportBuilder.includes('timerEndsAt') && reportBuilder.includes('challengeQuestionIds'));
check('final report freezes top-three competition podium per competitive batch', reportBuilder.includes('buildClassroomCompetitionStandings(batchResponseRows)') && reportBuilder.includes('.slice(0, 3)') && reportBuilder.includes('podium: batch.competitionEnabled ? podium : []'));

console.log(`Smart Classroom live journey contract: PASS (${checks.length}/${checks.length})`);
