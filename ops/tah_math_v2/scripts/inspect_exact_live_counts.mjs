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

const totalQ = await db.collection("questions").countDocuments({ subjectId: "sub_1777784609152" });
const appQ = await db.collection("questions").countDocuments({ subjectId: "sub_1777784609152", approvalStatus: "approved" });
const draftQ = await db.collection("questions").countDocuments({ subjectId: "sub_1777784609152", approvalStatus: "draft" });

const holdQ = await db.collection("questions").countDocuments({
  subjectId: "sub_1777784609152",
  approvalStatus: "draft",
  reviewerNotes: { $regex: "HOLD" }
});

const quizzes = await db.collection("quizzes").find({ subjectId: "sub_1777784609152" }).toArray();
const pubDrills = quizzes.filter(q => q.isPublished && q.quizKind !== "standard_test");
const unpubDrills = quizzes.filter(q => !q.isPublished && q.quizKind !== "standard_test");
const stdTests = quizzes.filter(q => q.quizKind === "standard_test");

const versionsPub = await db.collection("assessmentversions").countDocuments({ status: "published" });
const versionsSup = await db.collection("assessmentversions").countDocuments({ status: "superseded" });

console.log("LIVE ATLAS EXACT COUNTS:");
console.log(JSON.stringify({
  totalQuestions: totalQ,
  approvedQuestions: appQ,
  draftQuestions: draftQ,
  holdQuestions: holdQ,
  approvedPercentage: ((appQ / totalQ) * 100).toFixed(1) + "%",
  totalQuizzes: quizzes.length,
  publishedDrills: pubDrills.length,
  unpublishedDrills: unpubDrills.length,
  standardExams: stdTests.length,
  publishedAssessmentVersions: versionsPub,
  supersededAssessmentVersions: versionsSup
}, null, 2));

await client.close();
