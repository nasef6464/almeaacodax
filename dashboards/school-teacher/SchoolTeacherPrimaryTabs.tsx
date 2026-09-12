import React from 'react';
import { Bookmark, BookOpenCheck, Presentation, School, Trophy, UsersRound, Zap } from 'lucide-react';

interface PrimaryTabsProps {
  selectedSchool: any;
  userName?: string;
  onOpenScheduler: () => void;
  onOpenCertificate: () => void;
  onOpenClass: (classId: string) => void;
  onTabChange: (tab: 'reports' | 'prepared-questions') => void;
}

export const SchoolTeacherOverview: React.FC<PrimaryTabsProps> = ({
  selectedSchool,
  userName,
  onOpenScheduler,
  onOpenCertificate,
  onOpenClass,
  onTabChange,
}) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <div className="rounded-3xl bg-gradient-to-l from-indigo-800 via-indigo-900 to-slate-900 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-md bg-indigo-500/30 px-2.5 py-1 text-xs font-black text-indigo-200">
            مساحة تعليمية مدرسية معتمدة
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black">مرحباً بك، {userName || 'أستاذ المادة'} 👋</h1>
          <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-indigo-100 leading-6">
            من هنا تدير فصولك المسندة في {selectedSchool.schoolName}، وتبدأ الحصص التفاعلية، وتتابع الفجوات الصفية.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenScheduler}
            disabled={!selectedSchool.smartClassroomEnabled}
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 disabled:opacity-40 transition-all"
          >
            <Presentation size={16} /> بدء حصة ذكية
          </button>
          <button
            type="button"
            onClick={onOpenCertificate}
            className="flex items-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all"
          >
            <Trophy size={16} /> إصدار شهادة تقدير
          </button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">طلاب فصولي</span>
          <UsersRound size={20} className="text-emerald-600" />
        </div>
        <div className="mt-3 text-2xl font-black text-slate-900">{selectedSchool.assignments.reduce((total: number, assignment: any) => total + Number(assignment.studentCount || 0), 0)}</div>
        <p className="mt-1 text-[11px] text-slate-400">مسجلون فعليًا في فصولك المسندة</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">الحصص الذكية</span>
          <Presentation size={20} className="text-indigo-600" />
        </div>
        <div className="mt-3 text-2xl font-black text-slate-900">
          {selectedSchool.smartClassroomEnabled ? 'مفعلة 🟢' : 'غير مفعلة'}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">جاهزة للبث التفاعلي</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">اختبارات المدرسة</span>
          <BookOpenCheck size={20} className="text-amber-600" />
        </div>
        <div className="mt-3 text-2xl font-black text-slate-900">{selectedSchool.assessments.length}</div>
        <p className="mt-1 text-[11px] text-slate-400">اختبارات موجهة لفصولك</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">المدرسة الحالية</span>
          <School size={20} className="text-purple-600" />
        </div>
        <div className="mt-3 text-sm font-black text-slate-900 truncate">{selectedSchool.schoolName}</div>
        <p className="mt-1 text-[11px] text-slate-400">كود الإسناد الرسمي</p>
      </div>
    </div>

    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-black text-slate-900">فصولي المسندة وجدول الحصص</h2>
        <span className="text-xs text-slate-400">اضغط على أي فصل لبدء الحصة الذكية مباشرة</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {selectedSchool.assignments.map((assignment: any) => (
          <div
            key={assignment.assignmentId}
            className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:border-indigo-200 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-base">{assignment.className}</span>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                  {assignment.subjectId || 'تكليف عام'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                المادة: {assignment.subjectId || 'تكليف دراسي عام'} · نظام التقييم الذكي
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                {assignment.studentCount || 0} طالب في الفصل
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenClass(assignment.classId)}
                disabled={!selectedSchool.smartClassroomEnabled}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Presentation size={14} /> بدء حصة ذكية لهذا الفصل
              </button>
              <button
                type="button"
                onClick={() => onTabChange('reports')}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                تقارير الفصل →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-900">طلاب فصولي المسندة</h2>
        <p className="mt-1 text-xs text-slate-500">هذه القائمة تقرأ من إسنادك المدرسي فقط؛ لا تظهر طلاب أي فصل أو مدرسة أخرى.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {selectedSchool.assignments.map((assignment: any) => (
          <section key={`${assignment.assignmentId}-roster`} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-900">{assignment.className}</h3>
              <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">{assignment.studentCount || 0} طالب</span>
            </div>
            {assignment.students?.length ? (
              <ul className="mt-3 space-y-2">
                {assignment.students.map((student: any) => (
                  <li key={student.studentId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
                    <span className="font-bold text-slate-800">{student.name}</span>
                    <span className={student.isActive ? 'text-emerald-700' : 'text-slate-400'}>{student.isActive ? 'نشط' : 'غير نشط'}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-400">لا يوجد طلاب مسجلون في هذا الفصل بعد.</p>}
          </section>
        ))}
      </div>
    </div>
  </div>
);

export const SchoolTeacherSmartClassroom: React.FC<Omit<PrimaryTabsProps, 'userName' | 'onOpenCertificate'>> = ({
  selectedSchool,
  onOpenScheduler,
  onOpenClass,
  onTabChange,
}) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <div className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <Presentation size={18} />
            </span>
            <h2 className="text-xl font-black text-slate-900">مركز إدارة وإطلاق الحصص الذكية</h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 leading-5">
            يتيح لك النظام نمطين متكاملين: بث <b>سؤال تحدي فردي سريع ⚡</b> أو <b>حزمة أسئلة متكاملة 📚</b> مع إمكانية التبديل بينهما في أي لحظة أثناء الحصة.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenScheduler}
          disabled={!selectedSchool.smartClassroomEnabled}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-all"
        >
          <Zap size={16} /> إطلاق حصة الآن (تحديد اليوم والحصة) 🚀
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <div className="flex items-center gap-2 font-black text-sm text-amber-950 mb-2">
          <Zap size={18} className="text-amber-600" /> النمط الأول: سؤال تحدي سريع فردي ⚡
        </div>
        <p className="text-xs text-amber-900/80 leading-5">
          بث فوري لسؤال واحد سريع بمهلة 30 أو 45 أو 60 ثانية مع نقاط مضاعفة ورادار استجابات لحظي لكشف الفهم السريع وكسر رتابة الحصة.
        </p>
        <button type="button" onClick={onOpenScheduler} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-900">
          إطلاق تحدي سريع الآن ←
        </button>
      </div>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <div className="flex items-center gap-2 font-black text-sm text-indigo-950 mb-2">
          <Bookmark size={18} className="text-indigo-600" /> النمط الثاني: حزمة أسئلة صفية متتابعة 📚
        </div>
        <p className="text-xs text-indigo-900/80 leading-5">
          إطلاق جلسة تدريب صفي متتابعة من 2 إلى 10 أسئلة مجهزة مسبقاً، مع رابط السبورة التفاعلية للبروجكتور وكشف الأسئلة سؤالاً بعد سؤال.
        </p>
        <button type="button" onClick={() => onTabChange('prepared-questions')} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-indigo-700 hover:text-indigo-900">
          تحضير وتجهيز الحزم مسبقاً ←
        </button>
      </div>
    </div>

    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <h3 className="text-sm font-black text-slate-900 mb-4">اختر الفصل الدراسي لبدء الحصة التفاعلية</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selectedSchool.assignments.map((assignment: any) => (
          <div key={assignment.assignmentId} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col justify-between">
            <div>
              <p className="font-black text-slate-900 text-sm">{assignment.className}</p>
              <p className="text-xs text-slate-500 mt-1">المادة: {assignment.subjectId || 'عام'}</p>
            </div>
            <button type="button" onClick={() => onOpenClass(assignment.classId)} className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700">
              <Presentation size={13} /> إطلاق الحصة
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);
