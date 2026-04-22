import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Quiz, Question } from '../../types';
import { Plus, Search, Edit2, Trash2, Save, X, Settings, Link as LinkIcon, Users, FileQuestion, Filter, CheckCircle2 } from 'lucide-react';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';

interface QuizBuilderProps {
  onClose?: () => void;
  initialSubjectId?: string;
  initialQuizId?: string;
  initialType?: 'quiz' | 'bank';
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ onClose, initialSubjectId, initialQuizId, initialType = 'quiz' }) => {
  const { quizzes, addQuiz, updateQuiz, deleteQuiz, questions, subjects, paths, groups, addQuestion } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'settings' | 'access'>('info');
  
  const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>(() => {
    if (initialQuizId) {
      const existingQuiz = useStore.getState().quizzes.find(q => q.id === initialQuizId);
      if (existingQuiz) return existingQuiz;
    }
    return {
      title: '',
      description: '',
      pathId: '',
      subjectId: initialSubjectId || '',
      type: initialType,
      settings: {
        showExplanations: true,
        showAnswers: true,
        maxAttempts: 3,
        passingScore: 60,
        timeLimit: 60,
      },
      access: {
        type: 'free',
        allowedGroupIds: [],
      },
      questionIds: [],
      isPublished: false,
    };
  });

  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [autoGenConfig, setAutoGenConfig] = useState({
    difficulty: { Easy: 3, Medium: 5, Hard: 2 },
    skillIds: [] as string[]
  });

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    difficulty: 'Medium',
    type: 'mcq',
    subject: currentQuiz.subjectId,
    skillIds: []
  });

  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleCopyLink = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => alert('تم نسخ الرابط!')).catch(() => alert('فشل النسخ'));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('تم نسخ الرابط!');
      } catch (error) {
        alert('فشل نسخ الرابط');
      }
      textArea.remove();
    }
  };

  const handleAutoGenerate = async () => {
    let pool = questions;
    
    if (currentQuiz.pathId) {
       pool = pool.filter(q => q.pathId === currentQuiz.pathId || q.subject === currentQuiz.subjectId);
    }
    
    if (currentQuiz.subjectId) {
       pool = pool.filter(q => q.subject === currentQuiz.subjectId);
    }

    if (autoGenConfig.skillIds && autoGenConfig.skillIds.length > 0) {
      pool = pool.filter(q => q.skillIds?.some(id => autoGenConfig.skillIds.includes(id)));
    }

    const selectedIds: string[] = [];
    
    // Helper to pick random questions
    const pickRandom = (arr: Question[], count: number) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).map(q => q.id);
    };

    const easyQuestions = pool.filter(q => q.difficulty === 'Easy');
    const mediumQuestions = pool.filter(q => q.difficulty === 'Medium');
    const hardQuestions = pool.filter(q => q.difficulty === 'Hard');

    // Make sure we handle if count requested is larger than available pool
    const easyCount = Math.min(easyQuestions.length, autoGenConfig.difficulty.Easy || 0);
    const mediumCount = Math.min(mediumQuestions.length, autoGenConfig.difficulty.Medium || 0);
    const hardCount = Math.min(hardQuestions.length, autoGenConfig.difficulty.Hard || 0);

    selectedIds.push(...pickRandom(easyQuestions, easyCount));
    selectedIds.push(...pickRandom(mediumQuestions, mediumCount));
    selectedIds.push(...pickRandom(hardQuestions, hardCount));

    const totalRequested = (autoGenConfig.difficulty.Easy || 0) + (autoGenConfig.difficulty.Medium || 0) + (autoGenConfig.difficulty.Hard || 0);
    const missingCount = totalRequested - selectedIds.length;

    if (missingCount > 0) {
      const useAi = window.confirm(`لم يتم العثور على عدد كافٍ من الأسئلة في المنصة (مطلوب: ${totalRequested}، متوفر: ${selectedIds.length}). هل تريد توليد الباقي (${missingCount}) باستخدام الذكاء الاصطناعي؟`);
      if (useAi) {
         setIsAiGenerating(true);
         try {
           const { generateQuizQuestion } = await import('../../services/geminiService');
           let topicName = "القدرات العامة";
           if (currentQuiz.subjectId) {
              topicName = useStore.getState().subjects.find(s => s.id === currentQuiz.subjectId)?.name || topicName;
           }
           if (autoGenConfig.skillIds.length > 0) {
              const skillNames = autoGenConfig.skillIds.map(id => useStore.getState().topics.find(t => t.id === id)?.title).filter(Boolean);
              if (skillNames.length > 0) {
                 topicName += " - " + skillNames.join(', ');
              }
           }
           
           for(let i=0; i<missingCount; i++) {
              const generated = await generateQuizQuestion(topicName);
              if (generated) {
                const newQ: Question = {
                  id: `q_ai_${Date.now()}_${i}`,
                  text: generated.question,
                  options: generated.options,
                  correctOptionIndex: generated.correctIndex,
                  explanation: generated.explanation,
                  type: 'mcq',
                  difficulty: 'Medium', // Default to medium for AI
                  subject: currentQuiz.subjectId || '',
                  skillIds: autoGenConfig.skillIds
                };
                useStore.getState().addQuestion(newQ);
                selectedIds.push(newQ.id);
              }
           }
         } catch(e) {
           console.error("AI Generation failed", e);
           alert("حدث خطأ أثناء التوليد بالذكاء الاصطناعي.");
         } finally {
            setIsAiGenerating(false);
         }
      }
    }

    setCurrentQuiz(prev => ({
      ...prev,
      questionIds: [...new Set([...(prev.questionIds || []), ...selectedIds])]
    }));
    
    setIsAutoGenerateModalOpen(false);
    alert(`تمت إضافة ${selectedIds.length} سؤال بنجاح!`);
  };

  const handleSaveNewQuestion = (savedQuestion: Partial<Question>) => {
    const q: Question = {
      ...savedQuestion,
      id: `q_${Date.now()}`,
      subject: currentQuiz.subjectId || '',
    } as Question;
    
    addQuestion(q);
    setCurrentQuiz(prev => ({
      ...prev,
      questionIds: [...(prev.questionIds || []), q.id]
    }));
    
    setIsAddQuestionModalOpen(false);
  };

  const handleCreateNew = () => {
    setCurrentQuiz({
      title: '',
      description: '',
      pathId: '',
      subjectId: initialSubjectId || '',
      settings: {
        showExplanations: true,
        showAnswers: true,
        maxAttempts: 3,
        passingScore: 60,
        timeLimit: 60,
      },
      access: {
        type: 'free',
        allowedGroupIds: [],
      },
      questionIds: [],
      isPublished: false,
    });
    setIsEditing(true);
    setActiveTab('info');
  };

  const handleEdit = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setIsEditing(true);
    setActiveTab('info');
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار نهائياً؟')) {
      deleteQuiz(id);
    }
  };

  const handleSave = () => {
    if (!currentQuiz.title || !currentQuiz.subjectId) {
      alert('يرجى إدخال عنوان الاختبار وتحديد المادة.');
      return;
    }

    if (currentQuiz.id) {
      updateQuiz(currentQuiz.id, currentQuiz as Quiz);
    } else {
      const newQuiz: Quiz = {
        ...currentQuiz,
        id: `quiz_${Date.now()}`,
        createdAt: Date.now(),
      } as Quiz;
      addQuiz(newQuiz);
    }
    setIsEditing(false);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setCurrentQuiz(prev => {
      const currentIds = prev.questionIds || [];
      if (currentIds.includes(questionId)) {
        return { ...prev, questionIds: currentIds.filter(id => id !== questionId) };
      } else {
        return { ...prev, questionIds: [...currentIds, questionId] };
      }
    });
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!initialSubjectId || q.subjectId === initialSubjectId)
  );

  const availableQuestions = questions.filter(q => q.subject === currentQuiz.subjectId);

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {currentQuiz.id ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              حفظ الاختبار
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          {[
            { id: 'info', label: 'المعلومات الأساسية', icon: <FileQuestion size={18} /> },
            { id: 'questions', label: 'الأسئلة', icon: <Filter size={18} /> },
            { id: 'settings', label: 'الإعدادات', icon: <Settings size={18} /> },
            { id: 'access', label: 'الصلاحيات والنشر', icon: <Users size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">المسار (اختياري / لتصنيف الاختبار)</label>
                    <select 
                      value={currentQuiz.pathId || ''}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, pathId: e.target.value, subjectId: '' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    >
                      <option value="">-- كل المسارات --</option>
                      {paths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">المادة الأساسية</label>
                    <select 
                      value={currentQuiz.subjectId || ''}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, subjectId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                      disabled={!!currentQuiz.pathId && subjects.filter(s => s.pathId === currentQuiz.pathId).length === 0}
                    >
                      <option value="">-- اختر المادة --</option>
                      {subjects.filter(s => !currentQuiz.pathId || s.pathId === currentQuiz.pathId).map(s => (
                         <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الاختبار</label>
                  <input 
                    type="text" 
                    value={currentQuiz.title || ''}
                    onChange={(e) => setCurrentQuiz(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: اختبار تجريبي شامل - كمي"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">وصف الاختبار (اختياري)</label>
                  <textarea 
                    value={currentQuiz.description || ''}
                    onChange={(e) => setCurrentQuiz(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
                    placeholder="وصف قصير يظهر للطلاب قبل بدء الاختبار..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ربط بمهارات (اختياري)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentQuiz.skillIds?.map(skillId => {
                      const skill = useStore.getState().nestedSkills.flatMap(s => [s, ...s.subSkills]).find(s => s.id === skillId);
                      return skill ? (
                        <span key={skillId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                          {skill.name}
                          <button onClick={() => setCurrentQuiz(prev => ({ ...prev, skillIds: prev.skillIds?.filter(id => id !== skillId) }))} className="text-indigo-600 hover:text-indigo-900">
                            <X size={14} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <select 
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !currentQuiz.skillIds?.includes(e.target.value)) {
                        setCurrentQuiz(prev => ({ ...prev, skillIds: [...(prev.skillIds || []), e.target.value] }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- أضف مهارة --</option>
                    {useStore.getState().nestedSkills.filter(s => !currentQuiz.subjectId || s.subjectId === currentQuiz.subjectId).map(mainSkill => (
                      <optgroup key={mainSkill.id} label={mainSkill.name}>
                        <option value={mainSkill.id}>{mainSkill.name} (رئيسية)</option>
                        {mainSkill.subSkills?.map(sub => (
                          <option key={sub.id} value={sub.id}>- {sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Questions */}
            {activeTab === 'questions' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">الأسئلة المحددة ({currentQuiz.questionIds?.length || 0})</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsAutoGenerateModalOpen(true)}
                      className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors"
                    >
                      توليد تلقائي (نظام ساهر)
                    </button>
                    <button 
                      onClick={() => setIsAddQuestionModalOpen(true)}
                      className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors"
                    >
                      إضافة سؤال جديد
                    </button>
                  </div>
                </div>

                {/* Question Selection List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-600">اختر من بنك الأسئلة</span>
                    <input 
                      type="text" 
                      placeholder="بحث في الأسئلة..." 
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {availableQuestions.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        لا توجد أسئلة متاحة لهذه المادة في بنك الأسئلة.
                      </div>
                    ) : (
                      availableQuestions.map(q => {
                        const isSelected = currentQuiz.questionIds?.includes(q.id);
                        return (
                          <div 
                            key={q.id} 
                            onClick={() => toggleQuestionSelection(q.id)}
                            className={`p-4 flex items-start gap-4 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-5 h-5 rounded border mt-1 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>
                              {isSelected && <CheckCircle2 size={14} />}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-800 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: q.text }} />
                              <div className="flex gap-2 text-xs">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {q.difficulty === 'Easy' ? 'سهل' : q.difficulty === 'Medium' ? 'متوسط' : 'صعب'}
                                </span>
                                {q.skillIds?.map(skillId => {
                                  const topic = useStore.getState().topics.find(t => t.id === skillId);
                                  return topic ? (
                                    <span key={skillId} className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                      {topic.title}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Settings */}
            {activeTab === 'settings' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">درجة النجاح (%)</label>
                    <input 
                      type="number" 
                      value={currentQuiz.settings?.passingScore || 60}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings!, passingScore: Number(e.target.value) } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0" max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الوقت المحدد (بالدقائق)</label>
                    <input 
                      type="number" 
                      value={currentQuiz.settings?.timeLimit || 60}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings!, timeLimit: Number(e.target.value) } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">اتركه 0 لاختبار بدون وقت محدد.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">عدد المحاولات المسموحة</label>
                    <input 
                      type="number" 
                      value={currentQuiz.settings?.maxAttempts || 3}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings!, maxAttempts: Number(e.target.value) } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={currentQuiz.settings?.showAnswers}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings!, showAnswers: e.target.checked } }))}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block font-bold text-gray-800">إظهار الإجابات الصحيحة</span>
                      <span className="block text-xs text-gray-500">للطالب بعد انتهاء الاختبار</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={currentQuiz.settings?.showExplanations}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings!, showExplanations: e.target.checked } }))}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block font-bold text-gray-800">إظهار شرح الإجابات (الفيديو/النص)</span>
                      <span className="block text-xs text-gray-500">للطالب بعد انتهاء الاختبار</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Access */}
            {activeTab === 'access' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">نوع الوصول</label>
                  <select 
                    value={currentQuiz.access?.type || 'free'}
                    onChange={(e) => setCurrentQuiz(prev => ({ ...prev, access: { ...prev.access!, type: e.target.value as any } }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free">مجاني للجميع</option>
                    <option value="paid">مدفوع (شراء منفصل)</option>
                    <option value="private">مخصص لمجموعات محددة</option>
                    <option value="course_only">متاح فقط داخل الدورات</option>
                  </select>
                </div>

                {currentQuiz.access?.type === 'paid' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">سعر الاختبار (ريال)</label>
                    <input 
                      type="number" 
                      value={currentQuiz.access?.price || 0}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, access: { ...prev.access!, price: Number(e.target.value) } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                )}

                {currentQuiz.access?.type === 'private' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">المجموعات المسموح لها</label>
                    <select 
                      multiple
                      value={currentQuiz.access?.allowedGroupIds || []}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setCurrentQuiz(prev => ({ ...prev, access: { ...prev.access!, allowedGroupIds: values } }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">اضغط Ctrl (أو Cmd) لاختيار أكثر من مجموعة.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={currentQuiz.isPublished || false}
                      onChange={(e) => setCurrentQuiz(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block font-bold text-gray-800">نشر الاختبار</span>
                      <span className="block text-xs text-gray-500">سيكون الاختبار متاحاً للطلاب حسب إعدادات الوصول.</span>
                    </div>
                  </label>
                </div>

                {currentQuiz.id && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between mt-6">
                    <div>
                      <h4 className="font-bold text-indigo-900 text-sm">رابط مباشر للاختبار</h4>
                      <p className="text-xs text-indigo-600 mt-1">يمكنك استخدام هذا الرابط للتسويق أو إرساله للطلاب مباشرة.</p>
                    </div>
                    <button 
                      onClick={() => handleCopyLink(`${window.location.origin}/quiz/${currentQuiz.id}`)}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-2"
                    >
                      <LinkIcon size={16} />
                      نسخ الرابط
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        {/* Modals */}
        {isAutoGenerateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">توليد تلقائي (نظام ساهر)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عدد الأسئلة السهلة</label>
                  <input type="number" value={autoGenConfig.difficulty.Easy} onChange={e => setAutoGenConfig(prev => ({ ...prev, difficulty: { ...prev.difficulty, Easy: Number(e.target.value) } }))} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عدد الأسئلة المتوسطة</label>
                  <input type="number" value={autoGenConfig.difficulty.Medium} onChange={e => setAutoGenConfig(prev => ({ ...prev, difficulty: { ...prev.difficulty, Medium: Number(e.target.value) } }))} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عدد الأسئلة الصعبة</label>
                  <input type="number" value={autoGenConfig.difficulty.Hard} onChange={e => setAutoGenConfig(prev => ({ ...prev, difficulty: { ...prev.difficulty, Hard: Number(e.target.value) } }))} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-gray-700 mb-2">المهارات المشمولة (اختياري)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {autoGenConfig.skillIds?.map(skillId => {
                      const topic = useStore.getState().topics.find(t => t.id === skillId);
                      return topic ? (
                        <span key={skillId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                          {topic.title}
                          <button onClick={() => setAutoGenConfig(prev => ({ ...prev, skillIds: prev.skillIds.filter(id => id !== skillId) }))} className="text-indigo-600 hover:text-indigo-900">
                            <X size={14} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <select 
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !autoGenConfig.skillIds.includes(e.target.value)) {
                        setAutoGenConfig(prev => ({ ...prev, skillIds: [...prev.skillIds, e.target.value] }));
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- أضف مهارة للتوليد --</option>
                    {useStore.getState().topics.filter(t => !currentQuiz.subjectId || t.subjectId === currentQuiz.subjectId).filter(t => !t.parentId).map(mainTopic => (
                      <optgroup key={mainTopic.id} label={mainTopic.title}>
                        <option value={mainTopic.id}>{mainTopic.title} (رئيسية)</option>
                        {useStore.getState().topics.filter(sub => sub.parentId === mainTopic.id).map(sub => (
                          <option key={sub.id} value={sub.id}>- {sub.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-6 md:col-span-3">
                  <button onClick={() => setIsAutoGenerateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                  <button disabled={isAiGenerating} onClick={handleAutoGenerate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isAiGenerating ? 'جاري التوليد بالذكاء الاصطناعي...' : 'توليد'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddQuestionModalOpen && (
          <UnifiedQuestionBuilder 
            subjectId={currentQuiz.subjectId}
            onSave={handleSaveNewQuestion}
            onCancel={() => setIsAddQuestionModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">منشئ الاختبارات الموحد</h2>
          <p className="text-gray-500 text-sm mt-1">إنشاء وإدارة الاختبارات المحاكية والتجريبية على مستوى المنصة.</p>
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
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن اختبار..." 
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
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المادة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عدد الأسئلة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuizzes.map(quiz => {
                const subject = subjects.find(s => s.id === quiz.subjectId);
                return (
                  <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{quiz.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{quiz.access.type === 'free' ? 'مجاني' : quiz.access.type === 'paid' ? 'مدفوع' : 'مخصص'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-bold">
                        {subject?.name || quiz.subjectId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700">{quiz.questionIds.length} سؤال</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        quiz.isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {quiz.isPublished ? 'منشور' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(quiz)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(quiz.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleCopyLink(`${window.location.origin}/quiz/${quiz.id}`)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="نسخ الرابط"
                        >
                          <LinkIcon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
