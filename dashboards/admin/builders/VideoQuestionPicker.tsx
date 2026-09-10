import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { api } from '../../../services/api';
import { Question } from '../../../types';
import { useStore } from '../../../store/useStore';
import { normalizeQuestionHtml, hasInlineQuestionMedia } from '../../../utils/questionHtml';

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
  const [previewingQuestion, setPreviewingQuestion] = useState<Question | null>(null);
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

  const allCurrentPageSelected = useMemo(() => {
    if (visibleQuestions.length === 0) return false;
    return visibleQuestions.every((q) => selected.has(q.id));
  }, [visibleQuestions, selected]);

  const toggleSelectAllCurrentPage = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allCurrentPageSelected) {
        visibleQuestions.forEach((q) => next.delete(q.id));
      } else {
        visibleQuestions.forEach((q) => next.set(q.id, q));
      }
      return next;
    });
  };

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs" dir="rtl" role="dialog" aria-modal="true" aria-label="منتقي أسئلة الفيديو">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-4 sm:p-5">
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

        {selectionMode === 'multiple' && visibleQuestions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/80 border-b border-gray-100 text-xs font-bold text-slate-600">
            <div>
              <span>الأسئلة المعروضة: {visibleQuestions.length} سؤال</span>
              {selected.size > 0 && <span className="mr-2 text-indigo-700 font-black">({selected.size} محدد)</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllCurrentPage}
                className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-indigo-700 font-bold transition-colors cursor-pointer"
              >
                {allCurrentPageSelected ? 'إلغاء تحديد أسئلة الصفحة' : 'تحديد جميع أسئلة هذه الصفحة'}
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Map())}
                  className="px-2 py-1 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  مسح كل التحديدات
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-gray-500"><Loader2 className="animate-spin" size={20} /> جارٍ تحميل أسئلة البنك...</div> : null}
          {!loading && error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"><p className="font-bold text-red-700">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700"><RefreshCw size={15} /> إعادة المحاولة</button></div> : null}
          {!loading && !error && visibleQuestions.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm font-bold text-gray-500">لا توجد أسئلة معتمدة مطابقة للفلاتر الحالية.</div> : null}
          {!loading && !error ? (
            <div className="space-y-3">
              {visibleQuestions.map((question) => {
                const isSelected = selected.has(question.id);
                const normalizedText = normalizeQuestionHtml(question.text);
                const skillNames = (question.skillIds || []).map((id) => skills.find((skill) => skill.id === id)?.name).filter(Boolean).slice(0, 3);
                return (
                  <div
                    key={question.id}
                    onClick={() => toggleQuestion(question)}
                    className={`w-full rounded-2xl border p-4 text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100/80 pb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-700">
                          {question.type === 'true_false' ? 'صح / خطأ' : 'اختيار متعدد'}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 ${
                          question.difficulty === 'Easy'
                            ? 'bg-emerald-100 text-emerald-700'
                            : question.difficulty === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}>
                          {question.difficulty === 'Easy' ? 'سهل' : question.difficulty === 'Medium' ? 'متوسط' : 'صعب'}
                        </span>
                        {skillNames.map((name) => (
                          <span key={name} className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 border border-emerald-200/60">
                            {name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingQuestion(question);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          title="معاينة السؤال بالتفصيل"
                        >
                          <Eye size={14} />
                          معاينة
                        </button>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'border-gray-300 bg-white hover:border-indigo-400'
                          }`}
                          title={isSelected ? 'إلغاء التحديد' : 'تحديد السؤال'}
                        >
                          {isSelected && <Check size={16} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {question.text ? (
                        <div className="question-html text-sm font-black leading-7 text-gray-900 line-clamp-3" dangerouslySetInnerHTML={{ __html: normalizedText }} />
                      ) : (
                        <div className="text-sm font-black text-indigo-700">سؤال بصورة فقط</div>
                      )}
                      {question.imageUrl && (
                        <div className="max-w-md overflow-hidden rounded-xl border border-indigo-100 bg-slate-50 p-2 shadow-xs">
                          <img src={question.imageUrl} alt="معاينة صورة السؤال" className="max-h-44 w-full object-contain cursor-pointer hover:scale-[1.02] transition-transform" loading="lazy" onClick={(e) => { e.stopPropagation(); setPreviewingQuestion(question); }} />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(question.type === 'essay' ? [] : question.options || []).map((option, index) => {
                        const isCorrect = index === question.correctOptionIndex;
                        return (
                          <div key={`${question.id}-${index}`} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${isCorrect ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200' : 'bg-slate-50/60 text-slate-700 border-gray-100'}`}>
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{['أ', 'ب', 'ج', 'د'][index] || index + 1}</span>
                            <span className="truncate">{option || `خيار ${index + 1}`}</span>
                            {isCorrect && <span className="mr-auto text-[10px] font-black text-emerald-600">صحيح</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <button type="button" disabled={!pagination.hasPrev || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border bg-white p-2 disabled:opacity-40 cursor-pointer" aria-label="الصفحة السابقة"><ChevronRight size={17} /></button>
            <span>صفحة {pagination.page} من {pagination.totalPages}</span>
            <button type="button" disabled={!pagination.hasNext || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white p-2 disabled:opacity-40 cursor-pointer" aria-label="الصفحة التالية"><ChevronLeft size={17} /></button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">{selected.size} محدد</span>
            <button type="button" disabled={selected.size === 0} onClick={confirm} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 shadow-sm cursor-pointer">
              ربط السؤال{selected.size === 1 ? '' : 'ات المحددة'} ({selected.size})
            </button>
          </div>
        </div>
      </div>

      {previewingQuestion && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in" dir="rtl" onClick={() => setPreviewingQuestion(null)}>
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-black text-gray-900">معاينة تفاصيل السؤال</h4>
              <button onClick={() => setPreviewingQuestion(null)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"><X size={18} /></button>
            </div>
            {previewingQuestion.imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-50 p-2">
                <img src={previewingQuestion.imageUrl} alt="معاينة السؤال" className="max-h-72 w-full object-contain" />
              </div>
            )}
            {previewingQuestion.text && (
              <div className="question-html text-base font-black leading-8 text-gray-900 bg-slate-50 p-4 rounded-2xl border border-slate-100" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(previewingQuestion.text) }} />
            )}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500">الخيارات:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(previewingQuestion.options || []).map((opt, idx) => {
                  const isCorrect = idx === previewingQuestion.correctOptionIndex;
                  return (
                    <div key={idx} className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-gray-200 text-gray-800'}`}>
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{['أ', 'ب', 'ج', 'د'][idx] || idx + 1}</span>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {previewingQuestion.explanation && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900 border border-amber-200">
                <span className="font-bold block mb-1">الشرح / التوضيح:</span>
                {previewingQuestion.explanation}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t">
              <button type="button" onClick={() => { toggleQuestion(previewingQuestion); setPreviewingQuestion(null); }} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${selected.has(previewingQuestion.id) ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'}`}>
                {selected.has(previewingQuestion.id) ? 'إلغاء تحديد هذا السؤال' : 'تحديد هذا السؤال للدرس'}
              </button>
              <button type="button" onClick={() => setPreviewingQuestion(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
