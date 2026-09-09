export type SchoolMembershipRecord = { userId: string; schoolId: string; role: string; status: string };
export type TeachingAssignmentRecord = { schoolId: string; teacherId: string; classId: string; subjectId?: string; status: string };
export type SchoolContractRecord = { schoolId: string; status: string; modules: string[]; validFrom?: Date | null; validUntil?: Date | null };

const isCurrent = (contract: SchoolContractRecord, now: Date) =>
  contract.status === "active" && (!contract.validFrom || contract.validFrom <= now) && (!contract.validUntil || contract.validUntil >= now);

export const hasSchoolModule = (contract: SchoolContractRecord | null | undefined, schoolId: string, module: string, now = new Date()) =>
  Boolean(contract && contract.schoolId === schoolId && isCurrent(contract, now) && contract.modules.includes(module));

export const hasActiveSchoolMembership = (membership: SchoolMembershipRecord | null | undefined, userId: string, schoolId: string) =>
  Boolean(membership && membership.status === "active" && membership.userId === userId && membership.schoolId === schoolId);

export const canTeachAssignedClass = (assignment: TeachingAssignmentRecord | null | undefined, teacherId: string, schoolId: string, classId: string, subjectId?: string) =>
  Boolean(assignment && assignment.status === "active" && assignment.teacherId === teacherId && assignment.schoolId === schoolId && assignment.classId === classId && (!subjectId || !assignment.subjectId || assignment.subjectId === subjectId));
