import React from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Target } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { isPathMockExam } from '../utils/mockExam';

const isMockExamPath = (name?: string) => {
  const value = name || '';
  return value.includes('قدرات') || value.includes('القدرات') || value.includes('تحصيلي') || value.includes('التحصيلي');
};

const getPathIcon = (name?: string) =>
  (name || '').includes('تحصيلي') ? <BookOpen size={28} /> : <Target size={28} />;

export const MockExams: React.FC = () => {
  const { paths, quizzes, user } = useStore();
  const canSeeHiddenPaths = ['admin', 'teacher', 'supervisor'].includes(user?.role || '');
  const hasVisibleMockExam = (pathId: string) =>
    quizzes.some(
      (quiz) =>
        isPathMockExam(quiz, pathId) &&
        quiz.isPublished !== false &&
        quiz.showOnPlatform !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved'),
    );
  const mockPaths = paths
    .filter((path) => (canSeeHiddenPaths || path.isActive !== false) && path.showInNavbar !== false && (isMockExamPath(path.name) || hasVisibleMockExam(path.id)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-indigo-600 px-4 py-14 text-center text-white">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <Award size={30} />
        </div>
        <h1 className="text-2xl font-black leading-tight sm:text-4xl">الاختبارات المحاكية</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-indigo-100 sm:text-base">
          اختر المسار، وستصل لنفس صفحة المحاكيات الموجودة داخل المسار.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {mockPaths.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {mockPaths.map((path) => (
              <Link key={path.id} to={`/category/${path.id}?tab=mock-exams`}>
                <Card className="h-full p-6 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      {getPathIcon(path.name)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{path.name}</h2>
                      <p className="mt-1 text-sm font-bold text-gray-500">
                        {hasVisibleMockExam(path.id) ? 'محاكيات منشورة وجاهزة' : 'محاكاة كاملة حسب المسار'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-black text-gray-900">لا توجد مسارات محاكاة منشورة بعد</h2>
            <p className="mt-2 text-sm font-bold text-gray-500">
              عند تفعيل مسارات القدرات أو التحصيلي ستظهر هنا مباشرة.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MockExams;
