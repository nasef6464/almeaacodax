import { displayText } from './reportDomain';
import type { ScopedSkillReportCard } from './scopedSkillReportViewModel';
import type { ScopedStudentFocusCard } from './scopedStudentFocusViewModel';

export type WorkbookCell = string | number;
export type WorkbookRows = WorkbookCell[][];

export const buildScopedSkillsWorkbookRows = (
    scopedSkillReportCards: ScopedSkillReportCard[],
): WorkbookRows => [
    ['المهارة', 'المحور', 'نسبة الإتقان', 'طلاب متأثرون', 'محاولات', 'الإجراء المقترح', 'شرح / دعم', 'اختبار موجه'],
    ...scopedSkillReportCards.map((skill) => [
        displayText(skill.skill) || '-',
        displayText(skill.section) || '-',
        `${skill.mastery}%`,
        skill.affectedStudents,
        skill.attempts,
        displayText(skill.recommendedAction) || 'شرح قصير ثم تدريب علاجي ثم اختبار متابعة.',
        displayText(skill.lessonTitle) || '-',
        displayText(skill.quizTitle) || '-',
    ]),
];

export const buildScopedStudentsWorkbookRows = (
    scopedStudentFocusCards: ScopedStudentFocusCard[],
): WorkbookRows => [
    ['الطالب', 'المجموعات', 'متوسط الأداء', 'عدد المحاولات', 'مهارات تحتاج دعم', 'أبرز المهارات', 'الإجراء المقترح'],
    ...scopedStudentFocusCards.map((student) => [
        displayText(student.name) || '-',
        student.groupNames?.length ? student.groupNames.map((name) => displayText(name)).join('، ') : '-',
        `${student.averageScore}%`,
        student.attempts,
        student.weakSkillCount,
        student.topSkills.length
            ? student.topSkills.map((skill) => `${displayText(skill.skill)} ${skill.mastery}%`).join('، ')
            : '-',
        displayText(student.recommendedAction) || 'شرح قصير ثم تدريب موجه ثم قياس.',
    ]),
];
