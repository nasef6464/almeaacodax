import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { api } from '../../../services/api';
import { Question } from '../../../types';
import { useStore } from '../../../store/useStore';

export interface VideoQuestionPickerContext {
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  skillIds?: string[];
}

interface VideoQuestionPickerProps {
  context: VideoQuestionPickerContext;
  excludedQuestionIds: string[];
  selectionMode?: 'single' | 'multiple';
  onConfirm: (questions: Question[]) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const PAGE_SIZE = 20;

const plainText = (value?: string) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const VideoQuestionPicker: React.FC<VideoQuestionPickerProps> = ({
  context,
  excludedQuestionIds,
  selectionMode = 'multiple',
  onConfirm,
  onCreateNew,
  onClose,
}) => {
  const { subjects, sections, skills } = useStore();
  const [search, setSearch] = useState('');
  const [sectionId, setSectionId] = useState(context.sectionId || '');
  const [skillId, setSkillId] = useState(context.skillIds?.[0] || '');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState<'mcq' | 'true_false'>('mcq');
  const [hasExplanationVideo, setHasExplanationVideo] = useState(false);
  const [page, setPage] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Map<string, Question>>(() => new Map());
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasNext: false, hasPrev: false, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const subjectName = subjects.find((subject) => subject.id === context.subjectId)?.name || 'المادة الحالية';
  const availableSections = useMemo(
    () => sections.filter((section) => section.subjectId === context.subjectId),
    [context.subjectId, sections],
  );
  const availableSkills = useMemo(
    () => skills.filter((skill) => skill.subjectId === context.subjectId && (!sectionId || skill.sectionId === sectionId)),
    [context.subjectId, sectionId, skills],
  );
  const excluded = useMemo(() => new Set(excludedQuestionIds), [excludedQuestionIds]);
  const visibleQuestions = useMemo(
    () => questions.filter((question) => !excluded.has(question.id) && (question.type === 'mcq' || question.type === 'true_false')),
    [excluded, questions],
  );

  useEffect(() => {
    setPage(1);
  }, [search, sectionId, skillId, difficulty, type, hasExplanationVideo]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await api.getQuestionsPaginated({
          page,
          limit: PAGE_SIZE,
          pathId: context.pathId || undefined,
          subject: context.subjectId || undefined,
          sectionId: sectionId || undefined,
          skillId: skillId || undefined,
          difficulty: difficulty || undefined,
          type,
          search: search.trim() || undefined,
          approvalStatus: 'approved',
          hasExplanationVideo: hasExplanationVideo || undefined,
        });
        if (!active) return;
        setQuestions((Array.isArray(result?.data) ? result.data : []) as Question[]);
        setPagination(result?.pagination || { page, totalPages: 1, hasNext: false, hasPrev: page > 1, total: 0 });
      } catch (requestError) {
        if (!active) return;
        setQuestions([]);
        setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل أسئلة البنك الآن.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [context.pathId, context.subjectId, difficulty, hasExplanationVideo, page, reloadKey, search, sectionId, skillId, type]);

  const toggleQuestion = (question: Question) => {
    setSelected((previous) => {
      const next = new Map(selectionMode === 'single' ? [] : previous);
      if (next.has(question.id)) {
        next.delete(question.id);
      } else {
        if (selectionMode === 'single') next.clear();
        next.set(question.id, question);
      }
      return next;
    });
  };

  const confirm = () => {
    const items = Array.from(selected.values());
    if (items.length > 0) onConfirm(items);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" dir="rtl" role="dialog" aria-modal="true" aria-label="منتقي أسئلة الفيديو">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-lg font-black text-gray-900">اختيار أسئلة داخل الفيديو</h3>
            <p className="mt-1 text-sm font-medium text-gray-500">من بنك الأسئلة المعتمد ضمن {subjectName}. لا يُربط أي سؤال قبل تأكيد اختيارك.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="إغلاق المنتقي"><X size={20} /></button>
        </div>

        <div className="grid gap-3 border-b border-gray-100 bg-gray-50 p-4 md:grid-cols-5">
          <label className="relative md:col-span-2">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في نص السؤال..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm font-bold text-gray-700 outline-none focus:border-indigo-300" />
          </label>
          <select value={sectionId} onChange={(event) => { setSectionId(event.target.value); setSkillId(''); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            <option value="">كل المهارات الرئيسة</option>
            {availableSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
          <select value={skillId} onChange={(event) => setSkillId(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            <option value="">كل المهارات الفرعية</option>
            {availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
          </select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            <option value="">كل الصعوبات</option><option value="Easy">سهل</option><option value="Medium">متوسط</option><option value="Hard">صعب</option>
          </select>
          <select value={type} onChange={(event) => setType(event.target.value as 'mcq' | 'true_false')} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700">
            <option value="mcq">اختيار من متعدد</option><option value="true_false">صح / خطأ</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 md:col-span-2">
            <input type="checkbox" checked={hasExplanationVideo} onChange={(event) => setHasExplanationVideo(event.target.checked)} className="accent-indigo-600" /> يحتوي على فيديو شرح
          </label>
          <button type="button" onClick={onCreateNew} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-50 md:col-span-2">إنشاء سؤال جديد في البنك</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-gray-500"><Loader2 className="animate-spin" size={20} /> جارٍ تحميل أسئلة البنك...</div> : null}
          {!loading && error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"><p className="font-bold text-red-700">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700"><RefreshCw size={15} /> إعادة المحاولة</button></div> : null}
          {!loading && !error && visibleQuestions.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm font-bold text-gray-500">لا توجد أسئلة معتمدة مطابقة للفلاتر الحالية.</div> : null}
          {!loading && !error ? <div className="space-y-3">
            {visibleQuestions.map((question) => {
              const isSelected = selected.has(question.id);
              const skillNames = (question.skillIds || []).map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).slice(0, 2);
              return <button key={question.id} type="button" onClick={() => toggleQuestion(question)} className={`w-full rounded-2xl border p-4 text-right transition ${isSelected ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-1.5 text-[11px] font-black"><span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">{question.type === 'true_false' ? 'صح / خطأ' : 'اختيار متعدد'}</span><span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">{question.difficulty}</span>{skillNames.map((name) => <span key={name} className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{name}</span>)}</div>{isSelected ? <Check className="shrink-0 text-indigo-600" size={20} /> : null}</div>
                <p className="mt-3 text-sm font-black leading-6 text-gray-900">{plainText(question.text) || 'سؤال بصورة فقط'}</p>
                {question.imageUrl ? <img src={question.imageUrl} alt="معاينة السؤال" className="mt-3 max-h-32 rounded-lg border border-gray-100 object-contain" /> : null}
                <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">{(question.options || []).map((option, index) => <span key={`${question.id}-${index}`} className={`rounded-lg px-3 py-2 text-xs font-bold ${index === question.correctOptionIndex ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}>{plainText(option)}</span>)}</div>
              </button>;
            })}
          </div> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600"><button type="button" disabled={!pagination.hasPrev || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border bg-white p-2 disabled:opacity-40" aria-label="الصفحة السابقة"><ChevronRight size={17} /></button><span>صفحة {pagination.page} من {pagination.totalPages}</span><button type="button" disabled={!pagination.hasNext || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white p-2 disabled:opacity-40" aria-label="الصفحة التالية"><ChevronLeft size={17} /></button></div>
          <div className="flex items-center gap-3"><span className="text-sm font-bold text-gray-500">{selected.size} محدد</span><button type="button" disabled={selected.size === 0} onClick={confirm} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300">ربط السؤال{selected.size === 1 ? '' : 'ات المحددة'}</button></div>
        </div>
      </div>
    </div>
  );
};
