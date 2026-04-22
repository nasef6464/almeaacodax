import React, { useState } from 'react';
import { Lesson } from '../../types';
import { Plus, Search, Edit2, Trash2, Play, FileText, CheckCircle2, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UnifiedLessonBuilder } from './builders/UnifiedLessonBuilder';

interface LessonsManagerProps {
  subjectId?: string;
}

export const LessonsManager: React.FC<LessonsManagerProps> = ({ subjectId }) => {
  const { lessons: globalLessons, addLesson, updateLesson, deleteLesson, paths, subjects } = useStore();
  
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  
  // Filter lessons
  const lessons = globalLessons.filter(l => {
    if (subjectId && l.subjectId !== subjectId) return false;
    if (selectedSubjectId && l.subjectId !== selectedSubjectId) return false;
    if (selectedSectionId && l.sectionId !== selectedSectionId) return false;
    if (selectedPathId && !subjectId && !selectedSubjectId) {
      const pathSubjects = subjects.filter(s => s.pathId === selectedPathId).map(s => s.id);
      if (!l.subjectId || !pathSubjects.includes(l.subjectId)) return false;
    }
    if (selectedSkillId && (!l.skillIds || !l.skillIds.includes(selectedSkillId))) return false;
    return true;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({
    title: '',
    type: 'video',
    duration: '0',
    isCompleted: false,
    subjectId: selectedSubjectId || '',
    sectionId: selectedSectionId || '',
    pathId: selectedPathId || '',
    skillIds: [],
    order: 1
  });

  const handleCreateNew = () => {
    setCurrentLesson({
      title: '',
      type: 'video',
      duration: '0',
      isCompleted: false,
      subjectId: selectedSubjectId || '',
      sectionId: selectedSectionId || '',
      pathId: selectedPathId || '',
      skillIds: [],
      order: lessons.length + 1
    });
    setIsEditing(true);
  };

  const handleEdit = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس نهائياً؟')) {
      deleteLesson(id);
    }
  };

  const handleDuplicate = (lesson: Lesson) => {
    const duplicatedLesson: Lesson = {
      ...lesson,
      id: `l_${Date.now()}_copy`,
      title: `${lesson.title} (نسخة)`
    };
    addLesson(duplicatedLesson);
  };

  const handleSave = (moduleId: string | undefined, lessonToSave: Lesson) => {
    if (currentLesson.id) {
      updateLesson(lessonToSave.id, lessonToSave);
    } else {
      const newLesson: Lesson = {
        ...lessonToSave,
        id: `l_${Date.now()}`,
      } as Lesson;
      addLesson(newLesson);
    }
    setIsEditing(false);
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in relative z-50">
        <UnifiedLessonBuilder 
          initialLesson={currentLesson as Lesson}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مركز الدروس</h2>
          <p className="text-gray-500 text-sm mt-1">إدارة جميع الدروس في المنصة لاستخدامها في الدورات والمهارات.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة درس جديد
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {!subjectId && (
          <>
            <select 
              value={selectedPathId}
              onChange={(e) => {
                setSelectedPathId(e.target.value);
                setSelectedSubjectId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">كل المسارات</option>
              {paths.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select 
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedPathId}
            >
              <option value="">كل المواد</option>
              {subjects.filter(s => s.pathId === selectedPathId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </>
        )}
        <select 
          value={selectedSectionId}
          onChange={(e) => {
            setSelectedSectionId(e.target.value);
            setSelectedSkillId('');
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل الأقسام</option>
          {useStore.getState().sections.filter(s => s.subjectId === selectedSubjectId).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select 
          value={selectedSkillId}
          onChange={(e) => setSelectedSkillId(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">كل المهارات</option>
          {useStore.getState().nestedSkills.filter(s => 
            (!selectedSubjectId || s.subjectId === selectedSubjectId) &&
            (!selectedSectionId || s.sectionId === selectedSectionId)
          ).map(mainSkill => (
            <optgroup key={mainSkill.id} label={mainSkill.name}>
              <option value={mainSkill.id}>{mainSkill.name} (رئيسية)</option>
              {mainSkill.subSkills?.map(sub => (
                <option key={sub.id} value={sub.id}>- {sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ابحث في عنوان الدرس..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lessons List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عنوان الدرس</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المدة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المادة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLessons.map(lesson => (
                <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lesson.type === 'video' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {lesson.type === 'video' ? <Play size={18} className="ml-1" /> : <FileText size={18} />}
                      </div>
                      <span className="font-bold text-gray-800">{lesson.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {lesson.type === 'video' ? 'فيديو' : lesson.type === 'text' ? 'مقال' : 'اختبار'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{lesson.duration} دقيقة</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                      {subjects.find(s => s.id === lesson.subjectId)?.name || 'غير محدد'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDuplicate(lesson)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="نسخ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={() => handleEdit(lesson)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(lesson.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLessons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا توجد دروس مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
