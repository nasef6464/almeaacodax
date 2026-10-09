// Isolated regression gate. Reads source only: no database, network or credentials.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("server/src/modules/content/http/contentGroupRoutes.ts", "utf8");
const start = source.indexOf("contentGroupRouter.patch(");
const end = source.indexOf("contentGroupRouter.delete(", start);
assert.ok(start >= 0 && end > start, "Group PATCH route must exist");
const patchRoute = source.slice(start, end);

assert.match(patchRoute, /hasGroupManagementScope/, "Existing group scope must be checked");
assert.match(patchRoute, /role\\s*===\\s*["']supervisor["']/, "Supervisor updates need a dedicated privilege check");
for (const field of ["ownerId", "supervisorIds", "type", "parentId"]) {
  assert.ok(patchRoute.includes(field), `Supervisor mutation guard must cover ${field}`);
}
assert.match(patchRoute, /StatusCodes\\.FORBIDDEN/, "Privileged supervisor mutations must be rejected");
console.log("PASS: supervisor group mutation boundary contract");
