import { SchoolContractModel } from "../../../models/SchoolContract.js";
import { hasSchoolModule } from "./schoolAccessPolicy.js";

export const resolveSchoolEntitlement = async (schoolId: string, module: string) => {
  const contract = await SchoolContractModel.findOne({ schoolId }).select("schoolId status modules validFrom validUntil").lean();
  return { allowed: hasSchoolModule(contract as any, schoolId, module), contract: contract || null };
};
