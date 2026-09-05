import React, { useEffect, useMemo, useState } from 'react';
import { Lesson, LessonType, Question } from '../../../types';
import { Plus, Save, Search, Trash2, X, Video, FileText, HelpCircle, Video as VideoIcon, Youtube } from 'lucide-react';
import { UnifiedQuizBuilder } from '../UnifiedQuizBuilder';
import { UnifiedQuestionBuilder } from './UnifiedQuestionBuilder';
import { useStore } from '../../../store/useStore';
import { sanitizeVideoUrl } from '../../../utils/videoLinks';

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
  const [showQuestionBuilder, setShowQuestionBuilder] = useState<{ videoQuestionId: string } | null>(null);
  const [validationError, setValidationError] = useState('');
  const [videoQuestionSearch, setVideoQuestionSearch] = useState('');
  const { quizzes, questions, paths, subjects, sections, skills, addQuestion } = useStore();

  const availableMainSkills = useMemo(
    () => sections.filter((section) => !!lesson.subjectId && section.subjectId === lesson.subjectId),
    [sections, lesson.subjectId]
  );

  const availableSubSkills = useMemo(
    () => skills.filter((skill) => !!lesson.subjectId && skill.subjectId === lesson.subjectId && (!lesson.sectionId || skill.sectionId === lesson.sectionId)),
    [skills, lesson.subjectId, lesson.sectionId]
  );

  const questionMatchesLessonContext = (question: Question) => {
    const pathMatches = !lesson.pathId || !question.pathId || question.pathId === lesson.pathId;
    const subjectMatches = !lesson.subjectId || !question.subject || question.subject === lesson.subjectId;
    const sectionMatches = !lesson.sectionId || !question.sectionId || question.sectionId === lesson.sectionId;
    const skillMatches =
      !lesson.skillIds?.length ||
      !question.skillIds?.length ||
      question.skillIds.some((skillId) => lesson.skillIds.includes(skillId));

    return pathMatches && subjectMatches && sectionMatches && skillMatches;
  };

  const relevantVideoQuestions = useMemo(
    () => questions.filter(questionMatchesLessonContext),
    [questions, lesson.pathId, lesson.subjectId, lesson.sectionId, lesson.skillIds],
  );

  const otherVideoQuestions = useMemo(
    () => questions.filter((question) => !relevantVideoQuestions.some((item) => item.id === question.id)),
    [questions, relevantVideoQuestions],
  );

  const availableVideoQuestions = useMemo(
    () => [...relevantVideoQuestions, ...otherVideoQuestions],
    [relevantVideoQuestions, otherVideoQuestions],
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

  const cleanQuestionText = (value?: string) =>
    String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  const getQuestionMeta = (question: Question) => {
    const subjectName = subjects.find((subject) => subject.id === question.subject)?.name || 'بدون مادة';
    const sectionName = sections.find((section) => section.id === question.sectionId)?.name || 'بدون مهارة رئيسية';
    const skillNames = (question.skillIds || [])
      .map((skillId) => skills.find((skill) => skill.id === skillId)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join('، ');

    return {
      subjectName,
      sectionName,
      skillNames: skillNames || 'غير محدد',
    };
  };

  const videoQuestionSearchTerm = videoQuestionSearch.trim().toLowerCase();

  const questionMatchesVideoSearch = (question: Question) => {
    if (!videoQuestionSearchTerm) return true;
    const meta = getQuestionMeta(question);
    const haystack = [
      meta.subjectName,
      meta.sectionName,
      meta.skillNames,
      cleanQuestionText(question.text),
      ...(question.options || []).map((option) => cleanQuestionText(option)),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(videoQuestionSearchTerm);
  };

  const filteredRelevantVideoQuestions = useMemo(
    () => relevantVideoQuestions.filter(questionMatchesVideoSearch),
    [relevantVideoQuestions, videoQuestionSearchTerm, subjects, sections, skills],
  );

  const filteredOtherVideoQuestions = useMemo(
    () => otherVideoQuestions.filter(questionMatchesVideoSearch),
    [otherVideoQuestions, videoQuestionSearchTerm, subjects, sections, skills],
  );

  const filteredVideoQuestionsCount = filteredRelevantVideoQuestions.length + filteredOtherVideoQuestions.length;

  const renderBankQuestionPreview = (bankQuestion: Question, selected: boolean, onPick: () => void) => {
    const meta = getQuestionMeta(bankQuestion);
    const preview = cleanQuestionText(bankQuestion.text) || 'سؤال بدون نص';
    const optionsPreview = (bankQuestion.options || []).filter(Boolean).slice(0, 4);

    return (
      <button
        key={bankQuestion.id}
        type="button"
        onClick={onPick}
        className={`w-full rounded-xl border p-3 text-right transition ${
          selected
            ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-2 ring-indigo-100'
            : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
        }`}
      >
        <div className="mb-2 flex flex-wrap gap-1.5 text-[11px] font-black">
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{meta.subjectName}</span>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{meta.sectionName}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{meta.skillNames}</span>
          {selected ? <span className="rounded-full bg-indigo-600 px-2 py-1 text-white">محدد الآن</span> : null}
        </div>
        <div className="line-clamp-2 text-sm font-black leading-6 text-gray-900">{preview}</div>
        {optionsPreview.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {optionsPreview.map((option, optionIndex) => (
              <span
                key={`${bankQuestion.id}-preview-option-${optionIndex}`}
                className={`rounded-lg px-2 py-1 text-xs font-bold ${
                  optionIndex === bankQuestion.correctOptionIndex
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                {cleanQuestionText(option) || `اختيار ${optionIndex + 1}`}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    );
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

    setValidationError('');
    onSave(moduleId, lesson);
  };

  const addInteractiveQuestion = (source: 'inline' | 'bank' = 'inline') => {
    const firstBankQuestion = source === 'bank' ? availableVideoQuestions[0] : undefined;

    setLesson((previous) => ({
      ...previous,
      interactiveQuestions: [
        ...(previous.interactiveQuestions || []),
        {
          id: `video_question_${Date.now()}`,
          timestamp: 0,
          questionId: firstBankQuestion?.id,
          inlineQuestion: firstBankQuestion
            ? undefined
            : {
                text: '',
                options: ['', ''],
                correctOptionIndex: 0,
              },
          mustPass: false,
          actionOnFail: 'continue',
        },
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

  const saveInlineQuestionToBank = (videoQuestionId: string) => {
    const videoQuestion = (lesson.interactiveQuestions || []).find((item) => item.id === videoQuestionId);
    if (!videoQuestion?.inlineQuestion) return;

    const inlineQuestion = videoQuestion.inlineQuestion;
    const bankQuestion: Question = {
      id: `q_video_${Date.now()}`,
      text: inlineQuestion.text,
      options: inlineQuestion.options,
      correctOptionIndex: inlineQuestion.correctOptionIndex,
      type: 'mcq',
      pathId: lesson.pathId,
      subject: lesson.subjectId,
      sectionId: lesson.sectionId,
      skillIds: lesson.skillIds || [],
      difficulty: 'medium',
      source: 'video-inline',
      explanation: '',
      approvalStatus: 'draft',
      showOnPlatform: false,
    };
    addQuestion(bankQuestion);
    updateInteractiveQuestion(videoQuestionId, (current) => ({
      ...current,
      questionId: bankQuestion.id,
      inlineQuestion: undefined,
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" dir="rtl">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            {getLessonIcon(lesson.type)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{lesson.id ? 'تعديل الدرس' : 'درس جديد'}</h3>
            <p className="text-xs text-gray-500">اربط الدرس بالمسار والمادة والمهارات قبل الحفظ.</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="إغلاق">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {validationError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {validationError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الدرس</label>
            <input
              type="text"
              value={lesson.title || ''}
              onChange={event => setLesson({ ...lesson, title: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="مثال: مقدمة في الكسور"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">نوع الدرس</label>
            <select
              value={lesson.type}
              onChange={event => setLesson({ ...lesson, type: event.target.value as LessonType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="video">فيديو</option>
              <option value="text">نص / مقال</option>
              <option value="quiz">اختبار</option>
              <option value="file">ملف</option>
              <option value="live_youtube">بث YouTube مباشر</option>
              <option value="zoom">Zoom</option>
              <option value="google_meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المسار</label>
            <select
              value={lesson.pathId || ''}
              onChange={event => {
                const nextPathId = event.target.value;
                const currentSubjectStillBelongs = subjects.some(
                  (subject) => subject.id === lesson.subjectId && subject.pathId === nextPathId
                );
                setLesson({
                  ...lesson,
                  pathId: nextPathId,
                  subjectId: currentSubjectStillBelongs ? lesson.subjectId : '',
                  sectionId: currentSubjectStillBelongs ? lesson.sectionId : undefined,
                  skillIds: currentSubjectStillBelongs ? lesson.skillIds : [],
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- اختر المسار --</option>
              {paths.map(path => <option key={path.id} value={path.id}>{path.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
            <select
              value={lesson.subjectId || ''}
              onChange={event => setLesson({ ...lesson, subjectId: event.target.value, sectionId: undefined, skillIds: [] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- اختر المادة --</option>
              {subjects.filter(subject => !lesson.pathId || subject.pathId === lesson.pathId).map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المهارة الرئيسة</label>
            <select
              value={lesson.sectionId || ''}
              onChange={event => setLesson({ ...lesson, sectionId: event.target.value || undefined, skillIds: [] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={!lesson.subjectId || availableMainSkills.length === 0}
            >
              <option value="">-- اختر المهارة الرئيسة --</option>
              {availableMainSkills.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المدة</label>
            <input
              type="text"
              value={lesson.duration || ''}
              onChange={event => setLesson({ ...lesson, duration: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="مثال: 12 دقيقة"
            />
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مصدر الفيديو</label>
                <select
                  value={lesson.videoSource || 'upload'}
                  onChange={event => setLesson({ ...lesson, videoSource: event.target.value as Lesson['videoSource'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="upload">رابط فيديو مباشر / CDN</option>
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
              </div>
            </div>
            {lesson.videoSource === 'upload' || !lesson.videoSource ? (
              <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-800">
                الاستضافة المباشرة تعني أن ملف الفيديو موجود لدى مزود تخزين أو CDN خارجي، ثم تحفظ المنصة رابطه فقط. لا يوجد رفع ملف فيديو ثنائي إلى خادم التطبيق في هذا الإصدار.
              </p>
            ) : null}

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-gray-800">أسئلة داخل الفيديو</h5>
                  <p className="text-xs text-gray-500">تظهر للطالب عند توقيت محدد داخل مشغل الدرس، وتعمل في التأسيس والدورات.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addInteractiveQuestion('bank')}
                    disabled={questions.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    <Plus size={14} /> سحب سؤال من مركز الأسئلة
                  </button>
                  <button
                    type="button"
                    onClick={() => addInteractiveQuestion('inline')}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    <Plus size={14} /> سؤال سريع
                  </button>
                </div>
              </div>

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
                            className="self-end rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black"
                          >
                            فتح محرر السؤال
                          </button>
                        </div>

                        {question.questionId ? (
                          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                            {selectedBankQuestion ? renderBankQuestionPreview(selectedBankQuestion, true, () => undefined) : (
                              <p className="text-xs font-bold text-red-600">السؤال المرتبط غير موجود في البنك الحالي.</p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <label className="mb-1 block text-xs font-bold text-gray-600">نص السؤال السريع</label>
                            <input
                              type="text"
                              value={inlineQuestion.text}
                              onChange={(event) =>
                                updateInteractiveQuestion(question.id, (current) => ({
                                  ...current,
                                  inlineQuestion: {
                                    ...(current.inlineQuestion || inlineQuestion),
                                    text: event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {inlineQuestion.options.map((option, optionIndex) => (
                                <label key={optionIndex} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <input
                                    type="radio"
                                    checked={inlineQuestion.correctOptionIndex === optionIndex}
                                    onChange={() =>
                                      updateInteractiveQuestion(question.id, (current) => ({
                                        ...current,
                                        inlineQuestion: {
                                          ...(current.inlineQuestion || inlineQuestion),
                                          correctOptionIndex: optionIndex,
                                        },
                                      }))
                                    }
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(event) =>
                                      updateInteractiveQuestion(question.id, (current) => ({
                                        ...current,
                                        inlineQuestion: {
                                          ...(current.inlineQuestion || inlineQuestion),
                                          options: inlineQuestion.options.map((item, currentIndex) =>
                                            currentIndex === optionIndex ? event.target.value : item,
                                          ),
                                        },
                                      }))
                                    }
                                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                                    placeholder={`اختيار ${optionIndex + 1}`}
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateInteractiveQuestion(question.id, (current) => ({
                                    ...current,
                                    inlineQuestion: {
                                      ...(current.inlineQuestion || inlineQuestion),
                                      options: [...inlineQuestion.options, ''],
                                    },
                                  }))
                                }
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                              >
                                <Plus size={13} className="inline" /> إضافة اختيار
                              </button>
                              <button
                                type="button"
                                disabled={!inlineQuestion.text.trim() || inlineQuestion.options.filter((item) => item.trim()).length < 2}
                                onClick={() => saveInlineQuestionToBank(question.id)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                              >
                                حفظ في مركز الأسئلة
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {lesson.type === 'text' && (
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">محتوى الدرس</label>
            <textarea
              value={lesson.content || ''}
              onChange={event => setLesson({ ...lesson, content: event.target.value })}
              className="min-h-48 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="اكتب محتوى الدرس..."
            />
          </div>
        )}

        {lesson.type === 'file' && (
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">رابط الملف</label>
            <input
              type="text"
              value={lesson.fileUrl || ''}
              onChange={event => setLesson({ ...lesson, fileUrl: event.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://..."
            />
            <p className="mt-2 text-xs font-medium text-gray-500">يحفظ الدرس مرجع الملف فقط؛ استضف الملف لدى مزود تخزين موثوق ثم ضع الرابط هنا.</p>
          </div>
        )}

        {['live_youtube', 'zoom', 'google_meet', 'teams'].includes(lesson.type) && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
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
              <label className="block text-sm font-bold text-gray-700 mb-1">موعد الجلسة</label>
              <input
                type="datetime-local"
                value={lesson.meetingDate || ''}
                onChange={event => setLesson({ ...lesson, meetingDate: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-100">
          إلغاء
        </button>
        <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">
          <Save size={16} /> حفظ الدرس
        </button>
      </div>

      {showQuizBuilder ? (
        <UnifiedQuizBuilder
          onClose={() => setShowQuizBuilder(false)}
          onSave={() => setShowQuizBuilder(false)}
        />
      ) : null}

      {showQuestionBuilder ? (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 overflow-y-auto">
          <div className="mx-auto max-w-4xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-black text-gray-900">محرر سؤال الفيديو</h4>
              <button type="button" onClick={() => setShowQuestionBuilder(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <UnifiedQuestionBuilder
              onSave={(question) => {
                addQuestion(question);
                updateInteractiveQuestion(showQuestionBuilder.videoQuestionId, (current) => ({
                  ...current,
                  questionId: question.id,
                  inlineQuestion: undefined,
                }));
                setShowQuestionBuilder(null);
              }}
              onCancel={() => setShowQuestionBuilder(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
