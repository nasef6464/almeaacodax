import { readFile } from "node:fs/promises";
const read=(p)=>readFile(new URL(`../${p}`,import.meta.url),"utf8");
const [b,m,u,a,c,t,co,ad,cr,pr,ret]=await Promise.all([
 read("server/src/modules/database/dbGrowthBudgets.ts"),read("server/src/services/lessonProgressMirror.ts"),read("server/src/models/User.ts"),read("server/src/modules/auth/http/authSchemas.ts"),
 read("server/src/models/ClassroomSession.ts"),read("server/src/routes/classroom/registerClassroomTeacherRoutes.ts"),read("server/src/models/Course.ts"),read("server/src/models/AnnouncementAd.ts"),
 read("server/src/routes/course.routes.ts"),read("server/src/modules/content/http/platformPresentationSchemas.ts"),read("docs/architecture/PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md")
]);const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
for(const x of ["legacyCompletedLessons","interactiveVideoProgressRows","answeredQuestionIdsPerLesson","classroomSessionQuestions","courseDocumentBytes","announcementDocumentBytes"])assert(b.includes(x),`budget missing ${x}`);
assert(m.includes("answeredQuestionIdsPerLesson")&&m.includes(".slice(-DB_GROWTH_BUDGETS"),"mirror unbounded");
assert(u.includes("legacyCompletedLessons")&&u.includes("interactiveVideoProgressRows"),"User progress budget missing");
assert(a.includes("answeredQuestionIdsPerLesson")&&a.includes("interactiveVideoProgressRows"),"HTTP progress limits drifted");
assert(c.includes("classroomSessionQuestions")&&c.includes("classroomSessionDocumentBytes"),"Classroom budget missing");
assert(t.includes("classroomSessionQuestions")&&t.includes("الحد الأقصى للحصة"),"append total ceiling missing");
assert(co.includes("courseDocumentBytes")&&ad.includes("announcementDocumentBytes"),"admin document budgets missing");
assert(cr.includes("inlineAdminMediaChars")&&pr.includes("inlineAdminMediaChars"),"inline media ceiling missing");
assert(ret.includes("must not invent destructive expiry periods"),"retention policy gate missing");
console.log("PASS DB-4 high-volume growth budget contract");
