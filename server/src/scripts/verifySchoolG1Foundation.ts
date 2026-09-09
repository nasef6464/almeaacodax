import assert from "node:assert/strict";
import { canTeachAssignedClass, hasActiveSchoolMembership, hasSchoolModule } from "../modules/schools/application/schoolAccessPolicy.js";
import { canJoinAuthorizedWorkspace } from "../sockets/workspaceAuthorization.js";

const now = new Date("2026-09-09T00:00:00.000Z");
const contract = { schoolId: "school-a", status: "active", modules: ["SCHOOL_CORE", "SMART_CLASSROOM"], validUntil: new Date("2026-12-31T00:00:00.000Z") } as const;

assert.equal(hasSchoolModule(contract, "school-a", "SMART_CLASSROOM", now), true);
assert.equal(hasSchoolModule(contract, "school-b", "SMART_CLASSROOM", now), false);
assert.equal(hasSchoolModule({ ...contract, status: "expired" }, "school-a", "SMART_CLASSROOM", now), false);
assert.equal(hasActiveSchoolMembership({ userId: "teacher-a", schoolId: "school-a", role: "teacher", status: "active" }, "teacher-a", "school-a"), true);
assert.equal(hasActiveSchoolMembership({ userId: "teacher-a", schoolId: "school-a", role: "teacher", status: "inactive" }, "teacher-a", "school-a"), false);
assert.equal(canTeachAssignedClass({ schoolId: "school-a", teacherId: "teacher-a", classId: "class-a", subjectId: "math", status: "active" }, "teacher-a", "school-a", "class-a", "math"), true);
assert.equal(canTeachAssignedClass({ schoolId: "school-a", teacherId: "teacher-a", classId: "class-a", subjectId: "math", status: "active" }, "teacher-a", "school-a", "class-b", "math"), false);
assert.equal(canTeachAssignedClass(null, "teacher-a", "school-a", "class-a", "math"), false);
assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolId: null, schoolIds: ["school-a"] }, "school:school-a", { findDirectlySupervisedGroupIds: async () => [] }), true);
assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolId: null, schoolIds: ["school-a"] }, "school:school-b", { findDirectlySupervisedGroupIds: async () => [] }), false);

console.log("School G1 foundation policy: PASS (10 checks)");
