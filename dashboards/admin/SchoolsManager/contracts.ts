import { Role } from '../../../types';
import type { PackageContentType } from '../../../types';

/**
 * Compatibility contracts for the SchoolsManager sub-panels.
 *
 * These live outside SchoolsManager.tsx so child panels never import their
 * parent component. That keeps the component dependency graph acyclic while
 * the large manager is decomposed incrementally.
 */
export type ImportRow = {
    name: string;
    email: string;
    className?: string;
    password?: string;
};

export type ImportSummary = {
    totalRows: number;
    imported: number;
    classesTouched: number;
};

export type ImportResponse = {
    summary: ImportSummary;
    credentials: Array<{ name: string; email: string; password: string; className?: string }>;
};

export type RelationImportRow = {
    studentEmail: string;
    parentEmail?: string;
    parentName?: string;
    supervisorEmail?: string;
    supervisorName?: string;
    className?: string;
};

export type RelationImportSummary = {
    rows: number;
    createdParents: number;
    createdSupervisors: number;
    linkedParents: number;
    linkedSupervisors: number;
    assignedClasses: number;
    missingStudents: number;
    missingParents: number;
    missingSupervisors: number;
    missingClasses: number;
    skippedRows: number;
};

export type RelationCredential = {
    role: Role.PARENT | Role.SUPERVISOR;
    name: string;
    email: string;
    password: string;
    linkedTo: string;
};

export const PACKAGE_CONTENT_OPTIONS: Array<{ value: PackageContentType; label: string }> = [
    { value: 'all', label: 'شاملة' },
    { value: 'courses', label: 'الدورات' },
    { value: 'foundation', label: 'التأسيس' },
    { value: 'banks', label: 'التدريبات' },
    { value: 'tests', label: 'الاختبارات' },
    { value: 'mockExams', label: 'الاختبارات المحاكية' },
    { value: 'library', label: 'المكتبة' },
];
