import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { ClassroomPreparedTemplate } from './ClassroomPreparedTemplatesManager';

interface Props {
  sessionId: string;
  schoolId: string;
  questions: Array<{ questionId: string }>;
  activeBatch: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onReload?: () => void | Promise<void>;
}

export function ClassroomSavedBatchesPanel({ sessionId, schoolId, questions, activeBatch, busy, onBusyChange, onReload }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const cache = useRef('');
  const pending = useRef(false);
  useEffect(() => { cache.current = ''; setTemplates([]); setError(''); }, [schoolId]);
  useEffect(() => {
    if (!open || !schoolId || cache.current === schoolId) return;
    let active = true;
    setLoading(true); setError('');
    api.get<{ templates: ClassroomPreparedTemplate[] }>(`/classroom/templates?schoolId=${encodeURIComponent(schoolId)}`).then((result) => {
      if (active) { setTemplates(result.templates || []); cache.current = schoolId; }
    }).catch(() => { if (active) setError('تعذر تحميل دفعاتك. أعد المحاولة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, schoolId, retry]);
  const existing = new Set(questions.map((question) => String(question.questionId)));
  const send = async (template: ClassroomPreparedTemplate) => {
    if (cache.current !== schoolId || pending.current || busy || activeBatch || template.questionIds.length > 20 || !template.questionIds.length || template.questionIds.some((id) => existing.has(id))) return;
    pending.current = true; onBusyChange(true); setError('');
    try {
      await api.post(`/classroom/sessions/${encodeURIComponent(sessionId)}/append-questions`, { questionIds: template.questionIds, autoPublishFirst: true });
      await onReload?.();
    } catch { setError('تعذر إرسال الدفعة. تحقق من إتاحة أسئلتها ثم أعد المحاولة.'); }
    finally { pending.current = false; onBusyChange(false); }
  };
  return <section className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-slate-900" dir="rtl">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="w-full text-right font-black text-indigo-700 dark:text-indigo-300">دفعاتي المحضرة — اختر دفعة وأرسلها</button>
    {open && <div className="mt-3 space-y-3">
      <p className="text-xs text-slate-500">بعد كل جزئية من الشرح، أرسل دفعة. أنهِ الدفعة الحالية ليعود الطلاب إلى الانتظار داخل الحصة نفسها.</p>
      {loading && <p role="status">جارٍ تحميل دفعاتك…</p>}
      {error && <div role="alert" className="text-sm text-rose-700">{error} {!cache.current && <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={loading} className="mr-2 underline">إعادة المحاولة</button>}</div>}
      {!loading && !error && !templates.length && <p className="text-sm text-slate-500">لا توجد دفعات محفوظة. حضّر حزمك قبل الحصة، أو اختر أسئلة من البنك أثناءها.</p>}
      <div className="grid gap-2 sm:grid-cols-2">{templates.map((template) => {
        const used = template.questionIds.some((id) => existing.has(id));
        const tooLarge = template.questionIds.length > 20;
        return <div key={template.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="font-bold">{template.title}</p><p className="mt-1 text-xs text-slate-500">{template.questionIds.length} أسئلة {used && '· تحتوي أسئلة سبق إرسالها في هذه الحصة'} {tooLarge && '· قسّم هذه الحزمة إلى دفعات لا تتجاوز 20 سؤالًا'}</p>
          <button type="button" onClick={() => void send(template)} disabled={cache.current !== schoolId || busy || activeBatch || used || tooLarge || !template.questionIds.length} className="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? 'جارٍ الإرسال…' : activeBatch ? 'أنه الدفعة الحالية أولًا' : used ? 'سبق استخدامها' : 'إرسال الدفعة الآن'}</button>
        </div>;
      })}</div>
    </div>}
  </section>;
}
