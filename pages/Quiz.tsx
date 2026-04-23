
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Clock, CheckCircle, Camera, Mic, Lock, AlertCircle, PlayCircle, Heart, AlertTriangle, Gauge, ChevronRight, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { VideoModal } from '../components/VideoModal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useStore } from '../store/useStore';

const Quiz: React.FC = () => {
    const navigate = useNavigate();
    const { saveExamResult, toggleFavorite: toggleStoreFavorite, favorites: storeFavorites, recordQuestionAttempt, topics, subjects, sections, nestedSkills } = useStore();
    
    // States
    const [quizStarted, setQuizStarted] = useState(false);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
    
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answers, setAnswers] = useState<{[key: number]: number}>({}); // Store all answers
    const [showVideo, setShowVideo] = useState(false);
    
    // State for exit confirmation
    const [showExitDialog, setShowExitDialog] = useState(false);

    // Use global question bank
    const { questions: globalQuestionBank } = useStore();
    const allQuestions = globalQuestionBank;

    // Filter questions based on selected difficulty (Mock logic since globalQuestionBank doesn't have difficulty yet)
    // For now, just use all questions
    const questions = allQuestions;

    const toggleFavorite = (idx: number) => {
        const questionId = questions[idx].id.toString();
        toggleStoreFavorite(questionId);
    };

    // Load saved progress on mount
    useEffect(() => {
        const savedProgress = localStorage.getItem('quiz_progress');
        if (savedProgress) {
            const { currentQuestion: savedQ, answers: savedA } = JSON.parse(savedProgress);
            if (savedQ !== undefined) setCurrentQuestion(savedQ);
            if (savedA) setAnswers(savedA);
        }
    }, []);

    // Save progress effect
    useEffect(() => {
        if (quizStarted) {
            localStorage.setItem('quiz_progress', JSON.stringify({
                currentQuestion,
                answers
            }));
        }
    }, [currentQuestion, answers, quizStarted]);

    const startQuiz = () => {
        setQuizStarted(true);
    };

    useEffect(() => {
        let timer: any;
        if (quizStarted) {
            timer = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [quizStarted]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (quizStarted) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [quizStarted]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (index: number) => {
        setSelectedAnswer(index);
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: index
        }));
        
        const isCorrect = index === questions[currentQuestion].correctOptionIndex;
        recordQuestionAttempt({
            questionId: questions[currentQuestion].id.toString(),
            selectedOptionIndex: index,
            isCorrect,
            timeSpentSeconds: 0, // We could track this per question
            date: new Date().toISOString()
        });
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(curr => curr + 1);
            setSelectedAnswer(answers[currentQuestion + 1] ?? null);
            setShowVideo(false);
        } else {
            // Calculate results
            let correct = 0;
            let wrong = 0;
            let unanswered = 0;
            
            questions.forEach((q, idx) => {
                const ans = answers[idx];
                if (ans === undefined) {
                    unanswered++;
                } else if (ans === q.correctOptionIndex) {
                    correct++;
                } else {
                    wrong++;
                }
            });
            
            const score = Math.round((correct / questions.length) * 100);
            const skillStats: Record<string, { total: number; correct: number }> = {};
            questions.forEach((question, idx) => {
                const isCorrect = answers[idx] === question.correctOptionIndex;
                (question.skillIds || []).forEach((skillId) => {
                    if (!skillStats[skillId]) {
                        skillStats[skillId] = { total: 0, correct: 0 };
                    }
                    skillStats[skillId].total++;
                    if (isCorrect) {
                        skillStats[skillId].correct++;
                    }
                });
            });

            const allSkills = nestedSkills.flatMap(skill => [skill, ...skill.subSkills]);
            const skillsAnalysis = Object.entries(skillStats).map(([skillId, stats]) => {
                const topicSkill = topics.find(topic => topic.id === skillId);
                const nestedSkill = allSkills.find(skill => skill.id === skillId);
                const mastery = Math.round((stats.correct / stats.total) * 100);
                let status: 'weak' | 'average' | 'strong' = 'average';
                if (mastery < 50) status = 'weak';
                else if (mastery >= 80) status = 'strong';

                const sectionLabel = topicSkill?.sectionId
                    ? sections.find(section => section.id === topicSkill.sectionId)?.name
                    : topicSkill?.subjectId
                        ? subjects.find(subject => subject.id === topicSkill.subjectId)?.name
                        : ('subjectId' in (nestedSkill || {}) && nestedSkill?.subjectId
                            ? subjects.find(subject => subject.id === nestedSkill.subjectId)?.name
                            : undefined);

                return {
                    skillId,
                    pathId: topicSkill?.pathId,
                    subjectId: topicSkill?.subjectId || ('subjectId' in (nestedSkill || {}) ? nestedSkill?.subjectId : undefined),
                    sectionId: topicSkill?.sectionId,
                    skill: topicSkill?.title || nestedSkill?.name || 'مهارة غير معروفة',
                    mastery,
                    status,
                    recommendation: status === 'weak' ? 'بحاجة لمراجعة الدروس والتدريب على نفس المهارة' : (status === 'average' ? 'يمكن التحسين بالتدريب الموجه على نفس المهارة' : 'أداء ممتاز في هذه المهارة'),
                    section: sectionLabel
                };
            });

            const questionReview = questions.map((question, idx) => {
                const selectedOptionIndex = answers[idx];

                return {
                    questionId: question.id.toString(),
                    text: question.text,
                    options: question.options,
                    correctOptionIndex: question.correctOptionIndex,
                    selectedOptionIndex,
                    explanation: question.explanation,
                    videoUrl: question.videoUrl,
                    imageUrl: question.imageUrl,
                    isCorrect: selectedOptionIndex === question.correctOptionIndex
                };
            });
            
            saveExamResult({
                quizId: `quiz-${Date.now()}`,
                quizTitle: `اختبار نموذج 1 - ${difficulty}`,
                score,
                correctAnswers: correct,
                wrongAnswers: wrong,
                unanswered,
                timeSpent: formatTime(1200 - timeLeft),
                date: new Date().toISOString(),
                skillsAnalysis,
                totalQuestions: questions.length,
                questionReview
            });
            
            localStorage.removeItem('quiz_progress');
            navigate('/results');
        }
    };

    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(curr => curr - 1);
            setSelectedAnswer(answers[currentQuestion - 1] ?? null);
            setShowVideo(false);
        }
    };

    const handleExitAttempt = () => {
        if (quizStarted) {
            setShowExitDialog(true);
        } else {
            navigate('/dashboard');
        }
    };

    const handleSaveProgress = () => {
        localStorage.setItem('quiz_progress_save', JSON.stringify({
            currentQuestion,
            answers
        }));
        alert("تم حفظ تقدمك بنجاح!");
    };

    // 2. Difficulty Selection UI
    if (!quizStarted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Card className="max-w-2xl w-full p-8 space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">اختر مستوى الصعوبة</h2>
                        <p className="text-gray-500">حدد المستوى المناسب لبدء الاختبار</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setDifficulty('Easy')}
                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                                difficulty === 'Easy' 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                : 'border-gray-200 hover:border-emerald-200'
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${difficulty === 'Easy' ? 'bg-emerald-200' : 'bg-gray-100'}`}>
                                <CheckCircle size={32} />
                            </div>
                            <span className="font-bold text-lg">سهل</span>
                        </button>

                        <button 
                            onClick={() => setDifficulty('Medium')}
                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                                difficulty === 'Medium' 
                                ? 'border-amber-500 bg-amber-50 text-amber-700' 
                                : 'border-gray-200 hover:border-amber-200'
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${difficulty === 'Medium' ? 'bg-amber-200' : 'bg-gray-100'}`}>
                                <Gauge size={32} />
                            </div>
                            <span className="font-bold text-lg">متوسط</span>
                        </button>

                        <button 
                            onClick={() => setDifficulty('Hard')}
                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${
                                difficulty === 'Hard' 
                                ? 'border-red-500 bg-red-50 text-red-700' 
                                : 'border-gray-200 hover:border-red-200'
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${difficulty === 'Hard' ? 'bg-red-200' : 'bg-gray-100'}`}>
                                <AlertTriangle size={32} />
                            </div>
                            <span className="font-bold text-lg">صعب</span>
                        </button>
                    </div>

                    <button 
                        onClick={startQuiz}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        ابدأ الاختبار الآن
                        <ChevronRight size={24} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                    </button>
                </Card>
            </div>
        );
    }

    // 3. Actual Quiz UI
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Quiz Header */}
            <header className="bg-white border-b p-4 shadow-sm sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button className="text-gray-500 hover:text-gray-800 transition-colors" onClick={handleExitAttempt}>
                            <ArrowRight />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg">اختبار نموذج 1</h1>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                                difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                                difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                المستوى: {difficulty === 'Easy' ? 'سهل' : difficulty === 'Medium' ? 'متوسط' : 'صعب'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-secondary-50 text-secondary-700 px-3 py-1 rounded-lg font-mono font-bold">
                        <Clock size={18} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 max-w-3xl mx-auto w-full flex flex-col justify-center">
                
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>التقدم</span>
                        <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
                    </div>
                    <ProgressBar percentage={((currentQuestion + 1) / questions.length) * 100} showPercentage={false} color="secondary" />
                </div>

                {/* Progress Strip */}
                <div className="bg-amber-500 text-white py-2 px-4 rounded-t-lg flex justify-between items-center font-bold">
                    <span>وقف</span>
                    <span>السؤال {currentQuestion + 1} من {questions.length}</span>
                </div>

                <Card className="rounded-t-none rounded-b-xl p-6 min-h-[400px] flex flex-col">
                    {/* Question Header */}
                    <div className="flex justify-between mb-6">
                        <button 
                            onClick={() => toggleFavorite(currentQuestion)}
                            className={`${storeFavorites.includes(questions[currentQuestion].id) ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'} px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors`}
                        >
                            {storeFavorites.includes(questions[currentQuestion].id) ? <Trash2 size={18} /> : <Heart size={18} />}
                            {storeFavorites.includes(questions[currentQuestion].id) ? 'مسح من المفضلة' : 'إضافة إلى المفضلة'}
                        </button>

                        {/* Video Explanation Button */}
                        <button 
                            onClick={() => setShowVideo(true)}
                            disabled={!questions[currentQuestion].videoUrl}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm ${
                                questions[currentQuestion].videoUrl
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title={questions[currentQuestion].videoUrl ? "مشاهدة شرح الفيديو" : "لا يوجد شرح متوفر"}
                        >
                            <PlayCircle size={18} />
                            {questions[currentQuestion].videoUrl ? 'شرح الفيديو' : 'لا يوجد شرح'}
                        </button>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1">
                        <p className="text-lg font-medium text-gray-800 leading-loose mb-8 text-right">
                            ({currentQuestion + 1}) {questions[currentQuestion].text}
                        </p>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 dir-rtl">
                            {questions[currentQuestion].options.map((option, idx) => {
                                const isSelected = selectedAnswer === idx || answers[currentQuestion] === idx;
                                // Only show correct/incorrect immediate feedback if an answer is selected
                                let borderClass = 'border-gray-200 hover:border-gray-300 bg-white';
                                if (isSelected) {
                                    if (idx === questions[currentQuestion].correctOptionIndex) {
                                        borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-700';
                                    } else {
                                        borderClass = 'border-red-500 bg-red-50 text-red-700';
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(idx)}
                                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${borderClass}`}
                                    >
                                        <span className="font-bold text-lg">{option}</span>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            isSelected && idx === questions[currentQuestion].correctOptionIndex ? 'border-emerald-500 bg-emerald-500' : 
                                            isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                        }`}>
                                            {isSelected && idx === questions[currentQuestion].correctOptionIndex && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Immediate Explanation */}
                        {(selectedAnswer !== null || answers[currentQuestion] !== undefined) && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-2">الشرح:</h4>
                                <p className="text-blue-700 text-sm">
                                    الإجابة الصحيحة هي: {questions[currentQuestion].options[questions[currentQuestion].correctOptionIndex]}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                        <button 
                            onClick={handleSaveProgress}
                            className="px-4 py-2 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center gap-2 hover:bg-amber-200"
                        >
                            <Save size={18} />
                            <span className="hidden sm:inline">حفظ الإجابة</span>
                        </button>

                        <div className="flex gap-2">
                            <button 
                                onClick={handlePrev}
                                disabled={currentQuestion === 0}
                                className="px-6 py-3 rounded-lg bg-gray-200 text-gray-600 font-bold disabled:opacity-50"
                            >
                                السابق
                            </button>
                            <button 
                                onClick={handleNext}
                                className="px-6 py-3 rounded-lg bg-indigo-900 text-white font-bold flex items-center gap-2"
                            >
                                {currentQuestion === questions.length - 1 ? 'إنهاء الاختبار' : 'التالي'}
                                <ArrowLeft size={20} />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Question Palette */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {Array.from({ length: questions.length }, (_, i) => (
                        <button 
                            key={i}
                            onClick={() => {
                                setCurrentQuestion(i);
                                setSelectedAnswer(answers[i] ?? null);
                                setShowVideo(false);
                            }}
                            className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                currentQuestion === i 
                                ? 'bg-secondary-500 text-white shadow-md transform scale-105' 
                                : answers[i] !== undefined 
                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </main>

            {/* Video Modal */}
            {showVideo && questions[currentQuestion].videoUrl && (
                <VideoModal 
                    videoUrl={questions[currentQuestion].videoUrl} 
                    title="شرح السؤال بالفيديو" 
                    onClose={() => setShowVideo(false)} 
                />
            )}

            {/* Exit Confirmation Modal */}
            {showExitDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <Card className="max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-scale-up">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-800 mb-2">هل تريد الخروج؟</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                الاختبار لا يزال سارياً. الخروج الآن قد يؤدي إلى فقدان تقدمك الحالي.
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                            >
                                خروج وإنهاء
                            </button>
                            <button 
                                onClick={() => setShowExitDialog(false)}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Quiz;
