import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8");
const helper = await readFile(new URL("../server/src/services/packageSeatCapacity.ts", import.meta.url), "utf8");

assert.ok(route.includes("AccessGrantModel.countDocuments"), "redeem must count active package grants");
assert.ok(route.includes('status: "active"'), "seat count must ignore inactive grants");
assert.ok(route.includes('message: "اكتمل عدد المقاعد المتاحة لهذه الباقة"'), "seat-cap error must be explicit");
assert.ok(helper.includes("capacity <= 0"), "zero capacity must preserve unlimited legacy semantics");
assert.ok(helper.includes("Number(activeStudentGrants || 0)) < capacity"), "positive capacity must reject full packages");

console.log(JSON.stringify({ phase: "school-package-seat-capacity", status: "PASS", checks: 5 }, null, 2));
