import React, { useState, useMemo } from 'react';
import { BookOpen, RefreshCw, Check, X, RotateCcw, Frown } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';

export const FlashcardsManager: React.FC = () => {
    const { questions } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Get up to 10 random questions for today's review session
    const dailyFlashcards = useMemo(() => {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 10).map(q => ({
            id: q.id,
            question: q.text,
            answer: q.options[q.correctOptionIndex],
            explanation: q.explanation
        }));
    }, [questions]);

    const handleNext = () => {
        if (currentIndex < dailyFlashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            setCompleted(true);
        }
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setCompleted(false);
    };

    if (dailyFlashcards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 flex items-center justify-center rounded-full mb-6">
                    <Frown size={40} />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">لا توجد بطاقات للمراجعة</h2>
                <p className="text-slate-500 font-bold mb-8">عذراً، لم نجد أي أسئلة في بنك الأسئلة لإنشاء بطاقات لك.</p>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full mb-6">
                    <Check size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">أحسنت يا بطل!</h2>
                <p className="text-gray-500 font-bold mb-8">لقد راجعت جميع بطاقات التذكر لهذا اليوم بنظام التكرار المتباعد.</p>
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <RotateCcw size={20} />
                    مراجعة مرة أخرى
                </button>
            </div>
        );
    }

    const card = dailyFlashcards[currentIndex];

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">بطاقات التذكر المتباعد</h2>
                        <p className="text-sm font-bold text-gray-500 mt-1">راجع معلوماتك بذكاء لتبقى في الذاكرة طويلة المدى</p>
                    </div>
                </div>
                <div className="text-indigo-600 font-black bg-indigo-50 px-4 py-2 rounded-xl">
                    {currentIndex + 1} / {dailyFlashcards.length}
                </div>
            </div>

            <div className="relative perspective-1000">
                <div
                    className={`w-full h-80 transition-all duration-500 preserve-3d cursor-pointer relative ${
                        isFlipped ? 'rotate-y-180' : ''
                    }`}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front of card */}
                    <Card className={`absolute w-full h-full backface-hidden flex flex-col items-center justify-center p-8 text-center border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30`}>
                        <span className="absolute top-4 right-4 text-xs font-black text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full">السؤال</span>
                        <h3 className="text-3xl font-black text-gray-900 leading-relaxed line-clamp-4">{card.question}</h3>
                        <p className="absolute bottom-6 text-sm font-bold text-gray-400 flex items-center gap-2">
                            <RefreshCw size={16} />
                            انقر لقلب البطاقة
                        </p>
                    </Card>

                    {/* Back of card */}
                    <Card className={`absolute w-full h-full backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 text-center border-2 border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 overflow-y-auto`}>
                        <span className="absolute top-4 right-4 text-xs font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">الإجابة</span>
                        <h3 className="text-2xl font-bold text-gray-800 leading-relaxed mb-4">{card.answer}</h3>
                        {card.explanation && (
                            <div className="mt-4 p-4 bg-white/60 rounded-xl border border-emerald-50 text-sm font-bold text-gray-600 w-full">
                                {card.explanation}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {isFlipped && (
                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in pt-4">
                    <button
                        onClick={handleNext}
                        className="flex-1 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 px-6 py-4 rounded-2xl font-black flex justify-center items-center gap-2 transition-all"
                    >
                        <X size={24} />
                        صعبة (كررها قريباً)
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-4 rounded-2xl font-black flex justify-center items-center gap-2 shadow-sm transition-all"
                    >
                        <Check size={24} />
                        سهلة (تذكرتها)
                    </button>
                </div>
            )}
        </div>
    );
};

export default FlashcardsManager;
