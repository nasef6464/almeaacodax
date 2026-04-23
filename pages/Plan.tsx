import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle, Circle, Clock, Star, Target, ArrowRight, PlayCircle, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useStore } from '../store/useStore';

type DailyTask = {
  id: string;
  time: string;
  title: string;
  type: 'lesson' | 'quiz' | 'video' | 'resource';
  duration: string;
  status: 'completed' | 'in-progress' | 'pending';
  link?: string;
};

type WeeklyGoal = {
  id: string;
  title: string;
  progress: number;
  total: number;
  completed: number;
};

const formatActivityTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTodayLabel = () =>
  new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

const Plan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const { recentActivity, enrolledCourses, courses, completedLessons, examResults, skills, lessons, quizzes, questions, libraryItems } = useStore();

  const aggregatedWeakSkills = useMemo(() => {
    const skillsMap: Record<string, { title: string; total: number; count: number; skillId?: string }> = {};

    examResults.forEach((result) => {
      (result.skillsAnalysis || []).forEach((skill) => {
        const key = skill.skillId || skill.skill;
        if (!skillsMap[key]) {
          skillsMap[key] = {
            title: skill.skill,
            total: 0,
            count: 0,
            skillId: skill.skillId,
          };
        }
        skillsMap[key].total += skill.mastery;
        skillsMap[key].count += 1;
      });
    });

    return Object.entries(skillsMap)
      .map(([key, value]) => ({
        id: key,
        title: value.title,
        skillId: value.skillId,
        mastery: Math.round(value.total / value.count),
      }))
      .sort((a, b) => a.mastery - b.mastery);
  }, [examResults]);

  const enrolledCourseGoals = useMemo<WeeklyGoal[]>(() => {
    return courses
      .filter((course) => enrolledCourses.includes(course.id))
      .map((course) => {
        const totalLessons = course.modules?.reduce((sum, module) => sum + module.lessons.length, 0) || 0;
        const completed = course.modules?.reduce(
          (sum, module) => sum + module.lessons.filter((lesson) => completedLessons.includes(lesson.id)).length,
          0,
        ) || 0;
        const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          progress,
          total: totalLessons,
          completed,
        };
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [completedLessons, courses, enrolledCourses]);

  const weakSkillGoals = useMemo<WeeklyGoal[]>(() => {
    return aggregatedWeakSkills.slice(0, 3).map((skill) => ({
      id: skill.id,
      title: `رفع إتقان مهارة ${skill.title}`,
      progress: skill.mastery,
      total: 100,
      completed: skill.mastery,
    }));
  }, [aggregatedWeakSkills]);

  const weeklyGoals = enrolledCourseGoals.length > 0 ? enrolledCourseGoals : weakSkillGoals;

  const recommendationTasks = useMemo<DailyTask[]>(() => {
    return aggregatedWeakSkills.slice(0, 3).flatMap((skill, index) => {
      const resolvedSkill = skill.skillId
        ? skills.find((item) => item.id === skill.skillId)
        : skills.find((item) => item.name === skill.title);
      if (!resolvedSkill) {
        return [];
      }

      const lesson = lessons.find((item) => item.skillIds?.includes(resolvedSkill.id));
      const quiz = quizzes.find((item) =>
        item.questionIds?.some((questionId) => questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id)) ||
        item.skillIds?.includes(resolvedSkill.id)
      );
      const resource = libraryItems.find((item) => item.skillIds?.includes(resolvedSkill.id));

      const items: DailyTask[] = [];
      if (lesson) {
        items.push({
          id: `lesson-${lesson.id}`,
          time: index === 0 ? 'اليوم' : 'لاحقًا',
          title: `مراجعة ${lesson.title}`,
          type: lesson.type === 'video' ? 'video' : 'lesson',
          duration: lesson.duration || '20 دقيقة',
          status: index === 0 ? 'in-progress' : 'pending',
          link: resolvedSkill.pathId && resolvedSkill.subjectId ? `/category/${resolvedSkill.pathId}/${resolvedSkill.subjectId}` : undefined,
        });
      }
      if (quiz) {
        items.push({
          id: `quiz-${quiz.id}`,
          time: index === 0 ? 'اليوم' : 'لاحقًا',
          title: `حل ${quiz.title}`,
          type: 'quiz',
          duration: `${quiz.settings?.timeLimit || 20} دقيقة`,
          status: 'pending',
          link: `/quiz/${quiz.id}`,
        });
      }
      if (resource) {
        items.push({
          id: `resource-${resource.id}`,
          time: 'لاحقًا',
          title: `مراجعة ${resource.title}`,
          type: 'resource',
          duration: '10 دقائق',
          status: 'pending',
          link: resource.url,
        });
      }
      return items;
    });
  }, [aggregatedWeakSkills, lessons, quizzes, skills, questions, libraryItems]);

  const activityTasks = useMemo<DailyTask[]>(() => {
    return recentActivity.slice(0, 3).map((activity, index) => ({
      id: activity.id,
      time: formatActivityTime(activity.date),
      title: activity.title,
      type:
        activity.type === 'quiz_complete'
          ? 'quiz'
          : activity.type === 'lesson_complete'
            ? 'lesson'
            : 'video',
      duration: activity.type === 'quiz_complete' ? 'تم الإنجاز' : 'نشاط مكتمل',
      status: index === 0 ? 'in-progress' : 'completed',
      link: activity.link,
    }));
  }, [recentActivity]);

  const dailyTasks = activityTasks.length > 0
    ? [...activityTasks, ...recommendationTasks].slice(0, 4)
    : recommendationTasks.slice(0, 4);

  const weeklyProgress = useMemo(() => {
    if (weeklyGoals.length === 0) {
      return 0;
    }
    return Math.round(weeklyGoals.reduce((sum, goal) => sum + goal.progress, 0) / weeklyGoals.length);
  }, [weeklyGoals]);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowRight size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-indigo-800">خطتي الدراسية</h1>
          <p className="text-sm text-gray-500">تابع تقدمك وحقق أهدافك اليومية</p>
        </div>
      </header>

      <Card className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg border-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">هدفك الأسبوعي</h2>
            <p className="text-indigo-100 text-sm opacity-90">الخطة مبنية على تقدمك الحقيقي ونتائجك الأخيرة.</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Target size={24} className="text-white" />
          </div>
        </div>

        <div className="flex items-end gap-2 mb-2">
          <span className="text-4xl font-bold">{weeklyProgress}%</span>
          <span className="text-indigo-200 mb-1">من الخطة المنجزة</span>
        </div>
        <div className="w-full bg-black/20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full" style={{ width: `${weeklyProgress}%` }}></div>
        </div>
      </Card>

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

      {activeTab === 'daily' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
            <Calendar size={20} className="text-indigo-500" />
            <h3>مهام اليوم ({formatTodayLabel()})</h3>
          </div>

          <div className="relative border-r-2 border-indigo-100 mr-3 space-y-6">
            {dailyTasks.length > 0 ? dailyTasks.map((task) => (
              <div key={task.id} className="relative pr-8">
                <div className={`absolute -right-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                  task.status === 'completed'
                    ? 'bg-emerald-500'
                    : task.status === 'in-progress'
                      ? 'bg-amber-500'
                      : 'bg-gray-300'
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
                        <span>
                          {task.type === 'lesson'
                            ? 'درس تفاعلي'
                            : task.type === 'quiz'
                              ? 'اختبار قصير'
                              : task.type === 'resource'
                                ? 'ملف مراجعة'
                                : 'فيديو'}
                        </span>
                      </div>
                      {task.link ? (
                        task.type === 'resource' ? (
                          <a href={task.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                            <FileText size={14} />
                            فتح المهمة
                          </a>
                        ) : (
                          <Link to={task.link} className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                            {task.type === 'quiz' ? <FileText size={14} /> : <PlayCircle size={14} />}
                            فتح المهمة
                          </Link>
                        )
                      ) : null}
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
            )) : (
              <Card className="p-8 text-center text-gray-500">
                لا توجد مهام يومية بعد. ابدأ درسًا أو اختبارًا لتظهر خطتك تلقائيًا هنا.
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {weeklyGoals.length > 0 ? weeklyGoals.map((goal) => (
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
          )) : (
            <Card className="p-8 text-center text-gray-500">
              لا توجد أهداف أسبوعية بعد. عند بدء الدراسة سيبني النظام أهدافك هنا تلقائيًا.
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Plan;
