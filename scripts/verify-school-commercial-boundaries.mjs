// Isolated source contract: no database, network, secrets or production writes.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("server/src/modules/content/http/contentSchoolCommercialRoutes.ts", "utf8");
function routeBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Cannot locate route: ${start}`);
  return source.slice(from, to);
}

const createCode = routeBetween('"/access-codes",', '"/access-codes/:id",');
assert.match(createCode, /B2BPackageModel\.findOne/, "Code creation must resolve its package");
assert.match(createCode, /linkedPackage\.schoolId[\s\S]*payload\.schoolId|payload\.schoolId[\s\S]*linkedPackage\.schoolId/, "Code creation must compare package and code schools");

const updateCode = routeBetween('"/access-codes/:id",', 'contentSchoolCommercialRouter.delete(');
assert.match(updateCode, /hasSchoolIdManagementScope[\s\S]*payload\.schoolId|payload\.schoolId[\s\S]*hasSchoolIdManagementScope/, "Code updates must validate the destination school");
assert.match(updateCode, /B2BPackageModel\.findOne/, "Code updates must validate destination package ownership");

console.log("PASS: school commercial code boundaries");
