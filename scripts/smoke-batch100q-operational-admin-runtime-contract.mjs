import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(file, needle, label = needle) {
  const source = read(file);
  if (!source.includes(needle)) {
    throw new Error(`${file} is missing ${label}`);
  }
}

function assertAllIncludes(file, needles) {
  for (const needle of needles) {
    assertIncludes(file, needle);
  }
}

function assertAllIncludesSource(source, needles, label) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      throw new Error(`${label} is missing ${needle}`);
    }
  }
}

assertAllIncludes("App.tsx", [
  "import { PwaInstallBanner } from './components/PwaInstallBanner';",
  "<PwaInstallBanner />",
]);

assertAllIncludes("components/PwaInstallBanner.tsx", [
  "beforeinstallprompt",
  "appinstalled",
  "deferredPrompt.prompt()",
  "setHidden(true)",
]);

assertAllIncludes("store/useStore.ts", [
  "addQuestion: (question: Question) => Promise<Question>;",
  "updateQuestion: (questionId: string, data: Partial<Question>) => Promise<Question>;",
  "const created = await api.createQuestion(question)",
  "const updated = await api.updateQuestion(questionId, data)",
  "await api.deleteQuestion(questionId)",
]);

assertAllIncludes("dashboards/admin/FinancialManager.tsx", [
  "requestCountryFilter",
  "requestMethodFilter",
  "requestsSummary",
  "loadRequestsSummary",
  "resetRequestFilters",
  "applyCountryPreset",
  "api.getPaymentRequestsSummary",
  "api.applyPaymentCountryPreset",
  "paymentCountry: requestCountryFilter === 'all' ? undefined : requestCountryFilter",
  "paymentMethod: requestMethodFilter === 'all' ? undefined : requestMethodFilter",
]);

assertAllIncludes("dashboards/admin/UsersManager.tsx", [
  "usersTotalPages",
  "setUsersPage(1)",
  "api.getAdminUsers({",
  "search: searchTerm.trim() || undefined",
  "role: roleFilter === 'all' ? undefined : roleFilter",
  "Math.min(usersTotalPages, current + 1)",
]);

assertAllIncludes("dashboards/admin/SchoolPortalManager.tsx", [
  "selectedSchoolId",
  "selectedClassId",
  "reportMode",
  "reportStudents",
  "reportClasses",
  "reportFollowUpQuizzes",
  "showAggregatedSections",
  "showIndividualSections",
]);

assertAllIncludes("pages/QuizPage.tsx", [
  "questionHydrationStartedAt",
  "waitingForQuestionHydration",
  "Date.now() - questionHydrationStartedAt < 3000",
]);

assertAllIncludes("server/src/routes/payment.routes.ts", [
  '"/settings/apply-country-preset"',
  '"/requests/summary"',
  "paymentCountry: z.string().max(3).optional()",
  'paymentMethod: z.enum(["card", "transfer", "wallet", "all"]).optional()',
]);

assertAllIncludes("server/src/routes/taxonomy.routes.ts", [
  "taxonomyBootstrapPhaseSchema",
  'z.enum(["full", "core"]).default("full")',
  'res.setHeader("X-Taxonomy-Phase", phase)',
  'phase === "core"',
  "publicTaxonomyBootstrapCache",
  "publicTaxonomyBootstrapPromises",
]);

assertAllIncludes("server/src/routes/notification.routes.ts", [
  'notificationRouter.post("/admin/test-delivery"',
  'requireRole(["admin"])',
  "sendExternalNotification",
  "recipientPhone is required for whatsapp test.",
]);

assertAllIncludes("server/src/services/notificationService.ts", [
  ".select(\"_id id name email role phone\")",
  "phone: rawUser.phone ||",
  "recipientPhone: recipient.phone ||",
  "recipientPhone: item.recipientPhone",
]);

assertAllIncludesSource(`${read("services/api.ts")}\n${read("services/apiGroups/paymentsApi.ts")}\n${read("services/apiGroups/taxonomyContentApi.ts")}`, [
  "applyPaymentCountryPreset: (country: \"SA\" | \"EG\"",
  "getPaymentRequestsSummary: (token?: string | null)",
  "paymentCountry?: string | \"all\"",
  "paymentMethod?: string | \"all\"",
], "payments api facade/source");

assertAllIncludes("services/apiGroups/taxonomyContentApi.ts", [
  "getTaxonomyBootstrap: (phase: \"full\" | \"core\" = \"full\")",
]);

console.log("Batch 100Q operational admin runtime contract passed.");
