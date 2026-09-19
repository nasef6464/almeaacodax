import { ParentStudentRelationshipModel } from "../../../models/ParentStudentRelationship.js";
import { UserModel } from "../../../models/User.js";

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const appendId = (target: Map<string, string[]>, key: string, value: unknown) => {
  const id = String(value || "").trim();
  if (!id) return;
  const current = target.get(key) || [];
  if (!current.includes(id)) current.push(id);
  target.set(key, current);
};

/**
 * Resolve parent -> student authority in bulk.
 *
 * Canonical relationship rows are authoritative per parent. Once any canonical
 * row exists for a parent, legacy linkedStudentIds must never re-authorize a
 * relationship that has been revoked or omitted from the canonical set.
 */
export async function getAuthorizedStudentIdsForParents(parentUserIds: string[]) {
  const normalizedParentIds = normalizeIds(parentUserIds);
  const resolved = new Map<string, string[]>(normalizedParentIds.map((id) => [id, []]));
  if (!normalizedParentIds.length) return resolved;

  const canonicalRows = await ParentStudentRelationshipModel.find({
    parentUserId: { $in: normalizedParentIds },
  })
    .select("parentUserId studentUserId status")
    .lean();

  const parentsWithCanonicalRows = new Set<string>();
  for (const row of canonicalRows as any[]) {
    const parentUserId = String(row.parentUserId || "").trim();
    if (!parentUserId) continue;
    parentsWithCanonicalRows.add(parentUserId);
    if (row.status === "active") appendId(resolved, parentUserId, row.studentUserId);
  }

  const legacyFallbackParentIds = normalizedParentIds.filter(
    (parentUserId) => !parentsWithCanonicalRows.has(parentUserId),
  );
  if (!legacyFallbackParentIds.length) return resolved;

  const legacyParents = await UserModel.find({
    _id: { $in: legacyFallbackParentIds },
    role: "parent",
  })
    .select("_id linkedStudentIds")
    .lean();

  for (const parent of legacyParents as any[]) {
    const parentUserId = String(parent._id || "").trim();
    const linkedStudentIds = Array.isArray(parent.linkedStudentIds) ? parent.linkedStudentIds : [];
    for (const studentUserId of linkedStudentIds) appendId(resolved, parentUserId, studentUserId);
  }

  return resolved;
}

export async function getAuthorizedStudentIdsForParent(parentUserId: string) {
  const normalizedParentId = String(parentUserId || "").trim();
  if (!normalizedParentId) return [];
  const resolved = await getAuthorizedStudentIdsForParents([normalizedParentId]);
  return resolved.get(normalizedParentId) || [];
}

/**
 * Resolve student -> parent recipients without allowing stale legacy links to
 * override canonical parent authority.
 *
 * Legacy parent candidates are accepted only while that specific parent has no
 * canonical relationship rows at all.
 */
export async function getAuthorizedParentIdsForStudent(studentUserId: string) {
  const normalizedStudentId = String(studentUserId || "").trim();
  if (!normalizedStudentId) return [];

  const [canonicalForStudent, legacyParents] = await Promise.all([
    ParentStudentRelationshipModel.find({ studentUserId: normalizedStudentId })
      .select("parentUserId status")
      .lean(),
    UserModel.find({ role: "parent", linkedStudentIds: normalizedStudentId })
      .select("_id")
      .lean(),
  ]);

  const activeCanonicalParentIds = normalizeIds(
    (canonicalForStudent as any[])
      .filter((row) => row.status === "active")
      .map((row) => row.parentUserId),
  );
  const legacyParentIds = normalizeIds((legacyParents as any[]).map((parent) => parent._id));
  if (!legacyParentIds.length) return activeCanonicalParentIds;

  const canonicalPresenceRows = await ParentStudentRelationshipModel.find({
    parentUserId: { $in: legacyParentIds },
  })
    .select("parentUserId")
    .lean();
  const parentsWithCanonicalRows = new Set(
    normalizeIds((canonicalPresenceRows as any[]).map((row) => row.parentUserId)),
  );

  return normalizeIds([
    ...activeCanonicalParentIds,
    ...legacyParentIds.filter((parentUserId) => !parentsWithCanonicalRows.has(parentUserId)),
  ]);
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
    {
      parentUserId: payload.parentUserId,
      status: "active",
      studentUserId: { $nin: studentUserIds },
    },
    {
      $set: {
        status: "revoked",
        revokedAt: now,
        revokedBy: payload.createdBy,
      },
    },
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
          $setOnInsert: {
            id: `parent-student:${payload.parentUserId}:${studentUserId}`,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}
