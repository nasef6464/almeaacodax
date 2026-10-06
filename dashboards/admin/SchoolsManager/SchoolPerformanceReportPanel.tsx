import React from 'react';
import { Download } from 'lucide-react';
import type { SchoolReport } from './contracts';

type NamedEntity = { id: string; name: string };

interface SchoolPerformanceReportPanelProps {
    isLoadingReport: boolean;
    reportError: string | null;
    schoolReport: SchoolReport | null;
    subjects: NamedEntity[];
    sections: NamedEntity[];
    downloadSchoolPerformanceReport: () => void;
}

export const SchoolPerformanceReportPanel: React.FC<SchoolPerformanceReportPanelProps> = ({
    isLoadingReport,
    reportError,
    schoolReport,
    subjects,
    sections,
    downloadSchoolPerformanceReport,
}) => {
    if (isLoadingReport) {
        return <div className="py-12 text-center text-gray-500">جارٍ تحميل تقرير المدرسة...</div>;
    }

    if (reportError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {reportError}
            </div>
        );
    }

    if (!schoolReport) {
        return <div className="py-12 text-center text-gray-500">لا توجد بيانات تقرير متاحة بعد.</div>;
    }

    return (
        <>
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">ملف تقرير المدرسة</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        لقطة تنفيذية للمدير أو المشرف تشمل الأداء العام، أضعف المهارات، وأداء الفصول.
                    </p>
                </div>
                <button
                    onClick={downloadSchoolPerformanceReport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                >
                    <Download size={16} />
                    تصدير تقرير المدرسة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-5 rounded-xl">
                    <p className="text-sm text-blue-700 mb-1">الطلاب النشطون</p>
                    <p className="text-3xl font-bold text-blue-600">{schoolReport.metrics.activeStudents}</p>
                </div>
                <div className="bg-purple-50 p-5 rounded-xl">
                    <p className="text-sm text-purple-700 mb-1">محاولات الاختبار</p>
                    <p className="text-3xl font-bold text-purple-600">{schoolReport.metrics.quizAttempts}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-xl">
                    <p className="text-sm text-emerald-700 mb-1">متوسط الأداء</p>
                    <p className="text-3xl font-bold text-emerald-600">{schoolReport.metrics.averageScore}%</p>
                </div>
                <div className="bg-amber-50 p-5 rounded-xl">
                    <p className="text-sm text-amber-700 mb-1">الأكواد النشطة</p>
                    <p className="text-3xl font-bold text-amber-600">{schoolReport.metrics.activeCodes}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-gray-100 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">أضعف المهارات داخل المدرسة</h3>
                    <div className="space-y-3">
                        {schoolReport.weakestSkills.length === 0 ? (
                            <p className="text-sm text-gray-500">لا توجد بيانات نتائج كافية بعد لإظهار نقاط الضعف.</p>
                        ) : schoolReport.weakestSkills.map((item) => {
                            const subjectName = subjects.find((subject) => subject.id === item.subjectId)?.name;
                            const sectionName = sections.find((section) => section.id === item.sectionId)?.name;
                            return (
                                <div key={`${item.skillId || item.skill}-${item.attempts}`} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{item.skill}</p>
                                            <p className="text-xs text-gray-500">{[subjectName, sectionName].filter(Boolean).join(' • ') || 'بدون تصنيف إضافي'}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.mastery < 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            إتقان {item.mastery}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">عدد المحاولات: {item.attempts}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">أداء الفصول</h3>
                    <div className="space-y-3">
                        {schoolReport.classSummaries.length === 0 ? (
                            <p className="text-sm text-gray-500">لا توجد فصول مرتبطة بهذه المدرسة بعد.</p>
                        ) : schoolReport.classSummaries.map((classroom) => (
                            <div key={classroom.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-gray-900">{classroom.name}</p>
                                        <p className="text-xs text-gray-500">{classroom.studentCount} طالب • {classroom.supervisorCount} مشرف</p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{classroom.averageScore}%</span>
                                </div>
                                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${classroom.averageScore >= 70 ? 'bg-emerald-500' : classroom.averageScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(classroom.averageScore, 100)}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">محاولات الاختبار: {classroom.quizAttempts}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};
