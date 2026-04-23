
import React from 'react';
import { ArrowDown, BookOpen, Target, Zap, Book, Users, Video, BarChart, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';

export const Landing: React.FC = () => {
    const { paths, courses, quizzes, questions } = useStore();

    const getPathLink = (pathId: string) => {
        return `/category/${pathId}`;
    };

    const getPathColor = (path: any) => {
        return path?.color || 'blue';
    }

    const getPathIcon = (path: any) => {
        if (path?.iconUrl) return <img src={path.iconUrl} alt={path.name} className="w-8 h-8 object-contain" />;
        if (!path?.icon) return <Zap size={24} />;
        return <span className="text-xl">{path.icon}</span>;
    }

    const homepagePaths = paths.filter(
        p =>
            p.showInHome !== false &&
            p.isActive !== false &&
            typeof p.id === 'string' &&
            p.id.trim().length > 0 &&
            typeof p.name === 'string' &&
            p.name.trim().length > 0
    );

    const featuredCourses = courses
        .filter(course => !course.isPackage && course.isPublished !== false)
        .sort((a, b) => {
            const studentsA = a.fakeStudentsCount || a.studentCount || 0;
            const studentsB = b.fakeStudentsCount || b.studentCount || 0;
            const ratingA = a.fakeRating || a.rating || 0;
            const ratingB = b.fakeRating || b.rating || 0;
            return (studentsB + ratingB * 100) - (studentsA + ratingA * 100);
        })
        .slice(0, 3);

    const publishedCourses = courses.filter(course => !course.isPackage && course.isPublished !== false);
    const totalStudents = publishedCourses.reduce((sum, course) => sum + (course.fakeStudentsCount || course.studentCount || 0), 0);
    const totalQA = publishedCourses.reduce((sum, course) => sum + (course.qa?.length || 0), 0);
    const averageRating = publishedCourses.length > 0
        ? (publishedCourses.reduce((sum, course) => sum + (course.fakeRating || course.rating || 0), 0) / publishedCourses.length)
        : 0;
    const publishedQuizzes = quizzes.filter(quiz => quiz.isPublished !== false).length;
    const totalLearningAssets = questions.length + publishedQuizzes;

    const formatCompactNumber = (value: number) => {
        if (value >= 1000) {
            return new Intl.NumberFormat('en', {
                notation: 'compact',
                maximumFractionDigits: 1,
            }).format(value);
        }

        return value.toString();
    };

    return (
        <div className="bg-white font-tajawal">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-b from-indigo-50 via-white to-white pt-16 pb-24 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute top-[20%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-[-10%] right-[20%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                        
                        {/* Text Content */}
                        <div className="lg:w-1/2 text-center lg:text-right">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-blue-100 shadow-sm">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                المنصة الأولى للقدرات والتحصيلي
                            </div>
                            
                             <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-tight mb-6">
                                حقق <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">المئة</span> <br/>
                                في اختباراتك
                            </h1>
                            
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                رحلة تعليمية ذكية تجمع بين التدريب المكثف، الشروحات التفاعلية، والتحليل الدقيق لنقاط ضعفك لضمان أعلى الدرجات.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                <Link 
                                    to="/dashboard" 
                                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                >
                                    <Zap size={20} fill="currentColor" />
                                    ابدأ التدريب مجاناً
                                </Link>
                                <Link 
                                    to="/courses" 
                                    className="w-full sm:w-auto bg-white text-gray-700 border border-gray-200 text-lg font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <BookOpen size={20} />
                                    تصفح الدورات
                                </Link>
                            </div>

                            <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span>ضمان تحسن المستوى</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-500" />
                                    <span>مدربون معتمدون</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Section */}
                        <div className="lg:w-1/2 relative">
                            <div className="relative w-full max-w-lg mx-auto">
                                {/* Main Student Image */}
                                <img 
                                    src="https://img.freepik.com/free-photo/saudi-arab-boy-student-wearing-thobe-holding-tablet_1258-122164.jpg" 
                                    alt="طالب سعودي يستخدم منصة المئة" 
                                    className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white relative z-10 transform transition-transform hover:scale-[1.02]"
                                />

                                {/* Floating "Screen" Interface Simulation */}
                                <div className="absolute -bottom-6 -right-6 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 max-w-[200px] animate-bounce-slow">
                                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <Target size={16} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-800">منصة المئة</div>
                                            <div className="text-[10px] text-emerald-500 font-bold">مستواك: متقدم</div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-3/4"></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500">
                                            <span>التقدم</span>
                                            <span>75%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Elements */}
                                <div className="absolute top-10 -left-10 z-20 bg-white p-3 rounded-2xl shadow-lg animate-float">
                                    <div className="text-amber-500 font-black text-xl">A+</div>
                                </div>
                                <div className="absolute bottom-20 -left-4 z-0 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg animate-float animation-delay-2000">
                                    <Book size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="bg-blue-900 text-white py-10 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-800 divide-x-reverse">
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-amber-400 mb-1">{formatCompactNumber(totalStudents)}</div>
                            <div className="text-blue-200 text-sm font-bold">طالب وطالبة</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-amber-400 mb-1">{publishedCourses.length}</div>
                            <div className="text-blue-200 text-sm font-bold">دورة تدريبية</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-amber-400 mb-1">{formatCompactNumber(totalQA || totalLearningAssets)}</div>
                            <div className="text-blue-200 text-sm font-bold">{totalQA > 0 ? 'سؤال وجواب' : 'مواد تعليمية'}</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-amber-400 mb-1">{averageRating.toFixed(1)}</div>
                            <div className="text-blue-200 text-sm font-bold">تقييم عام</div>
                        </div>
                    </div>
                </div>
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            </section>

            {/* Main Features Grid (Organic Cards) */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">كل ما تحتاجه للتفوق</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">نقدم لك أدوات تعليمية متكاملة تغطي كافة جوانب الاختبارات</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <OrganicCard 
                            title="اختبر نفسك" 
                            subtitle="بنوك أسئلة ذكية ومحدثة"
                            icon={<Zap size={24} />} 
                            color="blue" 
                            link="/quiz"
                        />
                        {homepagePaths.map((path, idx) => (
                            <OrganicCard 
                                key={`hpath-${path.id}-${idx}`}
                                title={path.name} 
                                subtitle={path.description || "تأسيس وتدريب شامل"}
                                icon={getPathIcon(path)} 
                                color={getPathColor(path)} 
                                link={getPathLink(path.id)}
                                iconStyle={path.iconStyle}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Courses Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-12">
                        <div className="text-right">
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">الدورات الأكثر طلباً</h2>
                            <p className="text-gray-500">اختر دورتك وابدأ رحلة التفوق اليوم</p>
                        </div>
                        <Link to="/courses" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
                            عرض الكل <ArrowDown className="transform rotate-90" size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredCourses.map((course, idx) => (
                            <Link key={`fcourse-${course.id}-${idx}`} to={`/course/${course.id}`} className="group">
                                <Card className="overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 rounded-3xl group-hover:-translate-y-2">
                                    <div className="relative aspect-video overflow-hidden">
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-indigo-600 font-black text-sm shadow-sm">
                                            {course.price} ر.س
                                        </div>
                                    </div>
                                    <div className="p-6 text-right">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1 text-amber-400">
                                                <Star size={14} fill="currentColor" />
                                                <span className="text-xs font-bold text-gray-600">{course.fakeRating || course.rating || 0}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Users size={12} /> {course.fakeStudentsCount || course.studentCount || 0} طالب
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h3>
                                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                            <Users size={12} /> {course.instructor}
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <span className="text-indigo-600 font-bold text-sm">عرض التفاصيل</span>
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <ArrowDown className="transform rotate-90" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                    {featuredCourses.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            لا توجد دورات منشورة حاليًا.
                        </div>
                    )}
                </div>
            </section>

            {/* Why Choose Us (Detailed Features) */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FeatureCard 
                                icon={<Video className="text-purple-500" size={20} />}
                                title="بث مباشر وتفاعلي"
                                description="احضر الحصص مباشرة وتفاعل مع المعلم واسأل عما يصعب عليك."
                            />
                            <FeatureCard 
                                icon={<Users className="text-blue-500" size={20} />}
                                title="نخبة المعلمين"
                                description="مدربون خبراء في القدرات والتحصيلي بخبرة تتجاوز 15 عاماً."
                            />
                            <FeatureCard 
                                icon={<BarChart className="text-emerald-500" size={20} />}
                                title="تحليل الأداء"
                                description="تقارير دقيقة توضح نقاط قوتك وضعفك لتركز على ما يهم."
                            />
                            <FeatureCard 
                                icon={<Book className="text-amber-500" size={20} />}
                                title="ملازم شاملة"
                                description="ملخصات وتجميعات محدثة تغنيك عن الكتاب المدرسي."
                            />
                        </div>
                        <div className="lg:w-1/2 text-right">
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                                لماذا يختار الطلاب <br/> 
                                <span className="text-indigo-600">منصة المئة</span>؟
                            </h2>
                            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                نحن لا نقدم مجرد دورات، بل نقدم نظاماً بيئياً متكاملاً يضمن لك الفهم العميق والتدريب المستمر. من خلال تقنيات الذكاء الاصطناعي، نقوم بتخصيص مسار التعلم ليناسب مستواك ويضمن تطورك السريع.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle size={14} /></div>
                                    <span className="text-gray-700 font-medium">تحديثات مستمرة للأسئلة حسب قياس</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle size={14} /></div>
                                    <span className="text-gray-700 font-medium">ضمان ذهبي لاسترجاع الرسوم</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle size={14} /></div>
                                    <span className="text-gray-700 font-medium">دعم فني وأكاديمي طوال أيام الأسبوع</span>
                                </li>
                            </ul>
                            <Link to="/dashboard" className="text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-2 group">
                                اكتشف المزيد 
                                <ArrowDown className="transform rotate-90 group-hover:translate-x-[-5px] transition-transform" size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 bg-indigo-900 text-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">قصص نجاح نعتز بها</h2>
                        <p className="text-indigo-200">انضم لآلاف الطلاب الذين حققوا أحلامهم معنا</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        <TestimonialCard 
                            name="سارة العتيبي"
                            degree="98% قدرات"
                            text="المنصة غيرت طريقة مذاكرتي تماماً. تحليل نقاط الضعف ساعدني أركز جهدي في المكان الصح."
                            image="https://i.pravatar.cc/100?img=5"
                        />
                        <TestimonialCard 
                            name="فهد الشمري"
                            degree="96% تحصيلي"
                            text="شروحات الفيزياء والكيمياء بسطت لي المعلومات بشكل عجيب. شكراً لكل القائمين على المنصة."
                            image="https://i.pravatar.cc/100?img=11"
                        />
                        <TestimonialCard 
                            name="نورة السالم"
                            degree="99% قدرات"
                            text="اختبارات المحاكاة كانت مطابقة جداً للاختبار الحقيقي، دخلت الاختبار وأنا واثقة جداً."
                            image="https://i.pravatar.cc/100?img=9"
                        />
                    </div>
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
            </section>
        </div>
    );
};

// Helper Components

const OrganicCard = ({ title, subtitle, icon, color, link, iconStyle }: any) => {
    const isHex = color?.startsWith('#');
    const safeColor = color || 'indigo';

    // Different designs based on iconStyle
    if (iconStyle === 'modern') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div 
                    className={`w-full h-48 bg-white border-2 border-gray-100 flex flex-col items-center justify-center shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 rounded-3xl relative overflow-hidden group-hover:border-${safeColor}-500`}
                    style={isHex ? { borderColor: isHex ? safeColor : undefined } : {}}
                >
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`mb-4 p-4 rounded-2xl ${isHex ? '' : `bg-${safeColor}-50 text-${safeColor}-600`} group-hover:scale-110 transition-transform shadow-sm`} style={isHex ? { backgroundColor: `${safeColor}20`, color: safeColor } : {}}>
                            {icon}
                        </div>
                        <h3 className="text-xl font-bold tracking-wide text-gray-900 mb-2">{title}</h3>
                        <p className="text-gray-500 text-xs font-medium px-6 text-center leading-relaxed">{subtitle}</p>
                    </div>
                </div>
            </Link>
        );
    }
    
    if (iconStyle === 'minimal') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div className="w-full h-48 bg-gray-50 flex flex-col items-center justify-center hover:bg-white transition-all duration-300 transform group-hover:-translate-y-1 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`mb-3 ${isHex ? '' : `text-${safeColor}-600`}`} style={isHex ? { color: safeColor } : {}}>
                            {icon}
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-800 mb-2">{title}</h3>
                        <p className="text-gray-500 text-xs text-center px-4">{subtitle}</p>
                    </div>
                </div>
            </Link>
        );
    }

    if (iconStyle === 'playful') {
        return (
            <Link to={link || '#'} className="group block h-full w-full">
                <div 
                    className={`w-full h-48 ${isHex ? '' : `bg-${safeColor}-400`} text-white flex flex-col items-center justify-center shadow-[8px_8px_0px_#00000020] hover:shadow-[12px_12px_0px_#00000030] transition-all duration-300 transform group-hover:-translate-y-2 rounded-[2rem] border-4 border-white relative overflow-hidden`}
                    style={isHex ? { backgroundColor: safeColor } : {}}
                >
                    <div className="absolute top-2 right-2 text-white/30 transform rotate-12 text-6xl">✨</div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="mb-4 bg-white text-gray-800 p-4 rounded-full shadow-md group-hover:rotate-12 transition-transform">
                            {icon}
                        </div>
                        <h3 className="text-2xl font-black drop-shadow-md mb-2">{title}</h3>
                    </div>
                </div>
            </Link>
        );
    }

    // Default style
    return (
        <Link to={link || '#'} className="group block h-full w-full">
            <div 
                className={`w-full h-48 ${isHex ? '' : `bg-${safeColor}-600 hover:bg-${safeColor}-700`} text-white flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 rounded-3xl relative overflow-hidden`}
                style={isHex ? { backgroundColor: safeColor } : {}}
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 transform group-hover:scale-110 transition-transform duration-500"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8 transform group-hover:scale-110 transition-transform duration-500"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-4 bg-white/20 p-4 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-sm">
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold tracking-wide drop-shadow-md mb-2">{title}</h3>
                    <p className="text-white/90 text-xs font-medium px-6 text-center leading-relaxed max-w-[200px]">{subtitle}</p>
                </div>
            </div>
        </Link>
    );
};

const FeatureCard = ({ icon, title, description }: any) => (
    <Card className="p-6 border border-gray-100 hover:shadow-lg transition-shadow flex flex-col gap-3 h-full">
        <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mb-2">
            {icon}
        </div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </Card>
);

const TestimonialCard = ({ name, degree, text, image }: any) => (
    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
        <div className="flex items-center gap-4 mb-4">
            <img src={image} alt={name} className="w-12 h-12 rounded-full border-2 border-amber-400" />
            <div>
                <h4 className="font-bold">{name}</h4>
                <span className="text-amber-400 text-xs font-bold">{degree}</span>
            </div>
        </div>
        <p className="text-indigo-100 text-sm leading-relaxed italic">"{text}"</p>
        <div className="flex gap-1 text-amber-400 mt-4">
            {[...Array(5)].map((_, i) => <Star key={`star-${name}-${i}`} size={14} fill="currentColor" />)}
        </div>
    </div>
);
