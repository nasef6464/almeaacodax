import { directoryObjectIds, resolveSchoolDirectoryScope } from '../../schools/application/schoolDirectoryScope.js';
import mongoose from "mongoose";
import { AccessCodeModel } from "../../../models/AccessCode.js";
import { AnnouncementAdModel } from "../../../models/AnnouncementAd.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { getAuthorizedStudentIdsForParent } from "../../parents/application/parentAuthority.js";

export const PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT = 8;

type AuthUser = { id: string; role: string; schoolId?: string | null; groupIds?: string[] };

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

const getPublicAnnouncementAds = () =>
  AnnouncementAdModel.find({ isActive: true })
    .sort({ priority: 1, createdAt: -1 })
    .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT);

export const getScopedContentBootstrapOperationalData = async (authUser?: AuthUser, principalVerified = false) => {
  const empty = async () => ({groups:[],b2bPackages:[],accessCodes:[],announcementAds:await getPublicAnnouncementAds().lean()});
  if(!authUser)return empty();
  const user = principalVerified ? authUser : await UserModel.findById(authUser.id).select('role isActive schoolId groupIds').lean();
  if(!user || ('isActive' in user && user.isActive===false))return empty();
  const actor={id:authUser.id,role:user.role,schoolId:user.schoolId,groupIds:user.groupIds||[]};
  if(actor.role==='admin') {
    const [groups,b2bPackages,accessCodes,announcementAds]=await Promise.all([
      GroupModel.find().sort({createdAt:-1}).lean(),B2BPackageModel.find().sort({createdAt:-1}).lean(),
      AccessCodeModel.find().sort({createdAt:-1}).lean(),AnnouncementAdModel.find().sort({priority:1,createdAt:-1}).lean(),
    ]);return {groups,b2bPackages,accessCodes,announcementAds};
  }
  if(['teacher','supervisor'].includes(actor.role)) {
    const scope=await resolveSchoolDirectoryScope(actor);
    const contextIds=uniqueStrings(scope.groups.map(group=>String(group.parentId||''))).filter(id=>!scope.groupIds.includes(id));
    const parents=contextIds.length?await GroupModel.find({_id:{$in:directoryObjectIds(contextIds)}}).lean():[];
    const allowedStudents=new Set(scope.studentIds);
    // A parent school is display context, never school-wide roster/code authority.
    const groups=[...scope.groups,...parents.map(group=>({...group,studentIds:(group.studentIds||[]).filter(id=>allowedStudents.has(String(id))),supervisorIds:[]}))];
    const packageSchoolIds=uniqueStrings([...scope.schoolIds,...contextIds]);
    const [b2bPackages,accessCodes,announcementAds]=await Promise.all([
      packageSchoolIds.length?B2BPackageModel.find({schoolId:{$in:packageSchoolIds}}).sort({createdAt:-1}).lean():[],
      actor.role==='supervisor' && scope.schoolIds.length?AccessCodeModel.find({schoolId:{$in:scope.schoolIds}}).sort({createdAt:-1}).lean():[],getPublicAnnouncementAds().lean(),
    ]);return {groups,b2bPackages,accessCodes,announcementAds};
  }
  const children=actor.role==='parent'?await getAuthorizedStudentIdsForParent(actor.id):[];
  const linked=children.length?await UserModel.find({_id:{$in:directoryObjectIds(children)}}).select('schoolId groupIds').lean():[];
  const seedIds=uniqueStrings([String(actor.schoolId||''),...actor.groupIds,...linked.flatMap(child=>[String(child.schoolId||''),...(child.groupIds||[]).map(String)])]);
  if(!seedIds.length)return empty();
  const seeds=await GroupModel.find({_id:{$in:directoryObjectIds(seedIds)}}).lean();
  const schoolIds=uniqueStrings([String(actor.schoolId||''),...linked.map(child=>String(child.schoolId||'')),...seeds.filter(group=>group.type==='SCHOOL').map(group=>String(group._id)),...seeds.map(group=>String(group.parentId||''))]);
  const allowed=new Set(actor.role==='parent'?children:[actor.id]);
  const groups=await GroupModel.find({_id:{$in:directoryObjectIds([...seedIds,...schoolIds])}}).sort({createdAt:-1}).lean();
  const [b2bPackages,announcementAds]=await Promise.all([schoolIds.length?B2BPackageModel.find({schoolId:{$in:schoolIds}}).sort({createdAt:-1}).lean():[],getPublicAnnouncementAds().lean()]);
  return {groups:groups.map(group=>({...group,studentIds:(group.studentIds||[]).filter(id=>allowed.has(String(id))),supervisorIds:[]})),b2bPackages,accessCodes:[],announcementAds};
};
