export type PublicBarcodeStaffScope = {
  id: string;
  role: string;
  schoolIds: string[];
  groupIds: string[];
};

export type PublicBarcodeTestAccessRecord = {
  createdBy?: unknown;
  ownerType?: unknown;
  ownerId?: unknown;
  targetGroupIds?: unknown;
};

const uniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

/**
 * Keeps staff Barcode visibility bounded to the creator, its school owner, or
 * a group in the staff member's already-authorized school scope.
 */
export const canAccessPublicBarcodeTest = (
  scope: PublicBarcodeStaffScope,
  test: PublicBarcodeTestAccessRecord,
) => {
  if (scope.role === "admin") return true;

  const staffId = String(scope.id || "").trim();
  const schoolIds = new Set(uniqueStrings(scope.schoolIds));
  const groupIds = new Set(uniqueStrings(scope.groupIds));
  const testGroups = uniqueStrings(Array.isArray(test.targetGroupIds) ? test.targetGroupIds : []);

  return (
    (!!staffId && String(test.createdBy || "") === staffId) ||
    (String(test.ownerType || "") === "teacher" && !!staffId && String(test.ownerId || "") === staffId) ||
    (String(test.ownerType || "") === "school" && schoolIds.has(String(test.ownerId || ""))) ||
    testGroups.some((groupId) => groupIds.has(groupId))
  );
};

/**
 * Mongo equivalent of canAccessPublicBarcodeTest. Keep this fail-closed: a
 * legacy test without an owner or an in-scope target is visible only to its creator.
 */
export const buildPublicBarcodeTestScopeFilter = (scope: PublicBarcodeStaffScope): Record<string, unknown> => {
  if (scope.role === "admin") return {};

  const staffId = String(scope.id || "").trim();
  const schoolIds = uniqueStrings(scope.schoolIds);
  const groupIds = uniqueStrings(scope.groupIds);
  const clauses: Record<string, unknown>[] = [];

  if (staffId) {
    clauses.push({ createdBy: staffId }, { ownerType: "teacher", ownerId: staffId });
  }
  if (schoolIds.length) clauses.push({ ownerType: "school", ownerId: { $in: schoolIds } });
  if (groupIds.length) clauses.push({ targetGroupIds: { $in: groupIds } });

  return clauses.length ? { $or: clauses } : { _id: { $exists: false } };
};

export const resolvePublicBarcodeTestOwner = (authUser: { id: string; role: string; schoolId?: string | null }) => {
  if (authUser.role === "admin") return { ownerType: "platform", ownerId: "" } as const;
  if (authUser.schoolId) return { ownerType: "school", ownerId: String(authUser.schoolId) } as const;
  return { ownerType: "teacher", ownerId: String(authUser.id) } as const;
};
