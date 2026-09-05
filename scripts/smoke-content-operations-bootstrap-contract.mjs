import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const server = await read("server/src/routes/content.routes.ts");
const operationalData = await read("server/src/modules/content/infrastructure/contentBootstrapOperationalData.ts");
const api = await read("services/apiGroups/taxonomyContentApi.ts");
const schools = await read("dashboards/admin/SchoolsManager.tsx");
const schoolRosterBootstrap = await read("dashboards/admin/SchoolsManager/useSchoolRosterBootstrap.ts");
const schoolWorkspaceRefresh = await read("dashboards/admin/SchoolsManager/useSchoolWorkspaceRefresh.ts");

const checks = [
  ["operations scope is explicitly supported", server.includes('z.enum(["full", "learning", "operations"])')],
  ["operations scope skips learning content reads", server.includes("isOperationsOnly ? Promise.resolve([])")],
  ["bootstrap delegates scoped operational reads", server.includes("getScopedContentBootstrapOperationalData(req.authUser)")],
  ["operational reader preserves role-scoped query branches", operationalData.includes('authUser?.role === "admin"') && operationalData.includes('user.role === "supervisor"') && operationalData.includes('user.role === "parent"')],
  ["operational reader preserves public announcement limit", operationalData.includes("PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT = 8") && operationalData.includes("getPublicAnnouncementAds")],
  ["operations scope preserves operational response shape", api.includes("getOperationalBootstrapFresh") && api.includes('scope: "operations"')],
  ["schools manager uses operational bootstrap", schoolRosterBootstrap.includes("api.getOperationalBootstrapFresh()") && !schoolRosterBootstrap.includes("api.getContentBootstrapFresh()") && schools.includes("useSchoolRosterBootstrap")],
  ["school workspace refresh owns server verification", schoolWorkspaceRefresh.includes("api.getOperationalBootstrapFresh()") && schoolWorkspaceRefresh.includes("api.clearContentBootstrapCache()") && schoolWorkspaceRefresh.includes("loadSchoolAdminUsers()") && schools.includes("useSchoolWorkspaceRefresh")],
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Content operations bootstrap contract passed (${checks.length} checks).`);
