import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const route = await read("server/src/routes/taxonomy.routes.ts");
const api = await read("services/apiGroups/taxonomyContentApi.ts");
const adapter = await read("services/adapter.ts");
const app = await read("App.tsx");

const checks = [
  ["taxonomy accepts additive compact phase", route.includes('z.enum(["full", "compact", "core"])')],
  ["compact skills omit unbounded adjacency arrays", route.includes('phase === "compact"') && route.includes('"id pathId subjectId sectionId name description createdAt"')],
  ["full skills retain authoring adjacency arrays", route.includes('"id pathId subjectId sectionId name description lessonIds questionIds createdAt"')],
  ["learning deferred bootstrap uses compact phase", app.includes("getTaxonomyBootstrap('compact')")],
  ["frontend adapters preserve compact phase typing", api.includes('"full" | "compact" | "core"') && adapter.includes('"full" | "compact" | "core"')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Taxonomy compact contract passed (${checks.length} checks).`);
