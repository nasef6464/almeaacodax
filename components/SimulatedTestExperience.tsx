import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, ChevronRight, Lock, Unlock, PlayCircle, AlertTriangle, ArrowRight, ArrowLeft, Star, FileText, BarChart3, History, Eye, Trash2, CheckCircle2, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { DetailedAnalysisModal } from './DetailedAnalysisModal';
import { VideoModal } from './VideoModal';
import { Link } from 'react-router-dom';

interface Test {
    id: string | number;
    title: string;
    duration: string;
    questions: number;
    type: string;
    level: string;
    isLocked: boolean;
}

interface SimulatedTestExperienceProps {
    tests: Test[];
    mode?: 'test' | 'bank';
    onLockedClick?: (test: Test) => void;
    onStartTest?: (test: Test) => void;
}

export const SimulatedTestExperience: React.FC<SimulatedTestExperienceProps> = ({ tests, mode = 'test', onLockedClick, onStartTest }) => {
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [testState, setTestState] = useState<'list' | 'popup' | 'pre-test' | 'in-progress' | 'confirm-submit' | 'result'>('list');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [resultViewMode, setResultViewMode] = useState<'summary' | 'review'>('summary');
    const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [videoData, setVideoData] = useState<{ url: string; title: string } | null>(null);
    const [favorites, setFavorites] = useState<Record<number, boolean>>({});

    const toggleFavorite = (idx: number) => {
        setFavorites(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Mock Questions
    const mockQuestions = Array.from({ length: selectedTest?.questions || 30 }).map((_, i) => ({
        id: i + 1,
        text: `السؤال رقم ${i + 1}: أوجد مجموع الحاصلين على مجموع جيد وأقل بناءً على الجدول المرفق.`,
        options: ['أ) 20', 'ب) 32', 'ج) 40', 'د) 30'],
        correctAnswer: 'ب) 32',
        image: i === 0 ? "https://picsum.photos/seed/math1/800/400" : null
    }));

    useEffect(() => {
        let timer: any;
        if (testState === 'in-progress' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && testState === 'in-progress') {
            setTestState('result');
        }
        return () => clearInterval(timer);
    }, [testState, timeLeft]);

    const handleTestClick = (test: Test) => {
        setSelectedTest(test);
        if (test.isLocked) {
            if (onLockedClick) {
                onLockedClick(test);
            } else {
                setTestState('popup');
            }
        } else {
            if (onStartTest) {
                onStartTest(test);
                return;
            }
            setTestState('pre-test');
        }
    };

    const startTest = () => {
        const durationMinutes = parseInt(selectedTest?.duration || '60');
        setTimeLeft(durationMinutes * 60);
        setTestState('in-progress');
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview({});
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (option: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
    };

    const toggleReview = () => {
        setMarkedForReview(prev => ({ ...prev, [currentQuestionIndex]: !prev[currentQuestionIndex] }));
    };

    const calculateScore = () => {
        let correct = 0;
        mockQuestions.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) correct++;
        });
        return {
            correct,
            incorrect: mockQuestions.length - correct,
            percentage: Math.round((correct / mockQuestions.length) * 100)
        };
    };

    if (testState === 'list') {
        return (
            <div className="space-y-4 max-w-4xl mx-auto">
                {tests.map((test) => (
                    <div key={test.id} onClick={() => handleTestClick(test)} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${test.isLocked ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                {test.isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${test.type === 'trial' ? 'bg-green-100 text-green-700' : test.type === 'comprehensive' ? 'bg-purple-100 text-purple-700' : test.type === 'bank' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {test.type === 'trial' ? 'تجريبي' : test.type === 'comprehensive' ? 'شامل' : test.type === 'bank' ? 'بنك أسئلة' : 'محاكي'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {test.duration}</span>
                                    <span className="flex items-center gap-1"><CheckCircle size={14} /> {test.questions} سؤال</span>
                                    <span className="flex items-center gap-1"><Star size={14} /> {test.level}</span>
                                </div>
                            </div>
                        </div>
                        <button className={`px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shrink-0 ${test.isLocked ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                            {test.isLocked ? 'مغلق' : mode === 'bank' ? 'تصفح الأسئلة' : 'ابدأ الاختبار'}
                            {!test.isLocked && <ChevronRight size={18} className="transform rotate-180" />}
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    if (testState === 'popup') {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">هذا {mode === 'bank' ? 'البنك' : 'الاختبار'} ضمن الباقة المدفوعة</h2>
                    <p className="text-gray-600 mb-8">اشترك الآن لتتمكن من فتح جميع {mode === 'bank' ? 'بنوك الأسئلة' : 'الاختبارات المحاكية'} والتدرب بشكل احترافي.</p>
                    
                    <div className="space-y-3">
                        <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2">
                            <Star size={18} className="fill-current" />
                            اشترك في الباقة الكاملة ⭐
                        </button>
                        <button className="w-full bg-white text-indigo-600 border-2 border-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                            اشترك في باقة الاختبارات فقط
                        </button>
                        <button onClick={() => setTestState('list')} className="w-full text-gray-500 py-2 font-medium hover:text-gray-700 transition-colors mt-2">
                            تراجع
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (testState === 'pre-test') {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="p-8 text-center">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 mb-4">{selectedTest?.title}</h2>
                    
                    <div className="flex justify-center gap-8 mb-8">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{selectedTest?.questions}</div>
                            <div className="text-sm text-gray-500">سؤال</div>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{selectedTest?.duration}</div>
                            <div className="text-sm text-gray-500">الوقت المخصص</div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right mb-8">
                        <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                            <AlertTriangle size={18} /> تعليمات هامة:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                            <li>تأكد من استقرار اتصالك بالإنترنت.</li>
                            <li>لا تقم بتحديث الصفحة أثناء الاختبار.</li>
                            <li>بمجرد انتهاء الوقت سيتم تسليم الاختبار تلقائياً.</li>
                        </ul>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={startTest} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                            {mode === 'bank' ? 'ابدأ التصفح' : 'ابدأ الاختبار'} <PlayCircle size={20} />
                        </button>
                        <button onClick={() => setTestState('list')} className="px-6 py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            إلغاء
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    if (testState === 'in-progress') {
        const question = mockQuestions[currentQuestionIndex];
        const answeredCount = Object.keys(answers).length;
        const progress = (answeredCount / mockQuestions.length) * 100;

        return (
            <div className="max-w-4xl mx-auto">
                {/* Top Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setTestState('confirm-submit')} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors">
                            إنهاء {mode === 'bank' ? 'التصفح' : 'الاختبار'}
                        </button>
                        <button onClick={toggleReview} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${markedForReview[currentQuestionIndex] ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            <Star size={16} className={markedForReview[currentQuestionIndex] ? 'fill-current' : ''} />
                            {markedForReview[currentQuestionIndex] ? 'محدد للمراجعة' : 'إضافة للمفضلة'}
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-mono font-bold text-lg">
                            <Clock size={20} />
                            {formatTime(timeLeft)}
                        </div>
                        <div className="font-bold text-gray-700">
                            السؤال {currentQuestionIndex + 1} من {mockQuestions.length}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <ProgressBar percentage={progress} label={`تم حل ${answeredCount} من ${mockQuestions.length}`} color="primary" />
                </div>

                {/* Question Area */}
                <Card className="p-8 mb-6 min-h-[400px] flex flex-col">
                    <h3 className="text-xl font-bold text-gray-800 mb-8 leading-relaxed">
                        {question.text}
                    </h3>
                    
                    {/* Placeholder for Image if needed */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl h-48 mb-8 flex items-center justify-center text-gray-400">
                        [صورة توضيحية للسؤال إن وجدت]
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-auto">
                        {question.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                className={`w-full text-right p-4 rounded-xl border-2 transition-all font-bold text-base flex items-center gap-3 ${
                                    answers[currentQuestionIndex] === option 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    answers[currentQuestionIndex] === option ? 'border-indigo-600' : 'border-gray-300'
                                }`}>
                                    {answers[currentQuestionIndex] === option && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                                </div>
                                {option}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                    <button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowRight size={20} /> السابق
                    </button>
                    
                    <div className="flex gap-1 overflow-x-auto max-w-[50%] px-2">
                        {mockQuestions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`w-8 h-8 rounded-md shrink-0 text-xs font-bold flex items-center justify-center transition-colors ${
                                    currentQuestionIndex === idx ? 'bg-indigo-600 text-white' :
                                    markedForReview[idx] ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                                    answers[idx] ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                                    'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => {
                            if (currentQuestionIndex === mockQuestions.length - 1) {
                                setTestState('confirm-submit');
                            } else {
                                setCurrentQuestionIndex(prev => Math.min(mockQuestions.length - 1, prev + 1));
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        {currentQuestionIndex === mockQuestions.length - 1 ? 'إنهاء' : 'التالي'} <ArrowLeft size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (testState === 'confirm-submit') {
        const answeredCount = Object.keys(answers).length;
        const unansweredCount = mockQuestions.length - answeredCount;

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">هل أنت متأكد من إنهاء {mode === 'bank' ? 'التصفح' : 'الاختبار'}؟</h2>
                    
                    {unansweredCount > 0 && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm font-bold">
                            يوجد {unansweredCount} أسئلة لم تقم بالإجابة عليها!
                        </div>
                    )}
                    
                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setTestState('result')} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md">
                            نعم، قم بالإنهاء
                        </button>
                        <button onClick={() => setTestState('in-progress')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            العودة {mode === 'bank' ? 'للتصفح' : 'للإختبار'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (testState === 'result') {
        const score = calculateScore();
        const durationMinutes = parseInt(selectedTest?.duration || '60');
        const timeUsed = (durationMinutes * 60) - timeLeft;

        if (resultViewMode === 'review') {
            const q = mockQuestions[currentReviewIdx];
            return (
                <div className="max-w-4xl mx-auto animate-fade-in pb-20">
                    <header className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setResultViewMode('summary')} className="text-gray-500 hover:text-indigo-600 transition-colors">
                                <ArrowRight />
                            </button>
                            <h1 className="text-xl font-bold">مراجعة الحلول</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-amber-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold">
                                السؤال {currentReviewIdx + 1} من {mockQuestions.length}
                            </span>
                            <button 
                                onClick={() => toggleFavorite(currentReviewIdx)}
                                className={`${favorites[currentReviewIdx] ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors`}
                            >
                                {favorites[currentReviewIdx] ? <Trash2 size={16} /> : <Star size={16} />}
                                {favorites[currentReviewIdx] ? 'مسح من المفضلة' : 'إضافة للمفضلة'}
                            </button>
                        </div>
                    </header>

                    <Card className="p-0 overflow-hidden border-2 border-gray-100 shadow-xl">
                        <div className="p-8 bg-white">
                            <div className="bg-gray-50 rounded-2xl p-8 mb-8 flex flex-col items-center justify-center border border-gray-100 min-h-[250px]">
                                {q.image ? (
                                    <img src={q.image} alt="Question" className="max-h-64 object-contain mb-6" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="text-center mb-6">
                                        <FileText size={48} className="text-gray-200 mx-auto mb-2" />
                                        <span className="text-sm text-gray-400 font-bold">[ صورة توضيحية للسؤال ]</span>
                                    </div>
                                )}
                                <p className="text-xl font-bold text-gray-800 text-center leading-relaxed px-4">
                                    {q.text}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                {['A', 'B', 'C', 'D'].map((label, i) => {
                                    const isCorrect = q.options[i] === q.correctAnswer;
                                    const isUser = answers[currentReviewIdx] === q.options[i];
                                    
                                    let borderClass = "border-gray-200 text-gray-400";
                                    let bgClass = "bg-white";
                                    
                                    if (showExplanation) {
                                        if (isCorrect) {
                                            borderClass = "border-emerald-500 text-emerald-600";
                                            bgClass = "bg-emerald-50";
                                        } else if (isUser && !isCorrect) {
                                            borderClass = "border-red-500 text-red-600";
                                            bgClass = "bg-red-50";
                                        }
                                    }

                                    return (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-black transition-all ${borderClass} ${bgClass}`}>
                                                {label}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400">{q.options[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setVideoData({ url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: `شرح السؤال ${currentReviewIdx + 1}` })}
                                    className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                                >
                                    <PlayCircle size={20} />
                                    شرح الفيديو
                                </button>
                                <button 
                                    onClick={() => setShowExplanation(!showExplanation)}
                                    className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
                                >
                                    <Eye size={20} />
                                    {showExplanation ? 'إخفاء الحل' : 'إظهار الحل'}
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        setCurrentReviewIdx(prev => Math.max(0, prev - 1));
                                        setShowExplanation(false);
                                    }}
                                    disabled={currentReviewIdx === 0}
                                    className="bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all"
                                >
                                    السابق
                                </button>
                                <button 
                                    onClick={() => {
                                        if (currentReviewIdx < mockQuestions.length - 1) {
                                            setCurrentReviewIdx(prev => prev + 1);
                                            setShowExplanation(false);
                                        } else {
                                            setResultViewMode('summary');
                                        }
                                    }}
                                    className="bg-slate-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                                >
                                    {currentReviewIdx === mockQuestions.length - 1 ? 'إنهاء المراجعة' : 'التالي'}
                                    <ChevronRightIcon size={20} className="transform rotate-180" />
                                </button>
                            </div>
                        </div>
                    </Card>

                    {showExplanation && (
                        <div className="animate-slide-up mt-6">
                            <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/30 text-right">
                                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={20} />
                                    توضيح الحل الصحيح:
                                </h4>
                                <p className="text-gray-700 leading-relaxed font-medium">
                                    هذا شرح افتراضي للحل الصحيح للسؤال رقم {currentReviewIdx + 1}. يتم توضيح الخطوات المنطقية للوصول للنتيجة النهائية.
                                </p>
                            </Card>
                        </div>
                    )}

                    {videoData && (
                        <VideoModal 
                            videoUrl={videoData.url} 
                            title={videoData.title} 
                            onClose={() => setVideoData(null)} 
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="max-w-3xl mx-auto animate-fade-in">
                <Card className="p-8 text-center mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
                    
                    <div className="flex justify-between items-center mb-6">
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold">
                            المحاولة رقم 1
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">{mode === 'bank' ? 'نتيجة التصفح' : 'نتيجة الاختبار'}</h2>
                    </div>
                    
                    <p className="text-gray-500 mb-8">{selectedTest?.title}</p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
                        <div className="relative">
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                                <circle 
                                    cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                    strokeDasharray={440} 
                                    strokeDashoffset={440 - (440 * score.percentage) / 100}
                                    className={`${score.percentage >= 80 ? 'text-emerald-500' : score.percentage >= 60 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-gray-800">{score.percentage}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-right">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="text-emerald-600 text-sm font-bold mb-1">إجابات صحيحة</div>
                                <div className="text-2xl font-black text-emerald-700">{score.correct}</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <div className="text-red-600 text-sm font-bold mb-1">إجابات خاطئة</div>
                                <div className="text-2xl font-black text-red-700">{score.incorrect}</div>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 col-span-2">
                                <div className="text-indigo-600 text-sm font-bold mb-1">الوقت المستغرق</div>
                                <div className="text-xl font-bold text-indigo-700">{formatTime(timeUsed)} من {selectedTest?.duration}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-8">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setResultViewMode('review')}
                                className="bg-emerald-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-100"
                            >
                                <CheckCircle size={20} /> مراجعة الحلول
                            </button>
                            <button 
                                onClick={() => setIsAnalysisOpen(true)}
                                className="bg-indigo-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-indigo-100"
                            >
                                <BarChart3 size={20} /> تحليل مفصل بالدرجات
                            </button>
                        </div>
                        <button className="bg-white border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-50 transition-colors">
                            <History size={20} /> محاولاتك السابقة
                        </button>
                    </div>

                    <DetailedAnalysisModal 
                        isOpen={isAnalysisOpen} 
                        onClose={() => setIsAnalysisOpen(false)} 
                        mode={mode}
                    />

                    <div className="bg-gray-50 rounded-xl p-6 text-right mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Star className="text-amber-500" /> تحليل الأداء السريع
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-emerald-600 mb-2">نقاط القوة:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    <li>العمليات الحسابية الأساسية</li>
                                    <li>إدارة الوقت في القسم الأول</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-red-600 mb-2">تحتاج تحسين:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    <li>أسئلة الهندسة الفراغية</li>
                                    <li>التركيز في الأسئلة المقالية الطويلة</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-right relative overflow-hidden mb-8">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">تحسين مستواك 🚀</h3>
                            <p className="text-indigo-100 mb-4 text-sm">بناءً على نتيجتك، نقترح عليك التالي لرفع درجتك:</p>
                            <div className="flex flex-wrap gap-3">
                                <Link to="/qudrat/quant?tab=skills" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors">
                                    مراجعة مهارة الهندسة
                                </Link>
                                <Link to="/qudrat/quant?tab=banks" className="bg-indigo-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-900 transition-colors">
                                    حل بنك أسئلة الجبر
                                </Link>
                            </div>
                        </div>
                        <Lock className="absolute left-[-20px] top-[-20px] w-40 h-40 text-white opacity-10 transform -rotate-12" />
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button onClick={startTest} className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
                            <PlayCircle size={18} /> أعد الاختبار
                        </button>
                        <button onClick={() => setTestState('list')} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            العودة للقائمة
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return null;
};
