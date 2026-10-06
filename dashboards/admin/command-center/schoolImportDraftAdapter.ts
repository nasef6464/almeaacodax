import type { ImportRow, RelationImportRow } from "../SchoolsManager/contracts";

const clean = (value: unknown) => String(value || "").trim();

export const buildSchoolDraftFromImportedRows = (input: {
  schoolName: string;
  schoolId?: string;
  roster: ImportRow[];
  relations: RelationImportRow[];
}) => {
  const classNames = [
    ...new Set([
      ...input.roster.map((row) => clean(row.className)),
      ...input.relations.map((row) => clean(row.className)),
    ].filter(Boolean)),
  ];
  const classKeyByName = new Map(
    classNames.map((name, index) => [name, `class-${index + 1}`]),
  );

  const students = new Map<string, { email: string; name?: string; classKey: string }>();
  input.roster.forEach((row) => {
    const email = clean(row.email).toLowerCase();
    const className = clean(row.className);
    if (!email || !className) return;
    students.set(email, {
      email,
      name: clean(row.name) || undefined,
      classKey: classKeyByName.get(className)!,
    });
  });
  input.relations.forEach((row) => {
    const email = clean(row.studentEmail).toLowerCase();
    const className = clean(row.className);
    if (!email || !className || students.has(email)) return;
    students.set(email, { email, classKey: classKeyByName.get(className)! });
  });

  const teachers = input.relations.flatMap((row) => {
    const email = clean(row.teacherEmail).toLowerCase();
    const className = clean(row.className);
    if (!email || !className) return [];
    return [{
      email,
      name: clean(row.teacherName) || undefined,
      classKey: classKeyByName.get(className)!,
    }];
  });

  const supervisors = [
    ...new Map(
      input.relations.flatMap((row) => {
        const email = clean(row.supervisorEmail).toLowerCase();
        if (!email) return [];
        return [[email, { email, name: clean(row.supervisorName) || undefined }] as const];
      }),
    ).values(),
  ];

  return {
    ...(clean(input.schoolId) ? { schoolId: clean(input.schoolId) } : {}),
    schoolName: clean(input.schoolName),
    classes: classNames.map((name) => ({ key: classKeyByName.get(name)!, name })),
    students: [...students.values()],
    teachers,
    supervisors,
  };
};

export const importedRowsMissingClasses = (rows: ImportRow[]) =>
  rows.filter((row) => !clean(row.className));
