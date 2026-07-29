import React, { useEffect, useMemo, useState } from 'react';
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
  Printer,
  X,
  Eye,
  Video,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useStore } from '../../store/useStore';
import { Role } from '../../types';
import { LiveSessionsManager } from './LiveSessionsManager';

import { SupervisorTestsManager } from './SupervisorTestsManager';

type SupervisorTab = 'overview' | 'students' | 'skills' | 'reports' | 'live-sessions' | 'tests';
type StudentSubTab = 'all' | 'critical' | 'watch' | 'outstanding';

const KpiCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'indigo';
  trend?: { value: string; up: boolean };
}> = ({ title, value, subtitle, icon, color, trend }) => {
  const colors = {
    emerald: 'bg-emerald-50/60 text-emerald-800 border-emerald-100 hover:bg-emerald-50 transition-colors',
    blue: 'bg-blue-50/60 text-blue-800 border-blue-100 hover:bg-blue-50 transition-colors',
    amber: 'bg-amber-50/60 text-amber-800 border-amber-100 hover:bg-amber-50 transition-colors',
    rose: 'bg-rose-50/60 text-rose-800 border-rose-100 hover:bg-rose-50 transition-colors',
    purple: 'bg-purple-50/60 text-purple-800 border-purple-100 hover:bg-purple-50 transition-colors',
    indigo: 'bg-indigo-50/60 text-indigo-800 border-indigo-100 hover:bg-indigo-50 transition-colors',
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
    <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 ${colors[color]}`}>
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
    indigo: 'border-indigo-100 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 hover:border-indigo-200',
    emerald: 'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 hover:border-emerald-200',
    amber: 'border-amber-100 bg-amber-50/70 hover:bg-amber-100 text-amber-700 hover:border-amber-200',
    gray: 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 flex flex-col justify-between h-full ${colors[color]}`}>
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
          <span className="text-sm font-black">{label}</span>
        </div>
        <ExternalLink size={15} className="opacity-50" />
      </div>
      {subtitle && <p className="mt-2 text-xs opacity-75 leading-5">{subtitle}</p>}
    </button>
  );
};

export const SupervisorDashboard: React.FC = () => {
  const { user, groups, users, examResults, quizzes, hydrateUsers } = useStore();
  const [activeTab, setActiveTab] = useState<SupervisorTab>('overview');
  const [studentTab, setStudentTab] = useState<StudentSubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [weeklyAlertState, setWeeklyAlertState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [studentActionState, setStudentActionState] = useState<{ id: string; action: 'alert' | 'quiz' } | null>(null);
  const [studentActionFeedback, setStudentActionFeedback] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<{ name: string; level: 'critical' | 'watch' | 'mastered'; students: string[] } | null>(null);
  const [showPrincipalReport, setShowPrincipalReport] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  useEffect(() => {
    // Ensure we have loaded students for the supervisor to view
    const loadStudents = async () => {
      try {
        const { api } = await import('../../services/api');
        const response = await api.getAdminUsers({ role: Role.STUDENT as Role, limit: 1000 });
        if (response.users) {
          const storeUsers = response.users.map(u => ({
            id: u._id || u.id || '',
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role as Role,
            avatar: u.avatar,
            academicStage: u.academicStage,
            classNumber: u.classNumber,
            points: u.points || 0,
            badges: u.badges || [],
            groupIds: u.groupIds || [],
            schoolId: u.schoolId,
            isActive: u.isActive !== false,
            createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()
          }));
          hydrateUsers(storeUsers);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    if (users.filter(u => u.role === Role.STUDENT).length === 0) {
      loadStudents();
    }
  }, [hydrateUsers, users]);

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

    const primarySchool = scopedGroupList.find((g) => g.type === 'SCHOOL') || groups.find((g) => g.id === user.schoolId);
    const primarySchoolName = primarySchool?.name || (scopedSchoolIds.size > 0 ? 'المدرسة المسندة' : 'جميع الفصول المسندة');
    const scopeTypeName = primarySchool ? 'إشراف شامل على المدرسة' : scopedGroupList.length > 0 ? `إشراف مخصص (${scopedGroupList.length} فصل)` : 'إشراف عام';
    const scopedStudentIdSet = new Set(scopedGroupList.flatMap((g) => g.studentIds || []));
    const scopedStudents = users.filter((u) => {
      if (u.role !== Role.STUDENT) return false;
      return (u.groupIds || []).some((gid) => scopedGroupIds.has(gid)) || (u.schoolId && scopedSchoolIds.has(u.schoolId)) || scopedStudentIdSet.has(u.id);
    });
    const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
    const scopedResults = examResults.filter((r) => r.userId && scopedStudentIds.has(r.userId));

    const assignedFollowUps = quizzes.filter((q) =>
      (q.targetGroupIds || []).some((gid) => scopedGroupIds.has(gid)) ||
      (q.targetUserIds || []).some((sid) => scopedStudentIds.has(sid))
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
      .sort((a, b) => a.mastery - b.mastery || b.affectedStudents - a.affectedStudents);

    const allStudentsList = scopedStudents.map((student) => {
      const results = scopedResults.filter((r) => r.userId === student.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      const avg = results.length ? Math.round(results.reduce((t, r) => t + Number(r.score || 0), 0) / results.length) : 0;
      const latest = results[0];
      const studentClass = scopedGroupList.find((g) => g.type !== 'SCHOOL' && ((g.studentIds || []).includes(student.id) || (student.groupIds || []).includes(g.id)));
      const studentSchool = scopedGroupList.find((g) => g.type === 'SCHOOL' && (g.id === student.schoolId || g.id === studentClass?.parentId));
      const gs = studentClass?.metadata?.settings as Record<string, unknown> | undefined;
      const grade = String(gs?.grade || gs?.gradeName || gs?.stage || gs?.level || 'غير محدد').trim();
      const weakSkills = [...(latest?.skillsAnalysis || [])].filter((s) => Number(s.mastery || 0) < 70).sort((a, b) => Number(a.mastery || 0) - Number(b.mastery || 0)).slice(0, 3).map((s) => s.skill).filter(Boolean);
      const reason = results.length === 0 ? 'لم يبدأ القياس' : avg < 60 ? 'بحاجة لتدخل عاجل' : avg < 75 ? 'تحت المراقبة' : 'مستواه ممتاز';
      const status = results.length === 0 || avg < 60 ? 'danger' : avg < 75 ? 'watch' : 'good';
      const hasFollowUp = assignedFollowUps.some((q) =>
        (q.targetUserIds || []).includes(student.id) || (studentClass?.id ? (q.targetGroupIds || []).includes(studentClass.id) : false));
      return {
        id: student.id, name: student.name, email: student.email || '', schoolName: studentSchool?.name || 'بدون مدرسة',
        className: studentClass?.name || 'بدون فصل', classId: studentClass?.id || '', schoolId: studentSchool?.id || '', gradeName: grade, average: avg,
        attempts: results.length, latestQuiz: latest?.quizTitle || 'لم يبدأ بعد',
        weakSkills, followUpReason: reason, status, hasAssignedFollowUp: hasFollowUp,
        latestScore: latest ? Number(latest.score || 0) : null,
        previousScore: results[1] ? Number(results[1].score || 0) : null,
        resultsList: results,
      };
    });

    const studentsNeedingFollowUp = allStudentsList.filter((s) => s.attempts === 0 || s.average < 70);

    const groupSnapshots = scopedGroupList.filter((g) => g.type !== 'SCHOOL').map((g) => {
      const gsIds = new Set(g.studentIds || []);
      const gResults = scopedResults.filter((r) => r.userId && gsIds.has(r.userId));
      const gAvg = gResults.length ? Math.round(gResults.reduce((t, r) => t + Number(r.score || 0), 0) / gResults.length) : 0;
      return { id: g.id, name: g.name, studentCount: g.studentIds?.length || 0, average: gAvg, attempts: gResults.length, weakStudents: studentsNeedingFollowUp.filter((s) => gsIds.has(s.id)).length };
    });
    const withResults = groupSnapshots.filter((g) => g.attempts > 0);
    const bestClass = [...withResults].sort((a, b) => b.average - a.average || b.studentCount - a.studentCount)[0] || null;
    const weakestClass = [...withResults].sort((a, b) => a.average - b.average || b.studentCount - a.studentCount)[0] || null;
    
    const improvedStudentsCount = scopedStudents.filter((s) => {
      const r = scopedResults.filter((res) => res.userId === s.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return r.length >= 2 && Number(r[0].score || 0) > Number(r[1].score || 0);
    }).length;
    const declinedCount = scopedStudents.filter((s) => {
      const r = scopedResults.filter((res) => res.userId === s.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return r.length >= 2 && Number(r[0].score || 0) < Number(r[1].score || 0);
    }).length;

    const pendingFollowUpCount = allStudentsList.filter((s) => (s.attempts === 0 || s.average < 70) && !s.hasAssignedFollowUp).length;

    return {
      schoolCount: scopedSchoolIds.size, groupCount: scopedGroupList.length, studentCount: scopedStudents.length,
      followUpCount: assignedFollowUps.length, resultCount: scopedResults.length, averageScore,
      weakStudentsCount: studentsNeedingFollowUp.length, inactiveCount: studentsNeedingFollowUp.filter((s) => s.attempts === 0).length,
      improvedStudentsCount, declinedCount, weakestSkills, studentsNeedingFollowUp, allStudentsList,
      groupSnapshots, bestClass, weakestClass, pendingFollowUpCount, scopedStudentIdSet, scopedResults,
      primarySchoolName, scopeTypeName,
    };
  }, [examResults, groups, quizzes, user.groupIds, user.id, user.schoolId, users]);

  const activeStudentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    return supervisorScopeSummary.allStudentsList.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, supervisorScopeSummary.allStudentsList]);

  // Combined filters on the list of students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return supervisorScopeSummary.allStudentsList.filter((s) => {
      // Tab filter
      if (studentTab === 'critical' && s.status !== 'danger') return false;
      if (studentTab === 'watch' && s.status !== 'watch') return false;
      if (studentTab === 'outstanding' && s.average < 85) return false;

      // Search query
      if (q && !s.name.toLowerCase().includes(q) && !s.schoolName.toLowerCase().includes(q) && !s.className.toLowerCase().includes(q)) return false;
      
      // Select filters
      if (schoolFilter !== 'all' && s.schoolId !== schoolFilter) return false;
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      
      // Status filter dropdown
      if (statusFilter === 'inactive' && s.attempts > 0) return false;
      if (statusFilter === 'low' && (s.attempts === 0 || s.average >= 70)) return false;
      if (statusFilter === 'urgent' && s.status !== 'danger') return false;

      return true;
    });
  }, [supervisorScopeSummary.allStudentsList, studentTab, searchQuery, schoolFilter, classFilter, statusFilter]);

  const visibleWeakStudents = useMemo(() => {
    return filteredStudents.filter((s) => s.attempts === 0 || s.average < 70);
  }, [filteredStudents]);

  const filterOptions = useMemo(() => {
    const students = supervisorScopeSummary.allStudentsList;
    const schools = Array.from(new Map(students.filter((s) => s.schoolId).map((s) => [s.schoolId, s.schoolName] as const)).entries());
    const classes = Array.from(new Map(students.filter((s) => s.classId).map((s) => [s.classId, s.className] as const)).entries());
    return { schools, classes };
  }, [supervisorScopeSummary.allStudentsList]);

  const openStudentReport = (id: string) => window.location.assign(`/reports?studentId=${encodeURIComponent(id)}`);
  const openStudentQuiz = (id: string) => {
    const params = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal', targetUserId: id });
    window.location.hash = `/admin-dashboard?${params.toString()}`;
  };

  const sendStudentFollowUpAlert = async (student: { id: string; name: string; latestQuiz?: string; followUpReason?: string }) => {
    setStudentActionState({ id: student.id, action: 'alert' });
    setStudentActionFeedback('');
    try {
      const { api } = await import('../../services/api');
      await api.sendStudentAlert({
        studentIds: [student.id],
        title: 'تنبيه متابعة دراسية',
        body: `يرجى بدء متابعة الطالب ${student.name}. السبب: ${student.followUpReason || 'مستوى تحصيلي منخفض'}.`,
        channels: ['in_app'],
      });
      setStudentActionFeedback(`✅ تم إرسال تنبيه متابعة للطالب ${student.name}`);
    } catch {
      setStudentActionFeedback('❌ تعذر إرسال التنبيه. يرجى التحقق من اتصال الشبكة.');
    } finally {
      setStudentActionState(null);
    }
  };

  const sendWeeklyFollowUpAlert = async () => {
    const pendingStudents = supervisorScopeSummary.allStudentsList.filter((s) => (s.attempts === 0 || s.average < 70) && !s.hasAssignedFollowUp);
    if (!pendingStudents.length) return;
    setWeeklyAlertState('sending');
    try {
      const { api } = await import('../../services/api');
      const weakestSkill = supervisorScopeSummary.weakestSkills[0]?.skill || 'المهارات الأساسية';
      await api.sendStudentAlert({
        studentIds: pendingStudents.map((s) => s.id),
        title: 'ملخص المتابعة الأسبوعي',
        body: `توجد ${pendingStudents.length} حالة تحتاج متابعة. يرجى التركيز أولاً على تعزيز مهارة "${weakestSkill}".`,
        channels: ['in_app'],
      });
      setWeeklyAlertState('sent');
    } catch {
      setWeeklyAlertState('error');
    }
  };

  // Categorize curriculum skills for the Skills Tab
  const skillsOverviewList = useMemo(() => {
    const skillsList = supervisorScopeSummary.weakestSkills;
    const critical = skillsList.filter((s) => s.mastery < 60);
    const watch = skillsList.filter((s) => s.mastery >= 60 && s.mastery < 75);
    const mastered = skillsList.filter((s) => s.mastery >= 75);
    return { critical, watch, mastered };
  }, [supervisorScopeSummary.weakestSkills]);

  // Export scope data to CSV
  const exportScopeDataToCSV = () => {
    const students = supervisorScopeSummary.allStudentsList;
    if (!students.length) return;
    const headers = ['اسم الطالب', 'البريد الإلكتروني', 'المدرسة', 'الفصل', 'المرحلة', 'عدد المحاولات', 'متوسط الدرجات', 'الحالة التقييمية'];
    const rows = students.map((s) => [
      s.name,
      s.email,
      s.schoolName,
      s.className,
      s.gradeName,
      s.attempts,
      `${s.average}%`,
      s.followUpReason,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_إشراف_الطلاب_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const tabBadge = (id: SupervisorTab) => {
    if (id === 'students') return supervisorScopeSummary.weakStudentsCount;
    return undefined;
  };

  const sidebarItems = [
    { id: 'overview' as const, label: 'الملخص العام', icon: <BarChart3 size={20} /> },
    { id: 'students' as const, label: 'متابعة الطلاب', icon: <Users size={20} />, badge: supervisorScopeSummary.studentCount },
    { id: 'live-sessions' as const, label: 'الحصص المباشرة', icon: <Video size={20} /> },
    { id: 'tests' as const, label: 'الاختبارات والتحليل', icon: <ClipboardList size={20} /> },
    { id: 'skills' as const, label: 'خريطة المهارات', icon: <Target size={20} /> },
    { id: 'reports' as const, label: 'تقارير الأداء', icon: <ClipboardList size={20} /> },
  ];

  return (
    <DashboardLayout
      sidebar={
        <div className="py-6 space-y-1">
          <div className="mb-8 px-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={24} />
              لوحة الإشراف
            </h2>
            <p className="text-xs text-gray-500 mt-1">متابعة الفصول والمهارات والتقارير</p>
          </div>
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 font-bold border-r-4 border-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
              }`}
            >
              <div className={activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}>{item.icon}</div>
              <span className="text-sm">{item.label}</span>
              {item.id === 'students' && (
                <span className="mr-auto rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-700">
                  {supervisorScopeSummary.weakStudentsCount} ضعيف
                </span>
              )}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in print:bg-white print:p-0">
        
        {/* Navigation Tabs (Top Header) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 print:hidden">
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {sidebarItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === item.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button onClick={() => setShowPrincipalReport(true)} className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100 transition-colors shadow-sm">
              <Building2 size={16} />
              <span>تقرير مدير المدرسة (PDF)</span>
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Printer size={16} />
              <span>طباعة التقرير</span>
            </button>
            <button onClick={exportScopeDataToCSV} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
              <Download size={16} />
              <span>تصدير البيانات</span>
            </button>
          </div>
        </div>

        {/* PRINT LAYOUT (Visible only when printing) */}
        <div className="hidden print:block text-right mb-8">
          <h1 className="text-3xl font-bold text-gray-950">تقرير إشراف أداء المدرسة والفصول</h1>
          <p className="text-gray-600 mt-2">تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
          <div className="mt-6 border-t border-b border-gray-200 py-4 grid grid-cols-3 gap-4">
            <div>
              <span className="text-gray-500 block text-xs">عدد الطلاب الإجمالي:</span>
              <strong className="text-lg text-gray-900">{supervisorScopeSummary.studentCount} طالب</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">متوسط التحصيل الإجمالي:</span>
              <strong className="text-lg text-indigo-700">{supervisorScopeSummary.averageScore}%</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">الطلاب المتعثرون:</span>
              <strong className="text-lg text-rose-600">{supervisorScopeSummary.weakStudentsCount} طالب</strong>
            </div>
          </div>
        </div>

        {/* ===== LIVE SESSIONS TAB ===== */}
        {activeTab === 'live-sessions' && <LiveSessionsManager />}

        {/* ===== TESTS TAB ===== */}
        {activeTab === 'tests' && <SupervisorTestsManager />}

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)]"></div>
              <div className="relative z-10">
                <h1 className="text-3xl font-black">مرحباً بك، {user.name}</h1>
                <p className="mt-2 text-indigo-200 max-w-2xl text-sm sm:text-base">
                  {supervisorScopeSummary.schoolCount > 0
                    ? `أنت تشرف على ${supervisorScopeSummary.schoolCount} مدرسة، و ${supervisorScopeSummary.groupCount} فصل دراسي، بمجموع ${supervisorScopeSummary.studentCount} طالب.`
                    : `أنت تشرف على ${supervisorScopeSummary.groupCount} فصل دراسي، بمجموع ${supervisorScopeSummary.studentCount} طالب.`}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur-sm border border-white/10">
                    <Building2 size={13} className="text-amber-300" />
                    <span>المدرسة: {supervisorScopeSummary.primarySchoolName}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur-sm border border-white/10">
                    <GraduationCap size={13} className="text-emerald-300" />
                    <span>نطاق الصلاحية: {supervisorScopeSummary.scopeTypeName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="مجموع الطلاب" value={supervisorScopeSummary.studentCount} subtitle="تحت الإشراف المباشر" icon={<Users size={22} />} color="blue" />
              <KpiCard title="بحاجة لمتابعة" value={supervisorScopeSummary.weakStudentsCount} subtitle={`${supervisorScopeSummary.inactiveCount} لم يبدأ القياس`} icon={<UserX size={22} />} color="rose" />
              <KpiCard title="متوسط الدرجات" value={`${supervisorScopeSummary.averageScore}%`} subtitle={`${supervisorScopeSummary.resultCount} محاولة اختبار`} icon={<Target size={22} />} color="emerald"
                trend={supervisorScopeSummary.improvedStudentsCount >= supervisorScopeSummary.declinedCount ? { value: `${supervisorScopeSummary.improvedStudentsCount} تحسنوا`, up: true } : { value: `${supervisorScopeSummary.declinedCount} تراجعوا`, up: false }}
              />
              <KpiCard title="الفصول الدراسية" value={supervisorScopeSummary.groupCount} subtitle={`${supervisorScopeSummary.followUpCount} اختبار علاجي موجه`} icon={<Building2 size={22} />} color="purple" />
            </div>

            {/* Supervisor Quick Decision Board */}
            <div data-testid="supervisor-quick-decision-board" className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Trophy className="text-amber-500 animate-bounce" size={20} />
                    لوحة اتخاذ القرار السريعة والتحسين
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">تحديد الحالات الأكثر حرجاً للإصلاح الفوري وتوجيه المعلمين</p>
                </div>
                <button onClick={() => void sendWeeklyFollowUpAlert()} disabled={weeklyAlertState === 'sending' || supervisorScopeSummary.pendingFollowUpCount === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  {weeklyAlertState === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>إرسال تنبيه أسبوعي</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-2 text-emerald-700">
                    <Trophy size={16} />
                    <span className="text-xs font-bold">أعلى فصل دراسي أداءً</span>
                  </div>
                  {supervisorScopeSummary.bestClass ? (
                    <>
                      <h4 className="text-lg font-black text-gray-900 truncate">{supervisorScopeSummary.bestClass.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{supervisorScopeSummary.bestClass.studentCount} طالب • متوسط أداء {supervisorScopeSummary.bestClass.average}%</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">لا تتوفر نتائج فصول بعد</p>
                  )}
                </div>

                <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-2 text-rose-700">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold">الفصل الأكثر احتياجاً للتدخل</span>
                  </div>
                  {supervisorScopeSummary.weakestClass ? (
                    <>
                      <h4 className="text-lg font-black text-rose-900 truncate">{supervisorScopeSummary.weakestClass.name}</h4>
                      <p className="text-xs text-rose-500 mt-1">{supervisorScopeSummary.weakestClass.studentCount} طلاب متعثرون • متوسط {supervisorScopeSummary.weakestClass.average}%</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">لا تتوفر فصول تحتاج تدخل حالياً</p>
                  )}
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700">
                    <Activity size={16} />
                    <span className="text-xs font-bold">الحالات الأسبوعية العالقة</span>
                  </div>
                  <h4 className="text-lg font-black text-indigo-900">{supervisorScopeSummary.pendingFollowUpCount} حالة معلقة</h4>
                  <p className="text-xs text-indigo-500 mt-1">تتضمن طلاب منخفض التحصيل ولم يتم تعيين خطط علاجية لهم</p>
                </div>
              </div>
            </div>

            {/* Quick stats and action board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weakest skills preview */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4">أضعف المهارات في نطاق الإشراف</h3>
                {supervisorScopeSummary.weakestSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supervisorScopeSummary.weakestSkills.slice(0, 4).map((sk) => (
                      <div key={sk.skill} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-sm font-bold text-gray-900 truncate">{sk.skill}</span>
                          <span className="text-xs font-bold text-rose-600">{sk.mastery}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(6, sk.mastery)}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between items-center text-[11px] text-gray-500">
                          <span>{sk.affectedStudents} طالب متأثر</span>
                          <span>{sk.attempts} محاولة قياس</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    لا تتوفر مهارات ضعيفة بعد. تحتاج لمزيد من نتائج الاختبارات لتظهر البيانات هنا.
                  </div>
                )}
              </div>

              {/* Action Board */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4">أدوات الإجراء السريع</h3>
                <div className="grid grid-cols-1 gap-3 h-[calc(100%-2.5rem)]">
                  <ActionButton label="بوابة المدرسة" icon={<Building2 size={18} />} color="gray"
                    subtitle="إدارة الفصول والمجموعات الطلابية" onClick={() => window.location.assign('/admin-dashboard?tab=school-portal')}
                  />
                  <ActionButton label="التقارير الكاملة" icon={<BarChart3 size={18} />} color="emerald"
                    subtitle="تقارير المهارات والتحصيل على مستوى المدرسة" onClick={() => setActiveTab('reports')}
                  />
                  <ActionButton label="توجيه اختبار مهارات" icon={<ClipboardList size={18} />} color="amber"
                    subtitle="تعيين اختبار تشخيصي للطلاب الضعفاء"
                    onClick={() => { const p = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal' }); window.location.hash = `/admin-dashboard?${p.toString()}`; }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STUDENTS TAB ===== */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900">متابعة تحصيل الطلاب</h1>
                <p className="mt-1 text-sm text-gray-500">عرض أداء الطلاب في نطاقك، وإرسال التدخلات والتنبيهات المباشرة</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void sendWeeklyFollowUpAlert()} disabled={weeklyAlertState === 'sending' || supervisorScopeSummary.pendingFollowUpCount === 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {weeklyAlertState === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>تنبيه أسبوعي</span>
                </button>
              </div>
            </div>

            {/* Filters panel */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              {/* Category sub-tabs inside students */}
              <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
                {[
                  { id: 'all' as const, label: 'كل الطلاب', count: supervisorScopeSummary.allStudentsList.length, color: 'text-gray-700 bg-gray-50 border-gray-200' },
                  { id: 'critical' as const, label: 'تدخل عاجل (<60%)', count: supervisorScopeSummary.allStudentsList.filter((s) => s.status === 'danger').length, color: 'text-rose-700 bg-rose-50 border-rose-100' },
                  { id: 'watch' as const, label: 'تحت المراقبة (60-75%)', count: supervisorScopeSummary.allStudentsList.filter((s) => s.status === 'watch').length, color: 'text-amber-700 bg-amber-50 border-amber-100' },
                  { id: 'outstanding' as const, label: 'المتميزون (>85%)', count: supervisorScopeSummary.allStudentsList.filter((s) => s.average >= 85).length, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                ].map((item) => (
                  <button key={item.id} onClick={() => setStudentTab(item.id)}
                    className={`flex items-center gap-2 border rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                      studentTab === item.id ? 'bg-indigo-900 border-indigo-950 text-white shadow-xs' : `${item.color} hover:brightness-95`
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-black">{item.count}</span>
                  </button>
                ))}
              </div>

              {/* Text Search & Selector Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم طالب، مدرسة، فصل..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-10 pl-4 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل المدارس</option>
                  {filterOptions.schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل الفصول</option>
                  {filterOptions.classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">كل الحالات التقييمية</option>
                  <option value="urgent">عاجل جداً</option>
                  <option value="inactive">غير نشط (لم يختبر)</option>
                  <option value="low">منخفض التحصيل</option>
                </select>
              </div>
            </div>

            {studentActionFeedback && (
              <div className={`rounded-xl px-4 py-3 text-sm font-bold border ${studentActionFeedback.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {studentActionFeedback}
              </div>
            )}

            {/* Students List Table */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs">اسم الطالب</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs">المدرسة والفصل</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs">آخر اختبار تم</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs text-center">المعدل</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs">أبرز الفجوات والمهارات الضعيفة</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs">الحالة</th>
                      <th className="px-5 py-4 font-bold text-gray-500 text-xs text-center">إجراء تدخل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-500">
                          لا توجد نتائج تطابق الفلترة واختيارات البحث.
                        </td>
                      </tr>
                    ) : filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <button onClick={() => setSelectedStudentId(s.id)} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors text-right flex items-center gap-2">
                            <span>{s.name}</span>
                            <Eye size={14} className="opacity-40" />
                          </button>
                          <div className="text-xs text-gray-400 mt-0.5">{s.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-800">{s.schoolName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{s.className} • {s.gradeName}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-gray-700 truncate max-w-[150px]" title={s.latestQuiz}>{s.latestQuiz}</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`font-black text-base ${s.attempts ? (s.average >= 85 ? 'text-emerald-600' : s.average >= 70 ? 'text-indigo-600' : s.average >= 60 ? 'text-amber-600' : 'text-rose-600') : 'text-gray-400'}`}>
                            {s.attempts ? `${s.average}%` : '—'}
                          </span>
                          <span className="block text-[10px] text-gray-400">{s.attempts} محاولات</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {s.weakSkills.length > 0 ? s.weakSkills.slice(0, 2).map((sk) => (
                              <span key={sk} className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[11px] text-rose-700 truncate max-w-[90px]">{sk}</span>
                            )) : <span className="text-xs text-gray-400">لا توجد مهارات ضعيفة</span>}
                            {s.weakSkills.length > 2 && <span className="text-[11px] text-gray-400 font-bold">+{s.weakSkills.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                            s.status === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-700' : s.status === 'watch' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          }`}>{s.followUpReason}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => openStudentReport(s.id)} title="تقرير الطالب التفصيلي"
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-xs">تقرير</button>
                            <button onClick={() => openStudentQuiz(s.id)} title="تعيين اختبار علاجي"
                              className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors">اختبار</button>
                            <button onClick={() => void sendStudentFollowUpAlert(s)} disabled={studentActionState?.id === s.id} title="إرسال تنبيه فوري"
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                              {studentActionState?.id === s.id && studentActionState.action === 'alert' ? '...' : 'تنبيه'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                <span>يعرض {filteredStudents.length} من أصل {supervisorScopeSummary.allStudentsList.length} طالب</span>
                <span className="font-bold text-indigo-600">منسق للمتابعة والإرشاد التعليمي</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== SKILLS TAB ===== */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">خريطة تمكن المهارات (Curriculum Skills Map)</h1>
              <p className="mt-1 text-sm text-gray-500">خريطة توضيحية لنسبة تمكن الطلاب من مهارات المنهج داخل نطاق إشرافك</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Critical Skills Column */}
              <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <h3 className="text-base font-black text-rose-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    مهارات حرجة (ضعف شديد)
                  </h3>
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{skillsOverviewList.critical.length} مهارات</span>
                </div>
                
                {skillsOverviewList.critical.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">لا توجد مهارات حرجة في هذا النطاق.</p>
                ) : skillsOverviewList.critical.map((sk) => (
                  <div key={sk.skill} className="rounded-xl border border-white bg-white p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 max-w-[70%] truncate" title={sk.skill}>{sk.skill}</h4>
                      <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-600">{sk.mastery}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(6, sk.mastery)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                      <span>{sk.affectedStudents} طلاب متعثرين</span>
                      <button onClick={() => setSelectedSkillFilter({ name: sk.skill, level: 'critical', students: supervisorScopeSummary.allStudentsList.filter((s) => s.weakSkills.includes(sk.skill)).map(s => s.id) })}
                        className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">عرض الطلاب ←</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Needs Improvement Column */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <h3 className="text-base font-black text-amber-800 flex items-center gap-2">
                    <Activity size={18} />
                    مهارات قيد التطوير والتعزيز
                  </h3>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{skillsOverviewList.watch.length} مهارات</span>
                </div>

                {skillsOverviewList.watch.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">لا توجد مهارات قيد التعزيز.</p>
                ) : skillsOverviewList.watch.map((sk) => (
                  <div key={sk.skill} className="rounded-xl border border-white bg-white p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 max-w-[70%] truncate" title={sk.skill}>{sk.skill}</h4>
                      <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-600">{sk.mastery}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(6, sk.mastery)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                      <span>{sk.affectedStudents} طلاب يحتاجون تعزيز</span>
                      <button onClick={() => setSelectedSkillFilter({ name: sk.skill, level: 'watch', students: supervisorScopeSummary.allStudentsList.filter((s) => s.weakSkills.includes(sk.skill)).map(s => s.id) })}
                        className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">عرض الطلاب ←</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mastered Skills Column */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <h3 className="text-base font-black text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    مهارات ممتازة (تمكن عالي)
                  </h3>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{skillsOverviewList.mastered.length} مهارات</span>
                </div>

                {skillsOverviewList.mastered.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">لا تتوفر مهارات بنسبة تمكن عالية حالياً.</p>
                ) : skillsOverviewList.mastered.map((sk) => (
                  <div key={sk.skill} className="rounded-xl border border-white bg-white p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 max-w-[70%] truncate" title={sk.skill}>{sk.skill}</h4>
                      <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-600">{sk.mastery}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(6, sk.mastery)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                      <span>التمكن ممتاز للطلاب</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 rounded px-1.5 py-0.5">جاهزة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== REPORTS TAB ===== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">تقارير أداء فصول المدرسة والتحصيل</h1>
              <p className="mt-1 text-sm text-gray-500">تحليل مقارن للمستويات الدراسية والفصول للمشرفين</p>
            </div>

            {/* Class Performance Leaderboard */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  مقارنة الفصول والمجموعات الدراسية (Class Leaderboard)
                </h3>
                <span className="text-xs text-gray-500 font-bold">مرتبة تنازلياً حسب متوسط الدرجات</span>
              </div>

              {supervisorScopeSummary.groupSnapshots.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs">الفصل الدراسي / المجموعة</th>
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs text-center">عدد الطلاب</th>
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs text-center">عدد محاولات الاختبار</th>
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs text-center">الطلاب الضعفاء</th>
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs text-center">المعدل العام</th>
                        <th className="px-5 py-3.5 font-bold text-gray-500 text-xs">التوصية الإشرافية التلقائية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...supervisorScopeSummary.groupSnapshots].sort((a, b) => b.average - a.average).map((g, index) => {
                        const rankColors = index === 0 ? 'bg-amber-100 text-amber-900' : index === 1 ? 'bg-slate-100 text-slate-900' : index === 2 ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-800';
                        const isExpanded = expandedGroupId === g.id;
                        const groupStudents = supervisorScopeSummary.allStudentsList.filter(s => s.classId === g.id || s.schoolId === g.id);

                        return (
                          <React.Fragment key={g.id}>
                            <tr 
                              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                              onClick={() => setExpandedGroupId(isExpanded ? null : g.id)}
                            >
                              <td className="px-5 py-4 font-bold text-gray-900 flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${rankColors}`}>
                                  {index + 1}
                                </span>
                                <span>{g.name}</span>
                              </td>
                              <td className="px-5 py-4 text-center text-gray-700">{g.studentCount} طلاب</td>
                              <td className="px-5 py-4 text-center text-gray-700">{g.attempts} نتيجة مسجلة</td>
                              <td className="px-5 py-4 text-center text-gray-700">
                                <span className={`font-bold ${g.weakStudents > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                  {g.weakStudents} طالب
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`font-black text-base ${g.attempts > 0 ? (g.average >= 75 ? 'text-emerald-600' : g.average >= 60 ? 'text-amber-600' : 'text-rose-600') : 'text-gray-400'}`}>
                                  {g.attempts ? `${g.average}%` : 'لا توجد نتائج'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs text-gray-600 leading-6 block">
                                  {g.attempts === 0 ? '⚠️ لا توجد قياسات كافية، ينصح بتوجيه اختبار تشخيصي أولاً.' :
                                   g.average < 60 ? '🔴 ينصح بتدخل المعلم لتعزيز المهارات الأساسية وتكثيف الدروس العلاجية.' :
                                   g.weakStudents > 0 ? '🟡 ينصح بعمل خطة دعم مخصصة للطلاب المتعثرين فردياً.' :
                                   '🟢 يستمر الفصل في المنهج الطبيعي بمستوى ممتاز، مع تعزيز التحديات للمتميزين.'}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={6} className="px-10 py-6 border-b-2 border-indigo-100">
                                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-indigo-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                      <h4 className="font-bold text-gray-900 text-sm">قائمة طلاب الفصل ({g.name})</h4>
                                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-lg">
                                        {groupStudents.length} طلاب فعليين
                                      </span>
                                    </div>
                                    {groupStudents.length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-right text-sm">
                                          <thead>
                                            <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                                              <th className="px-4 py-2 font-bold">اسم الطالب</th>
                                              <th className="px-4 py-2 font-bold text-center">المعدل العام</th>
                                              <th className="px-4 py-2 font-bold text-center">المهارات الضعيفة</th>
                                              <th className="px-4 py-2 font-bold text-center">الإجراء</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {groupStudents.map(student => (
                                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-800">{student.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                  <span className={`font-black ${student.attempts > 0 ? (student.average >= 75 ? 'text-emerald-600' : student.average >= 60 ? 'text-amber-600' : 'text-rose-600') : 'text-gray-400'}`}>
                                                    {student.attempts ? `${student.average}%` : '—'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                  {student.weakSkills.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                      {student.weakSkills.slice(0, 2).map(ws => (
                                                        <span key={ws} className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 truncate max-w-[80px]">{ws}</span>
                                                      ))}
                                                      {student.weakSkills.length > 2 && <span className="text-[10px] text-gray-400">+{student.weakSkills.length - 2}</span>}
                                                    </div>
                                                  ) : (
                                                    <span className="text-xs text-gray-400">لا يوجد</span>
                                                  )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                  <button onClick={() => { setActiveTab('students'); setSelectedStudentId(student.id); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                                                    عرض التفاصيل
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="py-8 text-center text-gray-500 text-sm">
                                        لا يوجد طلاب مسجلين في هذا الفصل بعد.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  لا تتوفر مجموعات فصول دراسية تحت إشرافك حالياً.
                </div>
              )}
            </div>

            {/* Performance analysis chart simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Score Distribution Chart */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-base font-black text-gray-900">توزيع درجات الطلاب الإجمالي (منحنى الأداء)</h3>
                <div className="h-64 flex items-end justify-between gap-2 pt-6">
                  {[
                    { label: 'دون 50%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average < 50 && s.attempts > 0).length, color: 'bg-rose-500' },
                    { label: '50% - 60%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average >= 50 && s.average < 60).length, color: 'bg-rose-400' },
                    { label: '60% - 70%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average >= 60 && s.average < 70).length, color: 'bg-amber-400' },
                    { label: '70% - 80%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average >= 70 && s.average < 80).length, color: 'bg-blue-400' },
                    { label: '80% - 90%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average >= 80 && s.average < 90).length, color: 'bg-emerald-400' },
                    { label: 'أعلى من 90%', height: supervisorScopeSummary.allStudentsList.filter(s => s.average >= 90).length, color: 'bg-emerald-500' },
                  ].map((bar, i) => {
                    const maxCount = Math.max(1, ...[bar.height]);
                    const pctHeight = (bar.height / (supervisorScopeSummary.allStudentsList.length || 1)) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div className="text-[10px] font-bold text-gray-500 mb-1 group-hover:text-indigo-600">{bar.height} طالباً</div>
                        <div className={`w-full rounded-t-lg transition-all duration-500 ${bar.color}`} style={{ height: `${Math.max(6, pctHeight * 1.5)}%` }} />
                        <div className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">{bar.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary Statistics */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-base font-black text-gray-900">إحصائيات التقدم والتحصيل الكلي</h3>
                <div className="grid grid-cols-2 gap-4 h-[calc(100%-2.5rem)]">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center flex flex-col justify-center">
                    <TrendingUp size={28} className="mx-auto mb-2 text-emerald-600" />
                    <div className="text-3xl font-black text-emerald-700">{supervisorScopeSummary.improvedStudentsCount}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-1">طلاب ارتفع مستوى تحصيلهم</div>
                  </div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-center flex flex-col justify-center">
                    <TrendingDown size={28} className="mx-auto mb-2 text-rose-600" />
                    <div className="text-3xl font-black text-rose-700">{supervisorScopeSummary.declinedCount}</div>
                    <div className="text-xs font-bold text-rose-600 mt-1">طلاب تراجع مستوى تحصيلهم</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-center flex flex-col justify-center">
                    <UserCheck size={28} className="mx-auto mb-2 text-amber-600" />
                    <div className="text-3xl font-black text-amber-700">{supervisorScopeSummary.weakStudentsCount}</div>
                    <div className="text-xs font-bold text-amber-600 mt-1">طلاب بحاجة تدخل أسبوعي</div>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center flex flex-col justify-center">
                    <Target size={28} className="mx-auto mb-2 text-indigo-600" />
                    <div className="text-3xl font-black text-indigo-700">{supervisorScopeSummary.averageScore}%</div>
                    <div className="text-xs font-bold text-indigo-600 mt-1">معدل التحصيل العام للنطاق</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STUDENT DETAILS SLIDING DRAWER / MODAL ===== */}
        {activeStudentDetails && (
          <div className="fixed inset-0 z-50 overflow-hidden print:hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 overflow-hidden">
              {/* Backdrop */}
              <div onClick={() => setSelectedStudentId(null)} className="absolute inset-0 bg-gray-500/75 transition-opacity duration-300 ease-in-out"></div>
              
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10 sm:pr-16">
                <div className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl text-right">
                    
                    {/* Header */}
                    <div className="bg-indigo-900 px-6 py-6 text-white sm:flex sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white" id="slide-over-title">ملف تفاصيل مستوى الطالب</h2>
                        <p className="text-xs text-indigo-200">تحليل مفصل للمحاولات والمهارات وتوصيات المعلم</p>
                      </div>
                      <button onClick={() => setSelectedStudentId(null)} className="rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white">
                        <X size={24} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="relative flex-1 px-6 py-6 space-y-6">
                      
                      {/* Student Info Summary */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-xl shadow-xs">
                            {activeStudentDetails.name[0]}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-gray-900">{activeStudentDetails.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{activeStudentDetails.schoolName} • {activeStudentDetails.className} • {activeStudentDetails.gradeName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex flex-col items-center justify-center bg-indigo-50">
                            <span className="text-base font-black text-indigo-700">{activeStudentDetails.average}%</span>
                            <span className="text-[8px] text-gray-500">المعدل</span>
                          </div>
                        </div>
                      </div>

                      {/* Intervention Quick Actions inside Drawer */}
                      <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">الإجراءات السريعة للمشرف</h4>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => void sendStudentFollowUpAlert(activeStudentDetails)}
                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Send size={14} />
                            إرسال تنبيه متابعة
                          </button>
                          <button onClick={() => openStudentQuiz(activeStudentDetails.id)}
                            className="flex-1 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <ClipboardList size={14} />
                            توجيه خطة علاجية
                          </button>
                        </div>
                      </div>

                      {/* Skill Mastery Map */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-900">خريطة المهارات والتحصيل (Skills Breakdown)</h4>
                        {activeStudentDetails.resultsList.length > 0 ? (
                          <div className="space-y-3 max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/20">
                            {activeStudentDetails.resultsList[0].skillsAnalysis?.map((sk) => {
                              const masteryPct = Number(sk.mastery || 0);
                              const levelColor = masteryPct < 60 ? 'bg-rose-500 text-rose-700' : masteryPct < 75 ? 'bg-amber-500 text-amber-700' : 'bg-emerald-500 text-emerald-700';
                              const levelBg = masteryPct < 60 ? 'bg-rose-50' : masteryPct < 75 ? 'bg-amber-50' : 'bg-emerald-50';
                              return (
                                <div key={sk.skill} className="space-y-1.5 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-800">{sk.skill}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${levelBg} ${levelColor.split(' ')[1]}`}>{masteryPct}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${levelColor.split(' ')[0]}`} style={{ width: `${masteryPct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-xs text-gray-400">
                            لم يؤدِ هذا الطالب أي اختبارات تتضمن تحليلاً للمهارات بعد.
                          </div>
                        )}
                      </div>

                      {/* Recent Quiz Attempts List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-900">سجل محاولات الاختبار</h4>
                        {activeStudentDetails.resultsList.length > 0 ? (
                          <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                  <th className="px-4 py-2.5 font-bold text-gray-500">اسم الاختبار</th>
                                  <th className="px-4 py-2.5 font-bold text-gray-500 text-center">الدرجة</th>
                                  <th className="px-4 py-2.5 font-bold text-gray-500">التاريخ</th>
                                  <th className="px-4 py-2.5 font-bold text-gray-500 text-center">التقرير</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {activeStudentDetails.resultsList.map((r, i) => (
                                  <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-bold text-gray-800 truncate max-w-[160px]">{r.quizTitle}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`font-black text-sm ${r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {r.score}%
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="px-4 py-3 text-center">
                                      <button onClick={() => openStudentReport(activeStudentDetails.id)} className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
                                        عرض التقرير
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-xs text-gray-400">
                            لا تتوفر محاولات اختبار مسجلة للطالب.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SKILL DETAILS SUB-DRAWER / MODAL ===== */}
        {selectedSkillFilter && (
          <div className="fixed inset-0 z-50 overflow-hidden print:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 overflow-hidden">
              <div onClick={() => setSelectedSkillFilter(null)} className="absolute inset-0 bg-gray-500/75 transition-opacity"></div>
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                <div className="pointer-events-auto w-screen max-w-md transform transition duration-500">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl text-right">
                    
                    <div className="bg-indigo-950 px-6 py-5 text-white flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white">الطلاب المتعثرون في مهارة</h2>
                        <h3 className="text-xs text-indigo-200 mt-1 truncate max-w-[280px]">{selectedSkillFilter.name}</h3>
                      </div>
                      <button onClick={() => setSelectedSkillFilter(null)} className="rounded text-indigo-200 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs font-bold text-gray-400">قائمة المستهدفين بالدعم</span>
                        <button onClick={() => {
                          const params = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal' });
                          window.location.hash = `/admin-dashboard?${params.toString()}`;
                        }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">توجيه خطة جماعية ←</button>
                      </div>

                      {selectedSkillFilter.students.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">لا يوجد طلاب ضعفاء مسجلين حالياً في هذه المهارة.</p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selectedSkillFilter.students.map((sid) => {
                            const student = supervisorScopeSummary.allStudentsList.find(s => s.id === sid);
                            if (!student) return null;
                            return (
                              <div key={sid} className="flex justify-between items-center border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                                <div>
                                  <div className="font-bold text-xs text-gray-900">{student.name}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{student.className} • {student.schoolName}</div>
                                </div>
                                <button onClick={() => { setSelectedStudentId(student.id); setSelectedSkillFilter(null); }}
                                  className="rounded bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                  عرض
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PRINCIPAL EXECUTIVE BRIEFING MODAL ===== */}
        {showPrincipalReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white" role="dialog" aria-modal="true">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 text-right space-y-6 print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-0">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-100 pb-5 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                    <Building2 size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">تقرير الإنجاز الدوري لمدير المدرسة</h2>
                    <p className="text-xs text-gray-500 mt-1">{supervisorScopeSummary.primarySchoolName} • {supervisorScopeSummary.scopeTypeName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
                    <Printer size={15} />
                    <span>طباعة التقرير التفيذي</span>
                  </button>
                  <button onClick={() => setShowPrincipalReport(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Content Body */}
              <div className="space-y-6">
                <div className="hidden print:block text-center border-b pb-4 mb-4">
                  <h1 className="text-2xl font-black text-gray-950">تقرير التقييم الإداري والأكاديمي للمدرسة</h1>
                  <h2 className="text-lg font-bold text-indigo-700 mt-1">{supervisorScopeSummary.primarySchoolName}</h2>
                  <p className="text-xs text-gray-500 mt-1">تاريخ التقديم لمدير المدرسة: {new Date().toLocaleDateString('ar-EG')} • إعداد المشرف: {user.name}</p>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                  <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                    <span className="text-[11px] font-bold text-gray-500 block">إجمالي طلاب المدرسة</span>
                    <strong className="text-xl font-black text-indigo-900 mt-1 block">{supervisorScopeSummary.studentCount}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                    <span className="text-[11px] font-bold text-gray-500 block">متوسط تحصيل المدرسة</span>
                    <strong className="text-xl font-black text-emerald-600 mt-1 block">{supervisorScopeSummary.averageScore}%</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                    <span className="text-[11px] font-bold text-gray-500 block">فصول تحت الإشراف</span>
                    <strong className="text-xl font-black text-gray-900 mt-1 block">{supervisorScopeSummary.groupCount}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                    <span className="text-[11px] font-bold text-gray-500 block">طلاب بحاجة لدعم</span>
                    <strong className="text-xl font-black text-rose-600 mt-1 block">{supervisorScopeSummary.weakStudentsCount}</strong>
                  </div>
                </div>

                {/* Class Performance Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" />
                    مقارنة تحصيل الفصول والصفوف الدراسية
                  </h3>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                          <th className="p-3 font-bold">اسم الفصل</th>
                          <th className="p-3 font-bold text-center">عدد الطلاب</th>
                          <th className="p-3 font-bold text-center">متوسط الدرجات</th>
                          <th className="p-3 font-bold text-center">حالات التعثر</th>
                          <th className="p-3 font-bold">التوصية الإدارية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {supervisorScopeSummary.groupSnapshots.map((g) => (
                          <tr key={g.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold text-gray-900">{g.name}</td>
                            <td className="p-3 text-center text-gray-700">{g.studentCount}</td>
                            <td className="p-3 text-center">
                              <span className={`font-black ${g.average >= 75 ? 'text-emerald-600' : g.average >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {g.average}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {g.weakStudents > 0 ? (
                                <span className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                  {g.weakStudents} طالب
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold">لا يوجد</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-600">
                              {g.average >= 80 ? 'فصل متميز - ينصح بتكريم المعلم والطلاب' : g.average >= 65 ? 'أداء متوسط - يحتاج متابعة دورية' : 'يحتاج ورشة عمل علاجية عاجلة'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Priority Skills Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Target size={18} className="text-rose-500" />
                    المهارات الأكثر حرجاً والمستهدفة بالدعم
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {supervisorScopeSummary.weakestSkills.slice(0, 4).map((sk, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl p-3.5 bg-rose-50/30 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-xs text-gray-900">{sk.skill}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">يتأثر بها {sk.affectedStudents} طالب في المدرسة</div>
                        </div>
                        <span className="font-black text-xs text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-100 shadow-sm">
                          تمكن {sk.mastery}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature Line */}
                <div className="pt-6 border-t border-gray-100 flex justify-between items-end text-xs text-gray-600">
                  <div>
                    <span className="block font-bold text-gray-900">ملاحظات واعتماد مدير المدرسة:</span>
                    <div className="w-64 h-12 border-b border-dashed border-gray-300 mt-2"></div>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-900">توقيع مشرف المدرسة:</span>
                    <span className="block text-indigo-700 font-bold mt-1">{user.name}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
