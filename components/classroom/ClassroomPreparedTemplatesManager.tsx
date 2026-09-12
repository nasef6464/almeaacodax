import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Plus, Sparkles, Trash2, Zap } from 'lucide-react';

export interface ClassroomPreparedTemplate {
  id: string;
  title: string;
  schoolId: string;
  questionIds: string[];
  challengeIds: string[];
  createdAt: string;
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

const DEFAULT_TEMPLATES: ClassroomPreparedTemplate[] = [
  {
    id: 'tpl_qudurat_speed_6',
    title: 'تحدي القدرات العامة وسرعة البديهة (6 أسئلة)',
    schoolId: 'global',
    questionIds: ['q-math-1', 'q-verbal-2', 'q-speed-3', 'q-math-4', 'q-verbal-5', 'q-challenge-6'],
    challengeIds: ['q-speed-3', 'q-challenge-6'],
    createdAt: '2026-09-01',
    badge: 'نموذج قياسي جاهز ⭐',
  },
  {
    id: 'tpl_geometry_focus_5',
    title: 'حزمة إتقان الهندسة والمساحات (5 أسئلة)',
    schoolId: 'global',
    questionIds: ['q-math-1', 'q-math-4', 'q-challenge-6'],
    challengeIds: ['q-challenge-6'],
    createdAt: '2026-09-05',
    badge: 'علاج الفجوات 🎯',
  },
];

export const ClassroomPreparedTemplatesManager: React.FC<ClassroomPreparedTemplatesManagerProps> = ({
  schoolId,
  teacherId,
  selectedIds,
  challengeIds,
  onApplyTemplate,
  activeTemplateId,
}) => {
  const [customTemplates, setCustomTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [feedback, setFeedback] = useState('');

  const storageKey = `smart_classroom_templates_${schoolId}_${teacherId || 'default'}`;

  // Load custom templates
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCustomTemplates(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];

  const handleSave = () => {
    if (!newTitle.trim() || selectedIds.length === 0) return;
    const newTpl: ClassroomPreparedTemplate = {
      id: `tpl_custom_${Date.now()}`,
      title: newTitle.trim(),
      schoolId,
      questionIds: [...selectedIds],
      challengeIds: [...challengeIds],
      createdAt: new Date().toISOString().slice(0, 10),
      badge: 'حزمة مخصصة للمدرس 💼',
    };

    const updated = [newTpl, ...customTemplates].slice(0, 20);
    setCustomTemplates(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewTitle('');
    setShowSaveModal(false);
    setFeedback(`تم حفظ حزمة "${newTpl.title}" بنجاح! جاهزة للاستخدام في جميع فصولك.`);
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Action Strip: Save current as template */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
        <div className="flex items-center gap-2.5">
          <Bookmark className="text-indigo-600" size={20} />
          <div>
            <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
              حزم التحضير المسبق للمعلم (Pre-prepared Question Bundles)
            </h4>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
              حضر حزمة أسئلة واحدة واطلقها في كل فصولك خلال اليوم الدراسي بضغطة زر واحدة دون إعادة اختيار.
            </p>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-indigo-700 active:scale-95"
          >
            <Plus size={14} /> حفظ التحديد الحالي كحزمة ({selectedIds.length} أسئلة)
          </button>
        )}
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200">
          ✓ {feedback}
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="text-indigo-600" size={20} /> حفظ حزمة أسئلة جديدة للحصص
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              سيتم حفظ الـ {selectedIds.length} أسئلة المحددة حالياً مع وسوم التحدي لتتمكن من إطلاقها لأي فصل.
            </p>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="مثال: تحدي المتتابعات والهندسة - الأسبوع الرابع"
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!newTitle.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                حفظ الحزمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {allTemplates.map((tpl) => {
          const isActive = activeTemplateId === tpl.id;
          const isCustom = tpl.id.startsWith('tpl_custom_');

          return (
            <div
              key={tpl.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {tpl.badge || 'حزمة جاهزة'}
                  </span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(tpl.id, e)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="حذف الحزمة"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <h5 className="mt-2 text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {tpl.title}
                </h5>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                    {tpl.questionIds.length} أسئلة
                  </span>
                  {tpl.challengeIds.length > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <Zap size={12} /> {tpl.challengeIds.length} تحدي
                    </span>
                  )}
                  <span className="text-[11px]">{tpl.createdAt}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onApplyTemplate(tpl)}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Check size={15} /> الحزمة مفعلة لهذا الفصل
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> تطبيق وإطلاق الحصة لهذا الفصل 🚀
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
