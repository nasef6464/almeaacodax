import { AccessGrantModel } from "../../../models/AccessGrant.js";
import { AiInteractionModel } from "../../../models/AiInteraction.js";
import { ClientEventModel } from "../../../models/ClientEvent.js";
import { GroupModel } from "../../../models/Group.js";
import { NotificationDeliveryModel } from "../../../models/NotificationDelivery.js";
import { ParentStudentRelationshipModel } from "../../../models/ParentStudentRelationship.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";

type DeleteUserLifecycleInput = {
  targetUserId: string;
  targetMongoId: unknown;
  actorUserId: string;
};

export type DeleteUserLifecycleResult = {
  revokedParentRelationships: number;
  deactivatedSchoolMemberships: number;
  deactivatedTeachingAssignments: number;
  revokedAccessGrants: number;
  unlinkedUsers: number;
  unlinkedGroups: number;
  anonymizedAiInteractions: number;
  anonymizedClientEvents: number;
  anonymizedNotificationDeliveries: number;
};

/**
 * Account erasure is deliberately orchestrated here rather than scattered
 * across HTTP transport. Durable academic, payment and audit evidence is not
 * blanket-deleted; live authority is revoked and operational PII is minimized.
 */
export async function deleteUserLifecycle({
  targetUserId,
  targetMongoId,
  actorUserId,
}: DeleteUserLifecycleInput): Promise<DeleteUserLifecycleResult> {
  const revokedAt = Date.now();

  const [
    unlinkedUsers,
    revokedParentRelationships,
    unlinkedGroups,
    deactivatedSchoolMemberships,
    deactivatedTeachingAssignments,
    revokedAccessGrants,
    anonymizedAiInteractions,
    anonymizedClientEvents,
    anonymizedNotificationDeliveries,
  ] = await Promise.all([
    UserModel.updateMany({ linkedStudentIds: targetUserId }, { $pull: { linkedStudentIds: targetUserId } }),
    ParentStudentRelationshipModel.updateMany(
      {
        status: "active",
        $or: [{ parentUserId: targetUserId }, { studentUserId: targetUserId }],
      },
      {
        $set: {
          status: "revoked",
          revokedAt,
          revokedBy: actorUserId,
        },
      },
    ),
    GroupModel.updateMany(
      { $or: [{ studentIds: targetUserId }, { supervisorIds: targetUserId }] },
      { $pull: { studentIds: targetUserId, supervisorIds: targetUserId } },
    ),
    SchoolMembershipModel.updateMany(
      { userId: targetUserId, status: "active" },
      { $set: { status: "inactive" } },
    ),
    TeachingAssignmentModel.updateMany(
      { teacherId: targetUserId, status: "active" },
      { $set: { status: "inactive" } },
    ),
    AccessGrantModel.updateMany(
      { userId: targetUserId, status: "active" },
      {
        $set: {
          status: "revoked",
          revokedAt,
          revokedBy: actorUserId,
          revokeReason: "user_erasure",
        },
      },
    ),
    AiInteractionModel.updateMany(
      { userId: targetUserId },
      { $set: { userId: "", userEmail: "" } },
    ),
    ClientEventModel.updateMany(
      { userId: targetUserId },
      { $set: { userId: "", userEmail: "" } },
    ),
    NotificationDeliveryModel.updateMany(
      { recipientUserId: targetUserId },
      {
        $set: {
          recipientUserId: "",
          recipientEmail: "",
          recipientPhone: "",
        },
      },
    ),
  ]);

  await UserModel.deleteOne({ _id: targetMongoId });

  return {
    revokedParentRelationships: revokedParentRelationships.modifiedCount,
    deactivatedSchoolMemberships: deactivatedSchoolMemberships.modifiedCount,
    deactivatedTeachingAssignments: deactivatedTeachingAssignments.modifiedCount,
    revokedAccessGrants: revokedAccessGrants.modifiedCount,
    unlinkedUsers: unlinkedUsers.modifiedCount,
    unlinkedGroups: unlinkedGroups.modifiedCount,
    anonymizedAiInteractions: anonymizedAiInteractions.modifiedCount,
    anonymizedClientEvents: anonymizedClientEvents.modifiedCount,
    anonymizedNotificationDeliveries: anonymizedNotificationDeliveries.modifiedCount,
  };
}
