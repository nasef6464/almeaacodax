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


export async function syncCanonicalParentRelationships(payload: {
  parentUserId: string;
  studentUserIds: string[];
  schoolId?: string | null;
  createdBy: string;
}) {
  const studentUserIds = normalizeIds(payload.studentUserIds);
  const now = Date.now();
  await ParentStudentRelationshipModel.updateMany(
    { parentUserId: payload.parentUserId, status: "active", studentUserId: { $nin: studentUserIds } },
    { $set: { status: "revoked", revokedAt: now, revokedBy: payload.createdBy } },
  );

  await Promise.all(
    studentUserIds.map((studentUserId) =>
      ParentStudentRelationshipModel.findOneAndUpdate(
        { parentUserId: payload.parentUserId, studentUserId },
        {
          $set: {
            status: "active",
            schoolId: String(payload.schoolId || ""),
            source: "admin",
            createdBy: payload.createdBy,
            revokedAt: null,
            revokedBy: "",
          },
          $setOnInsert: { id: `parent-student:${payload.parentUserId}:${studentUserId}` },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}
