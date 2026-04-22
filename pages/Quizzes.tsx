import React, { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const Quizzes: React.FC = () => {
  const { examResults } = useStore();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const totalQuizzes = examResults.length;
  const passedQuizzes = examResults.filter((quiz) => quiz.score >= 50).length;
  const maxScore = Math.max(...examResults.map((quiz) => quiz.score), 0);

  const avgImprovement = useMemo(() => {
    if (examResults.length < 2) {
      return 0;
    }

    const ordered = [...examResults].reverse();
    const first = ordered[0]?.score || 0;
    const last = ordered[ordered.length - 1]?.score || 0;
    return Math.max(0, last - first);
  }, [examResults]);

  const courseFilters = useMemo(() => {
    const titles = Array.from(new Set(examResults.map((result) => result.quizTitle).filter(Boolean)));
    return ['الكل', ...titles];
  }, [examResults]);

  const filteredQuizzes =
    activeFilter === 'all' || activeFilter === 'الكل'
      ? examResults
      : examResults.filter((quiz) => quiz.quizTitle.includes(activeFilter));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowRight />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">اختباراتي</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Sparkles size={24} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
        <StatCard icon={<TrendingUp size={24} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
        <StatCard icon={<CheckCircle size={24} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
        <StatCard icon={<FileText size={24} />} value={totalQuizzes} label="إجمالي الاختبارات" color="emerald" />
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {courseFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter === 'الكل' ? 'all' : filter)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              (activeFilter === 'all' && filter === 'الكل') || activeFilter === filter
                ? 'bg-secondary-500 text-white shadow-md'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">تفاصيل الاختبارات</div>

        {filteredQuizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
                <tr>
                  <th className="p-4 text-right">اسم الاختبار وعدد الأسئلة</th>
                  <th className="p-4 text-center">الدرجة</th>
                  <th className="p-4 text-center">الوقت والتاريخ</th>
                  <th className="p-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuizzes.map((quiz, index) => (
                  <tr key={`${quiz.quizId}-${quiz.date}-${index}`} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-gray-800">{quiz.quizTitle}</div>
                        <span className="text-xs text-gray-500">{quiz.totalQuestions} سؤال</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`text-sm font-bold ${quiz.score < 50 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {quiz.score}%
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-[10px] text-gray-400" dir="ltr">
                        {new Date(quiz.date).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-gray-400" dir="ltr">
                        {new Date(quiz.date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          quiz.score >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {quiz.score >= 50 ? 'ناجح' : 'يحتاج إعادة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            لا توجد نتائج مطابقة للفلاتر الحالية. بعد إكمال أول اختبار ستظهر المحاولات هنا.
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'purple' | 'amber' | 'blue' | 'emerald';
}) => {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
        {icon}
      </div>
      <div className="text-left">
        <div className="font-bold text-2xl text-gray-800 dir-ltr">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
    </div>
  );
};

export default Quizzes;
