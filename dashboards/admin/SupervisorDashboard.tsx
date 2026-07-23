import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  GraduationCap,
  Mail,
  Search,
  Target,
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  UserX,
  ClipboardList,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useStore } from '../../store/useStore';
import { Role } from '../../types';

type SupervisorTab = 'overview' | 'students' | 'reports';

const KpiCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'indigo';
  trend?: { value: string; up: boolean };
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  const iconColors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${iconColors[color]}`}>{icon}</div>
        {trend && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${trend.up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-black">{value}</div>
        <div className="mt-1 text-sm font-bold opacity-80">{title}</div>
        {subtitle && <div className="mt-1 text-xs opacity-60">{subtitle}</div>}
      </div>
    </div>
  );
};

const ClassCard: React.FC<{
  title: string;
  name: string;
  score: number;
  students: number;
  attempts: number;
  variant: 'best' | 'weakest';
}> = ({ title, name, score, students, attempts, variant }) => (
  <div className={`rounded-2xl border p-5 ${variant === 'best' ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white' : 'border-rose-100 bg-gradient-to-br from-rose-50 to-white'}`}>
    <div className="flex items-center gap-2 mb-3">
      {variant === 'best' ? <Trophy size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-rose-600" />}
      <span className={`text-xs font-black ${variant === 'best' ? 'text-emerald-700' : 'text-rose-700'}`}>{title}</span>
    </div>
    <div className="text-lg font-black text-gray-900 truncate">{name || 'بانتظار نتائج'}</div>
    {name && (
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Users size={14} />{students} طالب</span>
        <span className="flex items-center gap-1"><ClipboardList size={14} />{attempts} نتيجة</span>
        <span className={`font-black text-lg ${variant === 'best' ? 'text-emerald-600' : 'text-rose-600'}`}>{score}%</span>
      </div>
    )}
  </div>
);

const ActionButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'indigo' | 'emerald' | 'amber' | 'gray';
  subtitle?: string;
  disabled?: boolean;
  loading?: boolean;
}> = ({ label, icon, onClick, color, subtitle, disabled, loading }) => {
  const colors = {
    indigo: 'border-indigo-100 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700',
    emerald: 'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50/70 hover:bg-amber-100 text-amber-700',
    gray: 'border-gray-100 bg-gray-50/70 hover:bg-gray-100 text-gray-700',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${colors[color]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
          <span className="text-sm font-black">{label}</span>
        </div>
        <ExternalLink size={16} className="opacity-50" />
      </div>
      {subtitle && <p className="mt-2 text-xs opacity-60 leading-5">{subtitle}</p>}
    </button>
  );
};

export const SupervisorDashboard: React.FC = () => {
  const { user, groups, users, examResults, quizzes } = useStore();
  const [activeTab, setActiveTab] = useState<SupervisorTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertState, setAlertState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [studentAction, setStudentAction] = useState<{ id: string; type: 'alert' | 'quiz' } | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');

  const supervisorScopeSummary = useMemo(() => {
    const directGroupIds = new Set(user.groupIds || []);
    const directGroups = groups.filter((g) => directGroupIds.has(g.id) || g.supervisorIds?.includes(user.id));
    const scopedSchoolIds = new Set<string>();
    if (user.schoolId) scopedSchoolIds.add(user.schoolId);
    directGroups.forEach((g) => {
      if (g.type === 'SCHOOL') scopedSchoolIds.add(g.id);
      if (g.parentId) scopedSchoolIds.add(g.parentId);
    });
    const scopedGroupIds = new Set<string>([...Array.from(directGroupIds), ...directGroups.map((g) => g.id)]);
    groups.forEach((g) => { if (g.parentId && scopedSchoolIds.has(g.parentId)) scopedGroupIds.add(g.id); });
    const scopedGroupList = groups.filter((g) => scopedGroupIds.has(g.id) || scopedSchoolIds.has(g.id));
    const scopedStudentIds = new Set(scopedGroupList.flatMap((g) => g.studentIds || []));
    const scopedStudents = users.filter((u) => {
      if (u.role !== Role.STUDENT) return false;
      return (u.groupIds || []).some((gid) => scopedGroupIds.has(gid)) || (u.schoolId && scopedSchoolIds.has(u.schoolId)) || scopedStudentIds.has(u.id);
    });
    const scopedStudentIdSet = new Set(scopedStudents.map((s) => s.id));
    const scopedResults = examResults.filter((r) => r.userId && scopedStudentIdSet.has(r.userId));

    const assignedFollowUps = quizzes.filter((q) =>
      (q.targetGroupIds || []).some((gid) => scopedGroupIds.has(gid)) ||
      (q.targetUserIds || []).some((sid) => scopedStudentIdSet.has(sid))
    );

    const averageScore = scopedResults.length
      ? Math.round(scopedResults.reduce((t, r) => t + Number(r.score || 0), 0) / scopedResults.length) : 0;

    const weakSkillMap = new Map<string, { skill: string; total: number; count: number; students: Set<string> }>();
    scopedResults.forEach((r) => {
      (r.skillsAnalysis || []).forEach((sk) => {
        const s = String(sk.skill || '').trim();
        if (!s) return;
        const key = sk.skillId || s;
        const cur = weakSkillMap.get(key) || { skill: s, total: 0, count: 0, students: new Set<string>() };
        cur.total += Number(sk.mastery || 0);
        cur.count += 1;
        if (r.userId) cur.students.add(r.userId);
        weakSkillMap.set(key, cur);
      });
    });

    const weakestSkills = Array.from(weakSkillMap.values())
      .map((sk) => ({ skill: sk.skill, mastery: sk.count ? Math.round(sk.total / sk.count) : 0, attempts: sk.count, affectedStudents: sk.students.size }))
      .filter((sk) => sk.mastery < 70)
      .sort((a, b) => a.mastery - b.mastery || b.affectedStudents - a.affectedStudents)
      .slice(0, 5);

    const studentsNeedingFollowUp = scopedStudents.map((student) => {
      const results = scopedResults.filter((r) => r.userId === student.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      const avg = results.length ? Math.round(results.reduce((t, r) => t + Number(r.score || 0), 0) / results.length) : 0;
      const latest = results[0];
      const studentClass = scopedGroupList.find((g) => g.type !== 'SCHOOL' && ((g.studentIds || []).includes(student.id) || (student.groupIds || []).includes(g.id)));
      const studentSchool = scopedGroupList.find((g) => g.type === 'SCHOOL' && (g.id === student.schoolId || g.id === studentClass?.parentId));
      const gs = studentClass?.metadata?.settings as Record<string, unknown> | undefined;
      const grade = String(gs?.grade || gs?.gradeName || gs?.stage || gs?.level || 'غير محدد').trim();
      const weakSkills = [...(latest?.skillsAnalysis || [])].filter((s) => Number(s.mastery || 0) < 70).sort((a, b) => Number(a.mastery || 0) - Number(b.mastery || 0)).slice(0, 3).map((s) => s.skill).filter(Boolean);
      const reason = results.length === 0 ? 'لم يبدأ' : avg < 60 ? 'ضعف' : 'متابعة';
      const status = results.length === 0 || avg < 60 ? 'danger' : avg < 70 ? 'watch' : 'good';
      const hasFollowUp = assignedFollowUps.some((q) =>
        (q.targetUserIds || []).includes(student.id) || (studentClass?.id ? (q.targetGroupIds || []).includes(studentClass.id) : false));
      return {
        id: student.id, name: student.name, schoolName: studentSchool?.name || 'بدون مدرسة',
        className: studentClass?.name || 'بدون فصل', gradeName: grade, average: avg,
        attempts: results.length, latestQuiz: latest?.quizTitle || 'لم يبدأ',
        weakSkills, followUpReason: reason, status, hasAssignedFollowUp: hasFollowUp,
        latestScore: latest ? Number(latest.score || 0) : null,
        previousScore: results[1] ? Number(results[1].score || 0) : null,
      };
    }).filter((s) => s.attempts === 0 || s.average < 70)
      .sort((a, b) => a.attempts - b.attempts || a.average - b.average);

    const groupSnapshots = scopedGroupList.filter((g) => g.type !== 'SCHOOL').map((g) => {
      const gsIds = new Set(g.studentIds || []);
      const gResults = scopedResults.filter((r) => r.userId && gsIds.has(r.userId));
      const gAvg = gResults.length ? Math.round(gResults.reduce((t, r) => t + Number(r.score || 0), 0) / gResults.length) : 0;
      return { id: g.id, name: g.name, studentCount: g.studentIds?.length || 0, average: gAvg, attempts: gResults.length, weakStudents: studentsNeedingFollowUp.filter((s) => gsIds.has(s.id)).length };
    });
    const withResults = groupSnapshots.filter((g) => g.attempts > 0);
    const bestClass = [...withResults].sort((a, b) => b.average - a.average || b.studentCount - a.studentCount)[0] || null;
    const weakestClass = [...withResults].sort((a, b) => a.average - b.average || b.studentCount - a.studentCount)[0] || null;
    const improvedCount = scopedStudents.filter((s) => {
      const r = scopedResults.filter((res) => res.userId === s.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return r.length >= 2 && Number(r[0].score || 0) > Number(r[1].score || 0);
    }).length;
    const declinedCount = scopedStudents.filter((s) => {
      const r = scopedResults.filter((res) => res.userId === s.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return r.length >= 2 && Number(r[0].score || 0) < Number(r[1].score || 0);
    }).length;

    return {
      schoolCount: scopedSchoolIds.size, groupCount: scopedGroupList.length, studentCount: scopedStudents.length,
      followUpCount: assignedFollowUps.length, resultCount: scopedResults.length, averageScore,
      weakStudentsCount: studentsNeedingFollowUp.length, inactiveCount: studentsNeedingFollowUp.filter((s) => s.attempts === 0).length,
      improvedCount, declinedCount, weakestSkills, studentsNeedingFollowUp,
      groupSnapshots, bestClass, weakestClass, pendingFollowUpCount: studentsNeedingFollowUp.filter((s) => !s.hasAssignedFollowUp).length,
    };
  }, [examResults, groups, quizzes, user.groupIds, user.id, user.schoolId, users]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return supervisorScopeSummary.studentsNeedingFollowUp.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.schoolName.toLowerCase().includes(q) && !s.className.toLowerCase().includes(q)) return false;
      if (schoolFilter !== 'all' && s.schoolName !== schoolFilter) return false;
      if (classFilter !== 'all' && s.className !== classFilter) return false;
      if (statusFilter === 'inactive' && s.attempts > 0) return false;
      if (statusFilter === 'low' && (s.attempts === 0 || s.average >= 70)) return false;
      if (statusFilter === 'urgent' && s.status !== 'danger') return false;
      return true;
    });
  }, [supervisorScopeSummary.studentsNeedingFollowUp, searchQuery, schoolFilter, classFilter, statusFilter]);

  const filterOptions = useMemo(() => {
    const students = supervisorScopeSummary.studentsNeedingFollowUp;
    return {
      schools: Array.from(new Set(students.map((s) => s.schoolName).filter(Boolean))),
      classes: Array.from(new Set(students.map((s) => s.className).filter(Boolean))),
    };
  }, [supervisorScopeSummary.studentsNeedingFollowUp]);

  const openStudentReport = (id: string) => window.location.assign(`/reports?studentId=${encodeURIComponent(id)}`);
  const openStudentQuiz = (id: string) => {
    const params = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal', targetUserId: id });
    window.location.hash = `/admin-dashboard?${params.toString()}`;
  };

  const sendAlert = async (studentId: string, studentName: string) => {
    setStudentAction({ id: studentId, type: 'alert' });
    setActionFeedback('');
    try {
      const { api } = await import('../../services/api');
      await api.sendStudentAlert({
        studentIds: [studentId], title: 'تنبيه متابعة دراسية',
        body: `يرجى بدء متابعة ${studentName}.`, channels: ['in_app'],
      });
      setActionFeedback(`✅ تم إرسال التنبيه إلى ${studentName}`);
    } catch { setActionFeedback('❌ تعذر إرسال التنبيه'); }
    finally { setStudentAction(null); }
  };

  const sendWeeklyAlert = async () => {
    const pending = supervisorScopeSummary.pendingFollowUpCount;
    if (!pending) return;
    setAlertState('sending');
    try {
      const { api } = await import('../../services/api');
      await api.sendStudentAlert({
        studentIds: supervisorScopeSummary.studentsNeedingFollowUp.filter((s) => !s.hasAssignedFollowUp).map((s) => s.id),
        title: 'ملخص المتابعة الأسبوعي',
        body: `توجد ${pending} حالة تحتاج متابعة. راجع لوحة المشرف للتفاصيل.`,
        channels: ['in_app'],
      });
      setAlertState('sent');
    } catch { setAlertState('error'); }
  };

  const schools = useMemo(() => {
    const sIds = new Set(supervisorScopeSummary.studentsNeedingFollowUp.map((s) => s.schoolName));
    return supervisorScopeSummary.studentsNeedingFollowUp.filter((s) => s.schoolName).filter((s, i, a) => a.findIndex((x) => x.schoolName === s.schoolName) === i);
  }, [supervisorScopeSummary.studentsNeedingFollowUp]);

  const sidebarItems = [
    { id: 'overview' as const, label: 'الملخص', icon: <BarChart3 size={20} /> },
    { id: 'students' as const, label: 'الطلاب', icon: <Users size={20} />, badge: supervisorScopeSummary.weakStudentsCount },
    { id: 'reports' as const, label: 'التقارير', icon: <Target size={20} /> },
  ];

  const tabBadge = (id: SupervisorTab) => {
    if (id === 'students') return supervisorScopeSummary.weakStudentsCount;
    return undefined;
  };

  return (
    <DashboardLayout
      sidebar={
        <div className="py-6 space-y-1">
          <div className="mb-8 px-6">
            <h2 className="text-xl font-bold text-gray-900">لوحة المشرف</h2>
            <p className="text-sm text-gray-500 mt-1">متابعة الطلاب والأداء</p>
          </div>
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                activeTab === item.id ? 'bg-indigo-50 text-indigo-600 font-bold border-r-4 border-indigo-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
              }`}
            >
              <div className={activeTab === item.id ? 'text-indigo-500' : 'text-gray-400'}>{item.icon}</div>
              <span className="text-sm">{item.label}</span>
              {tabBadge(item.id) ? <span className="mr-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-700">{tabBadge(item.id)}</span> : null}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Tab Navigation */}
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 w-fit">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition-all ${
                activeTab === item.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}{item.label}
              {tabBadge(item.id) ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{tabBadge(item.id)}</span> : null}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">مرحباً، {user.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {supervisorScopeSummary.schoolCount > 0
                  ? `مشرف على ${supervisorScopeSummary.schoolCount} مدرسة، ${supervisorScopeSummary.groupCount} فصل، ${supervisorScopeSummary.studentCount} طالب`
                  : `مشرف على ${supervisorScopeSummary.groupCount} فصل، ${supervisorScopeSummary.studentCount} طالب`}
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="إجمالي الطلاب" value={supervisorScopeSummary.studentCount} subtitle="ضمن نطاق الإشراف" icon={<Users size={22} />} color="blue" />
              <KpiCard title="يحتاجون متابعة" value={supervisorScopeSummary.weakStudentsCount} subtitle={`${supervisorScopeSummary.inactiveCount} لم يبدأ بعد`} icon={<UserX size={22} />} color="rose" />
              <KpiCard title="متوسط الدرجات" value={`${supervisorScopeSummary.averageScore}%`} subtitle={`${supervisorScopeSummary.resultCount} نتيجة`} icon={<Target size={22} />} color="emerald"
                trend={supervisorScopeSummary.improvedCount > supervisorScopeSummary.declinedCount ? { value: `${supervisorScopeSummary.improvedCount} تحسن`, up: true } : { value: `${supervisorScopeSummary.declinedCount} تراجع`, up: false }}
              />
              <KpiCard title="الفصول" value={supervisorScopeSummary.groupCount} subtitle={`${supervisorScopeSummary.followUpCount} اختبار موجه`} icon={<Building2 size={22} />} color="purple" />
            </div>

            {/* Best & Worst Class */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClassCard title="أفضل فصل" name={supervisorScopeSummary.bestClass?.name || ''} score={supervisorScopeSummary.bestClass?.average || 0} students={supervisorScopeSummary.bestClass?.studentCount || 0} attempts={supervisorScopeSummary.bestClass?.attempts || 0} variant="best" />
              <ClassCard title="يحتاج تدخل" name={supervisorScopeSummary.weakestClass?.name || ''} score={supervisorScopeSummary.weakestClass?.average || 0} students={supervisorScopeSummary.weakestClass?.studentCount || 0} attempts={supervisorScopeSummary.weakestClass?.attempts || 0} variant="weakest" />
            </div>

            {/* Weak Skills Preview */}
            {supervisorScopeSummary.weakestSkills.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4">أضعف المهارات في نطاقك</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supervisorScopeSummary.weakestSkills.slice(0, 3).map((sk) => (
                    <div key={sk.skill} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-sm font-black text-gray-900 truncate">{sk.skill}</span>
                        <span className="text-xs font-black text-rose-600">{sk.mastery}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(6, sk.mastery)}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">{sk.affectedStudents} طالب - {sk.attempts} محاولة</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionButton label="إرسال تنبيه أسبوعي" icon={<Send size={18} />} color="indigo"
                subtitle={`${supervisorScopeSummary.pendingFollowUpCount} طالب لم تتم متابعتهم`}
                onClick={() => void sendWeeklyAlert()} disabled={alertState === 'sending' || supervisorScopeSummary.pendingFollowUpCount === 0}
                loading={alertState === 'sending'}
              />
              <ActionButton label="التقارير الكاملة" icon={<BarChart3 size={18} />} color="emerald"
                subtitle="تقارير المهارات وأداء الفصول" onClick={() => window.location.assign('/reports')}
              />
              <ActionButton label="توجيه اختبار" icon={<ClipboardList size={18} />} color="amber"
                subtitle="اختبار تشخيصي لطلاب محددين"
                onClick={() => { const p = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal' }); window.location.hash = `/admin-dashboard?${p.toString()}`; }}
              />
              <ActionButton label="بوابة المدرسة" icon={<Building2 size={18} />} color="gray"
                subtitle="إدارة الفصول والمجموعات" onClick={() => window.location.assign('/admin-dashboard?tab=school-portal')}
              />
            </div>
          </div>
        )}

        {/* ===== STUDENTS TAB ===== */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">متابعة الطلاب</h1>
                <p className="mt-1 text-sm text-gray-500">{supervisorScopeSummary.weakStudentsCount} طالب يحتاجون متابعة</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void sendWeeklyAlert()} disabled={alertState === 'sending' || supervisorScopeSummary.pendingFollowUpCount === 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {alertState === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  تنبيه أسبوعي
                </button>
                <button onClick={() => window.location.assign('/reports')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <BarChart3 size={16} />
                  تقارير
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم طالب، مدرسة، فصل..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-10 pl-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل المدارس</option>
                  {filterOptions.schools.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل الفصول</option>
                  {filterOptions.classes.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل الحالات</option>
                  <option value="urgent">عاجل</option>
                  <option value="inactive">غير نشط</option>
                  <option value="low">منخفض التحصيل</option>
                </select>
              </div>
            </div>

            {actionFeedback && (
              <div className={`rounded-xl px-4 py-3 text-sm font-bold ${actionFeedback.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                {actionFeedback}
              </div>
            )}

            {/* Students Table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">الطالب</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">المدرسة / الفصل</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">آخر اختبار</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">الدرجة</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">المهارات الضعيفة</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">الحالة</th>
                      <th className="px-5 py-4 font-black text-gray-500 text-xs">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                        {searchQuery || schoolFilter !== 'all' || classFilter !== 'all' || statusFilter !== 'all'
                          ? 'لا توجد نتائج تطابق الفلترة' : 'لا توجد حالات بحاجة متابعة الآن'}
                      </td></tr>
                    ) : filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-black text-gray-900">{s.name}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-gray-700">{s.schoolName}</div>
                          <div className="text-xs text-gray-500">{s.className} • {s.gradeName}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-gray-700 truncate max-w-[140px]">{s.latestQuiz}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-black ${s.attempts ? (s.average >= 70 ? 'text-emerald-600' : s.average >= 60 ? 'text-amber-600' : 'text-rose-600') : 'text-gray-400'}`}>
                            {s.attempts ? `${s.average}%` : '—'}
                          </span>
                          {s.previousScore !== null && (
                            <span className={`mr-2 text-xs ${(s.latestScore || 0) >= (s.previousScore || 0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {(s.latestScore || 0) >= (s.previousScore || 0) ? <TrendingUp size={12} className="inline" /> : <TrendingDown size={12} className="inline" />}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {s.weakSkills.length > 0 ? s.weakSkills.slice(0, 2).map((sk) => (
                              <span key={sk} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 truncate max-w-[80px]">{sk}</span>
                            )) : <span className="text-xs text-gray-400">—</span>}
                            {s.weakSkills.length > 2 && <span className="text-xs text-gray-400">+{s.weakSkills.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${
                            s.status === 'danger' ? 'bg-rose-50 text-rose-700' : s.status === 'watch' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>{s.followUpReason}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => openStudentReport(s.id)} title="تقرير الطالب"
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-black text-white hover:bg-gray-800 transition-colors">تقرير</button>
                            <button onClick={() => openStudentQuiz(s.id)} title="تعيين اختبار"
                              className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 hover:bg-amber-100 transition-colors">اختبار</button>
                            <button onClick={() => void sendAlert(s.id, s.name)} disabled={studentAction?.id === s.id} title="إرسال تنبيه"
                              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                              {studentAction?.id === s.id ? '...' : 'تنبيه'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
                <span>{filteredStudents.length} من {supervisorScopeSummary.studentsNeedingFollowUp.length} طالب</span>
                {filteredStudents.length > 0 && (
                  <button onClick={() => window.location.assign('/reports')} className="font-black text-indigo-600 hover:text-indigo-700">
                    تقرير كامل ←
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== REPORTS TAB ===== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-gray-900">التقارير والتحليلات</h1>
                <p className="mt-1 text-sm text-gray-500">تحليل أداء الطلاب والمهارات داخل نطاقك</p>
              </div>
              <button onClick={() => window.location.assign('/reports')}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-black text-white hover:bg-gray-800 flex items-center gap-2"
              >
                <ExternalLink size={16} /> تقارير مفصلة
              </button>
            </div>

            {/* Skill Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4">تحليل المهارات</h3>
                {supervisorScopeSummary.weakestSkills.length > 0 ? (
                  <div className="space-y-4">
                    {supervisorScopeSummary.weakestSkills.map((sk) => (
                      <div key={sk.skill}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-900 truncate">{sk.skill}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{sk.affectedStudents} طالب</span>
                            <span className={`text-sm font-black ${sk.mastery < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{sk.mastery}%</span>
                          </div>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${sk.mastery < 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.max(4, sk.mastery)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500">تظهر المهارات بعد توفر نتائج اختبارات كافية</div>
                )}
              </div>

              {/* Class Performance */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4">أداء الفصول</h3>
                {supervisorScopeSummary.groupSnapshots.length > 0 ? (
                  <div className="space-y-3">
                    {[...supervisorScopeSummary.groupSnapshots].sort((a, b) => b.average - a.average).map((g) => (
                      <div key={g.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-gray-900 truncate">{g.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{g.studentCount} طالب • {g.attempts} نتيجة</div>
                        </div>
                        <div className={`rounded-xl px-3 py-1.5 text-sm font-black ${
                          g.attempts === 0 ? 'bg-gray-100 text-gray-500' :
                          g.average >= 70 ? 'bg-emerald-50 text-emerald-700' :
                          g.average >= 60 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {g.attempts ? `${g.average}%` : '—'}
                        </div>
                        <div className="w-20 text-xs text-gray-500">
                          {g.weakStudents > 0 ? `${g.weakStudents} ضعيف` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500">لا توجد فصول في نطاقك بعد</div>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-center">
                <TrendingUp size={24} className="mx-auto mb-2 text-emerald-600" />
                <div className="text-2xl font-black text-emerald-700">{supervisorScopeSummary.improvedCount}</div>
                <div className="text-xs font-bold text-emerald-600 mt-1">طلاب تحسنت درجاتهم</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5 text-center">
                <TrendingDown size={24} className="mx-auto mb-2 text-rose-600" />
                <div className="text-2xl font-black text-rose-700">{supervisorScopeSummary.declinedCount}</div>
                <div className="text-xs font-bold text-rose-600 mt-1">طلاب تراجعت درجاتهم</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 text-center">
                <UserCheck size={24} className="mx-auto mb-2 text-amber-600" />
                <div className="text-2xl font-black text-amber-700">{supervisorScopeSummary.weakStudentsCount}</div>
                <div className="text-xs font-bold text-amber-600 mt-1">يحتاجون متابعة</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-center">
                <Target size={24} className="mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-black text-blue-700">{supervisorScopeSummary.averageScore}%</div>
                <div className="text-xs font-bold text-blue-600 mt-1">متوسط النطاق</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
