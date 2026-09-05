import { GroupModel } from "../../../models/Group.js";
import type { SupervisorScopeGroup } from "../application/quizSupervisorScope.js";

const buildDocumentsByIdsQuery = (values: string[]) => ({
  $or: [
    { id: { $in: values } },
    { _id: { $in: values } },
  ],
});

const scopeGroupSelect = "id _id parentId type";

/** Persistence adapter for the group relationships used by supervisor report scope. */
export const quizSupervisorScopeRepository = {
  async findSeedGroups(groupIds: string[]): Promise<SupervisorScopeGroup[]> {
    if (!groupIds.length) return [];
    return GroupModel.find(buildDocumentsByIdsQuery(groupIds)).select(scopeGroupSelect).lean();
  },

  async findDirectlySupervisedGroups(supervisorId: string): Promise<SupervisorScopeGroup[]> {
    return GroupModel.find({ supervisorIds: supervisorId }).select(scopeGroupSelect).lean();
  },

  async findSchoolWideChildGroups(schoolIds: string[]): Promise<SupervisorScopeGroup[]> {
    if (!schoolIds.length) return [];
    return GroupModel.find({
      parentId: { $in: schoolIds },
      type: { $in: ["CLASS", "PRIVATE_GROUP"] },
    }).select("id _id").lean();
  },
};
