export function isPackageSeatAvailable(maxStudents: number | null | undefined, activeStudentGrants: number): boolean {
  const capacity = Number(maxStudents || 0);
  if (capacity <= 0) return true;
  return Math.max(0, Number(activeStudentGrants || 0)) < capacity;
}
