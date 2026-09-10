import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const check = (name, condition) => { checks.push({ name, pass: Boolean(condition) }); assert.ok(condition, name); };

const routes = read("server/src/routes/classroom.routes.ts");
const projection = read("server/src/modules/schools/application/classroomQuestionProjection.ts");
const teacher = read("pages/ClassroomTeacherConsole.tsx");
const student = read("pages/ClassroomStudentLive.tsx");
const projector = read("pages/ClassroomProjectorView.tsx");
const realtime = read("hooks/useClassroomRealtime.ts");
const app = read("App.tsx");

check("session creation requires SMART_CLASSROOM entitlement", routes.includes('resolveSchoolEntitlement(payload.schoolId, "SMART_CLASSROOM")'));
check("session creation requires an active teaching assignment", routes.includes('TeachingAssignmentModel.exists'));
check("student must join before reading a question", routes.includes('Join the session before viewing questions'));
check("student answer validates option range", routes.includes('payload.selectedOptionIndex >= question.options.length'));
check("responses use a single upsert identity", routes.includes('findOneAndUpdate') && routes.includes('sessionId: sessionId(session), questionId: question.questionId, studentId: req.authUser!.id'));
check("student projection excludes correctOptionIndex", !projection.includes("correctOptionIndex"));
check("teacher console creates a session from existing question bank", teacher.includes("createClassroomSession") && teacher.includes("getClassroomQuestions"));
check("teacher console publishes a selected session question", teacher.includes("publish(question.index)"));
check("student surface waits after joining until a question is published", student.includes("بانتظار المعلم لنشر السؤال التالي"));
check("projector displays aggregate responses only", projector.includes("responseCount") && projector.includes("distribution") && !projector.includes("student"));
check("realtime joins only the current classroom workspace", realtime.includes('workspace:join') && realtime.includes('classroom:${sessionId}'));
check("all three product surfaces have stable routes", app.includes('path="/classroom/teacher"') && app.includes('path="/classroom/:sessionId"') && app.includes('path="/classroom/:sessionId/projector"'));

console.log(`Smart Classroom G2 UI/API contract: PASS (${checks.length}/${checks.length})`);
