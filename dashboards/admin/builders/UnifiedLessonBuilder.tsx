import React, { useEffect, useMemo, useState } from 'react';
import { Lesson, LessonType } from '../../../types';
import { Save, X, Video, FileText, HelpCircle, Video as VideoIcon, Youtube } from 'lucide-react';
import { QuizBuilder } from '../QuizBuilder';
import { UnifiedQuestionBuilder } from './UnifiedQuestionBuilder';
import { useStore } from '../../../store/useStore';

interface UnifiedLessonBuilderProps {
  initialLesson: Lesson;
  moduleId?: string;
  onSave: (moduleId: string | undefined, lesson: Lesson) => void;
  onCancel: () => void;
}

export const UnifiedLessonBuilder: React.FC<UnifiedLessonBuilderProps> = ({
  initialLesson,
  moduleId,
  onSave,
  onCancel
}) => {
  const [lesson, setLesson] = useState<Lesson>(initialLesson);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const { quizzes, paths, subjects, sections, skills } = useStore();

  const availableMainSkills = useMemo(
    () => sections.filter((section) => !!lesson.subjectId && section.subjectId === lesson.subjectId),
    [sections, lesson.subjectId]
  );

  const availableSubSkills = useMemo(
    () => skills.filter((skill) => !!lesson.subjectId && skill.subjectId === lesson.subjectId && (!lesson.sectionId || skill.sectionId === lesson.sectionId)),
    [skills, lesson.subjectId, lesson.sectionId]
  );

  useEffect(() => {
    if (!lesson.subjectId) return;

    const currentSubject = subjects.find((subject) => subject.id === lesson.subjectId);
    if (!currentSubject) return;

    const nextPathId = currentSubject.pathId;
    const sectionBelongsToSubject = !lesson.sectionId || sections.some(
      (section) => section.id === lesson.sectionId && section.subjectId === lesson.subjectId
    );
    const filteredSkillIds = (lesson.skillIds || []).filter((skillId) =>
      skills.some(
        (skill) =>
          skill.id === skillId &&
          skill.subjectId === lesson.subjectId &&
          (!lesson.sectionId || skill.sectionId === lesson.sectionId)
      )
    );

    if (
      lesson.pathId !== nextPathId ||
      !sectionBelongsToSubject ||
      filteredSkillIds.length !== (lesson.skillIds || []).length
    ) {
      setLesson((prev) => ({
        ...prev,
        pathId: nextPathId,
        sectionId: sectionBelongsToSubject ? prev.sectionId : undefined,
        skillIds: filteredSkillIds
      }));
    }
  }, [lesson.subjectId, lesson.sectionId, lesson.pathId, lesson.skillIds, subjects, sections, skills]);

  const getLessonIcon = (type: LessonType) => {
    switch (type) {
      case 'video':
        return <Video size={18} className="text-blue-500" />;
      case 'text':
        return <FileText size={18} className="text-emerald-500" />;
      case 'quiz':
        return <HelpCircle size={18} className="text-purple-500" />;
      case 'live_youtube':
        return <Youtube size={18} className="text-red-500" />;
      case 'zoom':
        return <VideoIcon size={18} className="text-blue-400" />;
      case 'google_meet':
        return <VideoIcon size={18} className="text-green-500" />;
      case 'teams':
        return <VideoIcon size={18} className="text-indigo-600" />;
      default:
        return <FileText size={18} className="text-gray-500" />;
    }
  };

  const handleSave = () => {
    if (!lesson.title) {
      alert('يرجى إدخال عنوان الدرس');
      return;
    }
    if (!lesson.pathId) {
      alert('يرجى اختيار المسار قبل حفظ الدرس');
      return;
    }
    if (!lesson.subjectId) {
      alert('يرجى اختيار المادة قبل حفظ الدرس');
      return;
    }
    if (!lesson.sectionId) {
      alert('يرجى اختيار المهارة الرئيسة قبل حفظ الدرس');
      return;
    }
    if (!lesson.skillIds || lesson.skillIds.length === 0) {
      alert('يرجى ربط الدرس بمهارة فرعية واحدة على الأقل');
      return;
    }
    onSave(moduleId, lesson);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            {getLessonIcon(lesson.type)}
            منشئ الدروس الموحد: {lesson.title || 'درس جديد'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم الدرس</label>
              <input
                type="text"
                value={lesson.title || ''}
                onChange={event => setLesson({ ...lesson, title: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">الوصول</label>
              <select
                value={lesson.accessControl || 'enrolled'}
                onChange={event => setLesson({ ...lesson, accessControl: event.target.value as Lesson['accessControl'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="public">متاح للجميع</option>
                <option value="enrolled">للمشتركين في الدورة فقط</option>
                <option value="specific_groups">لمجموعات محددة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">وصف قصير للدرس</label>
            <textarea
              value={lesson.description || ''}
              onChange={event => setLesson({ ...lesson, description: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">المسار</label>
              <select
                value={lesson.pathId || ''}
                onChange={event => setLesson({ ...lesson, pathId: event.target.value, subjectId: '', sectionId: undefined, skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- اختر المسار --</option>
                {paths.map(path => (
                  <option key={path.id} value={path.id}>{path.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
              <select
                value={lesson.subjectId || ''}
                onChange={event => setLesson({ ...lesson, subjectId: event.target.value, sectionId: undefined, skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={!lesson.pathId}
              >
                <option value="">-- اختر المادة --</option>
                {subjects.filter(subject => subject.pathId === lesson.pathId).map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">المهارة الرئيسة</label>
              <select
                value={lesson.sectionId || ''}
                onChange={event => setLesson({ ...lesson, sectionId: event.target.value || undefined, skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={!lesson.subjectId}
              >
                <option value="">-- اختر المهارة الرئيسة --</option>
                {availableMainSkills.map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ربط بالمهارات الفرعية</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {lesson.skillIds?.map(skillId => {
                const subSkill = skills.find(item => item.id === skillId);
                return subSkill ? (
                  <span key={skillId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                    {subSkill.name}
                    <button
                      onClick={() => setLesson(prev => ({ ...prev, skillIds: prev.skillIds?.filter(id => id !== skillId) || [] }))}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <select
              value=""
              onChange={event => {
                if (event.target.value && !lesson.skillIds?.includes(event.target.value)) {
                  setLesson(prev => ({ ...prev, skillIds: [...(prev.skillIds || []), event.target.value] }));
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={!lesson.subjectId || !lesson.sectionId || availableSubSkills.length === 0}
            >
              <option value="">
                {!lesson.subjectId
                  ? '-- اختر المادة أولًا --'
                  : !lesson.sectionId
                    ? '-- اختر المهارة الرئيسة أولًا --'
                    : availableSubSkills.length === 0
                      ? '-- لا توجد مهارات فرعية لهذه المهارة الرئيسة بعد --'
                      : '-- أضف مهارة فرعية --'}
              </option>
              {availableSubSkills.map(subSkill => (
                <option key={subSkill.id} value={subSkill.id}>{subSkill.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">مصدر المهارات هنا هو مركز المهارات الحقيقي: المهارة الرئيسة ثم المهارات الفرعية التابعة لها.</p>
          </div>

          {lesson.type === 'video' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <Video size={18} className="text-blue-500" /> إعدادات الفيديو
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">مصدر الفيديو</label>
                  <select
                    value={lesson.videoSource || 'upload'}
                    onChange={event => setLesson({ ...lesson, videoSource: event.target.value as Lesson['videoSource'] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="upload">رفع مباشر</option>
                    <option value="youtube">رابط يوتيوب</option>
                    <option value="vimeo">رابط Vimeo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط الفيديو / الملف</label>
                  <input
                    type="text"
                    value={lesson.videoUrl || ''}
                    onChange={event => setLesson({ ...lesson, videoUrl: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {['live_youtube', 'zoom', 'google_meet', 'teams'].includes(lesson.type) && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <VideoIcon size={18} className="text-green-500" /> إعدادات البث / الاجتماع
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط الاجتماع / البث</label>
                  <input
                    type="text"
                    value={lesson.meetingUrl || ''}
                    onChange={event => setLesson({ ...lesson, meetingUrl: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">موعد الاجتماع</label>
                  <input
                    type="datetime-local"
                    value={lesson.meetingDate || ''}
                    onChange={event => setLesson({ ...lesson, meetingDate: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {lesson.type === 'quiz' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle size={18} className="text-purple-500" /> إعدادات الاختبار
              </h4>
              <p className="text-sm text-gray-500">يمكنك ربط هذا الدرس باختبار موجود أو إنشاء اختبار جديد من منشئ الاختبارات الموحد.</p>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اختيار من بنك الاختبارات</label>
                  <select
                    value={lesson.quizId || ''}
                    onChange={event => setLesson({ ...lesson, quizId: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- اختر اختبارًا --</option>
                    {quizzes.map(quiz => (
                      <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-400 font-bold">أو</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <button
                  onClick={() => setShowQuizBuilder(true)}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                >
                  فتح منشئ الاختبارات الموحد لإنشاء اختبار جديد
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} /> حفظ التغييرات
          </button>
        </div>
      </div>

      {showQuizBuilder && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <div className="p-4">
            <button onClick={() => setShowQuizBuilder(false)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold">
              <X size={20} /> العودة للدرس
            </button>
            <QuizBuilder />
          </div>
        </div>
      )}

      {showQuestionBuilder && (
        <UnifiedQuestionBuilder
          initialQuestion={{
            pathId: lesson.pathId || '',
            subject: lesson.subjectId || '',
            sectionId: lesson.sectionId || '',
            skillIds: lesson.skillIds || []
          }}
          subjectId={lesson.subjectId || ''}
          sectionId={lesson.sectionId || ''}
          onSave={() => setShowQuestionBuilder(false)}
          onCancel={() => setShowQuestionBuilder(false)}
        />
      )}
    </div>
  );
};
