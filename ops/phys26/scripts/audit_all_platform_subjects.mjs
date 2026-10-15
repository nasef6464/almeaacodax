import fs from "node:fs";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch (e) {}
const env = fs.readFileSync("server/.env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("almeaa");

  const subjects = await db.collection("subjects").find({}).toArray();
  console.log(`Found ${subjects.length} subjects in platform:\n`);

  for (const s of subjects) {
    const subId = String(s.id || s._id);
    const qCount = await db.collection("questions").countDocuments({ subjectId: subId });
    const appQ = await db.collection("questions").countDocuments({ subjectId: subId, approvalStatus: "approved" });
    const draftQ = await db.collection("questions").countDocuments({ subjectId: subId, approvalStatus: "draft" });
    const quizCount = await db.collection("quizzes").countDocuments({ subjectId: subId });
    const pubQuiz = await db.collection("quizzes").countDocuments({ subjectId: subId, isPublished: true });

    console.log(`- ${s.name || s.title} (ID: ${subId}, code: ${s.code}):`);
    console.log(`  Questions: ${qCount} (Approved: ${appQ}, Draft: ${draftQ})`);
    console.log(`  Quizzes:   ${quizCount} (Published: ${pubQuiz})\n`);
  }

  await client.close();
}
main().catch(console.error);
