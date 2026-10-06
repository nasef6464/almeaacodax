import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const lifecycle = read("server/src/modules/privacy/application/deleteUserLifecycle.ts");
const auth = read("server/src/routes/auth.routes.ts");

const requiredLifecycleContracts = [
  "ParentStudentRelationshipModel.updateMany",
  "SchoolMembershipModel.updateMany",
  "TeachingAssignmentModel.updateMany",
  "AccessGrantModel.updateMany",
  'revokeReason: "user_erasure"',
  "AiInteractionModel.updateMany",
  "ClientEventModel.updateMany",
  "NotificationDeliveryModel.updateMany",
  "UserModel.deleteOne",
];

for (const contract of requiredLifecycleContracts) {
  if (!lifecycle.includes(contract)) {
    throw new Error(`Missing privacy lifecycle contract: ${contract}`);
  }
}

if (!auth.includes("deleteUserLifecycle({")) {
  throw new Error("Admin user deletion must delegate to the privacy lifecycle application service");
}

if (auth.includes("await UserModel.findOneAndDelete(buildDocumentQuery(targetUserId))")) {
  throw new Error("Admin user deletion still bypasses the privacy lifecycle service");
}

console.log("Batch 10 privacy lifecycle contract: PASS");
