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

  const sciences = [
    { name: "الفيزياء", id: "sub_1784980706034" },
    { name: "الكيمياء", id: "sub_1784980728386" },
    { name: "الأحياء", id: "sub_tah_biology_bio26" }
  ];

  for (const s of sciences) {
    const totalQz = await db.collection("quizzes").countDocuments({ subjectId: s.id });
    const sample = await db.collection("quizzes").findOne({ subjectId: s.id });
    const withPlacements = await db.collection("quizzes").countDocuments({
      subjectId: s.id,
      learningPlacements: { $exists: true, $ne: [] }
    });
    const showOnPlatform = await db.collection("quizzes").countDocuments({
      subjectId: s.id,
      showOnPlatform: true
    });

    console.log(`=== ${s.name} (${s.id}) ===`);
    console.log(`Total Quizzes: ${totalQz}`);
    console.log(`With learningPlacements: ${withPlacements}`);
    console.log(`showOnPlatform=true: ${showOnPlatform}`);
    console.log(`Sample:`, {
      id: sample?._id,
      title: sample?.title,
      sectionId: sample?.sectionId,
      skillId: sample?.skillId,
      placements: sample?.learningPlacements
    });
    console.log();
  }

  await client.close();
}
main().catch(console.error);
