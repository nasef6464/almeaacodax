import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, CheckCircle2, Eye, EyeOff, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { QuestionAssistantPanel } from '../components/results/QuestionAssistantPanel';
import { QuestionVoiceExplanationPlayer } from '../components/results/QuestionVoiceExplanationPlayer';
import { api } from '../services/api';
import type { Question } from '../types';
import { normalizeQuestionHtml } from '../utils/questionHtml';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

type ReviewTab = 'saved' | 'mistakes';
type ReviewItem = { cardId: string; questionId: string; reasons: { saved: boolean; mistake: boolean }; reviewType: 'error_recovery' | 'mastery_review' | 'saved_review'; question: Question; };
const tabMeta: Record<ReviewTab, { label: string; empty: string }> = {
  saved: { label: 'حفظتها للمراجعة', empty: 'لم تحفظ أسئلة للمراجعة حتى الآن.' },
  mistakes: { label: 'أخطأت فيها', empty: 'لا توجد أسئلة أخطأت فيها محفوظة للمراجعة.' },
};

const Favorites: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<ReviewTab>('saved');
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [counts, setCounts] = React.useState({ saved: 0, mistakes: 0 });
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async (tab: ReviewTab, nextPage = 1) => {
    setLoading(true); setError('');
    try {
      const payload = await api.getStudentReviewLibrary({ tab, limit: 20, page: nextPage });
      setItems(Array.isArray(payload.items) ? payload.items as ReviewItem[] : []);
      setCounts(payload.counts || { saved: 0, mistakes: 0 });
      setPage(payload.page || nextPage);
      setHasMore(Boolean(payload.hasMore));
      setTotal(Number(payload.total || 0));
      setCurrentIndex(0); setShowAnswer(false);
    } catch (err) {
      setItems([]); setError(err instanceof Error ? err.message : 'تعذر تحميل أسئلة المراجعة الآن.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(activeTab, 1); }, [activeTab, load]);
  const current = items[currentIndex];
  const currentQuestion = current?.question;
  const assistantContext = current?.reasons?.mistake ? 'mistake_review' : 'saved_review';

  const removeSaved = async () => {
    if (!currentQuestion || !current?.reasons.saved) return;
    await api.removeQuestionFromReview(currentQuestion.id);
    const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
    await load(activeTab, nextPage);
  };

  return <div className="space-y-6 pb-20">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="text-gray-500 hover:text-gray-700"><ArrowRight /></Link>
        <div><h1 className="text-xl sm:text-2xl font-black text-emerald-700">أسئلتي للمراجعة</h1><p className="mt-1 text-sm text-gray-500">مكان واحد للأسئلة التي حفظتها والأسئلة التي أخطأت فيها.</p></div>
      </div>
      <Link to={`/review?mode=${activeTab}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700"><Sparkles size={16}/>تدرّب على هذه الأسئلة</Link>
    </header>
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
      {(Object.keys(tabMeta) as ReviewTab[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-2 text-sm font-black transition ${activeTab===tab?'bg-white text-indigo-700 shadow-sm':'text-gray-500'}`}>{tabMeta[tab].label} <span className="mr-1 text-xs">({counts[tab]})</span></button>)}
    </div>
    {loading ? <Card className="p-10 text-center text-gray-500">جاري تحميل المراجعة...</Card> : null}
    {!loading && error ? <Card className="p-6 text-center text-rose-600">{error}</Card> : null}
    {!loading && !error && items.length===0 ? <Card className="p-10 text-center border-dashed border-2 border-gray-200"><BookOpen size={46} className="mx-auto mb-3 text-gray-300"/><h2 className="font-black text-gray-800">{tabMeta[activeTab].empty}</h2><p className="mt-2 text-sm text-gray-500">السؤال لا يُنسخ هنا؛ يتم استدعاؤه من بنك الأسئلة بنفس الكود والصورة.</p></Card> : null}
    {currentQuestion ? <>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
        <span>إجمالي هذا القسم: {total}</span>
        <span>صفحة {page}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white">السؤال {currentIndex+1} من {items.length}</div>
        <div className="flex flex-wrap gap-2">
          {current.reasons.saved ? <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700"><Bookmark size={13} className="ml-1 inline"/>محفوظ للمراجعة</span> : null}
          {current.reasons.mistake ? <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"><RotateCcw size={13} className="ml-1 inline"/>خطأ سابق</span> : null}
          {current.reasons.saved ? <button onClick={() => void removeSaved()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-600 shadow-sm"><Trash2 size={14} className="ml-1 inline"/>إزالة من المحفوظة</button> : null}
        </div>
      </div>
      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="bg-white p-5 sm:p-7">
          {currentQuestion.imageUrl ? <img src={currentQuestion.imageUrl} alt={currentQuestion.imageAlt || 'صورة السؤال'} loading="lazy" className="mx-auto mb-4 max-h-[360px] max-w-full object-contain"/> : null}
          <div className="question-html text-center text-lg font-black leading-loose text-gray-800" dangerouslySetInnerHTML={{__html:normalizeQuestionHtml(currentQuestion.text)}}/>
        </div>
        <div className="grid gap-3 bg-gray-50 p-4 sm:grid-cols-2">{(currentQuestion.options||[]).map((option,idx)=>{const correct=showAnswer&&idx===currentQuestion.correctOptionIndex;return <div key={idx} className={`rounded-xl border p-3 text-center font-bold ${correct?'border-emerald-400 bg-emerald-50 text-emerald-700':'border-gray-200 bg-white text-gray-700'}`}>{sanitizeArabicText(option)} {correct?<CheckCircle2 size={15} className="mr-1 inline"/>:null}</div>;})}</div>
        <div className="flex flex-wrap gap-2 border-t bg-white p-4">
          <button onClick={()=>setShowAnswer(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white">{showAnswer?<EyeOff size={16}/>:<Eye size={16}/>} {showAnswer?'إخفاء الحل':'إظهار الحل'}</button>
          <button disabled={currentIndex===0} onClick={()=>{setCurrentIndex(v=>v-1);setShowAnswer(false);}} className="rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-40"><ArrowRight size={15} className="ml-1 inline"/>السابق</button>
          <button disabled={currentIndex>=items.length-1} onClick={()=>{setCurrentIndex(v=>v+1);setShowAnswer(false);}} className="rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-40">التالي<ArrowLeft size={15} className="mr-1 inline"/></button>
        </div>
        {showAnswer&&currentQuestion.explanation ? <div className="border-t bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-900">{currentQuestion.explanation}</div> : null}
      </Card>
      <QuestionVoiceExplanationPlayer voiceExplanation={currentQuestion.voiceExplanation}/>
      <QuestionAssistantPanel questionId={current.questionId} hasImage={Boolean(currentQuestion.imageUrl)} context={assistantContext}/>
      <div className="flex justify-center gap-2">
        <button
          disabled={page <= 1 || loading}
          onClick={() => void load(activeTab, Math.max(1, page - 1))}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-black disabled:opacity-40"
        >الصفحة السابقة</button>
        <button
          disabled={!hasMore || loading}
          onClick={() => void load(activeTab, page + 1)}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-black disabled:opacity-40"
        >الصفحة التالية</button>
      </div>
    </> : null}
  </div>;
};
export default Favorites;
