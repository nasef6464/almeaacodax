import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Plus, RefreshCw, Sparkles, Trash2, Zap } from 'lucide-react';
import { api } from '../../services/api';

export interface ClassroomPreparedTemplate {
  id: string;
  title: string;
  schoolId: string;
  questionIds: string[];
  challengeIds: string[];
  createdAt: string;
  updatedAt?: string;
  badge?: string;
}

interface ClassroomPreparedTemplatesManagerProps {
  schoolId: string;
  teacherId?: string;
  selectedIds: string[];
  challengeIds: string[];
  onApplyTemplate: (template: ClassroomPreparedTemplate) => void;
  activeTemplateId?: string;
}

export const ClassroomPreparedTemplatesManager: React.FC<ClassroomPreparedTemplatesManagerProps> = ({
  schoolId,
  selectedIds,
  challengeIds,
  onApplyTemplate,
  activeTemplateId,
}) => {
  const [templates, setTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    if (!schoolId) return;
    setLoading(true);
    setFeedback('');
    try {
      const result = await api.get<{ templates: ClassroomPreparedTemplate[] }>(`/classroom/templates?schoolId=${encodeURIComponent(schoolId)}`);
      setTemplates(Array.isArray(result.templates) ? result.templates : []);
    } catch (error: any) {
      setTemplates([]);
      setFeedback(error?.message || 'تعذر تحميل الحزم المحفوظة من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleSave = async () => {
    if (!newTitle.trim() || selectedIds.length === 0 || saving) return;
    setSaving(true);
    setFeedback('');
    try {
      const result = await api.post<{ template: ClassroomPreparedTemplate }>('/classroom/templates', {
        schoolId,
        title: newTitle.trim(),
        questionIds: selectedIds,
        challengeIds,
      });
      setTemplates((current) => [result.template, ...current.filter((template) => template.id !== result.template.id && template.title !== result.template.title)]);
      setNewTitle('');
      setShowSaveModal(false);
      setFeedback(`تم حفظ حزمة "${result.template.title}" على حسابك بنجاح.`);
    } catch (error: any) {
      setFeedback(error?.message || 'تعذر حفظ الحزمة. تأكد أن كل الأسئلة ما زالت متاحة ومعتمدة.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api.post(`/classroom/templates/${encodeURIComponent(id)}/delete`, {});
      setTemplates((current) => current.filter((template) => template.id !== id));
    } catch (error: any) {
      setFeedback(error?.message || 'تعذر حذف الحزمة.');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
        <div className="flex items-center gap-2.5">
          <Bookmark className="text-indigo-600" size={20} />
          <div>
            <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">حزم التحضير المسبق للمعلم</h4>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">الحزم محفوظة في قاعدة البيانات وتظهر لك على أي جهاز بعد تسجيل الدخول.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadTemplates()} disabled={loading} className="rounded-xl border border-indigo-200 bg-white p-2 text-indigo-700 disabled:opacity-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300" title="تحديث الحزم">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => setShowSaveModal(true)} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-indigo-700">
              <Plus size={14} /> حفظ التحديد الحالي كحزمة ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {feedback && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">{feedback}</div>}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><Bookmark className="text-indigo-600" size={20} /> حفظ حزمة أسئلة</h3>
            <p className="mt-2 text-xs text-slate-500">سيتم التحقق من كل سؤال في الخادم قبل حفظ الحزمة.</p>
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="مثال: مراجعة الهندسة - الأسبوع الرابع"
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSaveModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">إلغاء</button>
              <button type="button" onClick={() => void handleSave()} disabled={!newTitle.trim() || saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'جارٍ الحفظ…' : 'حفظ الحزمة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-6 text-center text-xs font-bold text-slate-500 dark:border-slate-800">جارٍ تحميل الحزم…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-500 dark:border-slate-700">
          لا توجد حزم محفوظة بعد. اختر أسئلة من البنك ثم احفظها كحزمة.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((template) => {
            const isActive = activeTemplateId === template.id;
            return (
              <div key={template.id} className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${isActive ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{template.badge || 'حزمة محفوظة'}</span>
                    <button type="button" onClick={(event) => void handleDelete(template.id, event)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="حذف الحزمة"><Trash2 size={14} /></button>
                  </div>
                  <h5 className="mt-2 text-sm font-black leading-snug text-slate-900 dark:text-white">{template.title}</h5>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{template.questionIds.length} أسئلة</span>
                    {template.challengeIds.length > 0 && <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><Zap size={12} /> {template.challengeIds.length} تحدي</span>}
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button type="button" onClick={() => onApplyTemplate(template)} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-indigo-600 dark:bg-slate-800'}`}>
                    {isActive ? <><Check size={15} /> الحزمة مفعلة لهذا الفصل</> : <><Sparkles size={14} /> تطبيق الحزمة</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
