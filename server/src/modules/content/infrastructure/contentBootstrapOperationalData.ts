import mongoose from "mongoose";
import { AccessCodeModel } from "../../../models/AccessCode.js";
import { AnnouncementAdModel } from "../../../models/AnnouncementAd.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";

export const PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT = 8;

type AuthUser = { id: string; role: string; schoolId?: string | null };

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(values.map((value) => String(value || "").trim()));
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

const getPublicAnnouncementAds = () =>
  AnnouncementAdModel.find({ isActive: true })
    .sort({ priority: 1, createdAt: -1 })
    .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT);

export const getScopedContentBootstrapOperationalData = async (authUser?: AuthUser) => {
  if (authUser?.role === "admin") {
    const [groups, b2bPackages, accessCodes, announcementAds] = await Promise.all([
      GroupModel.find().sort({ createdAt: -1 }).lean(),
      B2BPackageModel.find().sort({ createdAt: -1 }).lean(),
      AccessCodeModel.find().sort({ createdAt: -1 }).lean(),
      AnnouncementAdModel.find().sort({ priority: 1, createdAt: -1 }).lean(),
    ]);

    return { groups, b2bPackages, accessCodes, announcementAds };
  }

  if (!authUser) {
    const announcementAds = await getPublicAnnouncementAds().lean();
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const user = await UserModel.findById(authUser.id).select("schoolId groupIds linkedStudentIds role");
  if (!user) {
    const announcementAds = await getPublicAnnouncementAds();
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const managedGroups =
    user.role === "teacher" || user.role === "supervisor"
      ? await GroupModel.find({
          $or: [
            { ownerId: authUser.id },
            { supervisorIds: authUser.id },
            ...(authUser.schoolId ? [{ parentId: authUser.schoolId }, { _id: authUser.schoolId }, { id: authUser.schoolId }] : []),
          ],
        }).select("id _id parentId type")
      : [];

  const linkedStudents =
    user.role === "parent" && Array.isArray(user.linkedStudentIds) && user.linkedStudentIds.length
      ? await UserModel.find(buildDocumentsByIdsQuery(user.linkedStudentIds.map(String))).select("schoolId groupIds")
      : [];

  const seedGroupIds = uniqueStrings([
    String(user.schoolId || ""),
    ...(user.groupIds || []).map(String),
    ...managedGroups.flatMap((group) => [String(group.id || group._id), String(group.parentId || "")]),
    ...linkedStudents.flatMap((student) => [String(student.schoolId || ""), ...(student.groupIds || []).map(String)]),
  ]);

  if (seedGroupIds.length === 0) {
    const announcementAds = await getPublicAnnouncementAds();
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const seedGroups = await GroupModel.find(buildDocumentsByIdsQuery(seedGroupIds)).sort({ createdAt: -1 });
  const schoolIds = uniqueStrings([
    String(user.schoolId || ""),
    ...linkedStudents.map((student) => String(student.schoolId || "")),
    ...seedGroups
      .filter((group) => group.type === "SCHOOL")
      .map((group) => String(group.id || group._id)),
    ...seedGroups.map((group) => String(group.parentId || "")),
  ]);
  const visibleGroupIds = uniqueStrings([...seedGroupIds, ...schoolIds]);
  const groups = visibleGroupIds.length
    ? await GroupModel.find(buildDocumentsByIdsQuery(visibleGroupIds)).sort({ createdAt: -1 })
    : [];
  const [b2bPackages, accessCodes, announcementAds] = await Promise.all([
    schoolIds.length ? B2BPackageModel.find({ schoolId: { $in: schoolIds } }).sort({ createdAt: -1 }) : Promise.resolve([]),
    user.role === "supervisor" && schoolIds.length
      ? AccessCodeModel.find({ schoolId: { $in: schoolIds } }).sort({ createdAt: -1 })
      : Promise.resolve([]),
    getPublicAnnouncementAds(),
  ]);

  return { groups, b2bPackages, accessCodes, announcementAds };
};
