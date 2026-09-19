import { ParentStudentRelationshipModel } from "../models/ParentStudentRelationship.js";
import { UserModel } from "../models/User.js";

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

export async function getAuthorizedStudentIdsForParent(parentUserId: string) {
  const canonical = await ParentStudentRelationshipModel.find({
    parentUserId,
    status: "active",
  })
    .select("studentUserId")
    .lean();

  if (canonical.length) {
    return normalizeIds(canonical.map((row: any) => row.studentUserId));
  }

  // Compatibility fallback while legacy parent links are backfilled. Once a
  // parent has canonical rows, those rows become authoritative for that parent.
  const parent = await UserModel.findById(parentUserId).select("linkedStudentIds").lean();
  return normalizeIds(Array.isArray((parent as any)?.linkedStudentIds) ? (parent as any).linkedStudentIds : []);
}
