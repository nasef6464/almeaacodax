import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { displayText } from './reportDomain';
import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';

interface StudentWeeklyPlanPanelProps {
    visible: boolean;
    items: StudentWeeklyPlanItem[];
}

export const StudentWeeklyPlanPanel: React.FC<StudentWeeklyPlanPanelProps> = ({ visible, items }) => {
    if (!visible || items.length === 0) return null;

    return (
        <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">خطة أسبوعية صغيرة</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        ثلاث خطوات خفيفة تبدأ من أضعف المهارات، مناسبة للمذاكرة اليومية وولي الأمر يقدر يتابعها بسهولة.
                    </p>
                </div>
                <Link to="/plan" className="self-start rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
                    افتح خطتي الدراسية
                </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                {items.map((item) => (
                    <div key={`${item.day}-${item.skill}`} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">{item.day}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${item.mastery < 50 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                {item.mastery}%
                            </span>
                        </div>
                        <div className="mt-3 font-black text-gray-900 leading-7 break-words">{item.skill}</div>
                        {(item.subjectName || item.sectionName) ? (
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-gray-500">
                                {item.subjectName ? <span className="rounded-full bg-white px-2 py-1">المادة: {displayText(item.subjectName)}</span> : null}
                                {item.sectionName ? <span className="rounded-full bg-white px-2 py-1">المهارة الرئيسية: {displayText(item.sectionName)}</span> : null}
                            </div>
                        ) : null}
                        <p className="mt-2 text-sm leading-7 text-gray-600">{displayText(item.actionText)}</p>
                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                            {item.lessonTitle ? <div>شرح مقترح: <span className="font-bold">{displayText(item.lessonTitle)}</span></div> : null}
                            {item.lessonTopicTitle ? <div>داخل موضوع: <span className="font-bold">{displayText(item.lessonTopicTitle)}</span></div> : null}
                            {item.quizTitle ? <div>تدريب مقترح: <span className="font-bold">{displayText(item.quizTitle)}</span></div> : null}
                        </div>
                        <div className="print-hide mt-4 grid gap-2">
                            {item.lessonLink ? (
                                <Link to={item.lessonLink} className="rounded-xl bg-indigo-600 px-3 py-2 text-center text-xs font-black text-white hover:bg-indigo-700">
                                    فتح شرح اليوم
                                </Link>
                            ) : null}
                            {item.quizLink ? (
                                <Link to={item.quizLink} className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700 hover:bg-amber-100">
                                    فتح تدريب اليوم
                                </Link>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};
