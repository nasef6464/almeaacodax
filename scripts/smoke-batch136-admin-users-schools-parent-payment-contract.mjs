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

function assertAllIncludes(file, entries) {
  entries.forEach((entry) => {
    if (typeof entry === "string") {
      assertIncludes(file, entry);
    } else {
      assertIncludes(file, entry.needle, entry.label);
    }
  });
}

assertAllIncludes("dashboards/admin/UsersManager.tsx", [
  "toggleActionsMenu",
  "Delete user",
  "handleDeleteUser",
  "allStudentsForLinking",
  "linkableStudents",
  "parentCandidates = linkableStudents.filter",
  "options={linkableStudents.map((student) => ({ value: student.id, label: student.name }))}",
  "const linkedStudent = linkableStudents.find((student) => student.id === studentId);",
]);

assertAllIncludes("services/api.ts", [
  "deleteAdminUser: (id: string, token?: string | null)",
  "`/auth/admin/users/${id}`",
  "method: \"DELETE\"",
]);

assertAllIncludes("server/src/routes/auth.routes.ts", [
  "authRouter.delete(",
  "\"/admin/users/:id\"",
  "You cannot delete your current account.",
  "Cannot delete the last admin account.",
  "auth.admin_user.delete",
  "GroupModel.updateMany(",
  "buildDocumentsQuery",
  "role: \"student\"",
  "nextPayload.linkedStudentIds = linkedStudents.map",
]);

assertAllIncludes("dashboards/admin/SchoolsManager.tsx", [
  "toggleSchoolActions",
  "activeSchoolActionsId === school.id",
  "ربط المشرفين",
  "فتح الإدارة",
]);

assertAllIncludes("dashboards/admin/AdminDashboard.tsx", [
  "setActiveTab('groups')",
  "setActiveTab('quizzes')",
  "setActiveTab('announcement-ads')",
]);

assertAllIncludes("server/src/routes/payment.routes.ts", [
  "\"/settings/apply-country-preset\"",
  "\"/requests/summary\"",
  "verifyPaymentWebhookSignature",
]);

assertAllIncludes("dashboards/admin/SchoolsManager.tsx", [
  "assignSupervisorToGroup(value, selectedSchool.id)",
  "removeSupervisorFromGroup(currentUser.id, selectedSchool.id)",
  "assignSupervisorToGroup(value, classroom.id)",
  "removeSupervisorFromGroup(currentUser.id, classroom.id)",
  "setActiveTab('relations')",
  "setSelectedSchool((current) =>",
]);

assertAllIncludes("dashboards/admin/UsersManager.tsx", [
  "overflow-visible",
]);

assertAllIncludes("dashboards/admin/FinancialManager.tsx", [
  "onClick={() => void reviewRequest(request, 'approved')}",
  "onClick={() => void reviewRequest(request, 'rejected')}",
  "api.reviewPaymentRequest(request.id, {",
]);

assertAllIncludes("services/api.ts", [
  "reviewPaymentRequest: (id: string, payload: unknown, token?: string | null)",
  "`/payments/requests/${id}/review`",
]);

assertAllIncludes("server/src/routes/payment.routes.ts", [
  "\"/requests/:id/review\"",
  "payment.request.review",
]);

console.log("Batch 136 admin/users/schools/parent/payment contract passed.");
