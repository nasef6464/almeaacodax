import React from 'react';
import { BookOpen, Building2, Clock3, Key, ShieldCheck, Users } from 'lucide-react';
import type { ClassOperatingRow } from './relationshipViewModel';
import type { SchoolDecisionCard, SchoolOperatingStep } from './workspaceViewModel';

interface SchoolOverviewOperationsPanelProps {
    overviewFocusActions: SchoolDecisionCard[];
    nextOperatingStep: SchoolOperatingStep;
    studentCount: number;
    classCount: number;
    activePackageCount: number;
    totalSeats: number;
    usedSeats: number;
    activeCodeCount: number;
    classOperatingRows: ClassOperatingRow[];
    onFocusAction: (action: SchoolDecisionCard) => void;
    onOpenClass: (classroomId: string) => void;
}

export const SchoolOverviewOperationsPanel: React.FC<SchoolOverviewOperationsPanelProps> = ({
    overviewFocusActions,
    nextOperatingStep,
    studentCount,
    classCount,
    activePackageCount,
    totalSeats,
    usedSeats,
    activeCodeCount,
    classOperatingRows,
    onFocusAction,
    onOpenClass,
}) => (
    <>
        <div data-testid="school-overview-focus-strip" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-black text-slate-500">لوحة تشغيل المدرسة</p>
                    <h3 className="text-lg font-black text-gray-900">ابدأ من هنا بدل البحث داخل الصفحة</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                    {nextOperatingStep.title}
                </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {overviewFocusActions.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        data-testid={`school-overview-focus-${action.id}`}
                        onClick={() => onFocusAction(action)}
                        className={`rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                            action.tone === 'emerald'
                                ? 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                                : action.tone === 'amber'
                                    ? 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                                    : action.tone === 'purple'
                                        ? 'border-purple-100 bg-purple-50 hover:bg-purple-100'
                                        : action.tone === 'rose'
                                            ? 'border-rose-100 bg-rose-50 hover:bg-rose-100'
                                            : 'border-indigo-100 bg-indigo-50 hover:bg-indigo-100'
                        }`}
                    >
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-gray-600">
                                {action.label}
                            </span>
                            <span className="text-lg font-black text-gray-900">{action.value}</span>
                        </div>
                        <p className="min-h-[44px] text-xs font-bold leading-6 text-gray-600">{action.hint}</p>
                        <span className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800">
                            {action.actionLabel}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        <div data-testid="school-overview-metrics-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="text-blue-500" size={24} />
                    <h3 className="font-bold text-gray-900">إجمالي الطلاب</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600">{studentCount}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                    <Building2 className="text-purple-500" size={24} />
                    <h3 className="font-bold text-gray-900">الفصول الدراسية</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">{classCount}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="text-emerald-500" size={24} />
                    <h3 className="font-bold text-gray-900">الباقات النشطة</h3>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{activePackageCount}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <ShieldCheck size={18} />
                    <span className="text-xs font-black">المقاعد المتاحة</span>
                </div>
                <div className="text-2xl font-black text-amber-800">{totalSeats}</div>
                <p className="text-xs text-amber-700 mt-1">إجمالي سعة الباقات المدرسية</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                    <Users size={18} />
                    <span className="text-xs font-black">مقاعد مستخدمة</span>
                </div>
                <div className="text-2xl font-black text-indigo-800">{usedSeats}</div>
                <p className="text-xs text-indigo-700 mt-1">استخدام الأكواد حتى الآن</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <Key size={18} />
                    <span className="text-xs font-black">أكواد فعالة</span>
                </div>
                <div className="text-2xl font-black text-emerald-800">{activeCodeCount}</div>
                <p className="text-xs text-emerald-700 mt-1">صالحة الآن للتوزيع</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-700 mb-2">
                    <Clock3 size={18} />
                    <span className="text-xs font-black">طلاب المدرسة</span>
                </div>
                <div className="text-2xl font-black text-rose-800">{studentCount}</div>
                <p className="text-xs text-rose-700 mt-1">مرتبطون فعليًا بهذه المدرسة</p>
            </div>
        </div>

        <div data-testid="school-class-operating-brief" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-black text-slate-500">كشف تشغيل الفصول</p>
                    <h3 className="text-lg font-black text-gray-900">كل فصل واضح قبل التسليم</h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-gray-500">
                        ملخص سريع يوضح الطلاب والمشرفين والنواقص داخل كل فصل بدون فتح الجداول الطويلة.
                    </p>
                </div>
                <span className="w-fit rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                    {classOperatingRows.filter((row) => row.isReady).length}/{Math.max(classOperatingRows.length, 1)} جاهز
                </span>
            </div>
            {classOperatingRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm font-bold text-amber-800">
                    لا توجد فصول بعد. ابدأ بإنشاء فصل واحد حتى تصبح رحلة الطلاب والمشرفين واضحة.
                </div>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {classOperatingRows.map((row) => (
                        <div
                            key={row.classroom.id}
                            data-testid="school-class-operating-row"
                            className={`rounded-2xl border p-4 ${
                                row.isReady ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-100 bg-amber-50/70'
                            }`}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-black text-gray-900">{row.classroom.name}</h4>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                            row.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {row.isReady ? 'جاهز' : 'يحتاج مراجعة'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{row.studentCount} طالب</span>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-purple-700">{row.supervisorCount} مشرف</span>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-amber-700">{row.studentsWithoutParentCount} بلا ولي أمر</span>
                                    </div>
                                    <p className="mt-3 text-xs font-bold leading-6 text-gray-600">
                                        {row.gaps.length > 0 ? row.gaps.join('، ') : 'الفصل جاهز للتسليم والمتابعة.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    data-testid="school-class-operating-open"
                                    onClick={() => onOpenClass(row.classroom.id)}
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                                >
                                    فتح الفصل
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </>
);
