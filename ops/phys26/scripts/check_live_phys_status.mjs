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

  const subject = await db.collection("subjects").findOne({
    $or: [{ id: "sub_1784980706034" }, { _id: "sub_1784980706034" }, { code: "TAH-PHYS" }, { name: "الفيزياء" }]
  });
  console.log("Subject:", subject?.name || subject?.title || "Not found", "(ID:", subject?.id || subject?._id, ")");

  const subId = subject?.id || subject?._id || "sub_1784980706034";

  const qCount = await db.collection("questions").countDocuments({ subjectId: subId });
  const approvedQ = await db.collection("questions").countDocuments({ subjectId: subId, approvalStatus: "approved" });
  const draftQ = await db.collection("questions").countDocuments({ subjectId: subId, approvalStatus: "draft" });

  const quizCount = await db.collection("quizzes").countDocuments({ subjectId: subId });
  const publishedQuizzes = await db.collection("quizzes").countDocuments({ subjectId: subId, isPublished: true });

  const sections = await db.collection("learningsections").countDocuments({ subjectId: subId });
  const skills = await db.collection("skills").countDocuments({ subjectId: subId });

  console.log({
    subjectId: subId,
    totalQuestions: qCount,
    approvedQuestions: approvedQ,
    draftQuestions: draftQ,
    totalQuizzes: quizCount,
    publishedQuizzes: publishedQuizzes,
    sections: sections,
    skills: skills
  });

  await client.close();
}
main().catch(console.error);
