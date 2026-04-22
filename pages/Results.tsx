import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Eye,
  BarChart3,
  History,
  CheckCircle2,
  ChevronLeft,
  PlayCircle,
  Star,
  Trash2,
  FileText,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { VideoModal } from '../components/VideoModal';
import { DetailedAnalysisModal } from '../components/DetailedAnalysisModal';
import { useStore } from '../store/useStore';
import { QuizResult } from '../types';

const Results: React.FC = () => {
  const { examResults } = useStore();
  const [viewMode, setViewMode] = React.useState<'summary' | 'review' | 'history' | 'analysis'>('summary');
  const [isAnalysisOpen, setIsAnalysisOpen] = React.useState(false);
  const [videoData, setVideoData] = React.useState<{ url: string; title: string } | null>(null);

  const latestResult = examResults[0];

  const data = [
    { name: 'Success', value: latestResult?.score || 0 },
    { name: 'Fail', value: 100 - (latestResult?.score || 0) },
  ];
  const COLORS = ['#10b981', '#dc2626'];

  if (!latestResult) {
    return (
      <div className="space-y-6 pb-20">
        <header className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </header>

        <Card className="p-10 text-center border-dashed border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">لا توجد نتيجة محفوظة بعد</h2>
          <p className="text-gray-500 mb-6">ابدأ أول اختبار، وبعدها ستظهر هنا النتيجة والتحليل وسجل المحاولات.</p>
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            <PlayCircle size={18} />
            ابدأ اختبارًا الآن
          </Link>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <>
        <ReviewSolutions
          onBack={() => setViewMode('summary')}
          onShowVideo={(url, title) => setVideoData({ url, title })}
        />
        {videoData ? (
          <VideoModal videoUrl={videoData.url} title={videoData.title} onClose={() => setVideoData(null)} />
        ) : null}
      </>
    );
  }

  if (viewMode === 'history') {
    return <PreviousAttempts onBack={() => setViewMode('summary')} attempts={examResults} />;
  }

  if (viewMode === 'analysis') {
    return <DetailedAnalysis onBack={() => setViewMode('summary')} result={latestResult} />;
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-500">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold">
          آخر محاولة مسجلة
        </div>
      </header>

      <Card className="p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{latestResult.quizTitle}</h2>

        <div className="flex justify-center items-center gap-4 text-sm font-bold mb-8">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>نسبة النجاح</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span>لم ينجح</span>
          </div>
        </div>

        <div className="h-64 relative flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-emerald-600">{latestResult.score}%</span>
            <span className="text-sm text-gray-500">النتيجة النهائية</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => setIsAnalysisOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <BarChart3 size={18} />
            تحليل مفصل بالدرجات
          </button>
          <button
            onClick={() => setViewMode('history')}
            className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"
          >
            <History size={18} />
            محاولاتك السابقة
          </button>
        </div>

        <DetailedAnalysisModal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />
      </Card>

      <div className="bg-secondary-500 text-white p-3 text-center font-bold rounded-t-xl">إحصائيات الاختبار</div>
      <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden">
        <StatRow label="عدد الأسئلة" value={latestResult.totalQuestions.toString()} />
        <StatRow label="الوقت المستغرق" value={latestResult.timeSpent} />
        <StatRow label="الإجابات الصحيحة" value={latestResult.correctAnswers.toString()} color="text-emerald-500" />
        <StatRow label="الأخطاء" value={latestResult.wrongAnswers.toString()} color="text-red-500" />
        <StatRow label="لم يتم حلها" value={latestResult.unanswered.toString()} color="text-amber-500" />
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-right relative overflow-hidden mt-6">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">تحسين مستواك</h3>
          <p className="text-indigo-100 mb-4 text-sm">بناءً على نتيجتك، نقترح عليك مراجعة المهارات الأضعف ثم تنفيذ اختبار تدريبي جديد.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/reports" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors">
              افتح تقرير الأداء
            </Link>
            <Link to="/quizzes" className="bg-indigo-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-900 transition-colors">
              اعرض كل محاولاتك
            </Link>
          </div>
        </div>
        <Star className="absolute left-[-20px] top-[-20px] w-40 h-40 text-white opacity-10 transform -rotate-12" />
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setViewMode('review')}
            className="bg-emerald-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-100"
          >
            <Eye size={20} />
            مراجعة الحلول
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className="bg-indigo-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-indigo-100"
          >
            <BarChart3 size={20} />
            تحليل المهارات
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/quiz"
            className="bg-white border border-emerald-500 text-emerald-600 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-emerald-50"
          >
            <RefreshCw size={20} />
            إعادة الاختبار
          </Link>
          <Link
            to="/quizzes"
            className="bg-white border border-amber-500 text-amber-600 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-amber-50"
          >
            <PlusCircle size={20} />
            اختبار إضافي
          </Link>
        </div>
      </div>
    </div>
  );
};

const ReviewSolutions = ({
  onBack,
  onShowVideo,
}: {
  onBack: () => void;
  onShowVideo: (url: string, title: string) => void;
}) => {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Record<number, boolean>>({});

  const toggleFavorite = (idx: number) => {
    setFavorites((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const questions = [
    {
      id: 1,
      text: 'المعكوس الإيجابي للعبارة p -> q هو ...',
      image: 'https://picsum.photos/seed/math1/800/400',
      options: ['~q -> p', 'q -> ~p', 'p -> ~q', '~p -> ~q'],
      correct: 0,
      userAnswer: 0,
      explanation: 'المعكوس الإيجابي يعتمد على تبديل الفرض والنتيجة ثم نفيهما بالشكل الصحيح.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    },
    {
      id: 2,
      text: 'إذا كانت الشركة أ فيها 30% غير سعوديين والشركة ب نصفها وعدد غير السعوديين فيها 40%، فما النسبة معًا؟',
      options: ['33.3%', '30%', '25%', '66.6%'],
      correct: 0,
      userAnswer: 2,
      explanation: 'نفترض 100 موظف في الشركة أ و50 في الشركة ب، فيكون مجموع غير السعوديين 50 من أصل 150 أي 33.3%.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    },
  ];

  const q = questions[currentIdx];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowRight />
          </button>
          <h1 className="text-xl font-bold">مراجعة الحلول</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold">
            السؤال {currentIdx + 1} من {questions.length}
          </span>
          <button
            onClick={() => toggleFavorite(currentIdx)}
            className={`${favorites[currentIdx] ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors`}
          >
            {favorites[currentIdx] ? <Trash2 size={16} /> : <Star size={16} />}
            {favorites[currentIdx] ? 'مسح من المفضلة' : 'إضافة للمفضلة'}
          </button>
        </div>
      </header>

      <Card className="p-0 overflow-hidden border-2 border-gray-100 shadow-xl">
        <div className="p-8 bg-white">
          <div className="bg-gray-50 rounded-2xl p-8 mb-8 flex flex-col items-center justify-center border border-gray-100 min-h-[250px]">
            {q.image ? (
              <img src={q.image} alt="Question" className="max-h-64 object-contain mb-6" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-center mb-6">
                <FileText size={48} className="text-gray-200 mx-auto mb-2" />
                <span className="text-sm text-gray-400 font-bold">[صورة توضيحية للسؤال]</span>
              </div>
            )}
            <p className="text-xl font-bold text-gray-800 text-center leading-relaxed px-4">{q.text}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {['A', 'B', 'C', 'D'].map((label, i) => {
              const isCorrect = i === q.correct;
              const isUser = i === q.userAnswer;

              let borderClass = 'border-gray-200 text-gray-400';
              let bgClass = 'bg-white';

              if (showExplanation) {
                if (isCorrect) {
                  borderClass = 'border-emerald-500 text-emerald-600';
                  bgClass = 'bg-emerald-50';
                } else if (isUser && !isCorrect) {
                  borderClass = 'border-red-500 text-red-600';
                  bgClass = 'bg-red-50';
                }
              }

              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-black transition-all ${borderClass} ${bgClass}`}>
                    {label}
                  </div>
                  <span className="text-xs font-bold text-gray-400">{q.options[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onShowVideo(q.videoUrl, `شرح السؤال ${currentIdx + 1}`)}
              className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
            >
              <PlayCircle size={20} />
              شرح الفيديو
            </button>
            <button
              onClick={() => setShowExplanation((value) => !value)}
              className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
            >
              <Eye size={20} />
              {showExplanation ? 'إخفاء الحل' : 'إظهار الحل'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentIdx((prev) => Math.max(0, prev - 1));
                setShowExplanation(false);
              }}
              disabled={currentIdx === 0}
              className="bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all"
            >
              السابق
            </button>
            <button
              onClick={() => {
                if (currentIdx < questions.length - 1) {
                  setCurrentIdx((prev) => prev + 1);
                  setShowExplanation(false);
                } else {
                  onBack();
                }
              }}
              className="bg-slate-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
            >
              {currentIdx === questions.length - 1 ? 'إنهاء المراجعة' : 'التالي'}
              <ChevronRightIcon size={20} className="transform rotate-180" />
            </button>
          </div>
        </div>
      </Card>

      {showExplanation ? (
        <div className="animate-slide-up">
          <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/30">
            <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <CheckCircle2 size={20} />
              توضيح الحل الصحيح:
            </h4>
            <p className="text-gray-700 leading-relaxed font-medium">{q.explanation}</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

const DetailedAnalysis = ({ onBack, result }: { onBack: () => void; result: QuizResult }) => {
  const skills = result.skillsAnalysis || [];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500">
          <ArrowRight />
        </button>
        <h1 className="text-xl font-bold">التحليل المفصل للمهارات</h1>
      </header>

      <div className="grid gap-4">
        {skills.map((s, idx) => (
          <Card key={idx} className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{s.skill}</h3>
                <span className="text-xs text-gray-500">{s.section}</span>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  s.status === 'weak'
                    ? 'bg-red-100 text-red-600'
                    : s.status === 'average'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {s.mastery}%
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  s.status === 'weak' ? 'bg-red-500' : s.status === 'average' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${s.mastery}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-indigo-900 text-white">
        <h3 className="font-bold text-lg mb-4">توصية ذكية</h3>
        <p className="text-indigo-100 leading-relaxed">
          اعتمد في خطتك القادمة على مراجعة المهارات الأضعف أولًا، ثم إعادة الاختبار التدريبي بعد إنهاء الشرح المرتبط بها.
        </p>
        <Link to="/reports" className="inline-flex mt-6 bg-white text-indigo-900 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
          اذهب للتقرير الكامل
        </Link>
      </Card>
    </div>
  );
};

const PreviousAttempts = ({ onBack, attempts }: { onBack: () => void; attempts: QuizResult[] }) => {
  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500">
          <ArrowRight />
        </button>
        <h1 className="text-xl font-bold">محاولاتك السابقة</h1>
      </header>

      <div className="space-y-4">
        {attempts.map((attempt, index) => (
          <Card key={`${attempt.quizId}-${attempt.date}-${index}`} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  attempt.score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {attempt.score}%
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{attempt.quizTitle}</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{new Date(attempt.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{attempt.timeSpent}</span>
                </div>
              </div>
            </div>
            <ChevronLeft className="text-gray-400" />
          </Card>
        ))}
      </div>
    </div>
  );
};

const StatRow = ({ label, value, color = 'text-gray-800' }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between items-center p-4 border-b border-gray-100 last:border-0">
    <span className="font-bold text-lg text-gray-900">{label}</span>
    <span className={`font-bold text-lg ${color}`}>{value}</span>
  </div>
);

export default Results;
