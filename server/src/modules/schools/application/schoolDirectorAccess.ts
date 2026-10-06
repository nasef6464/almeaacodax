import { GroupModel } from "../../../models/Group.js";
import { SchoolContractModel, schoolModules } from "../../../models/SchoolContract.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import {
  hasSchoolDirectorPermission,
  type SchoolDirectorPermission,
} from "../domain/schoolDirectorPermissions.js";
import { resolveSchoolEntitlement } from "./schoolEntitlementResolver.js";
import { hasSchoolModule } from "./schoolAccessPolicy.js";

const idOf = (value: any) => String(value?.id || value?._id || value || "");

export const resolveActiveSchoolDirectorMembership = async (userId: string, schoolId: string) =>
  SchoolMembershipModel.findOne({ userId, schoolId, role: "school_admin", status: "active" }).lean();

export const requireSchoolDirectorPermission = async (
  userId: string,
  schoolId: string,
  permission: SchoolDirectorPermission,
) => {
  const membership = await resolveActiveSchoolDirectorMembership(userId, schoolId);
  return membership && hasSchoolDirectorPermission((membership as any).permissions, permission) ? membership : null;
};

export const requireSchoolDirectorCapability = async (
  userId: string,
  schoolId: string,
  permission: SchoolDirectorPermission,
  module: string,
) => {
  const [membership, entitlement] = await Promise.all([
    requireSchoolDirectorPermission(userId, schoolId, permission),
    resolveSchoolEntitlement(schoolId, module),
  ]);
  return membership && entitlement.allowed ? { membership, contract: entitlement.contract } : null;
};

export const buildSchoolDirectorWorkspace = async (userId: string) => {
  const memberships = await SchoolMembershipModel.find({
    userId,
    role: "school_admin",
    status: "active",
  }).select("schoolId status permissions updatedAt").lean();
  const schoolIds = memberships.map((membership: any) => String(membership.schoolId));
  const schools = schoolIds.length
    ? await GroupModel.find({ type: "SCHOOL", $or: [{ id: { $in: schoolIds } }, { _id: { $in: schoolIds.filter((id) => /^[a-f\d]{24}$/i.test(id)) } }] }).select("id name").lean()
    : [];
  const contracts = schoolIds.length ? await SchoolContractModel.find({ schoolId: { $in: schoolIds } }).select("schoolId status modules validFrom validUntil").lean() : [];
  const schoolById = new Map(schools.map((school: any) => [idOf(school), school]));
  const contractBySchool = new Map(contracts.map((contract: any) => [String(contract.schoolId), contract]));

  return {
    schools: memberships.map((membership: any) => ({
      schoolId: String(membership.schoolId),
      schoolName: String(schoolById.get(String(membership.schoolId))?.name || "مدرسة"),
      permissions: Array.isArray(membership.permissions) ? membership.permissions.map(String) : [],
      modules: schoolModules.filter((module) => hasSchoolModule(contractBySchool.get(String(membership.schoolId)) as any, String(membership.schoolId), module)),
      status: String(membership.status),
      updatedAt: membership.updatedAt || null,
    })),
  };
};
