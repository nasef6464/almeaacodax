import React, { useEffect, useMemo, useState } from 'react';
import { Lesson, LessonType, Question } from '../../../types';
import { Plus, Save, Trash2, X, Video, FileText, HelpCircle, Video as VideoIcon, Youtube } from 'lucide-react';
import { UnifiedQuizBuilder } from '../UnifiedQuizBuilder';
import { UnifiedQuestionBuilder } from './UnifiedQuestionBuilder';
import { VideoQuestionPicker } from './VideoQuestionPicker';
import { useStore } from '../../../store/useStore';
import { sanitizeVideoUrl } from '../../../utils/videoLinks';
import { createVideoQuestionSnapshot, isValidVideoQuestionSnapshot } from '../../../utils/videoQuestionSnapshot';

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
  const [isSavingVideoQuestion, setIsSavingVideoQuestion] = useState(false);
  const [questionPickerTargetId, setQuestionPickerTargetId] = useState<string | null | undefined>(undefined);
  const [validationError, setValidationError] = useState('');
  const [questionCreationNotice, setQuestionCreationNotice] = useState('');
  const { quizzes, questions, paths, subjects, sections, skills, addQuestion } = useStore();

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
    handleValidatedSave();
    return;
  };

  const handleValidatedSave = () => {
    if (!lesson.title) {
      setValidationError('يرجى إدخال عنوان الدرس.');
      return;
    }
    if (!lesson.pathId) {
      setValidationError('يرجى اختيار المسار قبل حفظ الدرس.');
      return;
    }
    if (!lesson.subjectId) {
      setValidationError('يرجى اختيار المادة قبل حفظ الدرس.');
      return;
    }
    if (!lesson.sectionId) {
      setValidationError('يرجى اختيار المهارة الرئيسة قبل حفظ الدرس.');
      return;
    }
    if (!lesson.skillIds || lesson.skillIds.length === 0) {
      setValidationError('يرجى ربط الدرس بمهارة فرعية واحدة على الأقل.');
      return;
    }

    const normalizedInteractiveQuestions = (lesson.interactiveQuestions || []).map((question) => {
      if (question.questionId && !question.inlineQuestion) {
        const bankQuestion = questions.find((item) => item.id === question.questionId);
        return bankQuestion ? { ...question, inlineQuestion: createVideoQuestionSnapshot(bankQuestion) } : question;
      }
      return question;
    });
    const invalidInteractiveQuestion = validateInteractiveQuestions(normalizedInteractiveQuestions);
    if (invalidInteractiveQuestion) {
      setValidationError(invalidInteractiveQuestion);
      return;
    }

    setValidationError('');
    onSave(moduleId, { ...lesson, interactiveQuestions: normalizedInteractiveQuestions });
  };

  const validateInteractiveQuestions = (interactiveQuestions: NonNullable<Lesson['interactiveQuestions']>) => {
    const linkedQuestionIds = new Set<string>();
    for (const question of interactiveQuestions) {
      if (!Number.isFinite(question.timestamp) || question.timestamp < 0) {
        return 'يوجد سؤال فيديو بتوقيت غير صالح.';
      }
      const snapshot = question.inlineQuestion;
      const hasValidSnapshot = isValidVideoQuestionSnapshot(snapshot);
      if (question.questionId) {
        if (linkedQuestionIds.has(question.questionId)) return 'لا يمكن ربط السؤال نفسه أكثر من مرة داخل الفيديو.';
        linkedQuestionIds.add(question.questionId);
        if (!hasValidSnapshot) return 'يوجد سؤال مرتبط بالبنك بلا نسخة تشغيل صالحة. استبدله من البنك قبل الحفظ.';
      } else if (!hasValidSnapshot) {
        return 'يوجد سؤال قديم داخل الفيديو غير مكتمل. استبدله بسؤال محفوظ من البنك.';
      }
    }
    return '';
  };

  const appendBankQuestions = (bankQuestions: Question[]) => {
    const alreadyLinked = new Set((lesson.interactiveQuestions || []).map((question) => question.questionId).filter(Boolean));
    const usableQuestions = bankQuestions.filter((question) =>
      !alreadyLinked.has(question.id) &&
      (question.type === 'mcq' || question.type === 'true_false'),
    );
    if (usableQuestions.length === 0) return;
    setLesson((previous) => ({
      ...previous,
      interactiveQuestions: [
        ...(previous.interactiveQuestions || []),
        ...usableQuestions.map((question, index) => ({
          id: `video_question_${Date.now()}_${index}`,
          timestamp: 0,
          questionId: question.id,
          inlineQuestion: createVideoQuestionSnapshot(question),
          mustPass: false,
          actionOnFail: 'continue' as const,
        })),
      ],
    }));
  };

  const updateInteractiveQuestion = (questionId: string, updater: (question: NonNullable<Lesson['interactiveQuestions']>[number]) => NonNullable<Lesson['interactiveQuestions']>[number]) => {
    setLesson((previous) => ({
      ...previous,
      interactiveQuestions: (previous.interactiveQuestions || []).map((question) =>
        question.id === questionId ? updater(question) : question,
      ),
    }));
  };

  const removeInteractiveQuestion = (questionId: string) => {
    setLesson((previous) => ({
      ...previous,
      interactiveQuestions: (previous.interactiveQuestions || []).filter((question) => question.id !== questionId),
    }));
  };

  const saveVideoQuestionToBank = async (questionPayload: Partial<Question>) => {
    if (isSavingVideoQuestion) return;
    const questionId = questionPayload.id || `q_video_${Date.now()}`;
    const questionToSave: Question = {
      id: questionId,
      text: questionPayload.text || '',
      options: questionPayload.options || ['', ''],
      correctOptionIndex: questionPayload.correctOptionIndex || 0,
      explanation: questionPayload.explanation || '',
      videoUrl: questionPayload.videoUrl || '',
      imageUrl: questionPayload.imageUrl || '',
      skillIds: questionPayload.skillIds || lesson.skillIds || [],
      pathId: questionPayload.pathId || lesson.pathId || '',
      subject: questionPayload.subject || lesson.subjectId || '',
      sectionId: questionPayload.sectionId || lesson.sectionId || '',
      difficulty: questionPayload.difficulty || 'Medium',
      type: questionPayload.type || 'mcq',
      approvalStatus: questionPayload.approvalStatus || 'approved',
      showOnPlatform: true,
    } as Question;

    try {
      setIsSavingVideoQuestion(true);
      const createdQuestion = await addQuestion(questionToSave);
      setShowQuestionBuilder(false);
      if (createdQuestion.approvalStatus && createdQuestion.approvalStatus !== 'approved') {
        setQuestionCreationNotice('تم حفظ السؤال في البنك وهو الآن بانتظار الاعتماد؛ لن يُنشر داخل الفيديو قبل اعتماده.');
        return;
      }
      appendBankQuestions([createdQuestion]);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'تعذر حفظ السؤال الجديد في البنك. لم يتم ربط أي سؤال بالفيديو.');
    } finally {
      setIsSavingVideoQuestion(false);
    }
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
          {validationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {validationError}
            </div>
          )}

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
                    <option value="upload">رابط مباشر / CDN</option>
                    <option value="youtube">رابط يوتيوب</option>
                    <option value="vimeo">رابط Vimeo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط الفيديو</label>
                  <input
                    type="text"
                    value={lesson.videoUrl || ''}
                    onChange={event => setLesson({ ...lesson, videoUrl: event.target.value })}
                    onBlur={event => setLesson({ ...lesson, videoUrl: sanitizeVideoUrl(event.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-xs text-gray-500">يُحفظ رابط الوسائط فقط. هذا المسار لا يرفع ملف فيديو إلى الخادم؛ استخدم رابطًا مباشرًا أو CDN أو اختر YouTube/Vimeo.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-gray-800">أسئلة داخل الفيديو</h5>
                    <p className="text-xs text-gray-500">تظهر للطالب عند توقيت محدد داخل مشغل الدرس، وتعمل في التأسيس والدورات.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setQuestionCreationNotice(''); setQuestionPickerTargetId(null); }}
                      disabled={!lesson.pathId || !lesson.subjectId}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                    >
                      <Plus size={14} /> اختيار من بنك الأسئلة
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQuestionCreationNotice(''); setShowQuestionBuilder(true); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <Plus size={14} /> إنشاء سؤال جديد
                    </button>
                  </div>
                </div>

                {questionCreationNotice ? <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{questionCreationNotice}</div> : null}
                {(lesson.interactiveQuestions || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-4 py-5 text-center text-sm font-medium text-gray-500">
                    لا توجد أسئلة داخل هذا الفيديو. اختر سؤالًا معتمدًا من البنك أو أنشئ سؤالًا جديدًا فيه.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(lesson.interactiveQuestions || []).map((question, index) => {
                      const snapshot = question.inlineQuestion;
                      const timestampMinutes = Math.floor((question.timestamp || 0) / 60);
                      const timestampSeconds = (question.timestamp || 0) % 60;
                      const rewatchMinutes = Math.floor((question.rewatchTimestamp || 0) / 60);
                      const rewatchSeconds = (question.rewatchTimestamp || 0) % 60;
                      return (
                        <div key={question.id} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div><span className="text-sm font-black text-gray-800">سؤال {index + 1}</span><p className="mt-1 text-[11px] font-bold text-gray-500">{question.questionId ? `مرجع البنك: ${question.questionId}` : 'سؤال Inline قديم — احتفظنا به للتوافق'}</p></div>
                            <button type="button" onClick={() => removeInteractiveQuestion(question.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف السؤال"><Trash2 size={15} /></button>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-3 text-sm font-bold text-gray-800">{snapshot?.text?.replace(/<[^>]*>/g, ' ').trim() || 'سؤال غير مكتمل — استبدله من البنك.'}</div>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                            <label className="text-xs font-bold text-gray-600">التوقيت (دقيقة)<input type="number" min={0} value={timestampMinutes} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, timestamp: Math.max(0, Number(event.target.value) || 0) * 60 + ((current.timestamp || 0) % 60) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                            <label className="text-xs font-bold text-gray-600">التوقيت (ثانية)<input type="number" min={0} max={59} value={timestampSeconds} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, timestamp: Math.floor((current.timestamp || 0) / 60) * 60 + Math.min(59, Math.max(0, Number(event.target.value) || 0)) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                            <label className="text-xs font-bold text-gray-600">عند الخطأ<select value={question.actionOnFail} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, actionOnFail: event.target.value as 'rewatch' | 'continue' }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="continue">يكمل الدرس</option><option value="rewatch">يرجع للمراجعة</option></select></label>
                            <label className="mt-5 flex items-center gap-2 text-xs font-bold text-gray-700"><input type="checkbox" checked={question.mustPass} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, mustPass: event.target.checked }))} className="accent-indigo-600" /> إجابة مطلوبة للمتابعة</label>
                          </div>
                          {question.actionOnFail === 'rewatch' ? <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 md:max-w-md"><label className="text-xs font-bold text-amber-800">الرجوع: دقيقة<input type="number" min={0} value={rewatchMinutes} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, rewatchTimestamp: Math.max(0, Number(event.target.value) || 0) * 60 + ((current.rewatchTimestamp || 0) % 60) }))} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-amber-800">الرجوع: ثانية<input type="number" min={0} max={59} value={rewatchSeconds} onChange={(event) => updateInteractiveQuestion(question.id, (current) => ({ ...current, rewatchTimestamp: Math.floor((current.rewatchTimestamp || 0) / 60) * 60 + Math.min(59, Math.max(0, Number(event.target.value) || 0)) }))} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /></label></div> : null}
                          <button type="button" onClick={() => setQuestionPickerTargetId(question.id)} className="mt-3 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">استبدال من بنك الأسئلة</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Legacy inline editor retained below only as source reference during this focused migration.
                {(lesson.interactiveQuestions || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-4 py-5 text-center text-sm font-medium text-gray-500">
                      لا توجد أسئلة داخل هذا الفيديو. اسحب سؤالًا محفوظًا من مركز الأسئلة أو أنشئ سؤالًا سريعًا.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(lesson.interactiveQuestions || []).map((question, index) => {
                      const inlineQuestion = question.inlineQuestion || { text: '', options: ['', ''], correctOptionIndex: 0 };
                      const selectedBankQuestion = question.questionId
                        ? questions.find((bankQuestion) => bankQuestion.id === question.questionId)
                        : undefined;
                      return (
                        <div key={question.id} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-gray-800">سؤال {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeInteractiveQuestion(question.id)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              aria-label="حذف السؤال"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">التوقيت بالثواني</label>
                              <input
                                type="number"
                                min={0}
                                value={question.timestamp}
                                onChange={(event) =>
                                  updateInteractiveQuestion(question.id, (current) => ({
                                    ...current,
                                    timestamp: Math.max(0, Number(event.target.value) || 0),
                                  }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">عند الخطأ</label>
                              <select
                                value={question.actionOnFail}
                                onChange={(event) =>
                                  updateInteractiveQuestion(question.id, (current) => ({
                                    ...current,
                                    actionOnFail: event.target.value as 'rewatch' | 'continue',
                                  }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="continue">يكمل الدرس</option>
                                <option value="rewatch">يرجع للمراجعة</option>
                              </select>
                            </div>
                            <label className="mt-6 flex items-center gap-2 text-xs font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={question.mustPass}
                                onChange={(event) =>
                                  updateInteractiveQuestion(question.id, (current) => ({
                                    ...current,
                                    mustPass: event.target.checked,
                                  }))
                                }
                                className="accent-indigo-600"
                              />
                              إجابة مطلوبة للمتابعة
                            </label>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <label className="block text-xs font-bold text-gray-600">اختيار من مركز الأسئلة</label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateInteractiveQuestion(question.id, (current) => ({
                                      ...current,
                                      questionId: undefined,
                                      inlineQuestion: current.inlineQuestion || inlineQuestion,
                                    }))
                                  }
                                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
                                >
                                  سؤال سريع بدل البنك
                                </button>
                              </div>
                              {question.questionId ? (
                                <p className="mt-1 text-[11px] font-bold text-emerald-700">
                                  مرتبط بسؤال محفوظ من مركز الأسئلة، وأي تعديل على السؤال يكون من البنك.
                                </p>
                              ) : questions.length === 0 ? (
                                <p className="mt-1 text-[11px] font-bold text-amber-700">
                                  لا توجد أسئلة في مركز الأسئلة حتى الآن. أنشئ سؤالًا في البنك أولًا أو استخدم سؤالًا سريعًا مؤقتًا.
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowQuestionBuilder({ videoQuestionId: question.id })}
                              className="self-end rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                            >
                              إنشاء سؤال في البنك
                            </button>
                          </div>

                          {selectedBankQuestion ? (
                            <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                              <div className="mb-2 text-xs font-black text-emerald-700">معاينة السؤال المرتبط الآن</div>
                              {renderBankQuestionPreview(selectedBankQuestion, true, () => undefined)}
                            </div>
                          ) : null}

                          {availableVideoQuestions.length > 0 ? (
                            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-black text-gray-800">استعرض السؤال قبل السحب</div>
                                  <div className="text-[11px] font-bold text-gray-500">تظهر المادة والمهارة ونص السؤال والاختيارات قبل ربطه بالفيديو.</div>
                                </div>
                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-gray-600">
                                  {filteredVideoQuestionsCount} / {availableVideoQuestions.length} سؤال
                                </span>
                              </div>
                              <div className="relative mb-2">
                                <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="search"
                                  value={videoQuestionSearch}
                                  onChange={(event) => setVideoQuestionSearch(event.target.value)}
                                  placeholder="ابحث بالمادة أو المهارة أو نص السؤال..."
                                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm font-bold text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                />
                              </div>
                              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                {filteredRelevantVideoQuestions.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="text-[11px] font-black text-indigo-700">أسئلة مناسبة للدرس</div>
                                    {filteredRelevantVideoQuestions.map((bankQuestion) =>
                                      renderBankQuestionPreview(
                                        bankQuestion,
                                        question.questionId === bankQuestion.id,
                                        () =>
                                          updateInteractiveQuestion(question.id, (current) => ({
                                            ...current,
                                            questionId: bankQuestion.id,
                                            inlineQuestion: undefined,
                                          })),
                                      ),
                                    )}
                                  </div>
                                ) : null}
                                {filteredOtherVideoQuestions.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="text-[11px] font-black text-gray-600">باقي مركز الأسئلة</div>
                                    {filteredOtherVideoQuestions.map((bankQuestion) =>
                                      renderBankQuestionPreview(
                                        bankQuestion,
                                        question.questionId === bankQuestion.id,
                                        () =>
                                          updateInteractiveQuestion(question.id, (current) => ({
                                            ...current,
                                            questionId: bankQuestion.id,
                                            inlineQuestion: undefined,
                                          })),
                                      ),
                                    )}
                                  </div>
                                ) : null}
                                {filteredVideoQuestionsCount === 0 ? (
                                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-xs font-bold text-gray-500">
                                    لا توجد أسئلة مطابقة للبحث الحالي.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {!question.questionId ? (
                            <>
                              <label className="mt-3 block text-xs font-bold text-gray-600">نص السؤال السريع</label>
                              <input
                                type="text"
                                value={inlineQuestion.text}
                                onChange={(event) =>
                                  updateInteractiveQuestion(question.id, (current) => ({
                                    ...current,
                                    inlineQuestion: { ...inlineQuestion, text: event.target.value },
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              />

                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                {inlineQuestion.options.map((option, optionIndex) => (
                                  <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-video-question-${question.id}`}
                                      checked={inlineQuestion.correctOptionIndex === optionIndex}
                                      onChange={() =>
                                        updateInteractiveQuestion(question.id, (current) => ({
                                          ...current,
                                          inlineQuestion: { ...inlineQuestion, correctOptionIndex: optionIndex },
                                        }))
                                      }
                                      className="accent-indigo-600"
                                    />
                                    <input
                                      type="text"
                                      value={option}
                                      placeholder={`اختيار ${optionIndex + 1}`}
                                      onChange={(event) => {
                                        const nextOptions = [...inlineQuestion.options];
                                        nextOptions[optionIndex] = event.target.value;
                                        updateInteractiveQuestion(question.id, (current) => ({
                                          ...current,
                                          inlineQuestion: { ...inlineQuestion, options: nextOptions },
                                        }));
                                      }}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
                */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط التسجيل بعد الحصة</label>
                  <input
                    type="text"
                    value={lesson.recordingUrl || ''}
                    onChange={event => setLesson({ ...lesson, recordingUrl: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 mt-6 md:mt-0">
                  <input
                    type="checkbox"
                    checked={lesson.showRecordingOnPlatform === true}
                    onChange={event => setLesson({ ...lesson, showRecordingOnPlatform: event.target.checked })}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-gray-700">إظهار التسجيل للطالب بعد الحصة</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">تعليمات الدخول أو التجهيز</label>
                <textarea
                  value={lesson.joinInstructions || ''}
                  onChange={event => setLesson({ ...lesson, joinInstructions: event.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                  placeholder="مثال: ادخل قبل الموعد بعشر دقائق، جهّز القلم والدفتر، واستخدم اسمك الحقيقي داخل الجلسة."
                /> 
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">المعلم المعيّن للحصة</label>
                  <input
                    type="text"
                    value={lesson.assignedTeacherName || ''}
                    onChange={event => setLesson({ ...lesson, assignedTeacherName: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="اسم المعلم أو المدرس..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الحد الأقصى للحضور</label>
                  <input
                    type="number"
                    value={lesson.maxAttendees || ''}
                    onChange={event => setLesson({ ...lesson, maxAttendees: Number(event.target.value) || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="اتركه فارغاً لعدم التحديد..."
                    min={1}
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
            onClick={handleValidatedSave}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} /> حفظ التغييرات
          </button>
        </div>
      </div>

      {showQuizBuilder && (
        <UnifiedQuizBuilder
          role="admin"
          defaultKind="drill"
          onClose={() => setShowQuizBuilder(false)}
          onSave={(savedQuiz) => {
            setLesson((prev) => ({ ...prev, quizId: savedQuiz.id }));
            setShowQuizBuilder(false);
          }}
        />
      )}

      {showQuestionBuilder && (
        <UnifiedQuestionBuilder
          initialQuestion={{
            id: `q_video_${Date.now()}`,
            pathId: lesson.pathId || '',
            subject: lesson.subjectId || '',
            sectionId: lesson.sectionId || '',
            skillIds: lesson.skillIds || [],
            difficulty: 'Medium',
            type: 'mcq',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
          }}
          subjectId={lesson.subjectId || ''}
          sectionId={lesson.sectionId || ''}
          allowedTypes={['mcq', 'true_false']}
          isSaving={isSavingVideoQuestion}
          onSave={saveVideoQuestionToBank}
          onCancel={() => setShowQuestionBuilder(false)}
        />
      )}

      {questionPickerTargetId !== undefined && (
        <VideoQuestionPicker
          context={{ pathId: lesson.pathId, subjectId: lesson.subjectId, sectionId: lesson.sectionId, skillIds: lesson.skillIds }}
          excludedQuestionIds={(lesson.interactiveQuestions || []).filter((question) => question.id !== questionPickerTargetId).map((question) => question.questionId).filter(Boolean) as string[]}
          selectionMode={typeof questionPickerTargetId === 'string' ? 'single' : 'multiple'}
          onClose={() => setQuestionPickerTargetId(undefined)}
          onCreateNew={() => { setQuestionPickerTargetId(undefined); setShowQuestionBuilder(true); }}
          onConfirm={(selectedQuestions) => {
            if (typeof questionPickerTargetId === 'string') {
              const replacement = selectedQuestions[0];
              if (replacement) {
                updateInteractiveQuestion(questionPickerTargetId, (current) => ({
                  ...current,
                  questionId: replacement.id,
                  inlineQuestion: createVideoQuestionSnapshot(replacement),
                }));
              }
            } else {
              appendBankQuestions(selectedQuestions);
            }
            setQuestionPickerTargetId(undefined);
          }}
        />
      )}
    </div>
  );
};
