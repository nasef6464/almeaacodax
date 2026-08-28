import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const operations = await read("server/src/routes/operations.routes.ts");
const content = await read("server/src/routes/content.routes.ts");
const statusStart = operations.indexOf('operationsRouter.get("/status"');
const statusEnd = operations.indexOf('operationsRouter.get("/audit"');
const status = operations.slice(statusStart, statusEnd > statusStart ? statusEnd : undefined);
const adminDataStart = content.indexOf('if (authUser?.role === "admin")');
const adminDataEnd = content.indexOf('if (!authUser)', adminDataStart);
const adminData = content.slice(adminDataStart, adminDataEnd);

const checks = [
  ["operations status uses lean documents", (status.match(/\.lean\(\)/g) || []).length >= 7],
  ["operations status keeps explicit projections", status.includes("OPERATIONS_STATUS_PATH_SELECT") && status.includes("OPERATIONS_STATUS_LIBRARY_SELECT")],
  ["admin school operational bootstrap uses lean documents", (adminData.match(/\.lean\(\)/g) || []).length === 4],
  ["operations response remains cached and scoped", operations.includes("cachedOperationsStatus") && operations.includes('requireRole(["admin"])')],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Operations read-memory contract passed (${checks.length} checks).`);
