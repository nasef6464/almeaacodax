import type { ImportRow, RelationImportRow } from './contracts';

/**
 * Pure row parsing for school student/relationship imports.
 *
 * Keep this module browser- and XLSX-independent so the business mapping can be
 * executed directly by the refactor contract tests.
 */
export const normalizeImportHeader = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/\uFEFF/g, '')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/\s+/g, '');

const aliasSet = (aliases: string[]) => new Set(aliases.map(normalizeImportHeader));

const STUDENT_IMPORT_HEADER_ALIASES = {
    name: aliasSet(['name', 'fullName', 'studentName', 'الاسم', 'اسم الطالب', 'اسم', 'الطالب']),
    email: aliasSet(['email', 'mail', 'البريد', 'البريد الإلكتروني', 'الايميل', 'الإيميل', 'بريد الطالب']),
    className: aliasSet(['className', 'class', 'classroom', 'الفصل', 'اسم الفصل', 'الصف', 'المجموعة']),
    password: aliasSet(['password', 'pass', 'كلمة المرور', 'كلمة السر', 'الرقم السري', 'passwordHint']),
};

const RELATION_IMPORT_HEADER_ALIASES = {
    studentEmail: aliasSet(['studentEmail', 'student', 'بريد الطالب', 'ايميل الطالب', 'إيميل الطالب', 'البريد الإلكتروني للطالب']),
    parentEmail: aliasSet(['parentEmail', 'parent', 'ولي الأمر', 'بريد ولي الأمر', 'ايميل ولي الأمر', 'إيميل ولي الأمر']),
    parentName: aliasSet(['parentName', 'اسم ولي الأمر', 'ولي الامر', 'guardianName']),
    supervisorEmail: aliasSet(['supervisorEmail', 'teacherEmail', 'بريد المشرف', 'ايميل المشرف', 'إيميل المشرف', 'بريد المعلم']),
    supervisorName: aliasSet(['supervisorName', 'teacherName', 'اسم المشرف', 'اسم المعلم']),
    className: aliasSet(['className', 'class', 'الفصل', 'اسم الفصل', 'الصف', 'المجموعة']),
};

const normalizeRows = (rows: unknown[][]) =>
    rows
        .map((row) => row.map((cell) => String(cell ?? '').trim()))
        .filter((row) => row.some(Boolean));

const canonicalizeHeader = <TKey extends string>(
    header: string,
    aliases: Record<TKey, Set<string>>,
): TKey | null => {
    const normalized = normalizeImportHeader(header);
    const entry = (Object.entries(aliases) as Array<[TKey, Set<string>]>).find(([, values]) => values.has(normalized));
    return entry?.[0] ?? null;
};

export const parseImportRows = (rows: unknown[][]): ImportRow[] => {
    const normalizedRows = normalizeRows(rows);
    if (normalizedRows.length < 2) return [];

    const headers = normalizedRows[0].map((header) => {
        const canonical = canonicalizeHeader(header, STUDENT_IMPORT_HEADER_ALIASES);
        return normalizeImportHeader(canonical ?? header);
    });

    const nameIndex = headers.findIndex((header) => header === 'name');
    const emailIndex = headers.findIndex((header) => header === 'email');
    const classIndex = headers.findIndex((header) => header === 'classname');
    const passwordIndex = headers.findIndex((header) => header === 'password');

    if (nameIndex === -1 || emailIndex === -1) {
        throw new Error('الملف يحتاج عمودين أساسيين على الأقل: name و email.');
    }

    return normalizedRows
        .slice(1)
        .map((cells) => ({
            name: (cells[nameIndex] || '').trim(),
            email: (cells[emailIndex] || '').trim(),
            className: classIndex >= 0 ? (cells[classIndex] || '').trim() : undefined,
            password: passwordIndex >= 0 ? (cells[passwordIndex] || '').trim() : undefined,
        }))
        .filter((row) => row.name && row.email);
};

export const parseRelationRows = (rows: unknown[][]): RelationImportRow[] => {
    const normalizedRows = normalizeRows(rows);
    if (normalizedRows.length < 2) return [];

    const headers = normalizedRows[0].map((header) => {
        const canonical = canonicalizeHeader(header, RELATION_IMPORT_HEADER_ALIASES);
        return normalizeImportHeader(canonical ?? header);
    });

    const studentEmailIndex = headers.findIndex((header) => header === 'studentemail');
    const parentEmailIndex = headers.findIndex((header) => header === 'parentemail');
    const parentNameIndex = headers.findIndex((header) => header === 'parentname');
    const supervisorEmailIndex = headers.findIndex((header) => header === 'supervisoremail');
    const supervisorNameIndex = headers.findIndex((header) => header === 'supervisorname');
    const classNameIndex = headers.findIndex((header) => header === 'classname');

    if (studentEmailIndex === -1) {
        throw new Error('ملف الربط يحتاج عمود بريد الطالب على الأقل.');
    }

    return normalizedRows
        .slice(1)
        .map((cells) => ({
            studentEmail: (cells[studentEmailIndex] || '').trim(),
            parentEmail: parentEmailIndex >= 0 ? (cells[parentEmailIndex] || '').trim() : undefined,
            parentName: parentNameIndex >= 0 ? (cells[parentNameIndex] || '').trim() : undefined,
            supervisorEmail: supervisorEmailIndex >= 0 ? (cells[supervisorEmailIndex] || '').trim() : undefined,
            supervisorName: supervisorNameIndex >= 0 ? (cells[supervisorNameIndex] || '').trim() : undefined,
            className: classNameIndex >= 0 ? (cells[classNameIndex] || '').trim() : undefined,
        }))
        .filter((row) => row.studentEmail || row.parentEmail || row.supervisorEmail || row.className);
};

export const getDuplicateImportEmails = (rows: ImportRow[]) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    rows.forEach((row) => {
        const email = row.email.trim().toLowerCase();
        if (!email) return;
        if (seen.has(email)) {
            duplicates.add(email);
            return;
        }
        seen.add(email);
    });

    return Array.from(duplicates);
};
