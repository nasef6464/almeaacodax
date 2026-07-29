import React, { useMemo } from 'react';
import { Target, Users, AlertTriangle, TrendingUp, Printer } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Quiz, QuizResult, SkillGap } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const TestAnalyticsReport: React.FC<{ quiz: Quiz; studentIds: string[] }> = ({ quiz, studentIds }) => {
  const { examResults, users } = useStore();

  const WEAKNESS_THRESHOLD = 60; // 60% as per user requirement

  // 1. Filter Results
  const results = useMemo(() => {
    return examResults.filter(r => r.quizId === quiz.id && studentIds.includes(r.userId || ''));
  }, [examResults, quiz.id, studentIds]);

  const studentsDetails = useMemo(() => {
    return users.filter(u => studentIds.includes(u.id));
  }, [users, studentIds]);

  // 2. Compute KPIs
  const participationRate = studentIds.length > 0 ? Math.round((results.length / studentIds.length) * 100) : 0;
  const averageScore = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;
  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
  const minScore = results.length > 0 ? Math.min(...results.map(r => r.score)) : 0;

  // 3. Compute Skills Analysis
  const skillStats = useMemo(() => {
    const skillsMap: Record<string, { totalScore: number; count: number }> = {};
    
    results.forEach(result => {
      if (result.skillsAnalysis) {
        result.skillsAnalysis.forEach(skill => {
          if (!skillsMap[skill.skill]) {
            skillsMap[skill.skill] = { totalScore: 0, count: 0 };
          }
          skillsMap[skill.skill].totalScore += skill.mastery;
          skillsMap[skill.skill].count += 1;
        });
      }
    });

    return Object.entries(skillsMap).map(([skill, data]) => ({
      skill,
      mastery: Math.round(data.totalScore / data.count),
      isWeak: Math.round(data.totalScore / data.count) < WEAKNESS_THRESHOLD,
    })).sort((a, b) => a.mastery - b.mastery); // lowest mastery first
  }, [results]);

  // 4. Compute Student Breakdown
  const studentBreakdown = useMemo(() => {
    return results.map(result => {
      const student = studentsDetails.find(u => u.id === result.userId);
      const weakSkills = (result.skillsAnalysis || []).filter(s => s.mastery < WEAKNESS_THRESHOLD).map(s => s.skill);
      return {
        id: result.userId || '',
        name: student?.name || 'طالب غير معروف',
        score: result.score,
        isWeak: result.score < WEAKNESS_THRESHOLD,
        weakSkills,
      };
    }).sort((a, b) => a.score - b.score); // lowest scores first
  }, [results, studentsDetails]);

  const weakStudents = studentBreakdown.filter(s => s.isWeak);

  const handlePrint = () => {
    window.print();
  };

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد نتائج بعد</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          لم يقم أي طالب من الفصول المحددة بإجراء هذا الاختبار حتى الآن. يرجى الانتظار حتى يتم حل الاختبار لظهور التحليل.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:bg-white print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{quiz.title}</h2>
          <p className="text-sm text-gray-500 mt-1">تحليل مفصل لنتائج الطلاب في هذا الاختبار</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
          <Printer size={18} />
          طباعة التقرير
        </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center border-b border-gray-200 pb-6 mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">تقرير تحليل الاختبار</h1>
        <h2 className="text-xl text-gray-700 mb-4">{quiz.title}</h2>
        <div className="flex justify-center gap-8 text-sm text-gray-500">
          <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
          <span>عدد المشاركين: {results.length} من {studentIds.length}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Target size={20} />
            <span className="font-bold">متوسط الدرجات</span>
          </div>
          <p className={`text-3xl font-black ${averageScore >= WEAKNESS_THRESHOLD ? 'text-gray-900' : 'text-rose-600'}`}>{averageScore}%</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Users size={20} />
            <span className="font-bold">نسبة المشاركة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{participationRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{results.length} من أصل {studentIds.length} طالب</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <TrendingUp size={20} />
            <span className="font-bold">أعلى درجة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{maxScore}%</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-rose-600 mb-2">
            <AlertTriangle size={20} />
            <span className="font-bold">أقل درجة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{minScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="text-indigo-600" />
            تحليل المهارات
          </h3>
          {skillStats.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="skill" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'الإتقان']} />
                  <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                    {skillStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isWeak ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">لا توجد بيانات مهارات في هذا الاختبار</div>
          )}
          {skillStats.filter(s => s.isWeak).length > 0 && (
            <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
              <h4 className="font-bold text-rose-800 mb-2 text-sm flex items-center gap-1"><AlertTriangle size={16} /> مهارات تحتاج لتعزيز</h4>
              <ul className="list-disc list-inside text-rose-700 text-sm space-y-1">
                {skillStats.filter(s => s.isWeak).map(s => (
                  <li key={s.skill}>{s.skill} ({s.mastery}%)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Weak Students */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-indigo-600" />
              الطلاب الضعاف (أقل من {WEAKNESS_THRESHOLD}%)
            </h3>
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">{weakStudents.length} طلاب</span>
          </div>

          {weakStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 rounded-tr-lg">الطالب</th>
                    <th className="px-4 py-3">الدرجة</th>
                    <th className="px-4 py-3 rounded-tl-lg">أبرز المهارات الضعيفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weakStudents.map(student => (
                    <tr key={student.id} className="hover:bg-rose-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">{student.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded-md">{student.score}%</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {student.weakSkills.length > 0 ? student.weakSkills.slice(0, 2).join('، ') + (student.weakSkills.length > 2 ? '...' : '') : 'غير محدد'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-500">
              <Target size={40} className="mb-2 opacity-50" />
              <p className="font-bold">عمل رائع! لا يوجد طلاب ضعاف في هذا الاختبار.</p>
            </div>
          )}
        </div>
      </div>

      {/* All Students Detailed Table (Printable) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ClipboardList className="text-indigo-600" />
          السجل الشامل לدرجات الطلاب
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 rounded-tr-lg">#</th>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">الدرجة النهائية</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 rounded-tl-lg hidden sm:table-cell">عدد المهارات الضعيفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studentBreakdown.map((student, idx) => (
                <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${student.isWeak ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{student.name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold px-2 py-1 rounded-md ${student.isWeak ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {student.score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${student.isWeak ? 'text-rose-600 border border-rose-200' : 'text-emerald-600 border border-emerald-200'}`}>
                      {student.isWeak ? 'يحتاج دعم' : 'متقن'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {student.weakSkills.length > 0 ? (
                      <span className="text-rose-600 font-bold">{student.weakSkills.length} مهارات</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
