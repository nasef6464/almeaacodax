import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const check = (name, value) => checks.push({ name, value });

const barcodeRoute = read("server/src/routes/publicTests.routes.ts");
const barcodeScope = read("server/src/modules/public-tests/application/publicBarcodeTestScope.ts");
const socketServer = read("server/src/sockets/index.ts");
const socketPolicy = read("server/src/sockets/workspaceAuthorization.ts");
const activityRoute = read("server/src/routes/activity.routes.ts");
const bookingUi = read("dashboards/admin/LiveSessionsManager.tsx");
const packageJson = JSON.parse(read("package.json"));

check("barcode list uses a server-side scope filter", barcodeRoute.includes("resolvePublicBarcodeScopeFilter(req.authUser!)"));
check("barcode live control uses a server-side scope filter", barcodeRoute.includes("$and: [{ id }, await resolvePublicBarcodeScopeFilter(req.authUser!)]"));
check("barcode report uses a server-side scope filter", barcodeRoute.includes("$and: [{ id: req.params.id }, await resolvePublicBarcodeScopeFilter(req.authUser!)]"));
check("barcode owner is server-derived", barcodeRoute.includes("resolvePublicBarcodeTestOwner(req.authUser!)"));
check("barcode scope is fail-closed", barcodeScope.includes("{ _id: { $exists: false } }"));
check("socket handshake validates JWT", socketServer.includes("verifyAccessToken(token)"));
check("socket workspace joins call authorization policy", socketServer.includes("canJoinAuthorizedWorkspace(socket.data.authUser, workspaceId"));
check("socket policy rejects unrecognized room shapes", socketPolicy.includes("if (!match) return false"));
check("platform-only bookings are admin-only on the server", activityRoute.includes('requireRole(["admin"])'));
check("non-admin session UI hides platform booking queue", bookingUi.includes("canManagePlatformBookings"));
check("G0 runtime policy smoke is wired", packageJson.scripts?.["smoke:smart-classroom-g0"] === "npm --prefix server run verify:smart-classroom-g0 && node scripts/smoke-smart-classroom-g0-contract.mjs");

const failed = checks.filter((check) => !check.value);
for (const check of checks) console.log(`${check.value ? "PASS" : "FAIL"} ${check.name}`);
if (failed.length) process.exit(1);
