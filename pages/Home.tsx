import React from 'react';
import { schedule, courses, skillsData, currentUser } from '../services/mockData';
import { Clock, TrendingUp, AlertTriangle, Zap, FileText, PieChart, Heart, Map, HelpCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Link } from 'react-router-dom';
import { SmartLearningPath } from '../components/SmartLearningPath';

const Home: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">مرحباً، {currentUser.name.split(' ')[0]} 👋</h2>
                    <p className="text-gray-500">لنواصل رحلة التعلم اليوم</p>
                </div>
                <Link to="/gamification" className="bg-secondary-100 text-secondary-600 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                    <TrendingUp size={16} />
                    المستوى 12
                </Link>
            </div>

            {/* AI Smart Learning Path (New Feature) */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Link to="/quiz" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                <Zap size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">الاختبارات المحاكية</span>
                        </Link>

                        <Link to="/quizzes" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <FileText size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">اختباراتي</span>
                        </Link>

                        <Link to="/reports" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                <PieChart size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">تقاريري</span>
                        </Link>

                        <Link to="/favorites" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                <Heart size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">الأسئلة المفضلة</span>
                        </Link>

                        <Link to="/plan" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                <Map size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">خطتي</span>
                        </Link>

                        <Link to="/qa" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-3 group">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                <HelpCircle size={24} />
                            </div>
                            <span className="font-bold text-gray-800 text-sm">سؤال وجواب</span>
                        </Link>
                    </div>

                    {/* Active Courses */}
                    <section>
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">الكورسات النشطة</h3>
                            <Link to="/courses" className="text-primary-600 text-sm font-medium">عرض الكل</Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {courses.map(course => (
                                <Card key={course.id} className="flex flex-col h-full">
                                    <div className="relative h-32 bg-gray-900">
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80" />
                                        <div className="absolute top-3 right-3 bg-secondary-500 text-white text-xs font-bold px-2 py-1 rounded">
                                            {course.price} {course.currency}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full">{course.level}</span>
                                                <div className="flex items-center text-amber-400 text-sm font-bold">
                                                    <span>★</span> {course.rating}
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-gray-900 leading-snug mb-1">{course.title}</h4>
                                            <p className="text-xs text-gray-500 mb-3">المدرس: {course.instructor}</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {course.features.slice(0, 2).map((feat, idx) => (
                                                    <span key={idx} className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-1 rounded text-gray-600">{feat}</span>
                                                ))}
                                            </div>
                                            <Link to={`/course/${course.id}`} className="block w-full bg-secondary-500 hover:bg-secondary-600 text-white text-center py-2 rounded-lg font-bold transition-colors">
                                                شراء / متابعة الكورس
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar / Right Column */}
                <div className="space-y-8">
                    {/* AI Learning Path Widget */}
                    <SmartLearningPath skills={skillsData} />

                    {/* Weekly Schedule */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">الجدول الدراسي</h3>
                        </div>
                        <div className="space-y-3">
                            {schedule.slice(0, 3).map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`p-4 rounded-xl border flex justify-between items-center ${
                                        item.status === 'in-progress' 
                                            ? 'bg-secondary-50 border-secondary-200' 
                                            : 'bg-white border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            item.status === 'completed' ? 'bg-primary-100 text-primary-600' :
                                            item.status === 'in-progress' ? 'bg-secondary-100 text-secondary-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{item.subject}</h4>
                                            <p className="text-sm text-gray-500">{item.day}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold text-gray-800">{item.duration}</span>
                                        {item.status === 'in-progress' && (
                                            <span className="text-xs text-secondary-600 font-bold animate-pulse">جاري الآن</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Weak Points Summary */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <AlertTriangle className="text-secondary-500" size={20} />
                                نقاط الضعف
                            </h3>
                            <Link to="/reports" className="text-xs text-primary-600 font-bold">التفاصيل</Link>
                        </div>
                        
                        <div className="space-y-6">
                            {skillsData.slice(0, 2).map((skill, index) => (
                                <div key={index}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-700 text-sm">{skill.skill}</span>
                                        <span className={`text-xs font-bold ${skill.mastery < 50 ? 'text-red-500' : 'text-amber-500'}`}>{skill.mastery}%</span>
                                    </div>
                                    <ProgressBar percentage={skill.mastery} showPercentage={false} color={skill.mastery < 50 ? 'danger' : 'secondary'} />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Home;