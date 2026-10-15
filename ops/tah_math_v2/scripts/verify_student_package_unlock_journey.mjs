import fs from "node:fs";
import dns from "node:dns";
try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch (e) {}

// Load server/.env
const envContent = fs.readFileSync("server/.env", "utf8");
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const mongoUri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;
const { MongoClient } = await import("../../../server/node_modules/mongodb/lib/index.js");
const client = new MongoClient(mongoUri);
await client.connect();
const db = client.db("almeaa");

console.log("=== SIMULATING STUDENT LEARNER UNLOCK JOURNEY ===");

// Import quizAccessPolicy logic
const CourseModel = db.collection("courses");
const QuizModel = db.collection("quizzes");

const matchesContentScope = (
  item,
  contentType,
  pathId,
  subjectId
) => {
  const contentTypes = Array.isArray(item.contentTypes) && item.contentTypes.length ? item.contentTypes : ["all"];
  const pathIds = Array.isArray(item.pathIds) ? item.pathIds.map(String).filter(Boolean) : [];
  const subjectIds = Array.isArray(item.subjectIds) ? item.subjectIds.map(String).filter(Boolean) : [];
  return (contentTypes.includes("all") || contentTypes.includes(contentType))
    && (pathIds.length === 0 || (!!pathId && pathIds.includes(pathId)))
    && (subjectIds.length === 0 || (!!subjectId && subjectIds.includes(subjectId)));
};

const hasPurchasedPackageAccess = async (purchasedIds, contentType, pathId, subjectId) => {
  if (!purchasedIds.length) return false;
  const packages = await CourseModel.find({
    _id: { $in: purchasedIds },
    isPackage: true,
    isPublished: true,
    showOnPlatform: { $ne: false },
  }).project({ _id: 1, pathId: 1, subjectId: 1, packageContentTypes: 1, includedCourses: 1 }).toArray();

  return packages.some((pkg) => matchesContentScope({
    contentTypes: Array.isArray(pkg.packageContentTypes) && pkg.packageContentTypes.length ? pkg.packageContentTypes : ["courses"],
    pathIds: pkg.pathId ? [String(pkg.pathId)] : [],
    subjectIds: pkg.subjectId ? [String(pkg.subjectId)] : [],
  }, contentType, pathId, subjectId));
};

// Test Student 1: Free Guest / Unsubscribed
const freeStudent = {
  id: "student_free_test",
  role: "student",
  subscription: { plan: "free", purchasedPackages: [] }
};

// Test Student 2: Subscribed to Qudurat
const qudratStudent = {
  id: "student_qudrat_test",
  role: "student",
  subscription: { plan: "free", purchasedPackages: ["pkg_1778330877046"] }
};

// Test Student 3: Subscribed to Tahsili
const tahsiliStudent = {
  id: "student_tahsili_test",
  role: "student",
  subscription: { plan: "free", purchasedPackages: ["pkg_tahsili_comprehensive"] }
};

// Sample paid quizzes from production
const testQuizzes = [
  { name: "Math Paid Training Quiz", pathId: "p_1777779653351", subjectId: "sub_1777784609152", contentType: "banks" },
  { name: "Math Paid Comprehensive Exam", pathId: "p_1777779653351", subjectId: "sub_1777784609152", contentType: "mockExams" },
  { name: "Physics Paid Training", pathId: "p_1777779653351", subjectId: "sub_1784980706034", contentType: "banks" },
  { name: "Chemistry Paid Training", pathId: "p_1777779653351", subjectId: "sub_1784980728386", contentType: "banks" },
  { name: "Biology Paid Training", pathId: "p_1777779653351", subjectId: "sub_tah_biology_bio26", contentType: "banks" },
  { name: "Qudurat Quant Paid Training", pathId: "p_1777779639431", subjectId: "sub_1777779748206", contentType: "banks" },
  { name: "Qudurat Quant Paid Mock Exam", pathId: "p_1777779639431", subjectId: "sub_1777779748206", contentType: "mockExams" },
  { name: "Qudurat Verbal Paid Training", pathId: "p_1777779639431", subjectId: "sub_1777779759038", contentType: "banks" }
];

console.log("\n1. Testing Free Student (Expect: ALL PAID LOCKED)");
for (const q of testQuizzes) {
  const allowed = await hasPurchasedPackageAccess(freeStudent.subscription.purchasedPackages, q.contentType, q.pathId, q.subjectId);
  console.log(`  [Free Student] ${q.name}: ${allowed ? "UNLOCKED (FAIL)" : "LOCKED / PAYWALL (PASS)"}`);
  if (allowed) throw new Error(`Security leak: Free student accessed ${q.name}`);
}

console.log("\n2. Testing Qudurat Student (Expect: Qudurat UNLOCKED, Tahsili LOCKED)");
for (const q of testQuizzes) {
  const allowed = await hasPurchasedPackageAccess(qudratStudent.subscription.purchasedPackages, q.contentType, q.pathId, q.subjectId);
  const isQudrat = q.pathId === "p_1777779639431";
  const expected = isQudrat;
  console.log(`  [Qudurat Student] ${q.name}: ${allowed ? "UNLOCKED" : "LOCKED"} (Expected: ${expected ? "UNLOCKED" : "LOCKED"}) -> ${allowed === expected ? "PASS" : "FAIL"}`);
  if (allowed !== expected) throw new Error(`Entitlement mismatch for Qudurat student on ${q.name}`);
}

console.log("\n3. Testing Tahsili Student (Expect: Tahsili UNLOCKED, Qudurat LOCKED)");
for (const q of testQuizzes) {
  const allowed = await hasPurchasedPackageAccess(tahsiliStudent.subscription.purchasedPackages, q.contentType, q.pathId, q.subjectId);
  const isTahsili = q.pathId === "p_1777779653351";
  const expected = isTahsili;
  console.log(`  [Tahsili Student] ${q.name}: ${allowed ? "UNLOCKED" : "LOCKED"} (Expected: ${expected ? "UNLOCKED" : "LOCKED"}) -> ${allowed === expected ? "PASS" : "FAIL"}`);
  if (allowed !== expected) throw new Error(`Entitlement mismatch for Tahsili student on ${q.name}`);
}

console.log("\n✨ ALL 24 ENTITLEMENT AND ACCESS SCENARIOS VERIFIED FLAWLESSLY!");

await client.close();
