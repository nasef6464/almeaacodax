import { readFile } from "node:fs/promises";
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const [lesson,audit,cleanup]=await Promise.all([
  read("server/src/models/LessonProgress.ts"),
  read("server/src/scripts/db3IndexAudit.ts"),
  read("server/src/scripts/db3ExactDuplicateIndexCleanup.ts"),
]);
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
assert(lesson.includes('name: "user_lesson_unique"') && lesson.includes('unique: true'),"LessonProgress canonical unique index name missing");
assert(lesson.includes('name: "user_course_completed"'),"LessonProgress course/completion canonical index name missing");
assert(lesson.includes('name: "user_updated"'),"LessonProgress updated index canonical name missing");
assert(audit.includes("listIndexes") && audit.includes("exactDuplicateKeyPatterns") && audit.includes("readOnly: true"),"DB-3 read-only index inventory missing");
assert(cleanup.includes('const APPLY = process.argv.includes("--apply")'),"DB-3 cleanup must be dry-run by default");
assert(cleanup.includes('const ROLLBACK = process.argv.includes("--rollback")'),"DB-3 rollback mode missing");
assert(cleanup.includes("canonical.unique !== true"),"DB-3 cleanup must verify canonical uniqueness");
assert(cleanup.includes("safeExactDuplicateCandidate"),"DB-3 cleanup exact-key containment missing");
assert(!cleanup.includes("dropIndexes("),"bulk index deletion forbidden");
console.log("PASS DB-3 query/index engineering contract");
