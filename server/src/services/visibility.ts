import { PathModel } from "../models/Path.js";

type AuthUserLike = {
  role?: string;
};

export const isStaffRole = (role?: string) => role === "admin" || role === "teacher" || role === "supervisor";

export const getActivePathIds = async () => {
  const paths = await PathModel.find({ isActive: { $ne: false } }).select("_id");
  return paths.map((path) => String(path._id));
};

export const withLearnerVisiblePaths = async <T extends Record<string, unknown>>(
  baseFilter: T,
  authUser?: AuthUserLike,
  pathField = "pathId",
) => {
  if (isStaffRole(authUser?.role)) {
    return baseFilter;
  }

  const activePathIds = await getActivePathIds();

  return {
    $and: [
      baseFilter,
      {
        $or: [
          { [pathField]: { $in: activePathIds } },
          { [pathField]: { $exists: false } },
          { [pathField]: "" },
          { [pathField]: null },
        ],
      },
    ],
  };
};
