
import React, { useState } from 'react';
import { Search, MessageCircle, ThumbsUp, Filter, Plus, ArrowRight, User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

const QA: React.FC = () => {
    const [filter, setFilter] = useState('all');
    
    const questions = [
        {
            id: 1,
            user: 'أحمد محمد',
            avatar: 'https://picsum.photos/seed/ahmed/50',
            date: 'منذ ساعتين',
            title: 'سؤال بخصوص قاعدة أرخميدس في الفيزياء',
            content: 'هل يمكن شرح الفرق بين قوة الطفو والوزن الظاهري؟ أجد صعوبة في التفريق بينهما في المسائل الحسابية.',
            subject: 'الفيزياء',
            replies: 5,
            likes: 12,
            isAnswered: true
        },
        {
            id: 2,
            user: 'سارة العلي',
            avatar: 'https://picsum.photos/seed/sara/50',
            date: 'منذ 5 ساعات',
            title: 'أفضل طريقة لحفظ مفردات اللغة الإنجليزية',
            content: 'أعاني من نسيان الكلمات بسرعة، هل هناك استراتيجيات فعالة للمراجعة؟',
            subject: 'اللغة الإنجليزية',
            replies: 2,
            likes: 8,
            isAnswered: false
        },
        {
            id: 3,
            user: 'خالد عمر',
            avatar: 'https://picsum.photos/seed/khaled/50',
            date: 'أمس',
            title: 'استفسار عن موعد اختبار القدرات القادم',
            content: 'متى يبدأ التسجيل للفترة الثانية؟',
            subject: 'عام',
            replies: 10,
            likes: 25,
            isAnswered: true
        }
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-gray-500 hover:text-gray-700">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-amber-600">سؤال وجواب</h1>
                        <p className="text-sm text-gray-500">تفاعل مع المعلمين والطلاب</p>
                    </div>
                </div>
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-md">
                    <Plus size={18} />
                    <span className="hidden md:inline">اطرح سؤالاً</span>
                </button>
            </header>

            {/* Search & Filter */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="ابحث في الأسئلة..." 
                        className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    />
                </div>
                <button className="bg-white border border-gray-200 text-gray-600 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                    <Filter size={20} />
                </button>
            </div>

            {/* Tags */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['الكل', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'القدرات', 'عام'].map((tag) => (
                    <button
                        key={tag}
                        onClick={() => setFilter(tag)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                            (filter === 'all' && tag === 'الكل') || filter === tag
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {questions.map((q) => (
                    <Card key={q.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <img src={q.avatar} alt={q.user} className="w-10 h-10 rounded-full" />
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-amber-600 transition-colors">{q.user}</h4>
                                    <span className="text-xs text-gray-400">{q.date}</span>
                                </div>
                            </div>
                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-md font-medium">
                                {q.subject}
                            </span>
                        </div>

                        <h3 className="font-bold text-lg text-gray-800 mb-2">{q.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                            {q.content}
                        </p>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <div className="flex gap-4 text-gray-500 text-sm">
                                <span className="flex items-center gap-1 hover:text-amber-600 transition-colors">
                                    <MessageCircle size={16} />
                                    {q.replies} إجابات
                                </span>
                                <span className="flex items-center gap-1 hover:text-amber-600 transition-colors">
                                    <ThumbsUp size={16} />
                                    {q.likes}
                                </span>
                            </div>
                            
                            {q.isAnswered && (
                                <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                                    تمت الإجابة
                                </span>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default QA;
