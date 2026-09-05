import mongoose from "mongoose";
import { GroupModel } from "../../models/Group.js";

type RelationshipRole = "student" | "teacher" | "admin" | "supervisor" | "parent";

type RelationshipUser = {
  role?: unknown;
  schoolId?: unknown;
  groupIds?: unknown[];
};

type RelationshipPayload = Record<string, unknown> & {
  role?: RelationshipRole;
  schoolId?: string | null;
  groupIds?: string[];
};

type RelationshipGroup = {
  id?: unknown;
  _id?: unknown;
  type?: unknown;
  parentId?: unknown;
};

const uniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const groupIdOf = (group: RelationshipGroup) => String(group.id || group._id || "").trim();

const buildGroupDocumentsQuery = (values: string[]) => {
  const ids = uniqueStrings(values);
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const badRequest = (message: string) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
};

export type NormalizedAdminUserRelationship = {
  payload: RelationshipPayload;
  previousRole: RelationshipRole;
  effectiveRole: RelationshipRole;
  relationshipTouched: boolean;
};

/**
 * Normalizes Admin user school/class relationships before persistence.
 * `groupIds` is the explicit authority list. For supervisors, a class must not
 * silently promote its parent school to school-wide authority.
 */
export const normalizeAdminUserRelationshipPayload = async (
  currentUser: RelationshipUser,
  inputPayload: RelationshipPayload,
): Promise<NormalizedAdminUserRelationship> => {
  const payload: RelationshipPayload = { ...inputPayload };
  const previousRole = String(currentUser.role || "student") as RelationshipRole;
  const effectiveRole = String(payload.role || previousRole) as RelationshipRole;
  const hasSchoolId = Object.prototype.hasOwnProperty.call(payload, "schoolId");
  const hasGroupIds = Object.prototype.hasOwnProperty.call(payload, "groupIds");
  const relationshipTouched = hasSchoolId || hasGroupIds || Object.prototype.hasOwnProperty.call(payload, "role");

  if (!relationshipTouched) {
    return { payload, previousRole, effectiveRole, relationshipTouched };
  }

  let requestedGroupIds = uniqueStrings(
    hasGroupIds ? (Array.isArray(payload.groupIds) ? payload.groupIds : []) : (currentUser.groupIds || []),
  );
  const requestedSchoolId = String(
    hasSchoolId ? payload.schoolId || "" : currentUser.schoolId || "",
  ).trim();

  // Preserve the legacy "schoolId only" Admin write as an explicit supervisor
  // school relationship, while treating groupIds as authoritative when supplied.
  if (effectiveRole === "supervisor" && hasSchoolId && !hasGroupIds && requestedSchoolId) {
    requestedGroupIds = uniqueStrings([...requestedGroupIds, requestedSchoolId]);
  }

  const lookupIds = uniqueStrings([...requestedGroupIds, ...(requestedSchoolId ? [requestedSchoolId] : [])]);
  const groups = lookupIds.length
    ? ((await GroupModel.find(buildGroupDocumentsQuery(lookupIds)).select("_id id type parentId").lean()) as RelationshipGroup[])
    : [];
  const groupById = new Map(groups.map((group) => [groupIdOf(group), group]));

  const missingGroupIds = requestedGroupIds.filter((id) => !groupById.has(id));
  if (missingGroupIds.length > 0) {
    throw badRequest(`Unknown school/group assignment: ${missingGroupIds.join(", ")}`);
  }

  if (requestedSchoolId) {
    const requestedSchool = groupById.get(requestedSchoolId);
    if (!requestedSchool || requestedSchool.type !== "SCHOOL") {
      throw badRequest("schoolId must reference an existing SCHOOL group");
    }
  }

  if (effectiveRole === "student") {
    const selectedGroups = requestedGroupIds.map((id) => groupById.get(id)!).filter(Boolean);
    const classSchoolIds = uniqueStrings(
      selectedGroups
        .filter((group) => group.type === "CLASS" && group.parentId)
        .map((group) => group.parentId),
    );
    const candidateSchoolIds = uniqueStrings([
      ...(requestedSchoolId ? [requestedSchoolId] : []),
      ...classSchoolIds,
    ]);

    if (candidateSchoolIds.length > 1) {
      throw badRequest("A student cannot be assigned to classes from multiple schools");
    }

    const normalizedSchoolId = candidateSchoolIds[0] || "";
    payload.schoolId = normalizedSchoolId || null;
    payload.groupIds = requestedGroupIds.filter((id) => {
      const group = groupById.get(id);
      if (!group || group.type === "SCHOOL") return false;
      if (group.type === "CLASS" && normalizedSchoolId) {
        return String(group.parentId || "") === normalizedSchoolId;
      }
      return true;
    });
  } else if (effectiveRole === "supervisor") {
    const explicitSchoolIds = requestedGroupIds.filter((id) => groupById.get(id)?.type === "SCHOOL");
    const normalizedSchoolId = requestedSchoolId && explicitSchoolIds.includes(requestedSchoolId)
      ? requestedSchoolId
      : explicitSchoolIds[0] || "";

    payload.groupIds = requestedGroupIds;
    payload.schoolId = normalizedSchoolId || null;
  }

  return { payload, previousRole, effectiveRole, relationshipTouched };
};

/**
 * Reconciles denormalized Group membership after the User document is saved.
 * The operation is idempotent, so retrying an Admin update repairs drift instead
 * of creating duplicate memberships.
 */
export const reconcileAdminUserGroupMembership = async (input: {
  userId: string;
  previousRole: RelationshipRole;
  effectiveRole: RelationshipRole;
  schoolId?: unknown;
  groupIds?: unknown[];
}) => {
  const userId = String(input.userId || "").trim();
  if (!userId) return;

  const desiredGroupIds = uniqueStrings(input.groupIds || []);
  const schoolId = String(input.schoolId || "").trim();

  if (input.previousRole === "student" || input.effectiveRole === "student") {
    await GroupModel.updateMany({ studentIds: userId }, { $pull: { studentIds: userId } });
    if (input.effectiveRole === "student") {
      const studentMembershipIds = uniqueStrings([...desiredGroupIds, ...(schoolId ? [schoolId] : [])]);
      if (studentMembershipIds.length > 0) {
        await GroupModel.updateMany(
          buildGroupDocumentsQuery(studentMembershipIds),
          { $addToSet: { studentIds: userId } },
        );
      }
    }
  }

  if (input.previousRole === "supervisor" || input.effectiveRole === "supervisor") {
    await GroupModel.updateMany({ supervisorIds: userId }, { $pull: { supervisorIds: userId } });
    if (input.effectiveRole === "supervisor" && desiredGroupIds.length > 0) {
      await GroupModel.updateMany(
        buildGroupDocumentsQuery(desiredGroupIds),
        { $addToSet: { supervisorIds: userId } },
      );
    }
  }
};
