import React from 'react';
import { Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

type HelpLevel = 'hint' | 'stronger_hint' | 'concept' | 'steps' | 'follow_up';

type ResponseState = {
  text: string;
  level: HelpLevel;
  provider: string;
  cacheHit: boolean;
  usedFallback: boolean;
  visualContextBlocked?: boolean;
};

const HELP_ACTIONS: Array<{ level: Exclude<HelpLevel, 'follow_up'>; label: string }> = [
  { level: 'hint', label: 'تلميح' },
  { level: 'stronger_hint', label: 'تلميح أقوى' },
  { level: 'concept', label: 'اشرح الفكرة' },
  { level: 'steps', label: 'خطوات الحل' },
];

export const QuestionAssistantPanel: React.FC<{
  resultId?: string;
  questionId: string;
  hasImage: boolean;
  context?: "result_review" | "saved_review" | "mistake_review" | "mastery_review";
}> = ({ resultId, questionId, hasImage, context = "result_review" }) => {
  const [response, setResponse] = React.useState<ResponseState | null>(null);
  const [followUp, setFollowUp] = React.useState('');
  const [pendingLevel, setPendingLevel] = React.useState<HelpLevel | null>(null);
  const [error, setError] = React.useState('');

  const ask = async (level: HelpLevel, message?: string) => {
    if (!questionId || pendingLevel || (context === "result_review" && !resultId)) return;
    setPendingLevel(level);
    setError('');
    try {
      const payload = await api.aiQuestionAssistant({
        ...(resultId ? { resultId } : {}),
        context,
        questionId,
        helpLevel: level,
        ...(message?.trim() ? { message: message.trim() } : {}),
      });
      setResponse({
        text: payload.text,
        level,
        provider: payload.provider,
        cacheHit: Boolean(payload.cacheHit),
        usedFallback: Boolean(payload.usedFallback),
        visualContextBlocked: payload.visualContextBlocked,
      });
      if (level === 'follow_up') setFollowUp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تشغيل مساعد السؤال الآن.');
    } finally {
      setPendingLevel(null);
    }
  };

  if (context === "result_review" && !resultId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
        مساعد السؤال متاح للمحاولات المحفوظة على الخادم فقط.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5" data-testid="question-assistant-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-xs">
            <Sparkles size={14} />
            ناقش هذا السؤال
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
            يعمل فقط عند الضغط. يعتمد على نص السؤال وإجابتك والشرح الموثوق، ولا يغيّر الدرجة أو الإتقان.
          </p>
          {hasImage ? (
            <p className="mt-1 text-[11px] font-bold leading-5 text-amber-700">
              السؤال يحتوي صورة؛ الصورة نفسها لا تُرسل للمساعد افتراضيًا، ويُستخدم الشرح النصي الموثوق أولًا.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HELP_ACTIONS.map((action) => (
          <button
            key={action.level}
            type="button"
            disabled={Boolean(pendingLevel)}
            onClick={() => void ask(action.level)}
            className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingLevel === action.level ? <Loader2 size={13} className="mx-auto animate-spin" /> : action.label}
          </button>
        ))}
      </div>

      {response ? (
        <div className="mt-4 rounded-xl border border-white bg-white p-3 shadow-xs">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400">
            <span>{response.cacheHit ? 'إجابة مخزنة لتقليل الاستهلاك' : response.usedFallback ? 'شرح داخلي موثوق' : 'مساعد السؤال'}</span>
            {response.visualContextBlocked ? <span className="text-amber-600">يلزم وصف بصري موثوق</span> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm font-bold leading-7 text-slate-700">{response.text}</p>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MessageCircle size={14} className="absolute right-3 top-3 text-slate-400" />
          <input
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value.slice(0, 800))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && followUp.trim()) {
                event.preventDefault();
                void ask('follow_up', followUp);
              }
            }}
            placeholder="اسأل عن خطوة محددة في هذا السؤال…"
            className="w-full rounded-xl border border-violet-100 bg-white py-2.5 pr-9 pl-3 text-xs font-bold text-slate-700 outline-none focus:border-violet-300"
          />
        </div>
        <button
          type="button"
          disabled={!followUp.trim() || Boolean(pendingLevel)}
          onClick={() => void ask('follow_up', followUp)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="إرسال سؤال متابعة"
        >
          {pendingLevel === 'follow_up' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs font-bold text-rose-700">{error}</p> : null}
    </div>
  );
};
