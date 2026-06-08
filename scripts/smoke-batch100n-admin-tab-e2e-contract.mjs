import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const adminDashboard = read("dashboards/admin/AdminDashboard.tsx");
const packageJson = read("package.json");

const checks = [];
const check = (label, pass) => checks.push([label, Boolean(pass)]);
const includes = (needle) => adminDashboard.includes(needle);

check("AdminDashboard imports useCallback", includes("useCallback, useEffect, useMemo, useState"));
check("AdminDashboard defines setActiveAdminTab helper", includes("const setActiveAdminTab = useCallback"));
check("setActiveAdminTab updates normalized tab state", includes("setActiveTab(normalizedTabId);"));
check("setActiveAdminTab persists normalized tab in URL search params", includes("url.searchParams.set('tab', normalizedTabId)"));
check("setActiveAdminTab preserves current hash while replacing URL", includes("window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)"));
check("Sidebar buttons use URL-aware tab navigation", includes("onClick={() => setActiveAdminTab(item.id)}"));
check("Sidebar buttons no longer use state-only navigation", !includes("onClick={() => setActiveTab(item.id)}"));
check("Admin action buttons no longer use state-only navigation", !/onClick=\{\(\) => setActiveTab\(/.test(adminDashboard));
check("Supervisor quiz shortcut uses URL-aware navigation", includes("action: () => setActiveAdminTab('quizzes')"));
check("Supervisor school portal shortcuts use URL-aware navigation", includes("action: () => setActiveAdminTab('school-portal')"));

const requiredTabs = [
  "overview",
  "paths",
  "lessons",
  "library",
  "quizzes",
  "mock-exams",
  "questions",
  "skills",
  "users",
  "schools",
  "school-portal",
  "financial",
  "notifications",
  "homepage",
  "announcement-ads",
  "platform-fonts",
  "platform-integrations",
  "live-sessions",
  "backups",
  "monitoring",
  "ai-assistant",
  "settings",
];

for (const tab of requiredTabs) {
  check(`Admin tab ${tab} has render case`, includes(`case '${tab}':`));
}

check("Homepage tab remains in admin enhanced menu", includes("{ id: 'homepage'"));
check("Announcement ads tab remains in admin enhanced menu", includes("{ id: 'announcement-ads'"));
check("Platform fonts tab remains in admin enhanced menu", includes("{ id: 'platform-fonts'"));
check("Platform integrations tab remains in admin enhanced menu", includes("{ id: 'platform-integrations'"));
check("Live sessions tab remains available for admin/teacher/supervisor", includes("{ id: 'live-sessions'"));
check("Unknown/disallowed active tabs fall back to available menu item", includes("if (!enhancedMenuItems.some((item) => item.id === activeTab))"));
check("npm script is registered", packageJson.includes("smoke:batch100n-admin-tab-e2e"));

const failed = checks.filter(([, pass]) => !pass);
if (failed.length > 0) {
  console.error("BATCH 100N admin tab E2E contract failed:");
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log("BATCH 100N admin tab E2E contract passed.");
