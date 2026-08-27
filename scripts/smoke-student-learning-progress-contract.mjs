import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];
const add = (name, ok, detail = "") => checks.push({ name, ok, detail });

const learningSection = read("components/LearningSection.tsx");
const store = read("store/useStore.ts");
const learningProgressSlice = read("store/slices/learningProgressSlice.ts");
const api = read("services/api.ts");
const authRoutes = read("server/src/routes/auth.routes.ts");

add(
  "Learning topic progress is no longer a fixed demo zero",
  !learningSection.includes("Dummy progress") && !learningSection.includes("const progress = 0"),
);
add(
  "Learning topic progress reads completed lessons and quiz results",
  learningSection.includes("completedLessons") &&
    learningSection.includes("examResults") &&
    learningSection.includes("getTopicProgressStats"),
);
add(
  "Marking a lesson complete syncs completed lessons to the account",
  store.includes("createLearningProgressSlice") &&
    learningProgressSlice.includes("completedLessons: nextCompletedLessons") &&
    learningProgressSlice.includes("api.updateMyPreferences") &&
    learningProgressSlice.includes("completedLessons: nextCompletedLessons"),
);
add(
  "Client preferences API accepts completed lessons",
  api.includes("completedLessons?: string[]") &&
    api.includes("/auth/me/preferences"),
);
add(
  "Backend preferences endpoint persists completed lessons",
  authRoutes.includes("completedLessons: z.array(z.string()).optional()") &&
    authRoutes.includes("update.completedLessons = Array.from(new Set(payload.completedLessons))"),
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
}

if (failed.length) {
  console.error(`\n${failed.length} student learning progress contract checks failed.`);
  process.exit(1);
}

console.log("\nStudent learning progress contract passed.");
