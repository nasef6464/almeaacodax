import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Quiz, Question, QuizResult } from '../types';
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, FileQuestion, Target } from 'lucide-react';

export const QuizPage: React.FC = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizzes, questions, user, checkAccess, saveExamResult, nestedSkills } = useStore();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const foundQuiz = quizzes.find(q => q.id === quizId);
    if (foundQuiz) {
      setQuiz(foundQuiz);
      
      // Check access
      if (foundQuiz.access.type === 'free') {
        setHasAccess(true);
      } else if (foundQuiz.access.type === 'paid') {
        setHasAccess(checkAccess(foundQuiz.id, true));
      } else if (foundQuiz.access.type === 'private') {
        const userGroups = user.groupIds || [];
        const hasGroupAccess = foundQuiz.access.allowedGroupIds?.some(id => userGroups.includes(id));
        setHasAccess(!!hasGroupAccess);
      } else {
        setHasAccess(false); // course_only should be accessed via course
      }

      // Load questions
      const loadedQuestions = foundQuiz.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
      setQuizQuestions(loadedQuestions);

      // Set timer
      if (foundQuiz.settings.timeLimit && foundQuiz.settings.timeLimit > 0) {
        setTimeLeft(foundQuiz.settings.timeLimit * 60);
      }
    } else {
      setHasAccess(false);
    }
  }, [quizId, quizzes, questions, user, checkAccess]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && !isFinished) {
      handleFinish();
    }
  }, [timeLeft, isFinished]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isFinished) return;
    const currentQuestion = quizQuestions[currentQuestionIndex];
    setSelectedOptions(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsFinished(true);
    
    if (!quiz) return;

    let correctCount = 0;
    quizQuestions.forEach(q => {
      if (selectedOptions[q.id] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const skillStats: Record<string, { total: number; correct: number }> = {};
    quizQuestions.forEach(q => {
      const isCorrect = selectedOptions[q.id] === q.correctOptionIndex;
      if (q.skillIds) {
        q.skillIds.forEach(skillId => {
          if (!skillStats[skillId]) {
            skillStats[skillId] = { total: 0, correct: 0 };
          }
          skillStats[skillId].total++;
          if (isCorrect) {
            skillStats[skillId].correct++;
          }
        });
      }
    });

    const allSkills = nestedSkills.flatMap(s => [s, ...s.subSkills]);
    const skillsAnalysis = Object.entries(skillStats).map(([skillId, stats]) => {
      const skill = allSkills.find(s => s.id === skillId);
      const mastery = Math.round((stats.correct / stats.total) * 100);
      let status: 'weak' | 'average' | 'strong' = 'average';
      if (mastery < 50) status = 'weak';
      else if (mastery >= 80) status = 'strong';
      
      return {
        skill: skill ? skill.name : 'مهارة غير معروفة',
        mastery,
        status,
        recommendation: status === 'weak' ? 'بحاجة لمراجعة الدروس' : (status === 'average' ? 'يمكن التحسين بالتدريب' : 'أداء ممتاز'),
        section: skill && 'subjectId' in skill ? skill.subjectId : undefined
      };
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);

    const result: QuizResult = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      score,
      totalQuestions: quizQuestions.length,
      correctAnswers: correctCount,
      wrongAnswers: quizQuestions.length - correctCount - (quizQuestions.length - Object.keys(selectedOptions).length),
      unanswered: quizQuestions.length - Object.keys(selectedOptions).length,
      timeSpent: quiz?.settings.timeLimit ? `${Math.floor((quiz.settings.timeLimit * 60 - (timeLeft || 0)) / 60)} دقيقة` : 'غير محدد',
      date: new Date().toISOString(),
      skillsAnalysis
    };

    saveExamResult(result);
  };

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!hasAccess || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">عذراً، لا يمكنك الوصول</h2>
          <p className="text-gray-500 mb-6">هذا الاختبار غير متاح لك حالياً. قد يكون مدفوعاً أو مخصصاً لمجموعة معينة.</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors w-full">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isPassed = isFinished && (Object.keys(selectedOptions).reduce((acc, qId) => acc + (selectedOptions[qId] === quizQuestions.find(q => q.id === qId)?.correctOptionIndex ? 1 : 0), 0) / quizQuestions.length * 100) >= quiz.settings.passingScore;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
            {quiz.description && <p className="text-gray-500 mt-1 text-sm">{quiz.description}</p>}
          </div>
          {timeLeft !== null && !isFinished && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-bold">
              <Clock size={20} />
              <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </div>
          )}
        </div>

        {!isFinished ? (
          /* Quiz Interface */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 w-full">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>

            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-gray-500">السؤال {currentQuestionIndex + 1} من {quizQuestions.length}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">{currentQuestion.difficulty}</span>
              </div>

              <div className="text-lg text-gray-800 mb-8" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    className={`w-full text-right p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      selectedOptions[currentQuestion.id] === index
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedOptions[currentQuestion.id] === index ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                    }`}>
                      {selectedOptions[currentQuestion.id] === index && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-medium text-gray-700">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowRight size={18} />
                السابق
              </button>
              
              {currentQuestionIndex === quizQuestions.length - 1 ? (
                <button
                  onClick={handleFinish}
                  className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  إنهاء الاختبار
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  التالي
                  <ArrowLeft size={18} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Results Interface */
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {isPassed ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {isPassed ? 'مبروك! لقد اجتزت الاختبار' : 'للأسف، لم تجتز الاختبار'}
              </h2>
              <p className="text-gray-500 mb-8">
                درجة النجاح المطلوبة هي {quiz.settings.passingScore}%
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">النتيجة</div>
                  <div className={`text-2xl font-bold ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                    {Math.round((Object.keys(selectedOptions).reduce((acc, qId) => acc + (selectedOptions[qId] === quizQuestions.find(q => q.id === qId)?.correctOptionIndex ? 1 : 0), 0) / quizQuestions.length) * 100)}%
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-sm text-emerald-600 mb-1">إجابات صحيحة</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {Object.keys(selectedOptions).reduce((acc, qId) => acc + (selectedOptions[qId] === quizQuestions.find(q => q.id === qId)?.correctOptionIndex ? 1 : 0), 0)}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="text-sm text-red-600 mb-1">إجابات خاطئة</div>
                  <div className="text-2xl font-bold text-red-700">
                    {Object.keys(selectedOptions).reduce((acc, qId) => acc + (selectedOptions[qId] !== quizQuestions.find(q => q.id === qId)?.correctOptionIndex ? 1 : 0), 0)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">الوقت المستغرق</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {quiz.settings.timeLimit ? Math.floor((quiz.settings.timeLimit * 60 - (timeLeft || 0)) / 60) : 0} د
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={() => navigate('/')} className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                  العودة للرئيسية
                </button>
                <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  إعادة الاختبار
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => alert('سيتم توليد اختبار جديد بنفس المواصفات')} className="bg-amber-50 text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                  <FileQuestion size={20} />
                  طلب اختبار مشابه
                </button>
                <button onClick={() => alert('سيتم توليد اختبار يركز على المهارات التي أخطأت بها')} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                  <Target size={20} />
                  اختبار للمهارات الضعيفة
                </button>
              </div>
            </div>

            {/* Review Answers */}
            {quiz.settings.showAnswers && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">مراجعة الإجابات</h3>
                <div className="space-y-8">
                  {quizQuestions.map((q, index) => {
                    const userAnswer = selectedOptions[q.id];
                    const isCorrect = userAnswer === q.correctOptionIndex;

                    return (
                      <div key={q.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                            userAnswer === undefined ? 'bg-gray-300' : isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-4">
                              <div className="text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: q.text }} />
                              <button 
                                onClick={() => alert('تمت الإضافة للمفضلة')}
                                className="text-gray-400 hover:text-amber-500 transition-colors p-2"
                                title="إضافة للمفضلة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                              </button>
                            </div>
                            <div className="space-y-2">
                              {q.options.map((opt, optIndex) => {
                                let bgClass = 'bg-gray-50 border-gray-200';
                                if (quiz.settings.showAnswers) {
                                  if (optIndex === q.correctOptionIndex) {
                                    bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                  } else if (optIndex === userAnswer && !isCorrect) {
                                    bgClass = 'bg-red-50 border-red-200 text-red-700';
                                  }
                                }
                                
                                return (
                                  <div key={optIndex} className={`p-3 rounded-lg border flex items-center gap-3 ${bgClass}`}>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      optIndex === q.correctOptionIndex ? 'border-emerald-500 bg-emerald-500' :
                                      optIndex === userAnswer ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                    }`}>
                                      {(optIndex === q.correctOptionIndex || optIndex === userAnswer) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {quiz.settings.showExplanations && q.explanation && (
                              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 mb-2 text-sm">شرح الإجابة:</h4>
                                <div className="text-indigo-800 text-sm" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Q&A Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">سؤال وجواب حول الاختبار</h3>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {user?.name?.charAt(0) || 'أ'}
                    </div>
                    <div className="flex-1">
                      <textarea 
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="هل لديك سؤال حول هذا الاختبار؟ اطرحه هنا..."
                      />
                      <div className="flex justify-end mt-2">
                        <button onClick={() => alert('تم إرسال سؤالك')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                          إرسال السؤال
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mock Q&A Thread */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      م
                    </div>
                    <div>
                      <div className="bg-gray-50 p-4 rounded-xl rounded-tr-none border border-gray-100">
                        <p className="text-sm font-bold text-gray-800 mb-1">محمد أحمد</p>
                        <p className="text-gray-600">في السؤال الثالث، لماذا لم نستخدم قانون المساحة بدلاً من المحيط؟</p>
                      </div>
                      <div className="mt-2 flex gap-4 ml-4">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs">
                          م
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl rounded-tr-none border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-800 mb-1">المعلم (أحمد)</p>
                          <p className="text-sm text-emerald-700">لأن المطلوب في السؤال هو إيجاد طول السياج الخارجي، والسياج يمثل المحيط وليس المساحة الداخلية.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
