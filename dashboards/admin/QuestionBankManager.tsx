import React, { useMemo, useState } from 'react';
import { Question } from '../../types';
import { Plus, Search, Edit2, Trash2, Download, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';
import * as XLSX from 'xlsx';

interface QuestionBankManagerProps {
  subjectId?: string;
}

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

  return { label: 'محتوى قديم', className: 'bg-gray-100 text-gray-600' };
};

const normalizeLookup = (value?: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const resolveDifficulty = (value?: string): Question['difficulty'] => {
  const normalized = normalizeLookup(value);
  if (['easy', 'سهل', 'سهلة'].includes(normalized)) return 'Easy';
  if (['hard', 'صعب', 'صعبة'].includes(normalized)) return 'Hard';
  return 'Medium';
};

const resolveQuestionType = (value?: string): Question['type'] => {
  const normalized = normalizeLookup(value);
  if (['true_false', 'true false', 'صح خطأ', 'صح/خطأ', 'صح او خطأ'].includes(normalized)) return 'true_false';
  if (['essay', 'مقالي', 'مقاليّة'].includes(normalized)) return 'essay';
  return 'mcq';
};

const normalizeQuestionContent = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { text: '', imageUrl: undefined as string | undefined };
  }

  if (/^image:/i.test(trimmed)) {
    return { text: '', imageUrl: trimmed.replace(/^image:/i, '').trim() };
  }

  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
    return { text: '', imageUrl: trimmed };
  }

  return { text: trimmed, imageUrl: undefined as string | undefined };
};

const readCell = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
};

const resolveCorrectOptionIndex = (value: string, options: string[]) => {
  const normalized = normalizeLookup(value);
  const letterMap: Record<string, number> = { a: 0, 'أ': 0, b: 1, 'ب': 1, c: 2, 'ج': 2, d: 3, 'د': 3 };

  if (normalized in letterMap) {
    return letterMap[normalized];
  }

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= options.length) {
    return numeric - 1;
  }

  const matchedIndex = options.findIndex((option) => normalizeLookup(option) === normalized);
  return matchedIndex >= 0 ? matchedIndex : -1;
};

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({ subjectId }) => {
  const { user, questions: globalQuestions, addQuestion, updateQuestion, deleteQuestion, paths, subjects, sections, skills } = useStore();
  const canReview = user.role === 'admin';
  const managedPathIds = user.managedPathIds || [];
  const managedSubjectIds = user.managedSubjectIds || [];
  const allowedPaths = user.role === 'teacher'
    ? paths.filter((path) => managedPathIds.length === 0 || managedPathIds.includes(path.id))
    : paths;
  const allowedSubjects = user.role === 'teacher'
    ? subjects.filter((subject) => {
        if (managedSubjectIds.length > 0) return managedSubjectIds.includes(subject.id);
        if (managedPathIds.length > 0) return managedPathIds.includes(subject.pathId);
        return true;
      })
    : subjects;

  const [selectedPathId, setSelectedPathId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    () => sections.filter((section) => section.subjectId === selectedSubjectId && allowedSubjects.some((subject) => subject.id === section.subjectId)),
    [allowedSubjects, sections, selectedSubjectId],
  );

  const availableSubSkills = useMemo(
    () =>
      skills
        .filter((skill) => skill.subjectId === selectedSubjectId && (!selectedSectionId || skill.sectionId === selectedSectionId))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [skills, selectedSectionId, selectedSubjectId],
  );

  const questions = globalQuestions.filter((question) => {
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
  });

  const filteredQuestions = questions.filter((question) => question.text.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreateNew = () => {
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
    });
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
        text: `${question.text} (نسخة)`,
        approvalStatus: 'draft',
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'تعذر نسخ السؤال الآن.');
    }
  };

  const handleSave = async (savedQuestion: Partial<Question>) => {
    if (currentQuestion.id) {
      updateQuestion(currentQuestion.id, { ...savedQuestion, id: currentQuestion.id } as Question);
    } else {
      try {
        await addQuestion({
          ...savedQuestion,
          id: `q_${Date.now()}`,
        } as Question);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'تعذر حفظ السؤال الآن.');
        return;
      }
    }
    setIsEditing(false);
  };

  const downloadImportTemplate = () => {
    const templateRows = [
      {
        السؤال: 'إذا كان 2 + 2 = ؟',
        المسار: allowedPaths[0]?.name || '',
        المادة: allowedSubjects[0]?.name || '',
        'المهارة الرئيسية': availableMainSkills[0]?.name || '',
        'المهارة الفرعية': availableSubSkills[0]?.name || '',
        الصعوبة: 'متوسط',
        النوع: 'mcq',
        'الخيار أ': '3',
        'الخيار ب': '4',
        'الخيار ج': '5',
        'الخيار د': '6',
        'الإجابة الصحيحة': 'ب',
        'رابط الشرح': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'رابط صورة السؤال': '',
        'شرح نصي': 'اجمع 2 + 2 للوصول إلى الإجابة الصحيحة.',
        ملاحظة: 'ضع نص السؤال أو رابط صورة السؤال. ويمكن أيضًا كتابة image:https://example.com/question.png داخل خانة السؤال.',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'questions-template');
    XLSX.writeFile(workbook, 'questions-import-template.xlsx');
  };

  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);
    setImportError(null);

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
        const rowNumber = rowIndex + 2;
        const questionValue = readCell(row, ['السؤال', 'نص السؤال', 'question', 'questionText']);
        const questionImageValue = readCell(row, ['رابط صورة السؤال', 'صورة السؤال', 'imageUrl', 'questionImage']);
        const pathName = readCell(row, ['المسار', 'path', 'pathName']);
        const subjectName = readCell(row, ['المادة', 'subject', 'subjectName']);
        const sectionName = readCell(row, ['المهارة الرئيسية', 'المهارة الرئيسة', 'section', 'mainSkill']);
        const skillName = readCell(row, ['المهارة الفرعية', 'skill', 'subSkill']);
        const explanationLink = readCell(row, ['رابط الشرح', 'videoUrl', 'explanationVideo']);
        const explanationText = readCell(row, ['شرح نصي', 'الشرح', 'explanation']);
        const typeValue = readCell(row, ['النوع', 'type', 'questionType']);
        const optionA = readCell(row, ['الخيار أ', 'الخيار A', 'optionA', 'A']);
        const optionB = readCell(row, ['الخيار ب', 'الخيار B', 'optionB', 'B']);
        const optionC = readCell(row, ['الخيار ج', 'الخيار C', 'optionC', 'C']);
        const optionD = readCell(row, ['الخيار د', 'الخيار D', 'optionD', 'D']);
        const correctAnswer = readCell(row, ['الإجابة الصحيحة', 'الاجابة الصحيحة', 'correctAnswer', 'answer']);

        if ((!questionValue && !questionImageValue) || !pathName || !subjectName || !sectionName || !skillName) {
          rowErrors.push(`الصف ${rowNumber}: البيانات الأساسية ناقصة.`);
          return;
        }

        const matchedPath = paths.find((path) => normalizeLookup(path.name) === normalizeLookup(pathName));
        if (!matchedPath) {
          rowErrors.push(`الصف ${rowNumber}: المسار "${pathName}" غير موجود.`);
          return;
        }

        const matchedSubject = subjects.find(
          (subject) =>
            subject.pathId === matchedPath.id &&
            normalizeLookup(subject.name) === normalizeLookup(subjectName),
        );
        if (!matchedSubject) {
          rowErrors.push(`الصف ${rowNumber}: المادة "${subjectName}" غير موجودة داخل المسار "${pathName}".`);
          return;
        }

        const matchedSection = sections.find(
          (section) =>
            section.subjectId === matchedSubject.id &&
            normalizeLookup(section.name) === normalizeLookup(sectionName),
        );
        if (!matchedSection) {
          rowErrors.push(`الصف ${rowNumber}: المهارة الرئيسية "${sectionName}" غير موجودة داخل المادة "${subjectName}".`);
          return;
        }

        const matchedSkill = skills.find(
          (skill) =>
            skill.subjectId === matchedSubject.id &&
            skill.sectionId === matchedSection.id &&
            normalizeLookup(skill.name) === normalizeLookup(skillName),
        );
        if (!matchedSkill) {
          rowErrors.push(`الصف ${rowNumber}: المهارة الفرعية "${skillName}" غير موجودة تحت "${sectionName}".`);
          return;
        }

        const { text, imageUrl } = normalizeQuestionContent(questionValue || (questionImageValue ? `image:${questionImageValue}` : ''));
        const finalImageUrl = questionImageValue || imageUrl;
        if (!text && !finalImageUrl) {
          rowErrors.push(`الصف ${rowNumber}: حقل السؤال غير صالح.`);
          return;
        }

        const type = resolveQuestionType(typeValue);
        const options = type === 'true_false' ? ['صح', 'خطأ'] : [optionA, optionB, optionC, optionD].filter(Boolean);
        if (type !== 'essay' && options.length < 2) {
          rowErrors.push(`الصف ${rowNumber}: يجب توفير الخيارات للسؤال.`);
          return;
        }

        const correctOptionIndex = type === 'essay' ? 0 : resolveCorrectOptionIndex(correctAnswer, options);
        if (type !== 'essay' && correctOptionIndex < 0) {
          rowErrors.push(`الصف ${rowNumber}: الإجابة الصحيحة غير مطابقة للخيارات.`);
          return;
        }

        importedQuestions.push({
          id: `q_import_${Date.now()}_${rowIndex}`,
          text,
          imageUrl: finalImageUrl,
          options: type === 'essay' ? [] : options,
          correctOptionIndex,
          explanation: explanationText,
          videoUrl: explanationLink || undefined,
          skillIds: [matchedSkill.id],
          pathId: matchedPath.id,
          subject: matchedSubject.id,
          sectionId: matchedSection.id,
          difficulty: resolveDifficulty(readCell(row, ['الصعوبة', 'difficulty'])),
          type,
          ownerType: user.role === 'teacher' ? 'teacher' : 'platform',
          ownerId: user.id,
          createdBy: user.id,
          approvalStatus: user.role === 'admin' ? 'approved' : 'pending_review',
          approvedAt: user.role === 'admin' ? Date.now() : undefined,
        });
      });

      if (rowErrors.length > 0) {
        throw new Error(rowErrors.slice(0, 6).join(' '));
      }

      await Promise.all(importedQuestions.map((question) => addQuestion(question)));
      setImportMessage(`تم استيراد ${importedQuestions.length} سؤال بنجاح.`);
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
          <p className="text-gray-500 text-sm mt-1">مراجعة بنك الأسئلة واعتماد ما يُضاف قبل دخوله في الاختبارات والتحليلات.</p>
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
          <p className="text-sm text-gray-500">حمّل نموذج Excel، ثم ارفع الملف وسيتم ربط المسار والمادة والمهارات من مركز المهارات مباشرة.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadImportTemplate}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            تحميل نموذج Excel
          </button>
          <label className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center gap-2 cursor-pointer">
            <Upload size={18} />
            رفع ملف أسئلة
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportQuestions} />
          </label>
        </div>
      </div>

      {(importMessage || importError || isImporting) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          importError
            ? 'border-red-100 bg-red-50 text-red-700'
            : importMessage
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-amber-100 bg-amber-50 text-amber-700'
        }`}>
          {isImporting ? 'جارٍ قراءة ملف الأسئلة وربطه بمركز المهارات...' : importError || importMessage}
        </div>
      )}

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
                <option key={path.id} value={path.id}>{path.name}</option>
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
              {allowedSubjects.filter((subject) => subject.pathId === selectedPathId).map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
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
          <option value="">كل المهارات الرئيسة</option>
          {availableMainSkills.map((section) => (
            <option key={section.id} value={section.id}>{section.name}</option>
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
            <option key={subSkill.id} value={subSkill.id}>{subSkill.name}</option>
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
                          {question.ownerType === 'teacher' ? 'سؤال معلم' : question.ownerType === 'school' ? 'سؤال مدرسة' : 'سؤال المنصة'}
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
                        {question.difficulty === 'Easy' ? 'سهل' : question.difficulty === 'Medium' ? 'متوسط' : 'صعب'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canReview && question.approvalStatus !== 'approved' && (
                          <button onClick={() => handleApprove(question)} className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                            اعتماد
                          </button>
                        )}
                        {canReview && question.approvalStatus !== 'rejected' && (
                          <button onClick={() => handleReject(question)} className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            رفض
                          </button>
                        )}
                        <button onClick={() => handleDuplicate(question)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="نسخ">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button onClick={() => handleEdit(question)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(question.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
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
    </div>
  );
};
