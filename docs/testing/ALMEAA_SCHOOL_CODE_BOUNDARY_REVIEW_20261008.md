# School access-code integrity review (isolated branch)

Review date: 2026-10-08. Scope: static source review only; no production requests.

## Finding
The access-code redemption handler looks up the linked package and checks active status, but does not compare `accessCode.schoolId` with `linkedPackage.schoolId` before issuing a grant and assigning a student's school. The access-code creation handler also does not validate that its `packageId` belongs to its `schoolId`.

## Suggested regression cases
- Reject code creation when package and code have different schools.
- Reject code redemption when an existing code and its package have different schools; no use count or access grant should change.
- Reject supervisor reassignment of school-bound resources outside their managed scope.

No code change, CI run, or production deployment is claimed in this note.
