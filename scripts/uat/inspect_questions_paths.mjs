import mongoose from "mongoose";
import fs from "fs";

let mongoUri = "";
if (fs.existsSync("server/.env")) {
  const envContent = fs.readFileSync("server/.env", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    if (line.startsWith("MONGODB_URI=")) {
      mongoUri = line.slice("MONGODB_URI=".length).trim().replace(/^["']|["']$/g, "");
    }
  }
}

await mongoose.connect(mongoUri);
console.log("Connected to MongoDB Atlas!");

const questionCount = await mongoose.connection.collection("questions").countDocuments();
console.log(`Total questions in questions collection: ${questionCount}`);

const sampleQuestions = await mongoose.connection.collection("questions").find().limit(3).toArray();
for (const q of sampleQuestions) {
  console.log(`- Question [${q.id || q._id}]: ${q.text?.slice(0, 40)} | Path: ${q.pathId} | Subject: ${q.subjectId}`);
}

const pathCount = await mongoose.connection.collection("paths").countDocuments();
const samplePaths = await mongoose.connection.collection("paths").find().limit(3).toArray();
console.log(`Total paths: ${pathCount}`);
for (const p of samplePaths) {
  console.log(`- Path [${p.id || p._id}]: ${p.name}`);
}

await mongoose.disconnect();
