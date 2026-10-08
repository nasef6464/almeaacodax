import React from 'react';
import type { TeachingCheckpoint } from '../../../server/src/modules/ai/contracts/teachingStoryboard';

export function PracticeCheckpoint({ checkpoint, pending, onAttempt, onSkip }: {
  checkpoint: TeachingCheckpoint; pending: boolean;
  onAttempt: (answer: string) => Promise<boolean | undefined>; onSkip: () => void;
}) {
  const [answer, setAnswer] = React.useState('');
  const [hintCount, setHintCount] = React.useState(0);
  return <section aria-label="جرّب الخطوة الجاية" className="rounded-2xl border border-violet-400/40 bg-violet-950/40 p-3">
    <h3 className="font-bold">جرّب الخطوة الجاية</h3>
    <p className="my-2 text-sm leading-6">{checkpoint.prompt}</p>
    <form className="flex gap-2" onSubmit={async event => {
      event.preventDefault();
      if (answer.trim() && !pending && await onAttempt(answer.trim())) setAnswer('');
    }}>
      <input aria-label="إجابتك على الخطوة" maxLength={350} disabled={pending} value={answer}
        onChange={event => setAnswer(event.target.value)} placeholder="اكتب محاولتك…"
        className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2" />
      <button type="submit" disabled={pending || !answer.trim()} className="min-h-11 rounded-xl bg-violet-600 px-3 disabled:opacity-40">راجع محاولتي</button>
    </form>
    <div aria-live="polite" className="space-y-1 text-sm text-amber-200">{checkpoint.hints.slice(0, hintCount).map((hint, index) => <p key={index} className="mt-2">تلميح {index + 1}: {hint}</p>)}</div>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" disabled={pending || hintCount === 2} onClick={() => setHintCount(count => Math.min(2, count + 1))}
        className="min-h-11 rounded-xl bg-slate-800 px-3 text-sm disabled:opacity-40">{hintCount ? 'تلميح أوضح' : 'أحتاج تلميح'}</button>
      <button type="button" disabled={pending} onClick={onSkip} className="min-h-11 px-3 text-sm text-slate-300">أكمل الشرح</button>
    </div>
  </section>;
}
