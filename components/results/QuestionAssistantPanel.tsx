import React from 'react';
import { Bot, Loader2 } from 'lucide-react';
import type { TeacherQuestionPreview } from './teaching/QuestionPreview';

const InteractiveSmartTeacher = React.lazy(() => import('./InteractiveSmartTeacher').then(m => ({ default: m.InteractiveSmartTeacher })));
type AssistantContext = 'result_review' | 'saved_review' | 'mistake_review' | 'mastery_review';

export const QuestionAssistantPanel: React.FC<{
  resultId?: string; questionId: string; hasImage: boolean; context?: AssistantContext; question?: TeacherQuestionPreview;
}> = ({ resultId, questionId, context = 'result_review', question }) => {
  const tutorSessionIdRef = React.useRef(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `question:${crypto.randomUUID()}` : `question:${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [open, setOpen] = React.useState(false);
  if (context === 'result_review' && !resultId) return null;
  return <>
    <div className="flex justify-center py-1" data-testid="question-assistant-panel">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">
        <Bot size={20} /> اشرح لي
      </button>
    </div>
    {open && <React.Suspense fallback={<div role="status" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 text-white"><Loader2 className="ml-2 animate-spin" size={20} />جاري فتح السبورة…</div>}>
      <InteractiveSmartTeacher isOpen onClose={() => setOpen(false)} resultId={resultId} questionId={questionId} question={question} context={context} tutorSessionId={tutorSessionIdRef.current} />
    </React.Suspense>}
  </>;
};
