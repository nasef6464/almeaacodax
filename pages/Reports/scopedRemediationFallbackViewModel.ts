import { displayText, type SmartRemediationPlan } from './reportDomain';

export type ScopedRemediationSkill = {
    skill: string;
    mastery: number;
};

export const buildScopedRemediationFallback = (
    skillPayload: ScopedRemediationSkill[],
): SmartRemediationPlan => ({
    title: 'خطة تدخل للنطاق الحالي',
    summary: 'ابدأ بالمهارة الأكثر ضعفًا، وجه شرحًا قصيرًا، ثم اختبار متابعة لقياس التحسن.',
    steps: skillPayload.slice(0, 3).map((skill, index) => ({
        day: `خطوة ${index + 1}`,
        skill: displayText(skill.skill),
        action: index === 0
            ? 'أنشئ شرحًا أو حصة قصيرة لهذه المهارة.'
            : 'وجّه تدريبًا علاجيًا للطلاب المتأثرين.',
        check: 'أعد القياس باختبار قصير موجه لنفس المهارة.',
    })),
    parentNote: 'تابع الطلاب الضعاف بهدوء، واجعل التغذية الراجعة قصيرة وواضحة بعد كل محاولة.',
});
