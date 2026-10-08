// Isolated static regression gate. No database, network, credentials or production writes.
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const redemption = readFileSync("server/src/routes/auth.routes.ts", "utf8");
const commercial = readFileSync(
  "server/src/modules/content/http/contentSchoolCommercialRoutes.ts",
  "utf8",
);

const reservation = redemption.match(
  /const reservedAccessCode = await AccessCodeModel\.findOneAndUpdate\(\s*\{([\s\S]*?)\},\s*\{ \$inc: \{ currentUses: 1 \} \}/,
)?.[1];
assert.ok(reservation, "Cannot locate access-code reservation query");
assert.match(
  reservation,
  /_id\s*:\s*accessCode\._id/,
  "Reservation must target the exact access-code document that was validated",
);

const redemptionGuard = redemption.slice(
  redemption.indexOf("const linkedPackage = await B2BPackageModel.findOne"),
  redemption.indexOf("const reservedAccessCode = await AccessCodeModel.findOneAndUpdate"),
);
assert.match(
  redemptionGuard,
  /accessCode\.schoolId[\s\S]*linkedPackage\.schoolId|linkedPackage\.schoolId[\s\S]*accessCode\.schoolId/,
  "Validate code/package school identity before consuming an activation",
);

const createCode = commercial.slice(
  commercial.indexOf('"/access-codes",'),
  commercial.indexOf('"/access-codes/:id",'),
);
assert.match(
  createCode,
  /B2BPackageModel/,
  "Code creation must resolve its package to validate school ownership",
);

console.log("PASS: access-code reservation and school boundary guards");
