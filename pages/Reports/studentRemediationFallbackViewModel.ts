import { displayText, type SmartRemediationPlan, type StudentAggregatedSkill } from './reportDomain';

export const buildStudentRemediationFallback = (
    focusedReportSkills: StudentAggregatedSkill[],
): SmartRemediationPlan => ({
    title: 'خطة علاجية قصيرة',
    summary: 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.',
    steps: focusedReportSkills.slice(0, 3).map((skill, index) => ({
        day: `اليوم ${index + 1}`,
        skill: [displayText(skill.subjectName), displayText(skill.sectionName), displayText(skill.skill)]
            .filter(Boolean)
            .join(' - '),
        action: skill.mastery < 50
            ? 'راجع شرحًا قصيرًا ثم حل 5 أسئلة سهلة.'
            : 'حل تدريبًا متدرجًا ثم راجع الأخطاء.',
        check: 'أعد اختبارًا مصغرًا من 5 أسئلة على نفس المهارة.',
    })),
    parentNote: 'تابع التقدم بهدوء. المطلوب الآن خطوة صغيرة يوميًا وليس ضغطًا زائدًا.',
});
