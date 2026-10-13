import mongoose from 'mongoose';
import { GroupModel } from '../../../models/Group.js';
import { SchoolMembershipModel } from '../../../models/SchoolMembership.js';
import { TeachingAssignmentModel } from '../../../models/TeachingAssignment.js';
import { buildSupervisorDirectScope } from '../../quizzes/application/quizSupervisorScope.js';

type DirectoryActor = { id: string; role: string; schoolId?: string | null; groupIds?: string[] };
const unique = (values: unknown[]) => Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
// Query native identities: strictQuery can strip virtual `id` conditions into {}.
export const directoryObjectIds = (values: unknown[]) => unique(values).filter(mongoose.isValidObjectId).map(id => new mongoose.Types.ObjectId(id));

export async function resolveSchoolDirectoryScope(actor: DirectoryActor) {
  const [memberships, assignments] = await Promise.all([
    SchoolMembershipModel.find({ userId: actor.id }).select('schoolId role status permissions').lean(),
    actor.role === 'teacher'
      ? TeachingAssignmentModel.find({ teacherId: actor.id }).select('schoolId classId status').lean()
      : [],
  ]);
  const canonical = new Set(memberships.map(row => String(row.schoolId)));
  const eligible = memberships.filter(row => row.role === actor.role || (actor.role === 'supervisor' && row.role === 'school_admin'));
  const active = new Set(eligible.filter(row => row.status === 'active').map(row => String(row.schoolId)));
  const wide = new Set(eligible.filter(row => row.status === 'active' && actor.role === 'supervisor' &&
    (row.role === 'supervisor' || (row.role === 'school_admin' && row.permissions.includes('SCHOOL_STUDENTS_VIEW'))))
    .map(row => String(row.schoolId)));
  const canRead = (school: string) => !canonical.has(school) || active.has(school);
  const canReadWide = (school: string) => actor.role === 'supervisor' && (!canonical.has(school) || wide.has(school));
  const assignmentByClass = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const classId = String(assignment.classId);
    const rows = assignmentByClass.get(classId) || [];
    rows.push(assignment);
    assignmentByClass.set(classId, rows);
  }
  const assigned = directoryObjectIds([
    ...(actor.groupIds || []),
    ...assignments.filter(row => row.status === 'active' && canRead(String(row.schoolId))).map(row => row.classId),
  ]);
  const candidates = await GroupModel.find({ $or: [
    { supervisorIds: actor.id }, { ownerId: actor.id },
    ...(assigned.length ? [{ _id: { $in: assigned } }] : []),
  ] }).lean();
  const direct = candidates.filter(group => {
    if (group.type === 'SCHOOL') return canReadWide(String(group._id));
    const schoolId = String(group.parentId || '');
    if (!canRead(schoolId)) return false;
    const classAssignments = assignmentByClass.get(String(group._id));
    // A canonical class row, including inactive, overrides legacy relationships.
    return !classAssignments || classAssignments.some(assignment => assignment.status === 'active' && String(assignment.schoolId) === schoolId);
  });
  const authority = buildSupervisorDirectScope({
    schoolId: actor.schoolId && canReadWide(actor.schoolId) ? actor.schoolId : undefined,
    managedGroupIds: direct.map(group => String(group._id)), seedGroups: direct, directlySupervisedGroups: direct,
  });
  authority.schoolIds = unique([...authority.schoolIds, ...wide]);
  const children = authority.schoolIds.length ? await GroupModel.find({ parentId: { $in: authority.schoolIds } }).lean() : [];
  const explicitSchools = directoryObjectIds(authority.schoolIds);
  const schools = explicitSchools.length ? await GroupModel.find({ _id: { $in: explicitSchools } }).lean() : [];
  const groups = Array.from(new Map([...direct, ...children, ...schools].map(group => [String(group._id), group])).values());
  const groupIds = unique([...authority.groupIds, ...groups.map(group => group._id)]);
  const studentIds = unique(groups.flatMap(group => group.studentIds || []));
  const schoolIds = authority.schoolIds;
  const rosterFilter = { $or: [
    { _id: { $in: directoryObjectIds([actor.id, ...studentIds]) } }, { groupIds: { $in: groupIds } },
    ...(schoolIds.length ? [{ schoolId: { $in: schoolIds } }] : []),
  ] };
  return { groups, groupIds, schoolIds, studentIds, rosterFilter };
}
