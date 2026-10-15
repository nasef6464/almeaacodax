import fs from "node:fs";
import dns from "node:dns";
import { MongoClient } from "../../../server/node_modules/mongodb/lib/index.js";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const envContent = fs.readFileSync("server/.env", "utf8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const client = new MongoClient(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
await client.connect();
const db = client.db("almeaa");

const qApproval = await db.collection("questions").aggregate([
  { $match: { subjectId: "sub_1777784609152" } },
  { $group: { _id: "$approvalStatus", count: { $sum: 1 } } }
]).toArray();
console.log("=== Math Questions approvalStatus in MongoDB Atlas ===");
console.table(qApproval);

const asmVersions = await db.collection("assessmentversions").aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]).toArray();
console.log("\n=== Assessment Versions Status in MongoDB Atlas ===");
console.table(asmVersions);

const drillsPublished = await db.collection("assessments").find({ subjectId: "sub_1777784609152" }).toArray();
console.log(`\nAssessments in 'assessments' collection with subjectId sub_1777784609152: ${drillsPublished.length}`);

// Check if assessments have different subject format
const allAsmCount = await db.collection("assessments").countDocuments();
console.log(`Total assessments in platform: ${allAsmCount}`);

await client.close();
