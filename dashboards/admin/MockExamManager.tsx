import React, { useEffect, useMemo, useState } from 'react';
import { Award, Plus, Save, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { MockExamSection, Question, Quiz } from '../../types';
import { getMockExamQuestionCount, getMockExamSections, isPathMockExam } from '../../utils/mockExam';

type DraftSection = MockExamSection;

const createSection = (title: string, subjectId = '', order = 0): DraftSection => ({
  id: `mock_sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title,
  subjectId,
  questionIds: [],
  timeLimit: 30,
  order,
});

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export const MockExamManager: React.FC = () => {
  const { paths, subjects, questions, quizzes, addQuiz, updateQuiz, deleteQuiz } = useStore();
  const [selectedPathId, setSelectedPathId] = useState(paths[0]?.id || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('اختبار محاكي جديد');
  const [description, setDescription] = useState('تجربة محاكية على مستوى المسار.');
  const [passingScore, setPassingScore] = useState(60);
  const [sections, setSections] = useState<DraftSection[]>([]);

  useEffect(() => {
    if (!selectedPathId && paths[0]?.id) {
      setSelectedPathId(paths[0].id);
    }
  }, [paths, selectedPathId]);

  const pathSubjects = useMemo(
    () => subjects.filter((subject) => subject.pathId === selectedPathId),
    [selectedPathId, subjects],
  );
  const pathQuestions = useMemo(
    () => questions.filter((question) => question.pathId === selectedPathId || pathSubjects.some((subject) => subject.id === question.subject)),
    [pathSubjects, questions, selectedPathId],
  );
  const mockExams = useMemo(
    () => quizzes.filter((quiz) => isPathMockExam(quiz, selectedPathId)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [quizzes, selectedPathId],
  );

  const resetDraft = () => {
    setEditingId(null);
    setTitle('اختبار محاكي جديد');
    setDescription('تجربة محاكية على مستوى المسار.');
    setPassingScore(60);
    setSections(pathSubjects.slice(0, 2).map((subject, index) => createSection(subject.name, subject.id, index)));
  };

  const loadExam = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setSelectedPathId(quiz.mockExam?.pathId || quiz.pathId);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setPassingScore(quiz.settings?.passingScore || 60);
    setSections(getMockExamSections(quiz));
  };

  const toggleQuestion = (sectionId: string, questionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const exists = section.questionIds.includes(questionId);
        return {
          ...section,
          questionIds: exists
            ? section.questionIds.filter((id) => id !== questionId)
            : [...section.questionIds, questionId],
        };
      }),
    );
  };

  const fillSectionFromSubject = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const pool = pathQuestions.filter((question) => !section.subjectId || question.subject === section.subjectId);
        return { ...section, questionIds: unique([...section.questionIds, ...pool.slice(0, 20).map((question) => question.id)]) };
      }),
    );
  };

  const saveExam = () => {
    const now = Date.now();
    const cleanSections = sections
      .map((section, index) => ({ ...section, order: index, questionIds: unique(section.questionIds) }))
      .filter((section) => section.title.trim() && section.questionIds.length > 0);
    const allQuestionIds = unique(cleanSections.flatMap((section) => section.questionIds));
    const firstSubjectId = cleanSections[0]?.subjectId || pathSubjects[0]?.id || 'mock_exam';

    const payload: Quiz = {
      id: editingId || `mock_exam_${now}`,
      title: title.trim() || 'اختبار محاكي',
      description,
      pathId: selectedPathId,
      subjectId: firstSubjectId,
      type: 'quiz',
      placement: 'mock',
      showInTraining: false,
      showInMock: false,
      mode: 'saher',
      settings: {
        showExplanations: true,
        showAnswers: true,
        maxAttempts: 3,
        passingScore,
        timeLimit: cleanSections.reduce((sum, section) => sum + (Number(section.timeLimit) || 0), 0) || 60,
        randomizeQuestions: false,
        showProgressBar: true,
        requireAnswerBeforeNext: false,
        allowQuestionReview: true,
        optionLayout: 'auto',
      },
      access: { type: 'free', allowedGroupIds: [] },
      questionIds: allQuestionIds,
      mockExam: { enabled: true, pathId: selectedPathId, sections: cleanSections },
      createdAt: now,
      isPublished: true,
      showOnPlatform: true,
      approvalStatus: 'approved',
      approvedAt: now,
    };

    if (editingId) {
      updateQuiz(editingId, payload);
    } else {
      addQuiz(payload);
    }
    resetDraft();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              <Award size={16} />
              مركز مستقل للمحاكيات
            </div>
            <h2 className="mt-3 text-2xl font-black text-gray-900">مركز الاختبارات المحاكية</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-gray-500">
              الاختبار هنا على مستوى المسار، وأقسامه تسحب الأسئلة من مركز الأسئلة فقط. نفس السؤال يمكن استخدامه في أكثر من اختبار.
            </p>
          </div>
          <select
            value={selectedPathId}
            onChange={(event) => {
              setSelectedPathId(event.target.value);
              setEditingId(null);
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold"
          >
            {paths.map((path) => (
              <option key={path.id} value={path.id}>{path.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{editingId ? 'تعديل محاكاة' : 'إنشاء محاكاة'}</h3>
            <button onClick={resetDraft} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700">
              جديد
            </button>
          </div>

          <div className="space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold" placeholder="عنوان الاختبار" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" placeholder="وصف مختصر" />
            <label className="block text-xs font-black text-gray-500">نسبة النجاح</label>
            <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value) || 0)} className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold" />

            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-900">الأقسام</h4>
              <button
                onClick={() => setSections((prev) => [...prev, createSection(`قسم ${prev.length + 1}`, pathSubjects[prev.length]?.id || '', prev.length)])}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"
              >
                <Plus size={16} />
                إضافة قسم
              </button>
            </div>

            {sections.length === 0 ? (
              <button onClick={resetDraft} className="w-full rounded-xl border border-dashed border-gray-300 py-8 text-sm font-black text-gray-500">
                تجهيز أقسام من مواد المسار
              </button>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => {
                  const sectionQuestions = pathQuestions.filter((question) => !section.subjectId || question.subject === section.subjectId);
                  return (
                    <div key={section.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={section.title}
                          onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, title: e.target.value } : item))}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                          placeholder="اسم القسم"
                        />
                        <select
                          value={section.subjectId || ''}
                          onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, subjectId: e.target.value, questionIds: [] } : item))}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                        >
                          <option value="">كل مواد المسار</option>
                          {pathSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min={5}
                          value={section.timeLimit || 30}
                          onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, timeLimit: Number(e.target.value) || 30 } : item))}
                          className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                        />
                        <span className="text-xs font-bold text-gray-500">دقيقة</span>
                        <button onClick={() => fillSectionFromSubject(section.id)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                          اختيار أول 20 سؤال
                        </button>
                        <button onClick={() => setSections((prev) => prev.filter((item) => item.id !== section.id))} className="mr-auto rounded-xl bg-red-50 p-2 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-3 text-xs font-bold text-gray-500">
                        القسم {index + 1}: {section.questionIds.length} سؤال مختار من {sectionQuestions.length}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={saveExam}
              disabled={!selectedPathId || sections.every((section) => section.questionIds.length === 0)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              حفظ الاختبار المحاكي
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-gray-900">أسئلة مركز الأسئلة</h3>
            <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
              {sections.map((section) => {
                const pool = pathQuestions.filter((question) => !section.subjectId || question.subject === section.subjectId);
                return (
                  <div key={section.id} className="rounded-2xl border border-gray-100 p-4">
                    <h4 className="mb-3 font-black text-indigo-700">{section.title}</h4>
                    <div className="space-y-2">
                      {pool.slice(0, 80).map((question: Question) => (
                        <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm hover:bg-white">
                          <input
                            type="checkbox"
                            checked={section.questionIds.includes(question.id)}
                            onChange={() => toggleQuestion(section.id, question.id)}
                            className="mt-1"
                          />
                          <span className="line-clamp-2 flex-1 font-bold text-gray-700">
                            {question.text || question.imageUrl || question.id}
                          </span>
                        </label>
                      ))}
                      {pool.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs font-bold text-gray-400">
                          لا توجد أسئلة لهذه المادة بعد.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-gray-900">المحاكيات الحالية</h3>
            <div className="space-y-3">
              {mockExams.map((quiz) => (
                <div key={quiz.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="font-black text-gray-900">{quiz.title}</h4>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                      <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamSections(quiz).length} قسم</span>
                      <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamQuestionCount(quiz)} سؤال</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">من مركز الأسئلة</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadExam(quiz)} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
                      تعديل
                    </button>
                    <button onClick={() => updateQuiz(quiz.id, { showOnPlatform: quiz.showOnPlatform === false })} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700">
                      {quiz.showOnPlatform === false ? 'إظهار' : 'إخفاء'}
                    </button>
                    <button onClick={() => deleteQuiz(quiz.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {mockExams.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-bold text-gray-400">
                  لا توجد محاكيات لهذا المسار بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockExamManager;
