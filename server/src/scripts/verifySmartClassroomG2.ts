import assert from "node:assert/strict";
import { projectClassroomQuestionForStudent } from "../modules/schools/application/classroomQuestionProjection.js";
import { canJoinAuthorizedWorkspace } from "../sockets/workspaceAuthorization.js";

const snapshot = {
  questionId: "question-a",
  text: "2 + 2؟",
  options: ["3", "4"],
  type: "mcq",
  correctOptionIndex: 1,
  skillIds: ["skill-a"],
};
const projected = projectClassroomQuestionForStudent(snapshot, true) as Record<string, unknown>;
assert.deepEqual(projected, { questionId: "question-a", text: "2 + 2؟", imageUrl: "", options: ["3", "4"], type: "mcq" });
assert.equal("correctOptionIndex" in projected, false, "Student projection never exposes the answer key");

const repository = {
  findDirectlySupervisedGroupIds: async () => [],
  findClassroomSessionScope: async () => ({ schoolId: "school-a", classId: "class-a", teacherId: "teacher-a" }),
};
assert.equal(await canJoinAuthorizedWorkspace({ id: "teacher-a", schoolIds: ["school-a"] }, "classroom:session-a", repository), true, "Session teacher can join realtime room");
assert.equal(await canJoinAuthorizedWorkspace({ id: "student-a", schoolIds: ["school-a"], groupIds: ["class-a"] }, "classroom:session-a", repository), true, "Membership-backed student can join own classroom room");
assert.equal(await canJoinAuthorizedWorkspace({ id: "student-b", schoolIds: ["school-b"], groupIds: ["class-b"] }, "classroom:session-a", repository), false, "Other school cannot join classroom room");
assert.equal(await canJoinAuthorizedWorkspace({ id: "student-a", schoolIds: ["school-a"], groupIds: ["class-b"] }, "classroom:session-a", repository), false, "Other class cannot join classroom room");

console.log("Smart Classroom G2 security/read-model checks: PASS (5 checks)");
