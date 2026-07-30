import React, { useMemo, useState } from 'react';
import { Target, Users, AlertTriangle, TrendingUp, Printer, Eye, Bell, FileText, X, ChevronDown, HelpCircle, CheckCircle, XCircle, ClipboardList, Send } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Quiz, QuizResult, SkillGap, QuizQuestionReview } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../../services/api';

export const TestAnalyticsReport: React.FC<{ quiz: Quiz; studentIds: string[] }> = ({ quiz, studentIds }) => {
  const { examResults, users, groups } = useStore();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [inspectedStudentId, setInspectedStudentId] = useState<string | null>(null);
  const [showInterventionReport, setShowInterventionReport] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const WEAKNESS_THRESHOLD = 60; // 60% as per user requirement

  // Groups that contain any of the relevant students
  const relevantGroups = useMemo(() => {
    return groups.filter(g => g.studentIds.some(id => studentIds.includes(id)));
  }, [groups, studentIds]);

  // 1. Filter Results Based on Selected Group
  const filteredStudentIds = useMemo(() => {
    if (selectedGroupId === 'all') return studentIds;
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return studentIds;
    return studentIds.filter(id => group.studentIds.includes(id));
  }, [selectedGroupId, studentIds, groups]);

  const results = useMemo(() => {
    return examResults.filter(r => r.quizId === quiz.id && filteredStudentIds.includes(r.userId || ''));
  }, [examResults, quiz.id, filteredStudentIds]);

  const studentsDetails = useMemo(() => {
    return users.filter(u => filteredStudentIds.includes(u.id));
  }, [users, filteredStudentIds]);

  const participantIds = useMemo(() => results.map(r => r.userId).filter(Boolean) as string[], [results]);
  const nonParticipantIds = useMemo(() => filteredStudentIds.filter(id => !participantIds.includes(id)), [filteredStudentIds, participantIds]);
  const nonParticipantsDetails = useMemo(() => users.filter(u => nonParticipantIds.includes(u.id)), [users, nonParticipantIds]);

  // 2. Compute KPIs
  const participationRate = filteredStudentIds.length > 0 ? Math.round((results.length / filteredStudentIds.length) * 100) : 0;
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

  // 5. Item Analysis (Per-Question Breakdown)
  const itemAnalysis = useMemo(() => {
    const map: Record<string, { text: string; attempts: number; correct: number; wrongOptionsMap: Record<number, number>; options: string[] }> = {};

    results.forEach(result => {
      if (result.questionReview) {
        result.questionReview.forEach(review => {
          if (!map[review.questionId]) {
            map[review.questionId] = {
              text: review.text,
              options: review.options,
              attempts: 0,
              correct: 0,
              wrongOptionsMap: {}
            };
          }
          map[review.questionId].attempts += 1;
          if (review.isCorrect) {
            map[review.questionId].correct += 1;
          } else if (review.selectedOptionIndex !== undefined && review.selectedOptionIndex !== -1) {
            map[review.questionId].wrongOptionsMap[review.selectedOptionIndex] = (map[review.questionId].wrongOptionsMap[review.selectedOptionIndex] || 0) + 1;
          }
        });
      }
    });

    return Object.values(map).map(item => {
      const errorRate = item.attempts > 0 ? Math.round(((item.attempts - item.correct) / item.attempts) * 100) : 0;
      
      let mostCommonWrongIdx = -1;
      let maxWrong = -1;
      Object.entries(item.wrongOptionsMap).forEach(([idx, count]) => {
        if (count > maxWrong) {
          maxWrong = count;
          mostCommonWrongIdx = Number(idx);
        }
      });

      return {
        ...item,
        errorRate,
        mostCommonWrongOption: mostCommonWrongIdx >= 0 && item.options[mostCommonWrongIdx] ? item.options[mostCommonWrongIdx] : 'لا يوجد إجابة متكررة'
      };
    }).sort((a, b) => b.errorRate - a.errorRate);
  }, [results]);

  const handlePrint = () => {
    window.print();
  };

  const handleNotifyNonParticipants = async () => {
    if (nonParticipantIds.length === 0) {
      setActionFeedback("جميع الطلاب شاركوا بالفعل.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('token') || '';
      await api.sendNotifications({
        title: "تذكير بالاختبار",
        body: `يرجى إجراء الاختبار: ${quiz.title} في أقرب وقت.`,
        channels: ['in_app'],
        userIds: nonParticipantIds
      }, token);
      setActionFeedback("تم إرسال التنبيهات بنجاح!");
    } catch (error) {
      setActionFeedback("حدث خطأ أثناء إرسال التنبيهات.");
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const interventionReportText = weakStudents.length > 0 
    ? weakStudents.map(student => `الطالب: ${student.name} (الدرجة: ${student.score}%)\nالمهارات الضعيفة: ${student.weakSkills.length > 0 ? student.weakSkills.join('، ') : 'غير محدد'}`).join('\n\n')
    : 'لا يوجد طلاب ضعاف يحتاجون إلى تدخل.';

  const inspectedResult = inspectedStudentId ? results.find(r => r.userId === inspectedStudentId) : null;
  const inspectedStudent = inspectedStudentId ? users.find(u => u.id === inspectedStudentId) : null;

  return (
    <div className="space-y-6 print:bg-white print:p-0 relative">
      {/* Top Bar with Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{quiz.title}</h2>
          <p className="text-sm text-gray-500 mt-1">تحليل مفصل لنتائج الطلاب في هذا الاختبار</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            >
              <option value="all">جميع الفصول</option>
              {relevantGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
            <Printer size={18} />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center border-b border-gray-200 pb-6 mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">تقرير تحليل الاختبار</h1>
        <h2 className="text-xl text-gray-700 mb-4">{quiz.title}</h2>
        <div className="flex justify-center gap-8 text-sm text-gray-500">
          <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
          <span>عدد المشاركين: {results.length} من {filteredStudentIds.length}</span>
          {selectedGroupId !== 'all' && (
            <span>الفصل: {groups.find(g => g.id === selectedGroupId)?.name}</span>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد نتائج بعد</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            لم يقم أي طالب من الفصول المحددة بإجراء هذا الاختبار حتى الآن. يرجى الانتظار حتى يتم حل الاختبار لظهور التحليل.
          </p>
        </div>
      ) : (
        <>
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
              <p className="text-xs text-gray-500 mt-1">{results.length} من أصل {filteredStudentIds.length} طالب</p>
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
                        <tr key={student.id} className="hover:bg-rose-50/50 transition-colors cursor-pointer" onClick={() => setInspectedStudentId(student.id)}>
                          <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2 hover:text-indigo-600">
                            <Eye size={16} className="text-indigo-400" />
                            {student.name}
                          </td>
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

          {/* Item Analysis */}
          {itemAnalysis.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <HelpCircle className="text-indigo-600" />
                تحليل الأسئلة (Item Analysis)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 rounded-tr-lg">السؤال</th>
                      <th className="px-4 py-3">المحاولات</th>
                      <th className="px-4 py-3">الإجابات الصحيحة</th>
                      <th className="px-4 py-3">نسبة الخطأ</th>
                      <th className="px-4 py-3 rounded-tl-lg">الخطأ الشائع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemAnalysis.map((item, idx) => (
                      <tr key={idx} className={`${item.errorRate > 50 ? 'bg-rose-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-[300px] truncate" title={item.text}>
                          {item.text.length > 80 ? item.text.substring(0, 80) + '...' : item.text}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.attempts}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{item.correct}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold px-2 py-1 rounded-md ${item.errorRate > 50 ? 'bg-rose-100 text-rose-700' : 'text-gray-700'}`}>
                            {item.errorRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]" title={item.mostCommonWrongOption}>
                          {item.mostCommonWrongOption}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Students Detailed Table */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ClipboardList className="text-indigo-600" />
              السجل الشامل لدرجات الطلاب
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
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${student.isWeak ? 'bg-rose-50/30' : ''}`} onClick={() => setInspectedStudentId(student.id)}>
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2 hover:text-indigo-600">
                        <Eye size={16} className="text-indigo-400" />
                        {student.name}
                      </td>
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
        </>
      )}

      {/* Non-Participants Section */}
      {nonParticipantsDetails.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-6 print:hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-gray-400" />
              طلاب لم يشاركوا
            </h3>
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{nonParticipantsDetails.length} طالب</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nonParticipantsDetails.map(student => (
              <div key={student.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50">
                <span className="font-medium text-gray-800 text-sm">{student.name}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md">لم يشارك</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision-Making Action Buttons */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm mt-8 print:hidden">
        <h3 className="text-lg font-bold text-indigo-900 mb-4">اتخاذ القرار</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleNotifyNonParticipants}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Bell size={18} />
            تنبيه غير المشاركين
          </button>
          <button 
            onClick={() => setShowInterventionReport(true)}
            className="flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <FileText size={18} />
            تقرير التدخل
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer size={18} />
            طباعة التقرير
          </button>
        </div>
        {actionFeedback && (
          <div className="mt-4 p-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm">
            <CheckCircle size={18} />
            {actionFeedback}
          </div>
        )}
      </div>

      {/* Intervention Report Modal */}
      {showInterventionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                تقرير التدخل للطلاب الضعاف
              </h3>
              <button onClick={() => setShowInterventionReport(false)} className="text-gray-400 hover:text-rose-500 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <textarea 
                readOnly
                className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                value={interventionReportText}
              />
              <p className="text-xs text-gray-500 mt-3 text-center">يمكنك نسخ هذا النص لمشاركته مع المعلمين أو أولياء الأمور.</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Answer Inspection Modal */}
      {inspectedStudentId && inspectedStudent && inspectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Eye className="text-indigo-600" />
                  إجابات الطالب: {inspectedStudent.name}
                </h3>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Target size={14} className="text-emerald-500" /> الدرجة: {inspectedResult.score}%</span>
                  <span className="flex items-center gap-1"><TrendingUp size={14} className="text-blue-500" /> الوقت المستغرق: {inspectedResult.timeSpent || 'غير متوفر'}</span>
                </div>
              </div>
              <button onClick={() => setInspectedStudentId(null)} className="text-gray-400 hover:text-rose-500 transition-colors p-1 self-start">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {inspectedResult.questionReview && inspectedResult.questionReview.length > 0 ? (
                <div className="space-y-4">
                  {inspectedResult.questionReview.map((q, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${q.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <p className="font-bold text-gray-900 mb-3 text-sm">{idx + 1}. {q.text}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500 text-xs">إجابة الطالب:</span>
                          <span className={`font-medium flex items-center gap-2 ${q.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {q.isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {q.selectedOptionIndex !== undefined && q.options[q.selectedOptionIndex] ? q.options[q.selectedOptionIndex] : 'لم يجب'}
                          </span>
                        </div>
                        {!q.isCorrect && (
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-500 text-xs">الإجابة الصحيحة:</span>
                            <span className="font-medium text-emerald-700 flex items-center gap-2">
                              <CheckCircle size={16} />
                              {q.correctOptionIndex !== undefined && q.options[q.correctOptionIndex] ? q.options[q.correctOptionIndex] : 'غير متوفر'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  لا تتوفر تفاصيل إجابات لهذا الطالب.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
