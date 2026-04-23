import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { LibraryItem } from '../../types';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';

interface LibraryManagerProps {
  subjectId: string;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ subjectId }) => {
  const {
    libraryItems,
    addLibraryItem,
    updateLibraryItem,
    deleteLibraryItem,
    subjects,
    sections,
    skills
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LibraryItem> | null>(null);

  const subjectItems = libraryItems.filter((item) => item.subjectId === subjectId);
  const currentSubject = subjects.find((item) => item.id === subjectId);

  const availableMainSkills = useMemo(
    () =>
      sections
        .filter((section) => section.subjectId === subjectId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [sections, subjectId]
  );

  const availableSubSkills = useMemo(
    () =>
      skills
        .filter((skill) => skill.subjectId === subjectId && (!editingItem?.sectionId || skill.sectionId === editingItem.sectionId))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [editingItem?.sectionId, skills, subjectId]
  );

  useEffect(() => {
    if (!editingItem) return;

    const filteredSkillIds = (editingItem.skillIds || []).filter((skillId) =>
      skills.some(
        (skill) =>
          skill.id === skillId &&
          skill.subjectId === subjectId &&
          (!editingItem.sectionId || skill.sectionId === editingItem.sectionId)
      )
    );

    if (filteredSkillIds.length !== (editingItem.skillIds || []).length) {
      setEditingItem((prev) => (prev ? { ...prev, skillIds: filteredSkillIds } : prev));
    }
  }, [editingItem, skills, subjectId]);

  const handleSave = () => {
    if (!currentSubject?.pathId) {
      alert('تعذر تحديد المسار المرتبط بهذه المادة.');
      return;
    }

    if (!editingItem?.sectionId) {
      alert('اختر المهارة الرئيسة أولًا.');
      return;
    }

    if (!editingItem?.skillIds || editingItem.skillIds.length === 0) {
      alert('اختر مهارة فرعية واحدة على الأقل لربط الملف بها.');
      return;
    }

    if (editingItem?.id) {
      updateLibraryItem(editingItem.id, {
        ...editingItem,
        pathId: currentSubject.pathId,
        subjectId
      });
    } else {
      addLibraryItem({
        id: `lib_${Date.now()}`,
        title: editingItem?.title || 'ملف جديد',
        size: editingItem?.size || '0 MB',
        downloads: 0,
        type: editingItem?.type || 'pdf',
        pathId: currentSubject.pathId,
        subjectId,
        sectionId: editingItem.sectionId,
        skillIds: editingItem.skillIds || [],
        url: editingItem?.url || ''
      });
    }

    setIsEditing(false);
    setEditingItem(null);
  };

  const toggleSkill = (skillId: string) => {
    const currentIds = editingItem?.skillIds || [];
    const nextIds = currentIds.includes(skillId)
      ? currentIds.filter((id) => id !== skillId)
      : [...currentIds, skillId];

    setEditingItem((prev) => ({ ...prev, skillIds: nextIds }));
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          {editingItem?.id ? 'تعديل ملف' : 'إضافة ملف جديد'}
        </h3>

        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الملف</label>
            <input
              type="text"
              value={editingItem?.title || ''}
              onChange={(event) => setEditingItem((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">نوع الملف</label>
              <select
                value={editingItem?.type || 'pdf'}
                onChange={(event) => setEditingItem((prev) => ({ ...prev, type: event.target.value as LibraryItem['type'] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pdf">PDF</option>
                <option value="doc">Word / Document</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">حجم الملف</label>
              <input
                type="text"
                value={editingItem?.size || ''}
                onChange={(event) => setEditingItem((prev) => ({ ...prev, size: event.target.value }))}
                placeholder="مثال: 2.5 MB"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">رابط الملف</label>
            <input
              type="text"
              value={editingItem?.url || ''}
              onChange={(event) => setEditingItem((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="مثال: رابط المشاركة من جوجل درايف"
              className="w-full px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-2">
              ضع رابط الملف المباشر أو رابط المشاركة السحابية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">المهارة الرئيسة</label>
              <select
                value={editingItem?.sectionId || ''}
                onChange={(event) =>
                  setEditingItem((prev) => ({
                    ...prev,
                    sectionId: event.target.value || undefined,
                    skillIds: []
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- اختر المهارة الرئيسة --</option>
                {availableMainSkills.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">ربط بالمهارات الفرعية</label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                {availableSubSkills.length > 0 ? (
                  availableSubSkills.map((skill) => {
                    const isSelected = editingItem?.skillIds?.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`text-right px-3 py-2 rounded-lg border text-sm font-bold transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">
                    {!editingItem?.sectionId
                      ? 'اختر المهارة الرئيسة أولًا.'
                      : 'لا توجد مهارات فرعية لهذه المهارة الرئيسة بعد.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            مصدر الربط هنا هو مركز المهارات الحقيقي: المهارة الرئيسة ثم المهارات الفرعية التابعة لها، وليس مواضيع التأسيس.
          </p>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700"
            >
              حفظ
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingItem(null);
              }}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-200"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h3 className="text-xl font-bold text-gray-800">إدارة المكتبة</h3>
          <p className="text-gray-500 mt-1">إدارة الملفات والمستندات الخاصة بهذه المادة</p>
        </div>
        <button
          onClick={() => {
            setEditingItem({ sectionId: undefined, skillIds: [] });
            setIsEditing(true);
          }}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة ملف جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectItems.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setIsEditing(true);
                  }}
                  className="text-gray-400 hover:text-indigo-600"
                >
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deleteLibraryItem(item.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span>{item.size}</span>
              <span>•</span>
              <span>{item.downloads} تحميل</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-auto">
              {(item.skillIds || []).slice(0, 3).map((skillId) => {
                const skillName = skills.find((skill) => skill.id === skillId)?.name;
                if (!skillName) return null;
                return (
                  <span key={`${item.id}-${skillId}`} className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                    {skillName}
                  </span>
                );
              })}
              {(item.skillIds || []).length > 3 && (
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                  +{(item.skillIds || []).length - 3}
                </span>
              )}
            </div>
          </div>
        ))}

        {subjectItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            لا توجد ملفات في المكتبة حاليًا.
          </div>
        )}
      </div>
    </div>
  );
};
