import mongoose from "mongoose";

export const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

export const buildDocumentQuery = (value: string) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return { $or: [{ id: value }, { _id: value }] };
  }

  return { id: value };
};

export const buildOwnedDocumentQuery = (
  value: string,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const baseQuery = buildDocumentQuery(value);

  if (authUser.role === "admin") {
    return baseQuery;
  }

  const ownershipConditions: Array<Record<string, string>> = [
    { ownerId: authUser.id },
    { createdBy: authUser.id },
    { assignedTeacherId: authUser.id },
  ];

  if (authUser.schoolId) {
    ownershipConditions.push({ ownerId: authUser.schoolId }, { createdBy: authUser.schoolId });
  }

  return { $and: [baseQuery, { $or: ownershipConditions }] };
};

export const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(
    values
      .flatMap((value) => {
        const id = String(value || "").trim();
        if (!id) return [];
        const withoutCopySuffix = id.replace(/_copy(?:_\d+)?$/i, "");
        return withoutCopySuffix && withoutCopySuffix !== id ? [id, withoutCopySuffix] : [id];
      })
      .filter(Boolean),
  );
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};
