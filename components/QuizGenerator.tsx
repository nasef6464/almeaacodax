
import React, { useState } from 'react';
import { generateQuizQuestion } from '../services/geminiService';
import { Card } from './ui/Card';
import { Sparkles, Check, RefreshCw, Plus, Trash2, Save, FileText } from 'lucide-react';

interface GeneratedQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export const QuizGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [generatedQuestion, setGeneratedQuestion] = useState<GeneratedQuestion | null>(null);
    const [loading, setLoading] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<GeneratedQuestion[]>([]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        const result = await generateQuizQuestion(topic);
        setGeneratedQuestion(result);
        setLoading(false);
    };

    const handleAddToQuiz = () => {
        if (generatedQuestion) {
            setQuizQuestions([...quizQuestions, generatedQuestion]);
            setGeneratedQuestion(null);
            setTopic('');
        }
    };

    const handleDeleteQuestion = (index: number) => {
        const newQuestions = [...quizQuestions];
        newQuestions.splice(index, 1);
        setQuizQuestions(newQuestions);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-indigo-800 mb-2">مولد الأسئلة الذكي</h1>
                <p className="text-gray-500">ابنِ اختبارك بسرعة باستخدام الذكاء الاصطناعي</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Generator Section */}
                <div className="space-y-6">
                    <Card className="p-6 border-t-4 border-t-indigo-500">
                        <h2 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" size={24} />
                            توليد سؤال جديد
                        </h2>
                        
                        <div className="flex gap-3 mb-6">
                            <input 
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="الموضوع (مثال: الجاذبية، الأدب الأموي...)"
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                            />
                            <button 
                                onClick={handleGenerate}
                                disabled={loading || !topic.trim()}
                                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                            >
                                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                <span>توليد</span>
                            </button>
                        </div>

                        {generatedQuestion && (
                            <div className="animate-scale-up space-y-4">
                                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-lg text-gray-800 leading-snug">{generatedQuestion.question}</h3>
                                        <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-1 rounded">AI</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {generatedQuestion.options.map((opt: string, idx: number) => (
                                            <div 
                                                key={idx}
                                                className={`p-3 rounded-lg border text-sm flex items-center justify-between transition-colors ${
                                                    idx === generatedQuestion.correctIndex 
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                                                    : 'bg-white border-gray-200 text-gray-600'
                                                }`}
                                            >
                                                <span>{opt}</span>
                                                {idx === generatedQuestion.correctIndex && <Check size={18} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 p-4 rounded-xl text-sm">
                                    <span className="font-bold text-indigo-600 mb-1 block flex items-center gap-1">
                                        <FileText size={14} /> الشرح:
                                    </span>
                                    <p className="text-gray-600 leading-relaxed">{generatedQuestion.explanation}</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleAddToQuiz}
                                        className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform"
                                    >
                                        <Plus size={20} />
                                        إضافة للاختبار
                                    </button>
                                    <button 
                                        onClick={() => setGeneratedQuestion(null)}
                                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Quiz Preview Section */}
                <div className="space-y-6">
                    <Card className="p-6 h-full bg-gray-50 border-2 border-dashed border-gray-200 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <FileText size={24} className="text-gray-500" />
                                مسودة الاختبار ({quizQuestions.length})
                            </h2>
                            {quizQuestions.length > 0 && (
                                <button 
                                    className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                    onClick={() => alert('سيتم حفظ الاختبار قريباً!')}
                                >
                                    <Save size={16} /> 
                                    حفظ المسودة
                                </button>
                            )}
                        </div>

                        {quizQuestions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Plus size={40} className="opacity-30" />
                                </div>
                                <p className="font-bold">لم تتم إضافة أسئلة بعد</p>
                                <p className="text-sm">استخدم المولد لإضافة أسئلة إلى القائمة</p>
                            </div>
                        ) : (
                            <div className="space-y-4 overflow-y-auto pr-2 max-h-[600px]">
                                {quizQuestions.map((q, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm group relative hover:border-indigo-200 transition-colors">
                                        <button 
                                            onClick={() => handleDeleteQuestion(idx)}
                                            className="absolute top-3 left-3 text-gray-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full"
                                            title="حذف السؤال"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="flex gap-4">
                                            <span className="bg-indigo-50 text-indigo-600 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shrink-0 border border-indigo-100">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-base mb-2">{q.question}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 font-medium">
                                                        الإجابة: {q.options[q.correctIndex]}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                        {q.options.length} خيارات
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};
