import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../dashboards/admin/AdminDashboard.tsx", import.meta.url), "utf8");

const checks = [];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
};

const menuSectionStart = source.indexOf("const menuItems = useMemo(() =>");
const menuSectionEnd = source.indexOf("const enhancedMenuItems = useMemo(() =>");
const menuSection = source.slice(menuSectionStart, menuSectionEnd);
const baseMenuIds = [...menuSection.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

const switchSectionStart = source.indexOf("const renderContent = () =>");
const switchSectionEnd = source.indexOf("return (", switchSectionStart);
const switchSection = source.slice(switchSectionStart, switchSectionEnd);
const caseIds = [...switchSection.matchAll(/case\s*'([^']+)'/g)].map((m) => m[1]);

const missingCases = [...new Set(baseMenuIds)].filter((id) => !caseIds.includes(id));

check("all base admin menu tabs are wired in renderContent switch", () => {
  assert(missingCases.length === 0, `Missing renderContent cases for tabs: ${missingCases.join(", ")}`);
});

check("notifications tab is wired to NotificationsManager", () => {
  assert(switchSection.includes("case 'notifications':"), "notifications tab is missing in renderContent switch");
  assert(source.includes("const NotificationsManager ="), "NotificationsManager lazy import is missing");
  assert(switchSection.includes("return <NotificationsManager />;"), "notifications tab does not render NotificationsManager");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length > 0) {
  process.exit(1);
}
