
import React, { useState } from 'react';
import { Calendar, CheckCircle, Circle, Clock, ChevronRight, Map, Star, Target, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ui/ProgressBar';

const Plan: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

    const dailyTasks = [
        { id: 1, time: '04:00 م', title: 'مراجعة الكسور العشرية', type: 'lesson', duration: '45 دقيقة', status: 'completed' },
        { id: 2, time: '05:00 م', title: 'حل تمارين الجبر', type: 'quiz', duration: '30 دقيقة', status: 'in-progress' },
        { id: 3, time: '06:30 م', title: 'مشاهدة شرح الهندسة', type: 'video', duration: '20 دقيقة', status: 'pending' },
    ];

    const weeklyGoals = [
        { id: 1, title: 'إتمام وحدة الجبر', progress: 75, total: 12, completed: 9 },
        { id: 2, title: 'حل 50 سؤال تحصيلي', progress: 40, total: 50, completed: 20 },
        { id: 3, title: 'مراجعة الفيزياء (ميكانيكا)', progress: 10, total: 5, completed: 0.5 },
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex items-center gap-4">
                <Link to="/" className="text-gray-500 hover:text-gray-700">
                    <ArrowRight size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-indigo-800">خطتي الدراسية</h1>
                    <p className="text-sm text-gray-500">تابع تقدمك وحقق أهدافك اليومية</p>
                </div>
            </header>

            {/* Goal Overview Card */}
            <Card className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg border-0">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold mb-1">هدفك الأسبوعي</h2>
                        <p className="text-indigo-100 text-sm opacity-90">أنت على بعد خطوات بسيطة من تحقيق هدفك!</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <Target size={24} className="text-white" />
                    </div>
                </div>

                <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold">85%</span>
                    <span className="text-indigo-200 mb-1">من الخطة المنجزة</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
            </Card>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    الخطة اليومية
                </button>
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    الأهداف الأسبوعية
                </button>
            </div>

            {/* Content */}
            {activeTab === 'daily' ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                        <Calendar size={20} className="text-indigo-500" />
                        <h3>مهام اليوم (السبت، 25 يناير)</h3>
                    </div>

                    <div className="relative border-r-2 border-indigo-100 mr-3 space-y-6">
                        {dailyTasks.map((task, idx) => (
                            <div key={task.id} className="relative pr-8">
                                {/* Timeline Dot */}
                                <div className={`absolute -right-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                    task.status === 'completed' ? 'bg-emerald-500' : 
                                    task.status === 'in-progress' ? 'bg-amber-500' : 'bg-gray-300'
                                }`}></div>

                                <Card className={`p-4 transition-all hover:shadow-md ${
                                    task.status === 'completed' ? 'bg-gray-50 opacity-75' : 'bg-white'
                                }`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                    {task.time}
                                                </span>
                                                {task.status === 'in-progress' && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded animate-pulse">
                                                        جاري التنفيذ
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className={`font-bold text-lg ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                                <Clock size={14} />
                                                <span>{task.duration}</span>
                                                <span className="mx-1">•</span>
                                                <span>{task.type === 'lesson' ? 'درس تفاعلي' : task.type === 'quiz' ? 'اختبار قصير' : 'فيديو'}</span>
                                            </div>
                                        </div>
                                        
                                        <button className={`p-2 rounded-full ${
                                            task.status === 'completed' 
                                                ? 'text-emerald-500 bg-emerald-50' 
                                                : 'text-gray-300 hover:bg-gray-100'
                                        }`}>
                                            {task.status === 'completed' ? <CheckCircle size={24} /> : <Circle size={24} />}
                                        </button>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {weeklyGoals.map((goal) => (
                        <Card key={goal.id} className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Star size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{goal.title}</h4>
                                        <p className="text-xs text-gray-500">{goal.completed} من {goal.total} منجز</p>
                                    </div>
                                </div>
                                <span className="font-bold text-indigo-600">{goal.progress}%</span>
                            </div>
                            <ProgressBar percentage={goal.progress} showPercentage={false} color="primary" />
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Plan;
