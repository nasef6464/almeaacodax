import dotenv from "dotenv";
dotenv.config();
import { MongoClient } from "mongodb";

async function check() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const quiz = await db.collection("quizzes").findOne({ id: "exam_mnsf26_mock_02" });
  console.log("=== MOCK EXAM 02 VERIFICATION ===");
  console.log("Quiz ID:", quiz?.id);
  console.log("Quiz Title:", quiz?.title);

  const qIds: string[] = quiz?.questionIds || [];
  console.log(`Total Questions in mock 02: ${qIds.length}`);

  const questions = await db.collection("questions").find({ id: { $in: qIds } }).toArray();
  console.log(`Found ${questions.length} questions in database for mock 02.`);

  let withImages = 0;
  let embeddedCount = 0;
  let verifiedCrops = 0;

  for (const q of questions) {
    if (q.imageUrl && q.imageUrl.startsWith("https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/")) {
      withImages++;
    }
    if (q.optionsEmbeddedInImage === true) {
      embeddedCount++;
    }
    if (q.cropStatus === "VERIFIED") {
      verifiedCrops++;
    }
  }

  console.log(`Images with verified R2 public URL: ${withImages} / ${questions.length}`);
  console.log(`Questions with optionsEmbeddedInImage=true: ${embeddedCount} / ${questions.length}`);
  console.log(`Questions with cropStatus="VERIFIED": ${verifiedCrops} / ${questions.length}`);

  // Inspect question 1 (the one in the user screenshot)
  const q1Id = qIds[0];
  const q1 = questions.find((q) => q.id === q1Id);
  console.log("\n--- QUESTION 1 DETAILS ---");
  console.log("ID:", q1?.id);
  console.log("Code:", q1?.questionCode);
  console.log("Text:", q1?.text);
  console.log("Image URL:", q1?.imageUrl);
  console.log("optionsEmbeddedInImage:", q1?.optionsEmbeddedInImage);

  // Check HTTP status of question 1 image
  if (q1?.imageUrl) {
    const res = await fetch(q1.imageUrl);
    console.log("HTTP Status of Question 1 image:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    console.log("Content-Length:", res.headers.get("content-length"));
  }

  // Also check Mock 01
  const mock01 = await db.collection("quizzes").findOne({ id: "exam_mnsf26_mock_01" });
  const mock01QIds: string[] = mock01?.questionIds || [];
  const mock01Questions = await db.collection("questions").find({ id: { $in: mock01QIds } }).toArray();
  const mock01WithImages = mock01Questions.filter((q) => q.imageUrl && q.imageUrl.startsWith("https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/")).length;
  console.log("\n--- MOCK EXAM 01 DETAILS ---");
  console.log(`Found ${mock01Questions.length} questions for mock 01.`);
  console.log(`Images with verified R2 public URL in mock 01: ${mock01WithImages} / ${mock01Questions.length}`);

  await client.close();
}

check().catch(console.error);
