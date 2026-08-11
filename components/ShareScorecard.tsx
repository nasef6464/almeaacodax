import React, { useRef } from 'react';
import { Share2 } from 'lucide-react';
import { QuizResult } from '../types';
import { useStore } from '../store/useStore';

export const ShareScorecard: React.FC<{ result: QuizResult }> = ({ result }) => {
  const user = useStore((state) => state.user);
  const scorecardRef = useRef<HTMLDivElement>(null);
  
  const handleShare = async () => {
    const text = `حققت ${result.score}% في اختبار ${result.quizTitle} على منصة ألمعاء! هل يمكنك التفوق علي؟ 🚀`;
    if (navigator.share) {
      navigator.share({
        title: 'نتيجتي في منصة ألمعاء',
        text,
      }).catch(console.error);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div 
        ref={scorecardRef}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-950 p-6 text-white shadow-xl border border-indigo-500/30"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl shadow-inner backdrop-blur-md">
            {result.score >= 90 ? '🏆' : result.score >= 70 ? '⭐' : '💪'}
          </div>
          <h3 className="text-xs font-bold text-indigo-200">بطل ألمعاء</h3>
          <h2 className="mt-1 text-xl font-black">{user?.name || 'طالب طموح'}</h2>
          
          <div className="my-6 w-full rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/10 shadow-inner">
            <div className="text-5xl font-black text-amber-300 drop-shadow-lg">{result.score}%</div>
            <div className="mt-2 text-sm font-bold text-indigo-50 truncate w-full" title={result.quizTitle}>في اختبار: {result.quizTitle}</div>
          </div>
          
          <div className="flex w-full justify-center gap-6 text-[11px] font-bold text-indigo-200">
            <div className="flex flex-col items-center gap-1">
              <span className="text-base text-white">{result.correctAnswers}</span>
              <span>إجابة صحيحة</span>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-base text-white">{result.timeSpent}</span>
              <span>وقت الحل</span>
            </div>
          </div>
          
          <div className="mt-6 border-t border-white/10 pt-4 text-[10px] font-bold tracking-widest text-indigo-300/80 uppercase">
            almeaa.com
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleShare}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Share2 size={18} />
        شارك نتيجتك وتحدّ أصدقاءك
      </button>
    </div>
  );
};
