
import React, { useMemo } from 'react';
import { ArrowRight, AlertTriangle, Play, ChevronLeft, Target, PieChart, TrendingUp, Award, BookOpen, Video, Clock, CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';

interface SkillRecommendation {
    lessonTitle?: string;
    lessonLink?: string;
    quizTitle?: string;
    quizLink?: string;
    resourceTitle?: string;
    resourceUrl?: string;
    subjectName?: string;
    sectionName?: string;
    actionText?: string;
}

const getSkillRecommendation = (
    skill: { skill?: string; skillId?: string } | undefined,
    allSkills: ReturnType<typeof useStore.getState>['skills'],
    lessons: ReturnType<typeof useStore.getState>['lessons'],
    quizzes: ReturnType<typeof useStore.getState>['quizzes'],
    libraryItems: ReturnType<typeof useStore.getState>['libraryItems'],
    questions: ReturnType<typeof useStore.getState>['questions'],
): SkillRecommendation => {
    if (!skill) return {};

    const resolvedSkill = skill.skillId
        ? allSkills.find((item) => item.id === skill.skillId)
        : allSkills.find((item) => item.name === skill.skill);

    if (!resolvedSkill) return {};

    const recommendedLesson = lessons.find((lesson) => lesson.skillIds?.includes(resolvedSkill.id));
    const recommendedQuiz = quizzes.find((quiz) =>
        quiz.questionIds?.some((questionId) => questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id)) ||
        quiz.skillIds?.includes(resolvedSkill.id)
    );
    const recommendedResource = libraryItems.find((item) => item.skillIds?.includes(resolvedSkill.id));

    return {
        lessonTitle: recommendedLesson?.title,
        lessonLink: resolvedSkill.pathId && resolvedSkill.subjectId ? `/category/${resolvedSkill.pathId}/${resolvedSkill.subjectId}` : undefined,
        quizTitle: recommendedQuiz?.title,
        quizLink: recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined,
        resourceTitle: recommendedResource?.title,
        resourceUrl: recommendedResource?.url,
        subjectName: resolvedSkill.subjectId ? useStore.getState().subjects.find((item) => item.id === resolvedSkill.subjectId)?.name : undefined,
        sectionName: resolvedSkill.sectionId ? useStore.getState().sections.find((item) => item.id === resolvedSkill.sectionId)?.name : undefined,
        actionText:
            recommendedLesson && recommendedQuiz
                ? 'ابدأ بالشرح أولًا ثم نفّذ اختبارًا قصيرًا لقياس التحسن.'
                : recommendedLesson
                    ? 'هذه المهارة تحتاج مراجعة شرحها قبل أي تدريب إضافي.'
                    : recommendedQuiz
                        ? 'هذه المهارة جاهزة لتدريب علاجي مباشر عبر الاختبار المقترح.'
                        : recommendedResource
                            ? 'راجع الملف الداعم ثم ارجع لتكرار التدريب على نفس المهارة.'
                            : 'أعد المحاولة عبر اختبار ساهر مخصص لهذه المهارة.',
    };
};

const Reports: React.FC = () => {
    const { examResults, skills, lessons, quizzes, libraryItems, questions } = useStore();

    // Calculate Performance Analysis
    const stats = useMemo(() => {
        if (examResults.length === 0) return null;

        const totalScore = examResults.reduce((acc, curr) => acc + curr.score, 0);
        const averageScore = Math.round(totalScore / examResults.length);

        // Group by quizTitle (as a proxy for subject)
        const subjectScores: Record<string, { total: number, count: number }> = {};
        examResults.forEach(result => {
            // Try to extract a general subject name from the quiz title (e.g., "اختبار الهندسة" -> "الهندسة")
            const subjectName = result.quizTitle.replace('اختبار ', '').replace('الوحدة الأولى', 'أساسيات');
            
            if (!subjectScores[subjectName]) {
                subjectScores[subjectName] = { total: 0, count: 0 };
            }
            subjectScores[subjectName].total += result.score;
            subjectScores[subjectName].count += 1;
        });

        let bestSubject = { name: '-', score: 0 };
        let worstSubject = { name: '-', score: 100 };

        Object.entries(subjectScores).forEach(([name, data]) => {
            const avg = data.total / data.count;
            if (avg >= bestSubject.score) bestSubject = { name, score: Math.round(avg) };
            if (avg <= worstSubject.score) worstSubject = { name, score: Math.round(avg) };
        });

        return { averageScore, bestSubject, worstSubject };
    }, [examResults]);

    // Aggregate Skill Analysis
    const aggregatedSkills = useMemo(() => {
        const skillsMap: Record<string, { totalMastery: number, count: number, skillId?: string }> = {};
        
        examResults.forEach(result => {
            if (result.skillsAnalysis) {
                result.skillsAnalysis.forEach(skill => {
                    if (!skillsMap[skill.skill]) {
                        skillsMap[skill.skill] = { totalMastery: 0, count: 0, skillId: skill.skillId };
                    }
                    skillsMap[skill.skill].totalMastery += skill.mastery;
                    skillsMap[skill.skill].count += 1;
                    if (!skillsMap[skill.skill].skillId && skill.skillId) {
                        skillsMap[skill.skill].skillId = skill.skillId;
                    }
                });
            }
        });

        return Object.entries(skillsMap).map(([skill, data]) => {
            const mastery = Math.round(data.totalMastery / data.count);
            return {
                skill,
                skillId: data.skillId,
                mastery,
                status: mastery < 50 ? 'weak' : mastery < 75 ? 'average' : 'strong'
            };
        }).sort((a, b) => a.mastery - b.mastery); // Sort by weakest first
    }, [examResults]);

    const weakestSkill = aggregatedSkills.length > 0 ? aggregatedSkills[0] : null;
    const weakestSkillRecommendation = getSkillRecommendation(weakestSkill || undefined, skills, lessons, quizzes, libraryItems, questions);

    if (examResults.length === 0) {
        return (
            <div className="space-y-6 pb-20 animate-fade-in">
                <header className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">تقارير الأداء</h1>
                        <p className="text-sm text-gray-500">نظرة شاملة على مستوى التقدم</p>
                    </div>
                </header>
                <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                        <PieChart size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">لا توجد بيانات كافية</h2>
                    <p className="text-gray-500 mb-6">قم بإجراء بعض الاختبارات لنتمكن من تحليل أدائك وتقديم توصيات مخصصة لك.</p>
                    <Link to="/quiz" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                        ابدأ أول اختبار
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">تقارير الأداء</h1>
                        <p className="text-sm text-gray-500">تحليل ذكي لمستواك بناءً على نتائج اختباراتك</p>
                    </div>
                </div>
            </header>

            {/* 1. Performance Analysis (A) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 flex flex-col items-center text-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-md">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                        <TrendingUp size={24} className="text-white" />
                    </div>
                    <div className="font-black text-4xl mb-1">{stats?.averageScore}%</div>
                    <div className="text-sm font-medium text-indigo-100">متوسط الدرجات</div>
                </Card>
                
                <Card className="p-6 flex flex-col items-center text-center justify-center border-0 shadow-sm bg-emerald-50">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                        <Award size={24} />
                    </div>
                    <div className="font-black text-2xl text-gray-800 mb-1">{stats?.bestSubject.name}</div>
                    <div className="text-sm font-medium text-emerald-600">أفضل أداء ({stats?.bestSubject.score}%)</div>
                </Card>

                <Card className="p-6 flex flex-col items-center text-center justify-center border-0 shadow-sm bg-rose-50">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="font-black text-2xl text-gray-800 mb-1">{stats?.worstSubject.name}</div>
                    <div className="text-sm font-medium text-rose-600">يحتاج تحسين ({stats?.worstSubject.score}%)</div>
                </Card>
            </div>

            {/* 2. Smart Recommendations (D) */}
            {weakestSkill && weakestSkill.mastery < 70 && (
                <Card className="p-6 border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                            <Target size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">توصية ذكية لك 💡</h3>
                            <p className="text-gray-700 mb-4">
                                لاحظنا أنك تواجه بعض الصعوبة في مهارة <span className="font-bold text-amber-700">"{weakestSkill.skill}"</span>. 
                                لا تقلق، هذا طبيعي! نقترح عليك القيام بالآتي لتحسين مستواك:
                            </p>
                            {(weakestSkillRecommendation.lessonTitle || weakestSkillRecommendation.quizTitle || weakestSkillRecommendation.resourceTitle) ? (
                                <div className="bg-white/70 border border-amber-100 rounded-xl p-4 mb-4 text-sm text-gray-700 space-y-2">
                                    {weakestSkillRecommendation.subjectName ? <div>المادة: <span className="font-bold">{weakestSkillRecommendation.subjectName}</span></div> : null}
                                    {weakestSkillRecommendation.sectionName ? <div>المهارة الرئيسة: <span className="font-bold">{weakestSkillRecommendation.sectionName}</span></div> : null}
                                    {weakestSkillRecommendation.lessonTitle ? <div>الدرس المقترح: <span className="font-bold">{weakestSkillRecommendation.lessonTitle}</span></div> : null}
                                    {weakestSkillRecommendation.quizTitle ? <div>الاختبار المقترح: <span className="font-bold">{weakestSkillRecommendation.quizTitle}</span></div> : null}
                                    {weakestSkillRecommendation.resourceTitle ? <div>الملف الداعم: <span className="font-bold">{weakestSkillRecommendation.resourceTitle}</span></div> : null}
                                    {weakestSkillRecommendation.actionText ? <div className="text-amber-800">الإجراء المقترح الآن: <span className="font-bold">{weakestSkillRecommendation.actionText}</span></div> : null}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-3">
                                <Link to={weakestSkillRecommendation.lessonLink || "/courses"} className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 border border-gray-200">
                                    <Video size={16} className="text-indigo-500" />
                                    مراجعة الدرس
                                </Link>
                                <Link to={weakestSkillRecommendation.quizLink || "/quiz"} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-600 flex items-center gap-2">
                                    <FileText size={16} />
                                    اختبار تدريبي
                                </Link>
                                {weakestSkillRecommendation.resourceUrl ? (
                                    <a href={weakestSkillRecommendation.resourceUrl} target="_blank" rel="noreferrer" className="bg-white text-amber-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-50 flex items-center gap-2 border border-amber-200">
                                        <BookOpen size={16} />
                                        ملف داعم
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 3. Skill Analysis & Actions (B & C) */}
            <Card className="p-6 shadow-sm border-0">
                <div className="flex items-center gap-2 mb-6">
                    <PieChart className="text-indigo-500" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">تحليل المهارات التفصيلي</h2>
                </div>

                <div className="space-y-6">
                    {aggregatedSkills.map((skill, index) => {
                        const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions);
                        let colorClass = 'bg-emerald-500';
                        let textClass = 'text-emerald-600';
                        let bgLight = 'bg-emerald-50';
                        
                        if (skill.mastery < 50) {
                            colorClass = 'bg-rose-500';
                            textClass = 'text-rose-600';
                            bgLight = 'bg-rose-50';
                        } else if (skill.mastery < 75) {
                            colorClass = 'bg-amber-500';
                            textClass = 'text-amber-600';
                            bgLight = 'bg-amber-50';
                        }

                        return (
                            <div key={index} className={`p-4 rounded-2xl border border-gray-100 ${bgLight}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-800 text-lg">{skill.skill}</span>
                                        <span className={`font-black text-lg ${textClass}`}>{skill.mastery}%</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3 flex flex-wrap gap-2">
                                        {recommendation.subjectName ? <span>المادة: {recommendation.subjectName}</span> : null}
                                        {recommendation.sectionName ? <span>المهارة الرئيسة: {recommendation.sectionName}</span> : null}
                                    </div>
                                    <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} 
                                            style={{ width: `${skill.mastery}%` }}
                                        ></div>
                                    </div>
                                    {(recommendation.lessonTitle || recommendation.quizTitle || recommendation.resourceTitle || recommendation.actionText) ? (
                                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                                            {recommendation.lessonTitle ? <div>شرح مقترح: <span className="font-bold">{recommendation.lessonTitle}</span></div> : null}
                                            {recommendation.quizTitle ? <div>تدريب مقترح: <span className="font-bold">{recommendation.quizTitle}</span></div> : null}
                                            {recommendation.resourceTitle ? <div>ملف داعم: <span className="font-bold">{recommendation.resourceTitle}</span></div> : null}
                                            {recommendation.actionText ? <div className="text-indigo-700">الخطوة التالية: <span className="font-bold">{recommendation.actionText}</span></div> : null}
                                        </div>
                                    ) : null}
                                </div>
                                    
                                    {/* Action Buttons for each skill (C) */}
                                    <div className="flex flex-wrap gap-2 shrink-0 md:w-auto w-full">
                                        <Link 
                                            to={recommendation.lessonLink || "/courses"} 
                                            className="flex-1 md:flex-none bg-white text-gray-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center justify-center gap-1 border border-gray-200"
                                            title="مشاهدة شرح"
                                        >
                                            <Play size={14} className="text-indigo-500" />
                                            <span className="hidden md:inline">شرح</span>
                                        </Link>
                                        <Link 
                                            to={recommendation.quizLink || "/quiz"} 
                                            className="flex-1 md:flex-none bg-white text-gray-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center justify-center gap-1 border border-gray-200"
                                            title="حل اختبار"
                                        >
                                            <FileText size={14} className="text-amber-500" />
                                            <span className="hidden md:inline">تدريب</span>
                                        </Link>
                                        <Link 
                                            to="/book-session" 
                                            className="flex-1 md:flex-none bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 flex items-center justify-center gap-1"
                                            title="طلب شرح خاص"
                                        >
                                            <Clock size={14} />
                                            <span className="hidden md:inline">حصة خاصة</span>
                                            <span className="md:hidden">حصة</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default Reports;
