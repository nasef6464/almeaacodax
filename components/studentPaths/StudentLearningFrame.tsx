import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStudentExperience } from '../../contexts/StudentExperienceContext';
export const StudentLearningFrame = ({ children }: { children: React.ReactNode }) => {
    const { scope } = useStudentExperience();
    const location = useLocation();
    const path = scope.registeredPaths.find(path => path.id === scope.activePathId) || (scope.registeredPaths.length === 1 ? scope.registeredPaths[0] : undefined);
    const focusedLesson = location.pathname.startsWith('/course/') && new URLSearchParams(location.search).get('learn') === '1';
    return <main data-student-template={scope.template} className={scope.template === 'simple' ? 'student-template-simple text-base' : undefined}>
        {scope.template === 'simple' && <>
            <style>{`.student-template-simple button,.student-template-simple select,.student-template-simple input{min-height:48px;font-size:16px}.student-template-simple p{line-height:1.8}`}</style>
            {!focusedLesson && path && <section aria-label="خطوتي التالية" className="mx-auto max-w-6xl m-4 p-4 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-wrap items-center justify-between gap-3" dir="rtl"><div><strong className="text-lg text-emerald-900">نتعلم خطوة بخطوة</strong><p className="text-emerald-800 text-sm">اختر درسًا، أكمله، ثم جرّب سؤالًا.</p></div><div className="flex gap-2"><Link to={'/category/'+encodeURIComponent(path.id)} className="rounded-xl bg-emerald-600 text-white font-bold px-5 py-3">ابدأ التعلم</Link><Link to="/dashboard?tab=paths" className="rounded-xl bg-white text-emerald-900 font-bold px-5 py-3">شاهد تقدّمك</Link></div></section>}
        </>}
        {children}
    </main>;
};
