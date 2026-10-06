import React from 'react';
import { Download } from 'lucide-react';
import { User } from '../../../types';

interface SchoolRelationsReportPanelProps {
    studentsWithoutParent: User[];
    studentsWithoutClass: User[];
    downloadRelationsReport: () => void;
}

export const SchoolRelationsReportPanel: React.FC<SchoolRelationsReportPanelProps> = ({
    studentsWithoutParent,
    studentsWithoutClass,
    downloadRelationsReport,
}) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
            <div>
                <h3 className="text-lg font-black text-gray-900">تقرير المتابعة المدرسية</h3>
                <p className="mt-1 text-sm leading-7 text-gray-500">
                    ملف واضح للإدارة يضم الطلاب، أولياء الأمور، المشرفين، والنواقص التي تحتاج استكمال.
                </p>
            </div>
            <button
                onClick={downloadRelationsReport}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
                <Download size={16} /> تصدير التقرير
            </button>
        </div>

        <div className="space-y-3">
            {studentsWithoutParent.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                    <div>
                        <p className="font-bold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.email || 'بدون بريد'}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">بلا ولي أمر</span>
                </div>
            ))}
            {studentsWithoutParent.length === 0 && studentsWithoutClass.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-800">
                    وضع الربط الأساسي جيد: لا يوجد طلاب بلا ولي أمر أو بلا فصل.
                </div>
            ) : null}
            {studentsWithoutClass.slice(0, 5).map((student) => (
                <div key={`class-${student.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                    <div>
                        <p className="font-bold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.email || 'بدون بريد'}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">بلا فصل</span>
                </div>
            ))}
        </div>
    </div>
);
