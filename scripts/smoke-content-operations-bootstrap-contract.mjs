import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const server = await read("server/src/routes/content.routes.ts");
const api = await read("services/apiGroups/taxonomyContentApi.ts");
const schools = await read("dashboards/admin/SchoolsManager.tsx");

const checks = [
  ["operations scope is explicitly supported", server.includes('z.enum(["full", "learning", "operations"])')],
  ["operations scope skips learning content reads", server.includes("isOperationsOnly ? Promise.resolve([])")],
  ["operations scope preserves operational response shape", api.includes("getOperationalBootstrapFresh") && api.includes('scope: "operations"')],
  ["schools manager uses operational bootstrap", schools.includes("api.getOperationalBootstrapFresh()") && !schools.includes("api.getContentBootstrapFresh()")],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Content operations bootstrap contract passed (${checks.length} checks).`);
