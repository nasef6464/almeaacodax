import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Edit2, Plus, Search, Trash2, Upload, Eye, X, BookOpen, Target } from 'lucide-react';
import { Question } from '../../types';
import { useStore } from '../../store/useStore';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';

interface QuestionBankManagerProps {
  subjectId?: string;
}

type ImportDraftQuestion = Question;

const normalizeLookup = (value?: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();

const readCell = (row: Record<string, unknown>, keys: string[]) => {
  const normalizedRow = new Map<string, string>();
  Object.entries(row).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      normalizedRow.set(normalizeLookup(key), String(value).trim());
    }
  });

  for (const key of keys) {
    const value = normalizedRow.get(normalizeLookup(key));
    if (value) return value;
  }

  return '';
};

const splitSkillNames = (value: string) =>
  value
    .split(/[,،;؛|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const resolveDifficulty = (value?: string): Question['difficulty'] => {
  const normalized = normalizeLookup(value);
  if (['easy', 'سهل', 'سهله', 'بسيط', 'منخفض'].includes(normalized)) return 'Easy';
  if (['hard', 'صعب', 'صعبه', 'مرتفع', 'عالي'].includes(normalized)) return 'Hard';
  return 'Medium';
};

const resolveQuestionType = (value?: string): Question['type'] => {
  const normalized = normalizeLookup(value);
  if (['true_false', 'true false', 'صح خطا', 'صح/خطا', 'صح او خطا'].includes(normalized)) return 'true_false';
  if (['essay', 'مقالي', 'مقاليه', 'كتابي'].includes(normalized)) return 'essay';
  return 'mcq';
};

const normalizeQuestionContent = (questionText: string, imageValue?: string) => {
  const trimmed = questionText.trim();
  const image = String(imageValue || '').trim();

  if (/^image:/i.test(trimmed)) {
    return { text: '', imageUrl: trimmed.replace(/^image:/i, '').trim() || image };
  }

  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
    return { text: '', imageUrl: image || trimmed };
  }

  return { text: trimmed, imageUrl: image || undefined };
};

const resolveCorrectOptionIndex = (value: string, options: string[]) => {
  const normalized = normalizeLookup(value);
  const letterMap: Record<string, number> = {
    a: 0,
    '1': 0,
    ا: 0,
    أ: 0,
    b: 1,
    '2': 1,
    ب: 1,
    c: 2,
    '3': 2,
    ج: 2,
    d: 3,
    '4': 3,
    د: 3,
    true: 0,
    صح: 0,
    false: 1,
    خطا: 1,
    خطأ: 1,
  };

  if (normalized in letterMap) return letterMap[normalized];

  const matchedIndex = options.findIndex((option) => normalizeLookup(option) === normalized);
  return matchedIndex >= 0 ? matchedIndex : -1;
};

const getStatusMeta = (question: Question) => {
  if (question.approvalStatus === 'rejected') {
    return { label: 'مرفوض', className: 'bg-red-50 text-red-600' };
  }

  if (question.approvalStatus === 'pending_review') {
    return { label: 'بانتظار المراجعة', className: 'bg-amber-50 text-amber-600' };
  }

  if (question.approvalStatus === 'approved') {
    return { label: 'معتمد', className: 'bg-emerald-50 text-emerald-600' };
  }

  return { label: 'مسودة', className: 'bg-gray-100 text-gray-600' };
};

const difficultyLabel = (difficulty: Question['difficulty']) => {
  if (difficulty === 'Easy') return 'سهل';
  if (difficulty === 'Hard') return 'صعب';
  return 'متوسط';
};

const arabicOptionLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({ subjectId }) => {
  const {
    user,
    questions: globalQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    paths,
    subjects,
    sections,
    skills,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canReview = user.role === 'admin';
  const managedPathIds = user.managedPathIds || [];
  const managedSubjectIds = user.managedSubjectIds || [];

  const allowedPaths = useMemo(
    () =>
      user.role === 'teacher'
        ? paths.filter((path) => managedPathIds.length === 0 || managedPathIds.includes(path.id))
        : paths,
    [managedPathIds, paths, user.role],
  );

  const allowedSubjects = useMemo(
    () =>
      user.role === 'teacher'
        ? subjects.filter((subject) => {
            if (managedSubjectIds.length > 0) return managedSubjectIds.includes(subject.id);
            if (managedPathIds.length > 0) return managedPathIds.includes(subject.pathId);
            return true;
          })
        : subjects,
    [managedPathIds, managedSubjectIds, subjects, user.role],
  );

  const [selectedPathId, setSelectedPathId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ imported: number; failed: number; samples: string[] } | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    difficulty: 'Medium',
    type: 'mcq',
    pathId: selectedPathId || '',
    subject: selectedSubjectId || '',
    sectionId: selectedSectionId || '',
    skillIds: [],
  });

  const availableMainSkills = useMemo(
    () =>
      sections
        .filter((section) => section.subjectId === selectedSubjectId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [sections, selectedSubjectId],
  );

  const availableSubSkills = useMemo(
    () =>
      skills
        .filter((skill) => skill.subjectId === selectedSubjectId && (!selectedSectionId || skill.sectionId === selectedSectionId))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [selectedSectionId, selectedSubjectId, skills],
  );

  const questions = useMemo(
    () =>
      globalQuestions.filter((question) => {
        if (user.role === 'teacher') {
          if (managedSubjectIds.length > 0 && !managedSubjectIds.includes(question.subject)) return false;
          if (managedPathIds.length > 0 && question.pathId && !managedPathIds.includes(question.pathId)) return false;
        }
        if (subjectId && question.subject !== subjectId) return false;
        if (selectedSubjectId && question.subject !== selectedSubjectId) return false;
        if (selectedSectionId && question.sectionId !== selectedSectionId) return false;
        if (selectedPathId && !subjectId && !selectedSubjectId && question.pathId !== selectedPathId) return false;
        if (selectedSkillId && (!question.skillIds || !question.skillIds.includes(selectedSkillId))) return false;
        return true;
      }),
    [
      globalQuestions,
      managedPathIds,
      managedSubjectIds,
      selectedPathId,
      selectedSectionId,
      selectedSkillId,
      selectedSubjectId,
      subjectId,
      user.role,
    ],
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const haystack = `${question.text || ''} ${question.options?.join(' ') || ''}`;
        return normalizeLookup(haystack).includes(normalizeLookup(searchTerm));
      }),
    [questions, searchTerm],
  );

  const questionCoverageSummary = useMemo(() => {
    const mainSkillCount = new Set(filteredQuestions.map((question) => question.sectionId).filter(Boolean) as string[]).size;
    const subSkillCount = new Set(filteredQuestions.flatMap((question) => question.skillIds || []).filter(Boolean)).size;
    const pendingCount = filteredQuestions.filter((question) => question.approvalStatus === 'pending_review').length;
    const approvedCount = filteredQuestions.filter((question) => question.approvalStatus === 'approved').length;

    return {
      total: filteredQuestions.length,
      mainSkillCount,
      subSkillCount,
      pendingCount,
      approvedCount,
    };
  }, [filteredQuestions]);

  const resetEditorQuestion = () => {
    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
      difficulty: 'Medium',
      type: 'mcq',
      pathId: selectedPathId || '',
      subject: selectedSubjectId || '',
      sectionId: selectedSectionId || '',
      skillIds: [],
      ownerType: user.role === 'teacher' ? 'teacher' : 'platform',
      ownerId: user.id,
      createdBy: user.id,
      approvalStatus: user.role === 'admin' ? 'approved' : 'pending_review',
    });
  };

  const handleCreateNew = () => {
    resetEditorQuestion();
    setIsEditing(true);
  };

  const handleEdit = (question: Question) => {
    setCurrentQuestion(question);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السؤال نهائيًا؟')) {
      deleteQuestion(id);
    }
  };

  const handleDuplicate = async (question: Question) => {
    try {
      await addQuestion({
        ...question,
        id: `q_${Date.now()}_copy`,
        text: question.text ? `${question.text} (نسخة)` : question.text,
        approvalStatus: 'draft',
      });
      setImportMessage('تم نسخ السؤال بنجاح.');
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'تعذر نسخ السؤال الآن.');
    }
  };

  const handlePreviewQuestion = (question: Question) => {
    setPreviewQuestion(question);
  };

  const downloadQuestionsExport = () => {
    const questionRows = filteredQuestions.map((question) => {
      const pathName = paths.find((path) => path.id === question.pathId)?.name || '';
      const subjectName = subjects.find((subject) => subject.id === question.subject)?.name || '';
      const mainSkillName = sections.find((section) => section.id === question.sectionId)?.name || '';
      const subSkillNames = (question.skillIds || [])
        .map((skillId) => skills.find((skill) => skill.id === skillId)?.name || '')
        .filter(Boolean)
        .join(' | ');

      return {
        المسار: pathName,
        المادة: subjectName,
        'المهارة الرئيسية': mainSkillName,
        'المهارات الفرعية': subSkillNames,
        'نص السؤال': question.text || '',
        'رابط صورة السؤال': question.imageUrl || '',
        'الاختيار أ': question.options?.[0] || '',
        'الاختيار ب': question.options?.[1] || '',
        'الاختيار ج': question.options?.[2] || '',
        'الاختيار د': question.options?.[3] || '',
        'الإجابة الصحيحة': question.type === 'essay' ? 'essay' : (question.options?.[question.correctOptionIndex] || ''),
        الصعوبة: difficultyLabel(question.difficulty),
        النوع: question.type,
        'رابط الشرح': question.videoUrl || '',
        'شرح نصي': question.explanation || '',
        'حالة الاعتماد': getStatusMeta(question).label,
      };
    });

    const instructions = [
      { البيان: 'التصدير الحالي', التوضيح: 'يعرض فقط الأسئلة الحالية بعد الفلترة والبحث.' },
      { البيان: 'الربط', التوضيح: 'المسار ثم المادة ثم المهارة الرئيسية ثم المهارات الفرعية كلها مأخوذة من مركز المهارات.' },
      { البيان: 'حالة الاعتماد', التوضيح: 'تظهر إن كان السؤال مسودة أو بانتظار مراجعة أو معتمدًا.' },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(questionRows), 'questions');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(instructions), 'instructions');
    XLSX.writeFile(workbook, 'questions-export.xlsx');
  };

  const handleSave = async (savedQuestion: Partial<Question>) => {
    if (currentQuestion.id) {
      updateQuestion(currentQuestion.id, { ...savedQuestion, id: currentQuestion.id } as Question);
    } else {
      try {
        await addQuestion({
          ...savedQuestion,
          id: `q_${Date.now()}`,
          ownerType: savedQuestion.ownerType || (user.role === 'teacher' ? 'teacher' : 'platform'),
          ownerId: savedQuestion.ownerId || user.id,
          createdBy: savedQuestion.createdBy || user.id,
          approvalStatus: savedQuestion.approvalStatus || (user.role === 'admin' ? 'approved' : 'pending_review'),
        } as Question);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'تعذر حفظ السؤال الآن.');
        return;
      }
    }

    setIsEditing(false);
  };

  const downloadImportTemplate = () => {
    const samplePath = allowedPaths[0];
    const sampleSubject = allowedSubjects.find((subject) => subject.pathId === samplePath?.id) || allowedSubjects[0];
    const sampleMainSkill = sections.find((section) => section.subjectId === sampleSubject?.id) || sections[0];
    const sampleSubSkill =
      skills.find((skill) => skill.subjectId === sampleSubject?.id && skill.sectionId === sampleMainSkill?.id) || skills[0];

    const templateRows = [
      {
        المسار: samplePath?.name || 'مسار القدرات',
        المادة: sampleSubject?.name || 'الكمي',
        'المهارة الرئيسية': sampleMainSkill?.name || 'العمليات الحسابية الأساسية',
        'المهارة الفرعية': sampleSubSkill?.name || 'ترتيب العمليات الحسابية',
        'نص السؤال': 'إذا كان 2 + 2 = ؟',
        'رابط صورة السؤال': '',
        'الاختيار أ': '3',
        'الاختيار ب': '4',
        'الاختيار ج': '5',
        'الاختيار د': '6',
        'الإجابة الصحيحة': 'ب',
        الصعوبة: 'متوسط',
        النوع: 'mcq',
        'رابط الشرح': 'https://www.youtube.com/watch?v=example',
        'شرح نصي': 'نجمع 2 + 2 فنحصل على 4.',
      },
    ];

    const instructions = [
      { البيان: 'المسار / المادة / المهارة الرئيسية / المهارة الفرعية', التوضيح: 'يجب أن تكون موجودة مسبقًا في مركز المهارات.' },
      { البيان: 'نص السؤال', التوضيح: 'اكتب نص السؤال أو اكتب image:https://example.com/question.png لو السؤال صورة فقط.' },
      { البيان: 'رابط صورة السؤال', التوضيح: 'اختياري، يستخدم عند وجود صورة خارجية للسؤال.' },
      { البيان: 'الإجابة الصحيحة', التوضيح: 'يمكن كتابة أ، ب، ج، د أو A، B، C، D أو نص الاختيار نفسه.' },
      { البيان: 'الصعوبة', التوضيح: 'سهل، متوسط، صعب.' },
      { البيان: 'النوع', التوضيح: 'mcq أو true_false أو essay.' },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows), 'questions');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(instructions), 'instructions');
    XLSX.writeFile(workbook, 'questions-import-template.xlsx');
  };

  const buildQuestionFromRow = (row: Record<string, unknown>, rowNumber: number): ImportDraftQuestion => {
    const questionValue = readCell(row, ['نص السؤال', 'السؤال', 'question', 'questionText']);
    const questionImageValue = readCell(row, ['رابط صورة السؤال', 'صورة السؤال', 'imageUrl', 'questionImage']);
    const pathName = readCell(row, ['المسار', 'path', 'pathName']);
    const subjectName = readCell(row, ['المادة', 'subject', 'subjectName']);
    const sectionName = readCell(row, ['المهارة الرئيسية', 'المهارة الرئيسة', 'mainSkill', 'section']);
    const skillName = readCell(row, ['المهارة الفرعية', 'skill', 'subSkill']);
    const explanationLink = readCell(row, ['رابط الشرح', 'videoUrl', 'explanationVideo']);
    const explanationText = readCell(row, ['شرح نصي', 'الشرح', 'explanation']);
    const typeValue = readCell(row, ['النوع', 'type', 'questionType']);
    const optionA = readCell(row, ['الاختيار أ', 'الاختيار ا', 'الاختيار A', 'optionA', 'A']);
    const optionB = readCell(row, ['الاختيار ب', 'الاختيار B', 'optionB', 'B']);
    const optionC = readCell(row, ['الاختيار ج', 'الاختيار C', 'optionC', 'C']);
    const optionD = readCell(row, ['الاختيار د', 'الاختيار D', 'optionD', 'D']);
    const correctAnswer = readCell(row, ['الإجابة الصحيحة', 'الاجابة الصحيحة', 'correctAnswer', 'answer']);
    const difficulty = readCell(row, ['الصعوبة', 'مستوى الصعوبة', 'difficulty']);

    if ((!questionValue && !questionImageValue) || !pathName || !subjectName || !sectionName || !skillName) {
      throw new Error(`الصف ${rowNumber}: بيانات أساسية ناقصة.`);
    }

    const matchedPath = allowedPaths.find((path) => normalizeLookup(path.name) === normalizeLookup(pathName));
    if (!matchedPath) {
      throw new Error(`الصف ${rowNumber}: المسار "${pathName}" غير موجود أو ليس ضمن صلاحياتك.`);
    }

    const matchedSubject = allowedSubjects.find(
      (subject) => subject.pathId === matchedPath.id && normalizeLookup(subject.name) === normalizeLookup(subjectName),
    );
    if (!matchedSubject) {
      throw new Error(`الصف ${rowNumber}: المادة "${subjectName}" غير موجودة داخل المسار "${pathName}".`);
    }

    const matchedSection = sections.find(
      (section) => section.subjectId === matchedSubject.id && normalizeLookup(section.name) === normalizeLookup(sectionName),
    );
    if (!matchedSection) {
      throw new Error(`الصف ${rowNumber}: المهارة الرئيسية "${sectionName}" غير موجودة داخل المادة "${subjectName}".`);
    }

    const requestedSkillNames = splitSkillNames(skillName);
    const matchedSkills = requestedSkillNames
      .map((requestedSkillName) =>
        skills.find(
          (skill) =>
            skill.subjectId === matchedSubject.id &&
            skill.sectionId === matchedSection.id &&
            normalizeLookup(skill.name) === normalizeLookup(requestedSkillName),
        ),
      )
      .filter(Boolean) as typeof skills;

    if (requestedSkillNames.length === 0 || matchedSkills.length !== requestedSkillNames.length) {
      const missingNames = requestedSkillNames.filter(
        (requestedSkillName) => !matchedSkills.some((skill) => normalizeLookup(skill.name) === normalizeLookup(requestedSkillName)),
      );
      throw new Error(`الصف ${rowNumber}: المهارة الفرعية "${missingNames.join('، ') || skillName}" غير موجودة تحت "${sectionName}".`);
    }

    const { text, imageUrl } = normalizeQuestionContent(questionValue, questionImageValue);
    if (!text && !imageUrl) {
      throw new Error(`الصف ${rowNumber}: حقل السؤال غير صالح.`);
    }

    const type = resolveQuestionType(typeValue);
    const options = type === 'true_false' ? ['صح', 'خطأ'] : [optionA, optionB, optionC, optionD].filter(Boolean);
    if (type !== 'essay' && options.length < 2) {
      throw new Error(`الصف ${rowNumber}: يجب توفير اختيارين على الأقل.`);
    }

    const correctOptionIndex = type === 'essay' ? 0 : resolveCorrectOptionIndex(correctAnswer, options);
    if (type !== 'essay' && correctOptionIndex < 0) {
      throw new Error(`الصف ${rowNumber}: الإجابة الصحيحة غير مطابقة للاختيارات.`);
    }

    return {
      id: `q_import_${Date.now()}_${rowNumber}`,
      text,
      imageUrl,
      options: type === 'essay' ? [] : options,
      correctOptionIndex,
      explanation: explanationText,
      videoUrl: explanationLink || undefined,
      skillIds: [...new Set(matchedSkills.map((skill) => skill.id))],
      pathId: matchedPath.id,
      subject: matchedSubject.id,
      sectionId: matchedSection.id,
      difficulty: resolveDifficulty(difficulty),
      type,
      ownerType: user.role === 'teacher' ? 'teacher' : 'platform',
      ownerId: user.id,
      createdBy: user.id,
      approvalStatus: user.role === 'admin' ? 'approved' : 'pending_review',
      approvedAt: user.role === 'admin' ? Date.now() : undefined,
    };
  };

  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);
    setImportError(null);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('الملف فارغ. ارفع ملفًا يحتوي على صفوف أسئلة.');
      }

      const importedQuestions: Question[] = [];
      const rowErrors: string[] = [];

      rows.forEach((row, rowIndex) => {
        try {
          importedQuestions.push(buildQuestionFromRow(row, rowIndex + 2));
        } catch (error) {
          rowErrors.push(error instanceof Error ? error.message : `الصف ${rowIndex + 2}: تعذر قراءة البيانات.`);
        }
      });

      if (importedQuestions.length === 0) {
        throw new Error(rowErrors.slice(0, 6).join(' ') || 'لم يتم العثور على أسئلة صالحة للاستيراد.');
      }

      for (const question of importedQuestions) {
        await addQuestion(question);
      }

      setImportSummary({
        imported: importedQuestions.length,
        failed: rowErrors.length,
        samples: rowErrors.slice(0, 5),
      });

      setImportMessage(
        rowErrors.length > 0
          ? `تم استيراد ${importedQuestions.length} سؤال بنجاح، وتخطينا ${rowErrors.length} صف يحتاج مراجعة. أول الملاحظات: ${rowErrors.slice(0, 3).join(' ')}`
          : `تم استيراد ${importedQuestions.length} سؤال بنجاح وربطها بمركز المهارات.`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'تعذر استيراد ملف الأسئلة الآن.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleApprove = (question: Question) => {
    updateQuestion(question.id, {
      approvalStatus: 'approved',
      approvedAt: Date.now(),
    });
  };

  const handleReject = (question: Question) => {
    updateQuestion(question.id, {
      approvalStatus: 'rejected',
    });
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in">
        <UnifiedQuestionBuilder
          initialQuestion={currentQuestion as Question}
          subjectId={selectedSubjectId || ''}
          sectionId={selectedSectionId || ''}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مركز الأسئلة</h2>
          <p className="text-gray-500 text-sm mt-1">
            مستودع الأسئلة الرئيسي، وكل سؤال يرتبط بمسار ثم مادة ثم مهارة رئيسية ثم مهارة فرعية من مركز المهارات.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة سؤال جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-800 mb-1">استيراد الأسئلة دفعة واحدة</h3>
          <p className="text-sm text-gray-500">
            حمّل النموذج، املأ الأسئلة، ثم ارفعه. الربط يتم من مركز المهارات فقط، ولا يتم الخلط مع موضوعات التأسيس.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadQuestionsExport}
            className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            تصدير الأسئلة الحالية
          </button>
          <button
            onClick={downloadImportTemplate}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            تحميل نموذج Excel
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
            disabled={isImporting}
          >
            <Upload size={18} />
            {isImporting ? 'جارٍ الاستيراد...' : 'رفع ملف أسئلة'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportQuestions} />
        </div>
      </div>

      {(importMessage || importError || isImporting) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            importError
              ? 'border-red-100 bg-red-50 text-red-700'
              : importMessage
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-amber-100 bg-amber-50 text-amber-700'
          }`}
        >
          {isImporting ? 'جارٍ قراءة ملف الأسئلة وربطه بمركز المهارات...' : importError || importMessage}
        </div>
      )}

      {importSummary && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_220px_1fr]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-black text-emerald-700">أسئلة تم استيرادها</p>
            <p className="mt-2 text-2xl font-black text-emerald-800">{importSummary.imported}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${importSummary.failed ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs font-black ${importSummary.failed ? 'text-amber-700' : 'text-gray-500'}`}>صفوف تحتاج مراجعة</p>
            <p className={`mt-2 text-2xl font-black ${importSummary.failed ? 'text-amber-800' : 'text-gray-700'}`}>{importSummary.failed}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-black text-indigo-700">فحص الربط</p>
            <p className="mt-2 text-sm font-bold leading-7 text-indigo-900">
              {importSummary.failed
                ? 'تم إدخال الأسئلة الصالحة فقط. راجع الصفوف المتبقية غالبًا بسبب اسم مسار/مادة/مهارة غير مطابق لمركز المهارات.'
                : 'كل الصفوف الصالحة تم ربطها بالمسار والمادة والمهارة الرئيسية والفرعية من مركز المهارات.'}
            </p>
            {importSummary.samples.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs font-bold leading-6 text-amber-800">
                {importSummary.samples.map((sample) => (
                  <li key={sample}>{sample}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-gray-500">الأسئلة الحالية</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{questionCoverageSummary.total}</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-black text-indigo-700">المهارات الرئيسية</p>
          <p className="mt-2 text-2xl font-black text-indigo-800">{questionCoverageSummary.mainSkillCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-black text-emerald-700">المهارات الفرعية</p>
          <p className="mt-2 text-2xl font-black text-emerald-800">{questionCoverageSummary.subSkillCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-black text-amber-700">بانتظار المراجعة</p>
          <p className="mt-2 text-2xl font-black text-amber-800">{questionCoverageSummary.pendingCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {!subjectId && (
          <>
            <select
              value={selectedPathId}
              onChange={(event) => {
                setSelectedPathId(event.target.value);
                setSelectedSubjectId('');
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">كل المسارات</option>
              {allowedPaths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.name}
                </option>
              ))}
            </select>
            <select
              value={selectedSubjectId}
              onChange={(event) => {
                setSelectedSubjectId(event.target.value);
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedPathId}
            >
              <option value="">كل المواد</option>
              {allowedSubjects
                .filter((subject) => subject.pathId === selectedPathId)
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
            </select>
          </>
        )}

        <select
          value={selectedSectionId}
          onChange={(event) => {
            setSelectedSectionId(event.target.value);
            setSelectedSkillId('');
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الرئيسية</option>
          {availableMainSkills.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSkillId}
          onChange={(event) => setSelectedSkillId(event.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الفرعية</option>
          {availableSubSkills.map((subSkill) => (
            <option key={subSkill.id} value={subSkill.id}>
              {subSkill.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="ابحث في نص السؤال..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600 w-1/2">نص السؤال</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المهارات الفرعية</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الصعوبة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuestions.map((question) => {
                const statusMeta = getStatusMeta(question);
                return (
                  <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        {question.text ? (
                          <div className="text-sm text-gray-800 line-clamp-2" dangerouslySetInnerHTML={{ __html: question.text }} />
                        ) : question.imageUrl ? (
                          <div className="text-sm font-bold text-indigo-600">سؤال بصورة مرفقة</div>
                        ) : (
                          <div className="text-sm text-gray-400">سؤال بدون نص</div>
                        )}
                        <div className="text-[11px] text-gray-400 mt-1">
                          {question.ownerType === 'teacher'
                            ? 'سؤال معلم'
                            : question.ownerType === 'school'
                              ? 'سؤال مدرسة'
                              : 'سؤال المنصة'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {question.skillIds?.map((skillId) => {
                          const subSkill = skills.find((skill) => skill.id === skillId);
                          return subSkill ? (
                            <span key={skillId} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-bold">
                              {subSkill.name}
                            </span>
                          ) : null;
                        })}
                        {!question.skillIds?.length && <span className="text-xs text-gray-400">غير مربوط</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          question.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-600'
                            : question.difficulty === 'Medium'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {difficultyLabel(question.difficulty)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canReview && question.approvalStatus !== 'approved' && (
                          <button
                            onClick={() => handleApprove(question)}
                            className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            اعتماد
                          </button>
                        )}
                        {canReview && question.approvalStatus !== 'rejected' && (
                          <button
                            onClick={() => handleReject(question)}
                            className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            رفض
                          </button>
                        )}
                        <button
                          onClick={() => handlePreviewQuestion(question)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="معاينة السؤال"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(question)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="نسخ"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(question)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا توجد أسئلة مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewQuestion && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6" onClick={() => setPreviewQuestion(null)}>
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">معاينة السؤال</div>
                <h3 className="mt-3 text-xl font-black text-gray-900">
                  {previewQuestion.text || 'سؤال بصوري/بدون نص'}
                </h3>
                <p className="mt-1 text-sm leading-7 text-gray-500">هذا الشكل يطابق ما يراه الطالب قبل النشر أو داخل الاختبار.</p>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                aria-label="إغلاق المعاينة"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black text-slate-500">المسار</div>
                <div className="mt-2 text-sm font-black text-slate-900">{paths.find((path) => path.id === previewQuestion.pathId)?.name || 'غير محدد'}</div>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <div className="text-xs font-black text-indigo-500">المادة</div>
                <div className="mt-2 text-sm font-black text-indigo-900">{subjects.find((subject) => subject.id === previewQuestion.subject)?.name || 'غير محدد'}</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="text-xs font-black text-emerald-500">المهارة الرئيسية</div>
                <div className="mt-2 text-sm font-black text-emerald-900">{sections.find((section) => section.id === previewQuestion.sectionId)?.name || 'غير محدد'}</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-xs font-black text-amber-500">الصعوبة</div>
                <div className="mt-2 text-sm font-black text-amber-900">{difficultyLabel(previewQuestion.difficulty)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-black text-gray-800">
                  <BookOpen size={16} className="text-indigo-500" />
                  شكل السؤال للطالب
                </div>
                <div className="mt-4 rounded-3xl border border-gray-100 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6">
                  {previewQuestion.imageUrl ? (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                      <img src={previewQuestion.imageUrl} alt="معاينة السؤال" className="max-h-72 w-full object-contain" />
                    </div>
                  ) : null}
                  {previewQuestion.text ? (
                    <div className="text-lg font-black leading-10 text-gray-900" dangerouslySetInnerHTML={{ __html: previewQuestion.text }} />
                  ) : null}
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(previewQuestion.type === 'essay' ? ['إجابة كتابية'] : previewQuestion.options || []).map((option, index) => {
                      const isCorrect = previewQuestion.type !== 'essay' && previewQuestion.correctOptionIndex === index;
                      return (
                        <div
                          key={`${option}-${index}`}
                          className={`min-h-[72px] rounded-2xl border px-4 py-3 text-center text-base font-black leading-8 ${
                            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-400 mb-1">{arabicOptionLabels[index] || 'خيار'}</div>
                          <div>{option}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-gray-800">
                    <Target size={16} className="text-rose-500" />
                    المهارات المرتبطة
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(previewQuestion.skillIds || []).length > 0 ? (
                      previewQuestion.skillIds!.map((skillId) => {
                        const skill = skills.find((item) => item.id === skillId);
                        return skill ? (
                          <span key={skillId} className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 shadow-sm">
                            {skill.name}
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-sm font-bold text-gray-500">لا توجد مهارات فرعية مرتبطة بعد</span>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="text-sm font-black text-indigo-800">الشرح / الفيديو</div>
                  <div className="mt-2 text-sm leading-7 text-indigo-900">
                    {previewQuestion.videoUrl ? (
                      <a href={previewQuestion.videoUrl} target="_blank" rel="noreferrer" className="font-black underline decoration-dotted">
                        فتح رابط الشرح
                      </a>
                    ) : (
                      'لا يوجد رابط شرح مرتبط بهذا السؤال.'
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-4">
                  <div className="text-sm font-black text-slate-800">ملاحظات السؤال</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{previewQuestion.explanation || 'لا توجد ملاحظة تفسيرية محفوظة لهذا السؤال بعد.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
