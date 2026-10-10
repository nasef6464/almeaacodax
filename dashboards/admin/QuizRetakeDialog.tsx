import React, { useState } from 'react';
import { api } from '../../services/api';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../../utils/quizAvailability';

export const QuizRetakeDialog: React.FC<{ quizId: string; title: string; students: Array<{ id: string; name: string }>; onClose: () => void }> = ({ quizId, title, students, onClose }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [opens, setOpens] = useState(toLocalDateTimeInput(new Date().toISOString()));
  const [closes, setCloses] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const filtered = students.filter(s => s.name.includes(query));
  const save = async () => {
    if (busy) return;
    if (!selected.length || !opens || !closes || new Date(closes) <= new Date(opens) || new Date(closes).getTime() <= Date.now()) { setError('اختر الطلاب وحدد نهاية مستقبلية بعد البداية.'); return; }
    setBusy(true); setError('');
    try {
      await api.grantQuizRetakes(quizId, { studentIds: selected, opensAt: fromLocalDateTimeInput(opens)!, closesAt: fromLocalDateTimeInput(closes)! });
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الإتاحة. حاول مرة أخرى.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="إعادة إتاحة الاختبار">
    <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 space-y-4">
      <h2 className="font-black">إعادة إتاحة: {title}</h2>
      {done ? <p role="status">تم الحفظ لـ {selected.length} طالب. النتائج السابقة محفوظة.</p> : <>
        <p className="text-sm text-gray-600">محاولة جديدة للمختارين عند نفاد محاولاتهم، داخل الموعد المحدد. بقية الطلاب يحتفظون بالإتاحة الأصلية.</p>
        <label className="block text-sm">بداية الإعادة<input aria-label="بداية الإعادة" type="datetime-local" value={opens} onChange={e => setOpens(e.target.value)} className="block w-full rounded-xl border p-2" /></label>
        <label className="block text-sm">نهاية الإعادة<input aria-label="نهاية الإعادة" type="datetime-local" value={closes} onChange={e => setCloses(e.target.value)} className="block w-full rounded-xl border p-2" /></label>
        <input aria-label="ابحث عن طالب" value={query} onChange={e => { setQuery(e.target.value); setLimit(20); }} placeholder="ابحث عن طالب" className="w-full rounded-xl border p-2" />
        <p className="text-xs">المختارون: {selected.length} / 100</p>
        <div className="space-y-2">{filtered.slice(0, limit).map(s => <label key={s.id} className="flex items-center gap-2 rounded-xl border p-2"><input type="checkbox" checked={selected.includes(s.id)} disabled={!selected.includes(s.id) && selected.length >= 100} onChange={e => setSelected(current => e.target.checked ? [...current, s.id] : current.filter(id => id !== s.id))} />{s.name}</label>)}</div>
        {filtered.length > limit && <button onClick={() => setLimit(n => n + 20)} className="text-indigo-700">عرض المزيد</button>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} onClick={() => void save()} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white">{busy ? 'جارٍ الحفظ…' : 'حفظ إتاحة المختارين'}</button>
      </>}
      <button disabled={busy} onClick={onClose} className="w-full rounded-xl border p-2">إغلاق</button>
    </div>
  </div>;
};
