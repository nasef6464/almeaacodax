import assert from "node:assert/strict";
import {
  buildPublicBarcodeTestScopeFilter,
  canAccessPublicBarcodeTest,
  resolvePublicBarcodeTestOwner,
} from "../modules/public-tests/application/publicBarcodeTestScope.js";
import { canJoinAuthorizedWorkspace } from "../sockets/workspaceAuthorization.js";

const schoolATeacher = { id: "teacher-a", role: "teacher", schoolIds: ["school-a"], groupIds: ["class-a"] };
const schoolBTest = {
  createdBy: "teacher-b",
  ownerType: "school",
  ownerId: "school-b",
  targetGroupIds: ["class-b"],
};
const schoolATest = {
  createdBy: "teacher-a",
  ownerType: "school",
  ownerId: "school-a",
  targetGroupIds: ["class-a"],
};

assert.equal(canAccessPublicBarcodeTest(schoolATeacher, schoolATest), true, "Teacher A can access School A test");
assert.equal(canAccessPublicBarcodeTest(schoolATeacher, schoolBTest), false, "Teacher A cannot access School B test");
assert.deepEqual(resolvePublicBarcodeTestOwner({ id: "teacher-a", role: "teacher", schoolId: "school-a" }), {
  ownerType: "school",
  ownerId: "school-a",
});
assert.deepEqual(resolvePublicBarcodeTestOwner({ id: "admin-a", role: "admin" }), { ownerType: "platform", ownerId: "" });

const scopeFilter = buildPublicBarcodeTestScopeFilter(schoolATeacher);
assert.ok(JSON.stringify(scopeFilter).includes("school-a"), "Barcode scope filter includes School A only");
assert.equal(JSON.stringify(scopeFilter).includes("school-b"), false, "Barcode scope filter excludes School B");

const repository = {
  async findDirectlySupervisedGroupIds(userId: string) {
    return userId === "supervisor-a" ? ["class-a"] : [];
  },
};

assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolId: "school-a", groupIds: ["class-a"] }, "school:school-a", repository), true);
assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolId: "school-a", groupIds: ["class-a"] }, "school:school-b", repository), false);
assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolId: "school-a", groupIds: ["class-a"] }, "class:class-b", repository), false);
assert.equal(await canJoinAuthorizedWorkspace({ id: "supervisor-a", schoolId: "school-a" }, "class:class-a", repository), true);
assert.equal(await canJoinAuthorizedWorkspace({ id: "student-a", schoolId: "school-a", groupIds: ["class-a"] }, "workspace:anything", repository), false);

console.log("PASS G0 School A/B Barcode and Socket authorization policy checks");
