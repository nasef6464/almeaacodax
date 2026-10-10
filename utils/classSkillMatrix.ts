export type MatrixSkill = { skill: string; mastery: number; skillId?: string; pathId?: string; subjectId?: string };
export type MatrixStudent = { id: string; name: string; className: string; classId?: string; schoolName?: string; resultsList: Array<{ skillsAnalysis?: MatrixSkill[] }> };
export type MatrixFilters = { pathId?: string; subjectId?: string };
export const matrixSkillKey = (skill: MatrixSkill) => JSON.stringify([skill.pathId || '', skill.subjectId || '', skill.skillId || skill.skill.trim()]);

/** Read-only presentation aggregation; never infer missing legacy scope from names. */
export function buildClassSkillMatrix(students: MatrixStudent[], filters: MatrixFilters = {}) {
  const columns = new Map<string, MatrixSkill & { key: string; total: number; count: number; studentIds: Set<string> }>();
  const studentSkillMap = new Map<string, Map<string, { total: number; count: number }>>();
  for (const student of students) {
    const cells = new Map<string, { total: number; count: number }>();
    for (const result of student.resultsList) for (const skill of result.skillsAnalysis || []) {
      if (!skill.skill?.trim() || !Number.isFinite(skill.mastery)) continue;
      if (filters.pathId && filters.pathId !== 'all' && skill.pathId !== filters.pathId) continue;
      if (filters.subjectId && filters.subjectId !== 'all' && skill.subjectId !== filters.subjectId) continue;
      const key = matrixSkillKey(skill);
      const column = columns.get(key) || { ...skill, key, total: 0, count: 0, studentIds: new Set<string>() };
      column.total += skill.mastery; column.count++; column.studentIds.add(student.id); columns.set(key, column);
      const cell = cells.get(key) || { total: 0, count: 0 };
      cell.total += skill.mastery; cell.count++; cells.set(key, cell);
    }
    studentSkillMap.set(student.id, cells);
  }
  return {
    skillColumns: [...columns.values()].map(column => ({ ...column, avg: Math.round(column.total / column.count), measuredStudents: column.studentIds.size })).sort((a, b) => a.avg - b.avg || a.key.localeCompare(b.key)),
    studentSkillMap,
  };
}
