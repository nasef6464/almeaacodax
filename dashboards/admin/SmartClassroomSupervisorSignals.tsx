import React, { useMemo } from 'react';
import { Activity, TrendingUp, UserRoundSearch, UsersRound } from 'lucide-react';

type Summary = {
  sessions: number;
  participants: number;
  expected: number;
  participationRate: number | null;
  responses: number;
  correct: number;
  accuracy: number | null;
};

type StudentSignal = {
  studentId: string;
  name: string;
  joinedSessions: number;
  responses: number;
  possibleResponses: number;
  responseRate: number | null;
  accuracy: number | null;
  improvement: number | null;
  earlyAccuracy: number | null;
  recentAccuracy: number | null;
};

type ClassNode = {
  classId: string;
  className: string;
  summary: Summary;
};

type TeacherNode = {
  teacherId: string;
  teacherName: string;
  summary: Summary;
  classes: ClassNode[];
};

type SchoolNode = {
  schoolId: string;
  schoolName: string;
  summary: Summary;
  teachers: TeacherNode[];
};

interface Props {
  schools: SchoolNode[];
  selectedSchoolId: string;
  selectedTeacherId: string;
  leastParticipation: StudentSignal[];
  mostImproved: StudentSignal[];
}

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${value}%`;

const compact = (value: number) => new Intl.NumberFormat('ar-SA', { notation: 'compact' }).format(value);

export const SmartClassroomSupervisorSignals: React.FC<Props> = ({
  schools,
  selectedSchoolId,
  selectedTeacherId,
  leastParticipation,
  mostImproved,
}) => {
  const teacherRows = useMemo(() => {
    const source = selectedSchoolId === 'all'
      ? schools.flatMap((school) => school.teachers.map((teacher) => ({ ...teacher, schoolName: school.schoolName })))
      : (schools.find((school) => school.schoolId === selectedSchoolId)?.teachers || []).map((teacher) => ({
          ...teacher,
          schoolName: schools.find((school) => school.schoolId === selectedSchoolId)?.schoolName || '',
        }));
    return source
      .sort((left, right) => right.summary.sessions - left.summary.sessions || (right.summary.accuracy ?? -1) - (left.summary.accuracy ?? -1))
      .slice(0, 8);
  }, [schools, selectedSchoolId]);

  const classRows = useMemo(() => {
    const schoolsInScope = selectedSchoolId === 'all'
      ? schools
      : schools.filter((school) => school.schoolId === selectedSchoolId);
    const rows = schoolsInScope.flatMap((school) => school.teachers.flatMap((teacher) => {
      if (selectedTeacherId !== 'all' && teacher.teacherId !== selectedTeacherId) return [];
      return teacher.classes.map((classroom) => ({
        ...classroom,
        teacherName: teacher.teacherName,
        schoolName: school.schoolName,
      }));
    }));
    return rows
      .sort((left, right) => (right.summary.accuracy ?? -1) - (left.summary.accuracy ?? -1) || right.summary.sessions - left.summary.sessions)
      .slice(0, 8);
  }, [schools, selectedSchoolId, selectedTeacherId]);

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2" dir="rtl">
      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <Activity size={17} className="text-indigo-600" />
          <h3 className="text-sm font-black text-slate-950">نشاط المعلمين في الفترة</h3>
        </div>
        {teacherRows.length === 0 ? (
          <p className="mt-3 text-xs font-bold text-slate-400">لا توجد بيانات معلمين ضمن الفترة الحالية.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {teacherRows.map((teacher) => (
              <div key={`${teacher.schoolName}:${teacher.teacherId}`} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-slate-900">{teacher.teacherName}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{teacher.schoolName}</div>
                  </div>
                  <div className="text-left text-[11px] font-bold text-slate-600">
                    <div>{teacher.summary.sessions} حصص</div>
                    <div>دقة {percent(teacher.summary.accuracy)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <UsersRound size={17} className="text-emerald-600" />
          <h3 className="text-sm font-black text-slate-950">مقارنة الفصول</h3>
        </div>
        {classRows.length === 0 ? (
          <p className="mt-3 text-xs font-bold text-slate-400">لا توجد فصول مطابقة للنطاق الحالي.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-right text-xs">
              <thead className="text-slate-400"><tr><th className="pb-2">الفصل</th><th className="pb-2">المعلم</th><th className="pb-2">الحصص</th><th className="pb-2">المشاركة</th><th className="pb-2">الدقة</th></tr></thead>
              <tbody>
                {classRows.map((row) => (
                  <tr key={`${row.schoolName}:${row.teacherName}:${row.classId}`} className="border-t border-slate-100">
                    <td className="py-2 font-black text-slate-900">{row.className}</td>
                    <td className="py-2 text-slate-600">{row.teacherName}</td>
                    <td className="py-2 text-slate-600">{row.summary.sessions}</td>
                    <td className="py-2 text-slate-600">{percent(row.summary.participationRate)}</td>
                    <td className="py-2 font-black text-emerald-700">{percent(row.summary.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
        <div className="flex items-center gap-2">
          <UserRoundSearch size={17} className="text-amber-700" />
          <div><h3 className="text-sm font-black text-amber-950">الطلاب الأقل مشاركة</h3><p className="mt-0.5 text-[10px] font-bold text-amber-700/60">على كامل نطاق الإشراف في الفترة المختارة</p></div>
        </div>
        {leastParticipation.length === 0 ? (
          <p className="mt-3 text-xs font-bold text-amber-700/60">لا توجد أدلة كافية في الفترة الحالية.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {leastParticipation.slice(0, 8).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div>
                  <div className="text-xs font-black text-slate-900">{student.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{student.joinedSessions} حصص · {compact(student.responses)} إجابة</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-black text-amber-700">{percent(student.responseRate)}</div>
                  <div className="text-[10px] text-slate-400">استجابة</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={17} className="text-emerald-700" />
          <div><h3 className="text-sm font-black text-emerald-950">الأكثر تحسنًا</h3><p className="mt-0.5 text-[10px] font-bold text-emerald-700/60">على كامل نطاق الإشراف في الفترة المختارة</p></div>
        </div>
        {mostImproved.length === 0 ? (
          <p className="mt-3 text-xs font-bold text-emerald-700/60">نحتاج حصتين على الأقل وأدلة كافية لحساب التحسن.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {mostImproved.slice(0, 8).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div>
                  <div className="text-xs font-black text-slate-900">{student.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{percent(student.earlyAccuracy)} ← {percent(student.recentAccuracy)}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-black text-emerald-700">+{student.improvement} نقطة</div>
                  <div className="text-[10px] text-slate-400">تحسن</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
