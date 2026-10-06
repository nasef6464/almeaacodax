import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../server/src/routes/parent.routes.ts", import.meta.url), "utf8");
const start = source.indexOf('"/children-progress"');
const end = source.indexOf('"/weekly-report/send"');
if (start < 0 || end < 0 || end <= start) throw new Error("children-progress route boundary not found");
const route = source.slice(start, end);

const checks = [
  ["uses aggregation for weekly summaries", route.includes("weeklyStudySeconds") && route.includes("$group")],
  ["uses aggregation for latest result", route.includes('score: { $first: "$score" }')],
  ["does not load all historical result documents", !route.includes("QuizResultModel.find")],
  ["preserves weekly minutes response field", route.includes("weeklyStudyMinutes")],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Parent progress bounded-read contract passed (${checks.length} checks).`);
