import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { buildDocumentsByIdsQuery } from "../infrastructure/contentDocumentQuery.js";

type SupervisorManagementScope = {
  schoolIds: string[];
  classIds: string[];
};

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

export const resolveSupervisorManagementScope = async (
  authUser: { id: string },
): Promise<SupervisorManagementScope> => {
  const user = await UserModel.findById(authUser.id).select("schoolId groupIds role").lean();
  if (!user) {
    return { schoolIds: [], classIds: [] };
  }

  const managedGroupIds = uniqueStrings([...(user.groupIds || []).map(String)]);
  const [seedGroups, directlySupervisedGroups] = await Promise.all([
    managedGroupIds.length
      ? GroupModel.find(buildDocumentsByIdsQuery(managedGroupIds)).select("id _id parentId type")
      : Promise.resolve([]),
    GroupModel.find({ supervisorIds: authUser.id }).select("id _id parentId type"),
  ]);

  const schoolIds = uniqueStrings([
    String(user.schoolId || ""),
    ...directlySupervisedGroups
      .filter((group) => group.type === "SCHOOL")
      .map((group) => String(group.id || group._id)),
    ...seedGroups
      .filter((group) => group.type === "SCHOOL")
      .map((group) => String(group.id || group._id)),
  ]);
  const classIds = uniqueStrings([
    ...directlySupervisedGroups
      .filter((group) => group.type === "CLASS")
      .map((group) => String(group.id || group._id)),
    ...seedGroups
      .filter((group) => group.type === "CLASS")
      .map((group) => String(group.id || group._id)),
  ]);

  return {
    schoolIds: schoolIds.filter(Boolean),
    classIds: classIds.filter(Boolean),
  };
};

export const assertSchoolManagementScope = async (
  authUser: { id: string; role: string },
  school: { id?: string; _id?: unknown; supervisorIds?: unknown[] },
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const schoolId = String(school.id || school._id || "");
  if (!schoolId) {
    return false;
  }

  const { schoolIds } = await resolveSupervisorManagementScope({ id: authUser.id });
  if (schoolIds.includes(schoolId)) {
    return true;
  }

  const supervisorIds = Array.isArray(school.supervisorIds)
    ? school.supervisorIds.map(String)
    : [];
  return supervisorIds.includes(String(authUser.id));
};

export const hasGroupManagementScope = async (
  authUser: { id: string; role: string },
  group: {
    id?: string;
    _id?: unknown;
    type?: unknown;
    parentId?: unknown;
    ownerId?: unknown;
    supervisorIds?: unknown[];
  },
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const groupId = String(group.id || group._id || "");
  const parentId = String(group.parentId || "");
  const ownerId = String(group.ownerId || "");
  const supervisorIds = Array.isArray(group.supervisorIds)
    ? group.supervisorIds.map(String)
    : [];

  if (ownerId && ownerId === String(authUser.id)) {
    return true;
  }

  if (supervisorIds.includes(String(authUser.id))) {
    return true;
  }

  if (authUser.role === "supervisor") {
    const { schoolIds, classIds } = await resolveSupervisorManagementScope({ id: authUser.id });
    if (String(group.type || "") === "SCHOOL" && schoolIds.includes(groupId)) {
      return true;
    }
    if (schoolIds.includes(parentId)) {
      return true;
    }
    if (classIds.includes(groupId) || classIds.includes(parentId)) {
      return true;
    }
  }

  return false;
};

export const hasSchoolIdManagementScope = async (
  authUser: { id: string; role: string },
  schoolId: string,
) => {
  if (authUser.role === "admin") {
    return true;
  }

  const { schoolIds } = await resolveSupervisorManagementScope({ id: authUser.id });
  return schoolIds.includes(String(schoolId || ""));
};
