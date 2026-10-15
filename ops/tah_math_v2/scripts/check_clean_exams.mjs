import fs from "node:fs";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch(e){}
const env = fs.readFileSync("server/.env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const client = new MongoClient(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
await client.connect();
const db = client.db("almeaa");

const holdIds = new Set([
  "q_tahmath_v2_col26_p005_q02",
  "TAH-MATH-V2-COL26-P005-Q02",
  "q_tahmath_v2_col26_p006_q15",
  "TAH-MATH-V2-COL26-P006-Q15",
  "q_tahmath_v2_col26_p131_q06",
  "TAH-MATH-V2-COL26-P131-Q06",
  "q_tahmath_v2_col26_p132_q29",
  "TAH-MATH-V2-COL26-P132-Q29",
  "q_tahmath_v2_col26_p132_q30",
  "TAH-MATH-V2-COL26-P132-Q30",
  "q_tahmath_v2_col26old_p129_q87",
  "TAH-MATH-V2-COL26OLD-P129-Q87",
  "q_tahmath_v2_col26old_p130_q105",
  "TAH-MATH-V2-COL26OLD-P130-Q105",
  "q_tahmath_v2_col26old_p055_q42",
  "TAH-MATH-V2-COL26OLD-P055-Q42"
]);

const exams = await db.collection("quizzes").find({
  subjectId: "sub_1777784609152",
  title: { $regex: "اختبار شامل" }
}).toArray();

console.log("Total comprehensive exams:", exams.length);

let cleanExams = 0;
let blockedExams = 0;
const cleanExamList = [];
const blockedExamList = [];

for (const ex of exams) {
  const matchingHolds = (ex.questionIds || []).filter(id => holdIds.has(id));
  if (matchingHolds.length > 0) {
    blockedExams++;
    blockedExamList.push({ id: ex._id, title: ex.title, holds: matchingHolds });
  } else {
    cleanExams++;
    cleanExamList.push(ex._id);
  }
}

console.log("Comprehensive exams breakdown:", { cleanExams, blockedExams });
if (blockedExamList.length > 0) {
  console.log("Blocked exams sample:", blockedExamList);
}

await client.close();
