import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8");
const grantService = await readFile(new URL("../server/src/services/accessGrantService.ts", import.meta.url), "utf8");

assert.ok(route.includes("expiresAt: Number(reservedAccessCode.expiresAt || 0) || null"), "redeemed school grant must inherit access-code expiry");
assert.ok(route.includes("reservedAccessCode.expiresAt"), "grant expiry must use the atomically reserved code");
assert.ok(grantService.includes("expiresAt: payload.expiresAt || null"), "grant service must persist expiry");
assert.ok(route.includes('linkedPackage.status !== "active"'), "inactive school packages remain blocked at redemption");

console.log(JSON.stringify({ phase: "school-grant-expiry", status: "PASS", checks: 4 }, null, 2));
