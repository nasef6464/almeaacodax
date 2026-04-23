
import React, { useMemo, useState } from 'react';
import { Course } from '../types';
import { 
    PlayCircle, BookOpen, Clock, Star, User, 
    ChevronRight, Share2, Heart, BarChart, 
    CheckCircle, List, Info, FileText, Download,
    Eye, MessageSquare, Send, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SimulatedTestExperience } from './SimulatedTestExperience';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface CourseOverviewProps {
    course: Course;
    onContinue: () => void;
}

type TabType = 'description' | 'syllabus' | 'tests' | 'qa' | 'files';

export const CourseOverview: React.FC<CourseOverviewProps> = ({ course, onContinue }) => {
    const [activeTab, setActiveTab] = useState<TabType>('syllabus');
    const [newQuestion, setNewQuestion] = useState('');
    const { enrolledCourses, enrollCourse, completedLessons, quizzes } = useStore();
    const navigate = useNavigate();

    const isEnrolled = enrolledCourses.includes(course.id);
    
    // Calculate real progress
    const totalLessons = course.modules?.reduce((acc, mod) => acc + mod.lessons.length, 0) || 1;
    const completedCount = course.modules?.reduce((acc, mod) => 
        acc + mod.lessons.filter(l => completedLessons.includes(l.id)).length, 0) || 0;
    const progress = Math.round((completedCount / totalLessons) * 100);

    const relatedTests = useMemo(() => {
        const courseSkillIds = new Set(course.skills || []);

        return quizzes
            .filter((quiz) => {
                if (quiz.isPublished === false || quiz.type === 'bank') {
                    return false;
                }

                const sameSubject = quiz.subjectId && course.subjectId && quiz.subjectId === course.subjectId;
                const samePath = quiz.pathId && course.pathId && quiz.pathId === course.pathId;
                const hasSharedSkill = (quiz.skillIds || []).some((skillId) => courseSkillIds.has(skillId));

                return Boolean((sameSubject && samePath) || hasSharedSkill);
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 6)
            .map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                duration: `${quiz.settings.timeLimit || 30} دقيقة`,
                questions: quiz.questionIds.length,
                type: quiz.mode === 'central' ? 'comprehensive' : quiz.mode === 'saher' ? 'simulated' : 'trial',
                level: quiz.mode === 'central' ? 'مركزي' : quiz.mode === 'saher' ? 'ساهر' : 'تدريبي',
                isLocked: false,
            }));
    }, [course.pathId, course.skills, course.subjectId, quizzes]);

    const handleEnroll = () => {
        enrollCourse(course.id);
        // Optionally show a success message or redirect
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'description':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <h3 className="text-xl font-black text-gray-900">حول هذه الدورة</h3>
                        <p className="text-gray-600 leading-relaxed">
                            {course.description}
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 pt-4">
                            {course.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            case 'syllabus':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {course.modules?.map((module, mIdx) => (
                            <div key={module.id} className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-800 font-black">
                                    <ChevronRight size={18} className="text-gray-400" />
                                    <span>{module.title}</span>
                                </div>
                                <div className="space-y-2">
                                    {module.lessons.map((lesson, lIdx) => {
                                        const isCompleted = completedLessons.includes(lesson.id);
                                        return (
                                        <div 
                                            key={lesson.id} 
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group cursor-pointer"
                                            onClick={onContinue}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-gray-400 w-4">{lIdx + 1}</span>
                                                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm ${lesson.type === 'quiz' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                    {lesson.type === 'quiz' ? <BarChart size={16} /> : <PlayCircle size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700">{lesson.title}</p>
                                                    <p className="text-[10px] text-gray-400">{lesson.type === 'quiz' ? 'اختبار محاكي' : 'درس فيديو'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-gray-400">{lesson.duration}</span>
                                                {isCompleted ? (
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-gray-200"></div>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                );
            case 'tests':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {relatedTests.length > 0 ? (
                            <SimulatedTestExperience
                                tests={relatedTests}
                                onStartTest={(test) => navigate(`/quiz/${test.id}`)}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <BarChart size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400">لا توجد اختبارات مرتبطة بهذه الدورة بعد.</p>
                            </div>
                        )}
                    </motion.div>
                );
            case 'qa':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex gap-4 mb-8">
                            <input 
                                type="text" 
                                placeholder="اسأل سؤالاً..." 
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                            />
                            <button className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors">
                                <Send size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {course.qa?.map((item) => (
                                <div key={item.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <HelpCircle size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-900 text-sm">{item.user}</span>
                                                <span className="text-[10px] text-gray-400">{item.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 font-bold mb-4">{item.question}</p>
                                            
                                            {item.answer && (
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 mb-1">رد المدرس</p>
                                                        <p className="text-xs text-gray-600 leading-relaxed">{item.answer}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!course.qa || course.qa.length === 0) && (
                                <div className="text-center py-12">
                                    <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400">لا توجد أسئلة بعد. كن أول من يسأل!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            case 'files':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid md:grid-cols-2 gap-4"
                    >
                        {course.files?.map((file) => (
                            <div key={file.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{file.title}</p>
                                        <p className="text-[10px] text-gray-400">{file.size} • PDF</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                        <Eye size={18} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!course.files || course.files.length === 0) && (
                            <div className="col-span-2 text-center py-12">
                                <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400">لا توجد ملفات متاحة لهذه الدورة حالياً.</p>
                            </div>
                        )}
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20" dir="rtl">
            {/* Hero Background Strip */}
            <div className="absolute top-0 left-0 right-0 h-[300px] md:h-[380px] bg-[#0f172a] z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-blue-600/5 blur-3xl rounded-full -ml-10 -mb-10"></div>
            </div>

            {/* Main Layout Grid */}
            <div className="max-w-7xl mx-auto px-4 relative z-10 pt-8 md:pt-16">
                <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">
                    
                    {/* Left Column: Info & Content */}
                    <div className="lg:col-span-2 space-y-8 md:space-y-12">
                        {/* Hero Info */}
                        <div className="text-white">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">جديد</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black mb-6 leading-tight text-right">
                                {course.title}
                            </h1>
                            
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                        <User size={20} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">مدرس</p>
                                        <p className="font-bold">{course.instructor}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <BookOpen size={20} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">فئة</p>
                                        <p className="font-bold">{course.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <BarChart size={20} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">طلاب مسجل</p>
                                        <p className="font-bold">{course.studentCount || 455}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Tabs */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex border-b border-gray-100">
                                <button 
                                    onClick={() => setActiveTab('description')}
                                    className={`px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'description' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    وصف
                                </button>
                                <button 
                                    onClick={() => setActiveTab('syllabus')}
                                    className={`px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'syllabus' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    المحتوى
                                </button>
                                <button 
                                    onClick={() => setActiveTab('tests')}
                                    className={`px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'tests' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    الاختبارات
                                </button>
                                <button 
                                    onClick={() => setActiveTab('qa')}
                                    className={`px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'qa' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    سؤال وجواب
                                </button>
                                <button 
                                    onClick={() => setActiveTab('files')}
                                    className={`px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'files' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    ملفات الدورة
                                </button>
                            </div>

                            <div className="p-6 md:p-8">
                                <AnimatePresence mode="wait">
                                    {renderTabContent()}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Progress Card */}
                    <div className="lg:sticky lg:top-24 z-30">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden text-gray-900 border border-gray-100">
                            <div className="relative aspect-video">
                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20"></div>
                            </div>
                            <div className="p-6">
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                        <span>الدرجة: {progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-1000" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {isEnrolled ? (
                                    <button 
                                        onClick={onContinue}
                                        className="w-full bg-[#1e293b] text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-lg mb-4 flex items-center justify-center gap-2"
                                    >
                                        استمر
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleEnroll}
                                        className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-all shadow-lg mb-4 flex items-center justify-center gap-2"
                                    >
                                        انضم للدورة الآن
                                    </button>
                                )}

                                <div className="flex gap-4">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                                        <Heart size={14} /> المفضلة
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                                        <Share2 size={14} /> مشاركة
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                                <h4 className="font-bold text-gray-800 mb-4 text-sm">تفاصيل الدورة</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Clock size={14} />
                                            <span>المدة</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{course.weeksCount || 6} اشهر</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BarChart size={14} />
                                            <span>محاضرات</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{course.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 42}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <PlayCircle size={14} />
                                            <span>فيديو</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{course.duration} ساعات</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
