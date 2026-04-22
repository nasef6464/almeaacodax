import React, { useState } from 'react';
import { Quiz } from '../../types';
import { Plus, Search, Edit2, Trash2, FileQuestion } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { QuizBuilder } from './QuizBuilder';

interface QuizzesManagerProps {
  subjectId?: string;
  filterType?: 'quiz' | 'bank';
}

export const QuizzesManager: React.FC<QuizzesManagerProps> = ({ subjectId, filterType }) => {
  const { quizzes: globalQuizzes, deleteQuiz, paths, subjects } = useStore();
  
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  
  // Filter quizzes
  const quizzes = globalQuizzes.filter(q => {
    if (filterType && q.type !== filterType) return false;
    if (subjectId && q.subjectId !== subjectId) return false;
    if (selectedSubjectId && q.subjectId !== selectedSubjectId) return false;
    if (selectedSectionId && q.sectionId !== selectedSectionId) return false;
    if (selectedPathId && !subjectId && !selectedSubjectId && q.pathId !== selectedPathId) return false;
    if (selectedSkillId && (!q.skillIds || !q.skillIds.includes(selectedSkillId))) return false;
    return true;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingQuizId(null);
    setIsEditing(true);
  };

  const handleEdit = (id: string) => {
    setEditingQuizId(id);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار نهائياً؟')) {
      deleteQuiz(id);
    }
  };

  const handleDuplicate = (quiz: Quiz) => {
    const { addQuiz } = useStore.getState();
    const duplicatedQuiz: Quiz = {
      ...quiz,
      id: `quiz_${Date.now()}_copy`,
      title: `${quiz.title} (نسخة)`
    };
    addQuiz(duplicatedQuiz);
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">
            {editingQuizId ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}
          </h3>
          <button 
            onClick={() => setIsEditing(false)}
            className="text-gray-500 hover:text-gray-700 font-bold text-sm"
          >
            العودة للقائمة
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <QuizBuilder 
            initialQuizId={editingQuizId || undefined} 
            initialSubjectId={selectedSubjectId || undefined}
            initialType={filterType}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مركز الاختبارات</h2>
          <p className="text-gray-500 text-sm mt-1">إدارة جميع الاختبارات في المنصة (تدريبية، محاكية، أو تقييمية).</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إنشاء اختبار جديد
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
          {useStore.getState().topics.filter(t => 
            (!selectedSubjectId || t.subjectId === selectedSubjectId) && !t.parentId
          ).map(mainTopic => (
            <optgroup key={mainTopic.id} label={mainTopic.title}>
              <option value={mainTopic.id}>{mainTopic.title} (رئيسية)</option>
              {useStore.getState().topics.filter(sub => sub.parentId === mainTopic.id).map(sub => (
                <option key={sub.id} value={sub.id}>- {sub.title}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ابحث في عنوان الاختبار..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Quizzes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عنوان الاختبار</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عدد الأسئلة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المادة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuizzes.map(quiz => (
                <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-500">
                        <FileQuestion size={18} />
                      </div>
                      <span className="font-bold text-gray-800">{quiz.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {quiz.type === 'bank' ? 'تدريب (بنك)' : 'اختبار محاكي'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{quiz.questionIds?.length || 0} سؤال</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                      {subjects.find(s => s.id === quiz.subjectId)?.name || 'غير محدد'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDuplicate(quiz)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="نسخ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={() => handleEdit(quiz.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(quiz.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuizzes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا توجد اختبارات مطابقة للبحث.
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
