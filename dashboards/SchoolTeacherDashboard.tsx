import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, CalendarClock, ChevronLeft, Presentation, School, Trophy, UsersRound } from 'lucide-react';
import { TeacherWorkspaceSwitcher } from '../components/teacher/TeacherWorkspaceSwitcher';
import { useTeacherWorkspaceOptional } from '../components/teacher/TeacherWorkspaceContext';
import { SmartClassroomReportsSection } from '../components/classroom/SmartClassroomReportsSection';
import { ClassSkillGapsRadar } from '../components/classroom/ClassSkillGapsRadar';
import { StudentAppreciationCertificateModal } from '../components/classroom/StudentAppreciationCertificateModal';

export const SchoolTeacherDashboard: React.FC = () => {
  const workspace = useTeacherWorkspaceOptional();
  const [selectedSchoolId, setSelectedSchoolId] = useState(workspace?.schools[0]?.schoolId || '');
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const selectedSchool = useMemo(
    () => workspace?.schools.find((school) => school.schoolId === selectedSchoolId) || workspace?.schools[0],
    [selectedSchoolId, workspace],
  );
  if (!workspace || !selectedSchool) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-gradient-to-l from-indigo-700 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-indigo-200">مساحة مدرسة مستقلة</p>
              <h1 className="mt-1 text-3xl font-black">لوحة معلم المدرسة</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100">فصولك وتكليفاتك واختبارات المدرسة والفصل الذكي، وفق الإسناد المعتمد فقط.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-sm font-black text-white shadow-md transition-all active:scale-95"
              >
                <Trophy size={18} /> إصدار شهادة تقدير للطلاب
              </button>

              {workspace.schools.length > 1 && (
                <label className="text-sm font-bold">
                  <select value={selectedSchool.schoolId} onChange={(event) => setSelectedSchoolId(event.target.value)} className="block w-full min-w-48 rounded-xl border-0 bg-white px-4 py-3 text-slate-900 font-bold">
                    {workspace.schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>
          <TeacherWorkspaceSwitcher />
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><School className="text-indigo-600" /><p className="mt-3 text-sm text-slate-500">المدرسة الحالية</p><p className="text-lg font-black">{selectedSchool.schoolName}</p></div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><UsersRound className="text-emerald-600" /><p className="mt-3 text-sm text-slate-500">الفصول المسندة</p><p className="text-3xl font-black">{selectedSchool.assignments.length}</p></div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><BookOpenCheck className="text-amber-600" /><p className="mt-3 text-sm text-slate-500">اختبارات المدرسة</p><p className="text-3xl font-black">{selectedSchool.assessments.length}</p></div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black">فصولي</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {selectedSchool.assignments.map((assignment) => (
              <article key={assignment.assignmentId} data-testid="school-teacher-assignment" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-lg font-black">{assignment.className}</p>
                <p className="mt-1 text-sm text-slate-500">المادة: {assignment.subjectId || 'تكليف عام للفصل'}</p>
                {selectedSchool.smartClassroomEnabled ? (
                  <Link to={`/classroom/teacher?schoolId=${encodeURIComponent(selectedSchool.schoolId)}&classId=${encodeURIComponent(assignment.classId)}`} className="mt-5 flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 font-black text-white hover:bg-indigo-700">
                    <span className="flex items-center gap-2"><Presentation size={18} /> ابدأ فصلًا ذكيًا</span><ChevronLeft size={18} />
                  </Link>
                ) : <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">وحدة الفصل الذكي غير مفعلة في عقد المدرسة.</p>}
              </article>
            ))}
          </div>
        </section>

        {/* Class Skill Gaps Heatmap / Radar */}
        <ClassSkillGapsRadar
          schoolId={selectedSchool.schoolId}
          assignments={selectedSchool.assignments}
        />

        {/* Smart Classroom Persistent Reports & Archive */}
        <SmartClassroomReportsSection
          schoolId={selectedSchool.schoolId}
          assignments={selectedSchool.assignments}
          smartClassroomEnabled={selectedSchool.smartClassroomEnabled}
        />

        <section className="mt-8 pb-10">
          <h2 className="text-xl font-black">اختبارات المدرسة الموجهة لفصولي</h2>
          <div className="mt-4 space-y-3">
            {selectedSchool.assessments.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">لا توجد اختبارات منشورة موجهة لفصولك الآن.</div> : selectedSchool.assessments.map((assessment) => (
              <div key={assessment.assessmentId} data-testid="school-teacher-assessment" className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-black">{assessment.title}</p><p className="mt-1 text-sm text-slate-500">المادة: {assessment.subjectId || 'عام'} · {assessment.classIds.length} فصل</p></div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600"><CalendarClock size={17} />{assessment.dueDate || 'بدون موعد نهائي'}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Student Appreciation Certificate Generator Modal */}
        <StudentAppreciationCertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          defaultSchoolName={selectedSchool.schoolName}
          defaultClassName={selectedSchool.assignments[0]?.className || 'الصف الثالث الثانوي (أ)'}
        />
      </div>
    </main>
  );
};
