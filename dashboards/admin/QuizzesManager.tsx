import React, { useMemo, useState } from 'react';
import { Quiz } from '../../types';
import { Plus, Search, Edit2, Trash2, FileQuestion } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { QuizBuilder } from './QuizBuilder';

interface QuizzesManagerProps {
  subjectId?: string;
  filterType?: 'quiz' | 'bank';
}

export const QuizzesManager: React.FC<QuizzesManagerProps> = ({ subjectId, filterType }) => {
  const {
    quizzes: globalQuizzes,
    deleteQuiz,
    paths,
    subjects,
    sections,
    skills,
    questions,
    addQuiz
  } = useStore();

  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'all' | 'regular' | 'saher' | 'central'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const availableSections = useMemo(
    () =>
      sections
        .filter((section) => section.subjectId === selectedSubjectId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [sections, selectedSubjectId]
  );

  const availableSubSkills = useMemo(
    () =>
      skills
        .filter((skill) => {
          if (!selectedSubjectId || skill.subjectId !== selectedSubjectId) return false;
          if (selectedSectionId && skill.sectionId !== selectedSectionId) return false;
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [skills, selectedSectionId, selectedSubjectId]
  );

  const quizzes = useMemo(
    () =>
      globalQuizzes.filter((quiz) => {
        if (filterType && quiz.type !== filterType) return false;
        if (subjectId && quiz.subjectId !== subjectId) return false;
        if (selectedSubjectId && quiz.subjectId !== selectedSubjectId) return false;
        if (selectedSectionId && quiz.sectionId !== selectedSectionId) return false;
        if (selectedPathId && !subjectId && !selectedSubjectId && quiz.pathId !== selectedPathId) return false;
        if (selectedSkillId && (!quiz.skillIds || !quiz.skillIds.includes(selectedSkillId))) return false;
        if (modeFilter !== 'all' && (quiz.mode || 'regular') !== modeFilter) return false;
        return true;
      }),
    [filterType, globalQuizzes, modeFilter, selectedPathId, selectedSectionId, selectedSkillId, selectedSubjectId, subjectId]
  );

  const filteredQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [quizzes, searchTerm]
  );

  const modeCounts = useMemo(
    () => ({
      all: globalQuizzes.length,
      saher: globalQuizzes.filter((quiz) => (quiz.mode || 'regular') === 'saher').length,
      central: globalQuizzes.filter((quiz) => (quiz.mode || 'regular') === 'central').length
    }),
    [globalQuizzes]
  );

  const measuredSkillNames = (quiz: Quiz) => {
    const directSkillIds = quiz.skillIds || [];
    const questionSkillIds = (quiz.questionIds || []).flatMap((questionId) => {
      const question = questions.find((item) => item.id === questionId);
      return question?.skillIds || [];
    });

    const uniqueIds = [...new Set([...directSkillIds, ...questionSkillIds])];
    return uniqueIds
      .map((skillId) => skills.find((skill) => skill.id === skillId)?.name)
      .filter(Boolean) as string[];
  };

  const handleCreateNew = () => {
    setEditingQuizId(null);
    setIsEditing(true);
  };

  const handleCreateByMode = (mode: 'regular' | 'saher' | 'central') => {
    const draftQuiz: Quiz = {
      id: `quiz_${Date.now()}_${mode}`,
      title: mode === 'saher' ? 'اختبار ساهر جديد' : mode === 'central' ? 'اختبار مركزي جديد' : 'اختبار جديد',
      description: '',
      pathId: selectedPathId || '',
      subjectId: selectedSubjectId || '',
      type: 'quiz',
      mode,
      settings: {
        showExplanations: true,
        showAnswers: true,
        maxAttempts: 3,
        passingScore: 60,
        timeLimit: 60
      },
      access:
        mode === 'central'
          ? { type: 'private', allowedGroupIds: [] }
          : { type: 'free', allowedGroupIds: [] },
      questionIds: [],
      createdAt: Date.now(),
      isPublished: false,
      targetGroupIds: [],
      targetUserIds: [],
      dueDate: ''
    };

    addQuiz(draftQuiz);
    setEditingQuizId(draftQuiz.id);
    setIsEditing(true);
  };

  const handleEdit = (id: string) => {
    setEditingQuizId(id);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار نهائيًا؟')) {
      deleteQuiz(id);
    }
  };

  const handleDuplicate = (quiz: Quiz) => {
    const duplicatedQuiz: Quiz = {
      ...quiz,
      id: `quiz_${Date.now()}_copy`,
      title: `${quiz.title} (نسخة)`
    };
    addQuiz(duplicatedQuiz);
  };

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
          <p className="text-gray-500 text-sm mt-1">
            إدارة جميع الاختبارات في المنصة وربطها بالمادة والمهارات المقاسة فعليًا من الأسئلة المضافة لها.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateNew}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            إنشاء اختبار جديد
          </button>
          <button
            onClick={() => handleCreateByMode('saher')}
            className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 transition-colors"
          >
            + اختبار ساهر
          </button>
          <button
            onClick={() => handleCreateByMode('central')}
            className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold hover:bg-amber-100 transition-colors"
          >
            + اختبار مركزي موجه
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">إجمالي الاختبارات</p>
          <p className="text-2xl font-black text-gray-900">{modeCounts.all}</p>
        </div>
        <div className="bg-white border border-purple-100 rounded-xl p-4">
          <p className="text-xs text-purple-500 mb-1">اختبارات ساهر</p>
          <p className="text-2xl font-black text-purple-700">{modeCounts.saher}</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">اختبارات مركزية موجهة</p>
          <p className="text-2xl font-black text-amber-700">{modeCounts.central}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {!subjectId && (
          <>
            <select
              value={selectedPathId}
              onChange={(event) => {
                setSelectedPathId(event.target.value);
                setSelectedSubjectId('');
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">كل المسارات</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectId}
              onChange={(event) => {
                setSelectedSubjectId(event.target.value);
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedPathId}
            >
              <option value="">كل المواد</option>
              {subjects
                .filter((subject) => subject.pathId === selectedPathId)
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
            </select>
          </>
        )}

        <select
          value={selectedSectionId}
          onChange={(event) => {
            setSelectedSectionId(event.target.value);
            setSelectedSkillId('');
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الرئيسة</option>
          {availableSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSkillId}
          onChange={(event) => setSelectedSkillId(event.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الفرعية</option>
          {availableSubSkills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>

        <select
          value={modeFilter}
          onChange={(event) => setModeFilter(event.target.value as typeof modeFilter)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">كل الأنماط</option>
          <option value="regular">اختبار عادي</option>
          <option value="saher">اختبار ساهر</option>
          <option value="central">اختبار مركزي</option>
        </select>

        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="ابحث في عنوان الاختبار..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عنوان الاختبار</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عدد الأسئلة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المادة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المهارات المقاسة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">النمط</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuizzes.map((quiz) => {
                const measuredSkills = measuredSkillNames(quiz);
                return (
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
                        {subjects.find((subject) => subject.id === quiz.subjectId)?.name || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 max-w-xs">
                        {measuredSkills.length > 0 ? (
                          <>
                            {measuredSkills.slice(0, 3).map((skillName) => (
                              <span
                                key={`${quiz.id}-${skillName}`}
                                className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700"
                              >
                                {skillName}
                              </span>
                            ))}
                            {measuredSkills.length > 3 && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                +{measuredSkills.length - 3}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">تُحدد تلقائيًا من الأسئلة</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (quiz.mode || 'regular') === 'saher'
                            ? 'bg-purple-50 text-purple-700'
                            : (quiz.mode || 'regular') === 'central'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {(quiz.mode || 'regular') === 'saher'
                          ? 'ساهر'
                          : (quiz.mode || 'regular') === 'central'
                            ? 'مركزي'
                            : 'عادي'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicate(quiz)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="نسخ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(quiz.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuizzes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
