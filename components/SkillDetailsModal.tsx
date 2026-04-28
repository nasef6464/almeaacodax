import React, { useEffect, useMemo, useState } from 'react';
import { X, Video, Target, Clock, Layers, Play, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Topic } from '../types';
import { VideoModal } from './VideoModal';
import { openExternalUrl } from '../utils/openExternalUrl';

interface SkillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: any;
}

export const SkillDetailsModal: React.FC<SkillDetailsModalProps> = ({ isOpen, onClose, skill }) => {
  const { user, topics, lessons, quizzes, libraryItems } = useStore();
  const [selectedSubTopic, setSelectedSubTopic] = useState<Topic | null>(null);
  const [topicModalTab, setTopicModalTab] = useState<'lessons' | 'quizzes'>('lessons');
  const [videoData, setVideoData] = useState<{ url: string; title: string } | null>(null);
  const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);
  const canStudentSeeLesson = (lesson: (typeof lessons)[number]) =>
    isStaffViewer || (lesson.showOnPlatform !== false && (!lesson.approvalStatus || lesson.approvalStatus === 'approved'));
  const canStudentSeeQuiz = (quiz: (typeof quizzes)[number]) =>
    isStaffViewer || (quiz.showOnPlatform !== false && quiz.isPublished !== false && (!quiz.approvalStatus || quiz.approvalStatus === 'approved'));
  const canStudentSeeLibraryItem = (item: (typeof libraryItems)[number]) =>
    isStaffViewer || (item.showOnPlatform !== false && (!item.approvalStatus || item.approvalStatus === 'approved'));

  useEffect(() => {
    if (isOpen && skill?.originalTopic?.id) {
      const subTopics = topics
        .filter((topic) => topic.parentId === skill.originalTopic.id && (isStaffViewer || topic.showOnPlatform !== false))
        .sort((a, b) => a.order - b.order);

      setSelectedSubTopic(subTopics[0] || null);
      setTopicModalTab('lessons');
    }
  }, [isOpen, skill?.originalTopic?.id, topics]);

  if (!isOpen || !skill || !skill.originalTopic) return null;

  const selectedTopic = skill.originalTopic as Topic;
  const subjectTopics = topics.filter((topic) => topic.subjectId === selectedTopic.subjectId && (isStaffViewer || topic.showOnPlatform !== false));
  const activeTopic = selectedSubTopic || selectedTopic;

  const activeTopicLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => activeTopic.lessonIds?.includes(lesson.id) && canStudentSeeLesson(lesson))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [activeTopic, lessons],
  );

  const activeTopicQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => activeTopic.quizIds?.includes(quiz.id) && canStudentSeeQuiz(quiz))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [activeTopic, quizzes],
  );

  const relatedLessonSuggestions = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const matchesPath = selectedTopic.pathId ? lesson.pathId === selectedTopic.pathId : true;
          const matchesSubject = lesson.subjectId === selectedTopic.subjectId;
          const matchesSection = activeTopic.sectionId ? lesson.sectionId === activeTopic.sectionId : true;
          const notAttached = !activeTopic.lessonIds?.includes(lesson.id);
          return matchesPath && matchesSubject && matchesSection && notAttached && canStudentSeeLesson(lesson);
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .slice(0, 3),
    [activeTopic, lessons, selectedTopic.pathId, selectedTopic.subjectId],
  );

  const relatedQuizSuggestions = useMemo(
    () =>
      quizzes
        .filter((quiz) => {
          const matchesPath = selectedTopic.pathId ? quiz.pathId === selectedTopic.pathId : true;
          const matchesSubject = quiz.subjectId === selectedTopic.subjectId;
          const matchesSection = activeTopic.sectionId ? quiz.sectionId === activeTopic.sectionId : true;
          const notAttached = !activeTopic.quizIds?.includes(quiz.id);
          return matchesPath && matchesSubject && matchesSection && notAttached && canStudentSeeQuiz(quiz);
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 3),
    [activeTopic, quizzes, selectedTopic.pathId, selectedTopic.subjectId],
  );

  const relatedLibrarySuggestions = useMemo(
    () =>
      libraryItems
        .filter((item) => {
          const matchesPath = selectedTopic.pathId ? item.pathId === selectedTopic.pathId : true;
          const matchesSubject = item.subjectId === selectedTopic.subjectId;
          const matchesSection = activeTopic.sectionId ? item.sectionId === activeTopic.sectionId : true;
          return matchesPath && matchesSubject && matchesSection && Boolean(item.url) && canStudentSeeLibraryItem(item);
        })
        .slice(0, 2),
    [activeTopic.sectionId, libraryItems, selectedTopic.pathId, selectedTopic.subjectId],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-5xl h-[85vh] sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
        <div className="flex-none bg-gradient-to-l from-indigo-900 to-[#2e2b70] p-6 sm:p-8 text-white relative h-32 sm:h-40 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-tr-full"></div>

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black">{selectedTopic.title}</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">
          <div className="w-full md:w-80 flex-none bg-white border-l border-gray-100 h-1/3 md:h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <h3 className="font-bold text-gray-800">الموضوعات الفرعية</h3>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedSubTopic(null)}
                className={`w-full text-right p-4 rounded-xl transition-all flex items-center justify-between group ${
                  selectedSubTopic === null
                    ? 'bg-indigo-50 border border-indigo-100'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div>
                  <h4
                    className={`font-bold ${
                      selectedSubTopic === null ? 'text-indigo-700' : 'text-gray-700 group-hover:text-indigo-600'
                    }`}
                  >
                    عام (للموضوع التأسيسي الرئيس)
                  </h4>
                </div>
              </button>

              {subjectTopics
                .filter((topic) => topic.parentId === selectedTopic.id)
                .sort((a, b) => a.order - b.order)
                .map((subTopic) => (
                  <button
                    key={subTopic.id}
                    onClick={() => setSelectedSubTopic(subTopic)}
                    className={`w-full text-right p-4 rounded-xl transition-all flex items-center justify-between group ${
                      selectedSubTopic?.id === subTopic.id
                        ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div>
                      <h4
                        className={`font-bold transition-colors ${
                          selectedSubTopic?.id === subTopic.id
                            ? 'text-indigo-700'
                            : 'text-gray-700 group-hover:text-indigo-600'
                        }`}
                      >
                        {subTopic.title}
                      </h4>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className="flex-1 h-2/3 md:h-full flex flex-col overflow-hidden bg-gray-50/50">
            <div className="flex-none p-4 sm:p-6 pb-0">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setTopicModalTab('lessons')}
                  className={`px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                    topicModalTab === 'lessons'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Video size={18} /> الشروحات
                </button>
                <button
                  onClick={() => setTopicModalTab('quizzes')}
                  className={`px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
                    topicModalTab === 'quizzes'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Target size={18} /> التدريبات القصيرة
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {topicModalTab === 'lessons' && (
                <div className="space-y-4">
                  {activeTopicLessons.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 border-dashed overflow-hidden">
                      <div className="text-center py-10 px-4 border-b border-gray-100">
                        <Video size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد شروحات مرتبطة مباشرة بهذا الجزء</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          لا يوجد درس مربوط لهذا الموضوع الآن، لكن هذه أقرب شروحات وملفات متاحة من نفس المادة.
                        </p>
                      </div>

                      <div className="p-4 sm:p-6 space-y-4 bg-gray-50/60">
                        {relatedLessonSuggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                              <Play size={16} className="text-indigo-600" />
                              شروحات بديلة متاحة الآن
                            </div>
                            <div className="grid gap-3">
                              {relatedLessonSuggestions.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => lesson.videoUrl && setVideoData({ url: lesson.videoUrl, title: lesson.title })}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-right hover:border-indigo-200 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-bold text-gray-800">{lesson.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">مدة الدرس: {lesson.duration || 'غير محدد'}</p>
                                    </div>
                                    <span className="shrink-0 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                                      مشاهدة
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {relatedLibrarySuggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                              <FileText size={16} className="text-emerald-600" />
                              ملفات مراجعة داعمة
                            </div>
                            <div className="grid gap-3">
                              {relatedLibrarySuggestions.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => openExternalUrl(item.url)}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-right hover:border-emerald-200 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-bold text-gray-800">{item.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{item.size}</p>
                                    </div>
                                    <span className="shrink-0 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                                      فتح الملف
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    activeTopicLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => lesson.videoUrl && setVideoData({ url: lesson.videoUrl, title: lesson.title })}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative w-28 h-16 sm:w-32 sm:h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            {lesson.videoUrl?.includes('youtube') || lesson.videoUrl?.includes('youtu.be') ? (
                              <img
                                src={`https://img.youtube.com/vi/${
                                  lesson.videoUrl.split('youtu.be/')[1] || lesson.videoUrl.split('v=')[1]?.split('&')[0]
                                }/mqdefault.jpg`}
                                alt={lesson.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300 group-hover:bg-indigo-100 group-hover:text-indigo-400 transition-colors">
                                <Video size={24} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play size={14} className="text-indigo-600 ml-1" fill="currentColor" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-800 line-clamp-1">{lesson.title}</h4>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1 font-bold">
                                <Clock size={12} /> {lesson.duration || 'غير محدد'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Layers size={12} /> المادة العلمية
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                            مشاهدة الدرس
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {topicModalTab === 'quizzes' && (
                <div className="space-y-4">
                  {activeTopicQuizzes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 border-dashed overflow-hidden">
                      <div className="text-center py-10 px-4 border-b border-gray-100">
                        <Target size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تدريبات قصيرة مرتبطة مباشرة بهذا الجزء</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          يمكنك البدء من اختبار قريب في نفس المادة، أو فتح ملف مراجعة سريع قبل العودة لهذا الموضوع.
                        </p>
                      </div>

                      <div className="p-4 sm:p-6 space-y-4 bg-gray-50/60">
                        {relatedQuizSuggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                              <Target size={16} className="text-amber-600" />
                              تدريبات متاحة من نفس المادة
                            </div>
                            <div className="grid gap-3">
                              {relatedQuizSuggestions.map((quiz) => (
                                <Link
                                  key={quiz.id}
                                  to={`/quiz/${quiz.id}`}
                                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-amber-200 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-bold text-gray-800">{quiz.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{quiz.questionIds?.length || 0} سؤال</p>
                                    </div>
                                    <span className="shrink-0 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold">
                                      ابدأ الآن
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {relatedLibrarySuggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                              <FileText size={16} className="text-emerald-600" />
                              ملفات داعمة للمراجعة
                            </div>
                            <div className="grid gap-3">
                              {relatedLibrarySuggestions.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => openExternalUrl(item.url)}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-right hover:border-emerald-200 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-bold text-gray-800">{item.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{item.size}</p>
                                    </div>
                                    <span className="shrink-0 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                                      فتح الملف
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    activeTopicQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="bg-white p-5 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                            <Target size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{quiz.title}</h4>
                            <div className="flex items-center gap-4 mt-2 text-xs font-bold text-gray-500">
                              <span className="flex items-center gap-1">
                                <Layers size={14} /> {quiz.questionIds?.length || 0} سؤال
                              </span>
                              <span className="flex items-center gap-1">
                                <Target size={14} /> +{(quiz.questionIds?.length || 0) * 10} نقطة إنجاز
                              </span>
                            </div>
                          </div>
                        </div>

                        <Link
                          to={`/quiz/${quiz.id}`}
                          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shrink-0 text-center"
                        >
                          ابدأ التدريب
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {videoData && <VideoModal videoUrl={videoData.url} title={videoData.title} onClose={() => setVideoData(null)} />}
      </div>
    </div>
  );
};
