import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Award, Eye, ExternalLink, Filter, Plus, Save, Search, Trash2, X, Image as ImageIcon, CheckSquare, Square, ZoomIn, Users, ChevronDown, ChevronUp, PenLine, Sparkles, FileText, Building2, Globe, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { MockExamSection, Question, Quiz } from '../../types';
import { getMockExamQuestionCount, getMockExamSections, isPathMockExam } from '../../utils/mockExam';
import { normalizeQuestionHtml } from '../../utils/questionHtml';
import { getDefaultQuizSettings } from '../../utils/quizSettings';
import { EXAM_QUESTION_BANK_EMPTY_MESSAGE, useExamQuestionBank } from '../../utils/exams/questionBankSource';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';
import { SmartQuestionSelector } from './SmartQuestionSelector';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftSection = MockExamSection;
type ExamType = 'regular' | 'mock';
type PublishMode = 'platform' | 'school';

export interface MockExamManagerProps {
  /** 'admin' (default) can publish to platform & set pricing. 'supervisor' targets own school/groups only. */
  role?: 'admin' | 'supervisor';
  /** Restrict path selector to these IDs. Undefined = show all. */
  allowedPathIds?: string[];
  /** Groups available for targeting (supervisor's scoped groups). */
  allowedGroupIds?: string[];
  /** School group ID for the supervisor. */
  allowedSchoolGroupId?: string;
  /** If provided, a back button appears at the top. */
  onClose?: () => void;
  /** Pre-select exam type on mount. */
  initialExamType?: ExamType;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createSection = (title: string, subjectId = '', order = 0): DraftSection => ({
  id: `mock_sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title,
  subjectId,
  questionIds: [],
  timeLimit: 25,
  order,
});

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
const plainQuestionText = (value?: string | null) => normalizeQuestionHtml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (value: string | undefined, keywords: string[]) => {
  const normalized = (value || '').toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
};

const findSubjectByKeywords = (pathSubjects: Array<{ id: string; name: string }>, keywords: string[]) =>
  pathSubjects.find((subject) => includesAny(subject.name, keywords));

const buildQiyasSections = (pathName: string | undefined, pathSubjects: Array<{ id: string; name: string }>) => {
  const isTahsili = includesAny(pathName, ['تحصيلي', 'tahsili']);
  const isQudrat = includesAny(pathName, ['قدرات', 'qudrat']);

  if (isTahsili) {
    const tahsiliSubjects = [
      { title: 'القسم الأول - الرياضيات', keywords: ['رياضيات', 'math'], domain: 'math' as const },
      { title: 'القسم الثاني - الفيزياء', keywords: ['فيزياء', 'physics'], domain: 'physics' as const },
      { title: 'القسم الثالث - الكيمياء', keywords: ['كيمياء', 'chemistry'], domain: 'chemistry' as const },
      { title: 'القسم الرابع - الأحياء', keywords: ['أحياء', 'احياء', 'biology'], domain: 'biology' as const },
    ];
    const matchedSections = tahsiliSubjects
      .map((item, index) => {
        const subject = findSubjectByKeywords(pathSubjects, item.keywords);
        return subject ? { ...createSection(item.title, subject.id, index), domain: item.domain, isStrictSectionLock: true, timeLimit: 25 } : null;
      })
      .filter(Boolean) as DraftSection[];
    if (matchedSections.length > 0) return matchedSections;
  }

  if (isQudrat) {
    const quantitativeSubject = findSubjectByKeywords(pathSubjects, ['كمي', 'الكمي', 'quant']);
    const verbalSubject = findSubjectByKeywords(pathSubjects, ['لفظي', 'اللفظي', 'verbal']);
    const qudratSections = [
      { title: 'القسم الأول — كمي', subjectId: quantitativeSubject?.id || pathSubjects[0]?.id || '', domain: 'quantitative' as const },
      { title: 'القسم الثاني — لفظي', subjectId: verbalSubject?.id || pathSubjects[1]?.id || pathSubjects[0]?.id || '', domain: 'verbal' as const },
      { title: 'القسم الثالث — كمي', subjectId: quantitativeSubject?.id || pathSubjects[0]?.id || '', domain: 'quantitative' as const },
      { title: 'القسم الرابع — لفظي', subjectId: verbalSubject?.id || pathSubjects[1]?.id || pathSubjects[0]?.id || '', domain: 'verbal' as const },
      { title: 'القسم الخامس — كمي', subjectId: quantitativeSubject?.id || pathSubjects[0]?.id || '', domain: 'quantitative' as const },
    ];
    return qudratSections
      .filter((section) => section.subjectId)
      .map((section, index) => ({ ...createSection(section.title, section.subjectId, index), domain: section.domain, isStrictSectionLock: true, timeLimit: 25 }));
  }

  return pathSubjects.slice(0, 4).map((subject, index) => ({ ...createSection(subject.name, subject.id, index), domain: 'general' as const, isStrictSectionLock: true, timeLimit: 25 }));
};

// ─── Smart Auto-Select ───────────────────────────────────────────────────────

/** Picks `count` random questions from the bank filtered by skills and difficulty */
const autoSelectQuestions = (
  pool: Question[],
  skillIds: string[],
  difficulty: 'all' | Question['difficulty'],
  count: number,
): string[] => {
  const filtered = pool.filter((q) => {
    const skillMatch = skillIds.length === 0 || (q.skillIds || []).some((sid) => skillIds.includes(sid));
    const diffMatch = difficulty === 'all' || q.difficulty === difficulty;
    return skillMatch && diffMatch;
  });
  // Shuffle and take `count`
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => q.id);
};

// ─── Visual Question Card ─────────────────────────────────────────────────────

const QuestionCard: React.FC<{
  question: Question;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ question, isSelected, onToggle }) => {
  const [imgZoomed, setImgZoomed] = useState(false);
  const text = plainQuestionText(question.text);
  const hasImage = Boolean(question.imageUrl);

  return (
    <>
      <div
        onClick={onToggle}
        className={`group relative cursor-pointer rounded-2xl border-2 p-3 transition-all duration-150 ${
          isSelected
            ? 'border-indigo-400 bg-indigo-50/80 shadow-sm shadow-indigo-100'
            : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
        }`}
      >
        {/* Selection indicator */}
        <div className={`absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white group-hover:border-indigo-300'}`}>
          {isSelected && <span className="block h-2 w-2 rounded-full bg-white" />}
        </div>

        <div className="mr-7">
          {hasImage && (
            <div className="relative mb-2 overflow-hidden rounded-xl">
              <img
                src={question.imageUrl}
                alt="سؤال بصري"
                className="max-h-32 w-full object-contain rounded-xl bg-gray-50"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setImgZoomed(true); }}
                className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-black text-white backdrop-blur-sm"
              >
                <ZoomIn size={10} /> تكبير
              </button>
            </div>
          )}

          {text && (
            <p className="line-clamp-2 text-sm font-bold leading-6 text-gray-800" dir="rtl">
              {text}
            </p>
          )}

          {question.options && question.options.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {question.options.slice(0, 4).map((opt, idx) => (
                <div key={idx} className="truncate rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-bold text-gray-600">
                  {String.fromCharCode(0x0041 + idx)}. {opt}
                </div>
              ))}
            </div>
          )}

          {/* Metadata row */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              question.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
              question.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {question.difficulty === 'Easy' ? 'سهل' : question.difficulty === 'Hard' ? 'صعب' : 'متوسط'}
            </span>
            {hasImage && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700">
                📷 بصري
              </span>
            )}
            {question.type === 'true_false' && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                صح/خطأ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {imgZoomed && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImgZoomed(false)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white p-4">
            <button
              type="button"
              onClick={() => setImgZoomed(false)}
              className="absolute left-3 top-3 rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
            <img
              src={question.imageUrl}
              alt="سؤال بصري - تكبير"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            {text && (
              <p className="mt-3 text-center text-sm font-bold text-gray-700" dir="rtl">{text}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ─── Smart Pick Panel (per section) ──────────────────────────────────────────

const SmartPickPanel: React.FC<{
  pool: Question[];
  pathSkills: Array<{ id: string; name: string }>;
  onApply: (questionIds: string[]) => void;
  currentCount: number;
}> = ({ pool, pathSkills, onApply, currentCount }) => {
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'all' | Question['difficulty']>('all');
  const [count, setCount] = useState(Math.max(currentCount, 10));

  const previewCount = useMemo(() => {
    const filtered = pool.filter((q) => {
      const skillMatch = selectedSkillIds.length === 0 || (q.skillIds || []).some((sid) => selectedSkillIds.includes(sid));
      const diffMatch = difficulty === 'all' || q.difficulty === difficulty;
      return skillMatch && diffMatch;
    });
    return filtered.length;
  }, [pool, selectedSkillIds, difficulty]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-black text-violet-800">
        <Sparkles size={16} className="text-violet-600" />
        الاختيار الذكي من بنك الأسئلة
      </div>

      {/* Skills */}
      <div>
        <p className="text-xs font-black text-gray-500 mb-2">اختر المهارات (الكل = لا فلتر)</p>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {pathSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-black transition-all ${
                selectedSkillIds.includes(skill.id)
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300'
              }`}
            >
              {skill.name}
            </button>
          ))}
          {pathSkills.length === 0 && (
            <span className="text-xs text-gray-400">لا توجد مهارات لهذا المسار/القسم</span>
          )}
        </div>
      </div>

      {/* Difficulty + Count */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-black text-gray-500 block mb-1">الصعوبة</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold"
          >
            <option value="all">مختلطة</option>
            <option value="Easy">سهل</option>
            <option value="Medium">متوسط</option>
            <option value="Hard">صعب</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-black text-gray-500 block mb-1">عدد الأسئلة</label>
          <input
            type="number"
            min={1}
            max={previewCount}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
        <span>متاح في البنك: <strong className="text-violet-700">{previewCount} سؤال</strong> تطابق الفلتر</span>
        <button
          type="button"
          onClick={() => {
            const ids = autoSelectQuestions(pool, selectedSkillIds, difficulty, count);
            onApply(ids);
          }}
          disabled={previewCount === 0}
          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50 hover:bg-violet-700 transition-all"
        >
          <Sparkles size={12} className="inline ml-1" />
          اختيار تلقائي ({Math.min(count, previewCount)})
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const MockExamManager: React.FC<MockExamManagerProps> = ({
  role = 'admin',
  allowedPathIds,
  allowedGroupIds,
  allowedSchoolGroupId,
  onClose,
  initialExamType = 'mock',
}) => {
  const { paths, subjects, sections: allSections, quizzes, skills, groups, addQuiz, updateQuiz, deleteQuiz, addQuestion } = useStore();

  // Filter paths by role
  const availablePaths = useMemo(() =>
    allowedPathIds && allowedPathIds.length > 0
      ? paths.filter((p) => allowedPathIds.includes(p.id))
      : paths,
    [paths, allowedPathIds]
  );

  // ── Exam Type ──────────────────────────────────────────────────────────────
  const [examType, setExamType] = useState<ExamType>(initialExamType);

  // ── Path ──────────────────────────────────────────────────────────────────
  const [selectedPathId, setSelectedPathId] = useState(availablePaths[0]?.id || '');

  const {
    questions: questionBankQuestions,
    total: questionBankTotal,
    isLoading: isQuestionBankLoading,
    error: questionBankError,
    refresh: refreshQuestionBank,
  } = useExamQuestionBank({ pathId: selectedPathId, enabled: Boolean(selectedPathId) });

  // ── Builder state ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [accessType, setAccessType] = useState<Quiz['access']['type']>('free');
  const [accessPrice, setAccessPrice] = useState(99);
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Question['difficulty']>('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [sectionIdFilter, setSectionIdFilter] = useState('');
  const [saveError, setSaveError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [smartSections, setSmartSections] = useState<Set<string>>(new Set()); // sections in smart mode

  // ── Inline Question Builder state ──────────────────────────────────────────
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [builderTargetSectionId, setBuilderTargetSectionId] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // ── Targeting state ───────────────────────────────────────────────────────
  const [publishMode, setPublishMode] = useState<PublishMode>('platform'); // admin only
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]); // supervisor: selected groups; admin: school targeting
  const [targetSchoolId, setTargetSchoolId] = useState(''); // admin: school targeting
  const [dueDate, setDueDate] = useState('');

  // ── Regular exam subject ───────────────────────────────────────────────────
  const [regularSubjectId, setRegularSubjectId] = useState('');
  const [regularTimeLimit, setRegularTimeLimit] = useState(30);
  const [regularQuestionIds, setRegularQuestionIds] = useState<string[]>([]);

  // ── Derived ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPathId && availablePaths[0]?.id) {
      setSelectedPathId(availablePaths[0].id);
    }
  }, [availablePaths, selectedPathId]);

  // Update title defaults when exam type changes
  useEffect(() => {
    if (!editingId) {
      setTitle(examType === 'mock' ? 'اختبار محاكي جديد' : 'اختبار موجه جديد');
      setDescription(examType === 'mock' ? 'تجربة محاكية على مستوى المسار.' : '');
    }
  }, [examType, editingId]);

  const pathSubjects = useMemo(
    () => subjects.filter((subject) => subject.pathId === selectedPathId),
    [selectedPathId, subjects],
  );

  const pathSections = useMemo(
    () => allSections.filter((sec) => pathSubjects.some((s) => s.id === sec.subjectId)),
    [allSections, pathSubjects],
  );

  const pathQuestions = questionBankQuestions;
  const pathSkills = useMemo(
    () => skills.filter((skill) => skill.pathId === selectedPathId || pathSubjects.some((subject) => subject.id === skill.subjectId)),
    [pathSubjects, selectedPathId, skills],
  );
  const selectedPathName = availablePaths.find((path) => path.id === selectedPathId)?.name || '';

  const mockExams = useMemo(
    () => quizzes.filter((quiz) => isPathMockExam(quiz, selectedPathId)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [quizzes, selectedPathId],
  );

  // Scoped groups for supervisor
  const scopedGroups = useMemo(() => {
    if (role === 'supervisor' && allowedGroupIds) {
      return groups.filter((g) => allowedGroupIds.includes(g.id));
    }
    if (role === 'admin') {
      const schools = groups.filter((g) => g.type === 'SCHOOL');
      return schools;
    }
    return groups;
  }, [groups, role, allowedGroupIds]);

  const adminSchoolGroups = useMemo(() =>
    groups.filter((g) => g.type === 'SCHOOL'),
    [groups]
  );

  const adminSchoolClasses = useMemo(() =>
    adminSchoolGroups.find((s) => s.id === targetSchoolId)
      ? groups.filter((g) => g.parentId === targetSchoolId || g.type === 'CLASS' && groups.some(s => s.id === g.parentId && s.id === targetSchoolId))
      : [],
    [adminSchoolGroups, targetSchoolId, groups]
  );

  const getSectionsForSubject = useCallback(
    (subjectId: string) => allSections.filter((sec) => sec.subjectId === subjectId),
    [allSections],
  );

  const filterQuestionsForSection = (section: DraftSection) => {
    const search = questionSearchTerm.trim().toLowerCase();
    return pathQuestions.filter((question) => {
      const subjectMatches = !section.subjectId || question.subject === section.subjectId;
      const sectionMatches = !sectionIdFilter || question.sectionId === sectionIdFilter;
      const difficultyMatches = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      const skillMatches = !skillFilter || (question.skillIds || []).includes(skillFilter);
      const text = `${plainQuestionText(question.text)} ${question.id}`.toLowerCase();
      const searchMatches = !search || text.includes(search);
      return subjectMatches && sectionMatches && difficultyMatches && skillMatches && searchMatches;
    });
  };

  const filterRegularQuestions = useMemo(() => {
    const search = questionSearchTerm.trim().toLowerCase();
    return pathQuestions.filter((q) => {
      const subjectMatches = !regularSubjectId || q.subject === regularSubjectId;
      const difficultyMatches = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
      const skillMatches = !skillFilter || (q.skillIds || []).includes(skillFilter);
      const text = `${plainQuestionText(q.text)} ${q.id}`.toLowerCase();
      const searchMatches = !search || text.includes(search);
      return subjectMatches && difficultyMatches && skillMatches && searchMatches;
    });
  }, [pathQuestions, regularSubjectId, questionSearchTerm, difficultyFilter, skillFilter]);

  const resetDraft = () => {
    setEditingId(null);
    setTitle(examType === 'mock' ? 'اختبار محاكي جديد' : 'اختبار موجه جديد');
    setDescription(examType === 'mock' ? 'تجربة محاكية على مستوى المسار.' : '');
    setPassingScore(60);
    setAccessType('free');
    setAccessPrice(99);
    setSections(examType === 'mock' ? buildQiyasSections(selectedPathName, pathSubjects) : []);
    setExpandedSections(new Set());
    setSmartSections(new Set());
    setTargetGroupIds([]);
    setTargetSchoolId('');
    setDueDate('');
    setRegularSubjectId(pathSubjects[0]?.id || '');
    setRegularTimeLimit(30);
    setRegularQuestionIds([]);
  };

  const loadExam = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setSelectedPathId(quiz.mockExam?.pathId || quiz.pathId);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setPassingScore(quiz.settings?.passingScore || 60);
    setAccessType(quiz.access?.type || 'free');
    setAccessPrice(quiz.access?.price || 99);
    setSections(getMockExamSections(quiz));
    setExpandedSections(new Set());
    setSmartSections(new Set());
    setTargetGroupIds(quiz.targetGroupIds || []);
    setPublishMode(quiz.showOnPlatform ? 'platform' : 'school');
    setDueDate(quiz.dueDate || '');
    // للاختبارات العادية الموجهة: استعادة الأسئلة والمادة والوقت
    if (!quiz.mockExam?.enabled) {
      setRegularSubjectId(quiz.subjectId || '');
      setRegularTimeLimit((quiz.settings as any)?.timeLimit || 30);
      setRegularQuestionIds(quiz.questionIds || []);
    }
  };

  const toggleQuestion = (sectionId: string, questionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const exists = section.questionIds.includes(questionId);
        return {
          ...section,
          questionIds: exists
            ? section.questionIds.filter((id) => id !== questionId)
            : [...section.questionIds, questionId],
        };
      }),
    );
  };

  const toggleRegularQuestion = (questionId: string) => {
    setRegularQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const selectAllInSection = (sectionId: string, questionIds: string[]) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return { ...section, questionIds: unique([...section.questionIds, ...questionIds]) };
      }),
    );
  };

  const clearSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return { ...section, questionIds: [] };
      }),
    );
  };

  const applySmartPick = async (sectionId: string, questionIds: string[]) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return { ...section, questionIds: unique([...section.questionIds, ...questionIds]) };
      }),
    );
  };


  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleSmartMode = (sectionId: string) => {
    setSmartSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleInlineQuestionSave = useCallback(
    async (draft: Partial<Question>) => {
      if (isSavingQuestion) return;
      setIsSavingQuestion(true);
      try {
        const now = Date.now();
        // لا نُنشئ ID محلياً — نُرسل للسيرفر ونستخدم ID الحقيقي المُرجع
        const questionPayload: Question = {
          ...draft,
          pathId: selectedPathId,
          approvalStatus: 'approved',
          approvedAt: now,
          ownerType: 'platform',
          source: 'mock',
          createdAt: now,
        } as Question;

        const persistedQuestion = await addQuestion(questionPayload);
        await refreshQuestionBank();

        if (builderTargetSectionId) {
          // نستخدم ID السيرفر الحقيقي وليس ID محلي مؤقت
          setSections((prev) =>
            prev.map((s) =>
              s.id === builderTargetSectionId ? { ...s, questionIds: unique([...s.questionIds, persistedQuestion.id]) } : s,
            ),
          );
        }
        setShowQuestionBuilder(false);
        setBuilderTargetSectionId('');
      } catch (err) {
        console.error('Failed to save question', err);
        // أظهر الخطأ للمستخدم بدلاً من ابتلاعه بصمت
        setSaveError(err instanceof Error ? err.message : 'تعذر حفظ السؤال. تحقق من الاتصال وحاول مرة أخرى.');
      } finally {
        setIsSavingQuestion(false);
      }
    },
    [addQuestion, builderTargetSectionId, isSavingQuestion, refreshQuestionBank, selectedPathId],
  );

  // ── Save (الدالة الوحيدة للحفظ — async مع إدارة الأخطاء وإزالة المعرفات المحلية) ──────────────────────
  const saveExam = async () => {
    const now = Date.now();
    setSaveError('');

    try {
      if (examType === 'regular') {
        if (regularQuestionIds.length === 0) {
          setSaveError('لا يمكن حفظ الاختبار بدون أسئلة.');
          return;
        }

        const finalTargetGroupIds = role === 'supervisor'
          ? targetGroupIds
          : (publishMode === 'school' ? [targetSchoolId, ...targetGroupIds].filter(Boolean) : []);

        // لا نُنشئ ID محلياً — السيرفر هو مصدر الحقيقة للمعرفات الدائمة
        const payload: Omit<Quiz, 'id'> & { id?: string } = {
          ...(editingId ? { id: editingId } : {}),
          title: title.trim() || 'اختبار موجه',
          description,
          pathId: selectedPathId,
          subjectId: regularSubjectId || pathSubjects[0]?.id || '',
          quizKind: 'test' as const,
          type: 'quiz',
          // test = يظهر في التدريبات والاختبارات — الاستهداف يتحكم في من يراه
          placement: 'both',
          showInTraining: true,
          showInMock: true,
          mode: 'central',
          settings: {
            ...getDefaultQuizSettings({ mode: 'central' }),
            passingScore,
            timeLimit: regularTimeLimit,
          },
          access: { type: 'free', allowedGroupIds: [] },
          questionIds: unique(regularQuestionIds),
          targetGroupIds: finalTargetGroupIds,
          dueDate: dueDate || undefined,
          createdAt: now,
          isPublished: true,
          showOnPlatform: false,
          approvalStatus: 'approved',
          approvedAt: now,
        };

        if (editingId) await updateQuiz(editingId, payload as Quiz);
        else await addQuiz(payload as Quiz);
        resetDraft();
        return;
      }

      // Mock exam
      const cleanSections = sections
        .map((section, index) => ({ ...section, order: index, questionIds: unique(section.questionIds) }))
        .filter((section) => section.title.trim() && section.questionIds.length > 0);
      const allQuestionIds = unique(cleanSections.flatMap((section) => section.questionIds));
      if (allQuestionIds.length === 0) {
        setSaveError('لا يمكن حفظ الاختبار المحاكي بدون أسئلة.');
        return;
      }

      const firstSubjectId = cleanSections[0]?.subjectId || pathSubjects[0]?.id || 'mock_exam';
      const isAdminPlatform = role === 'admin' && publishMode === 'platform';
      const finalTargetGroupIds = role === 'supervisor'
        ? targetGroupIds
        : (publishMode === 'school' ? [targetSchoolId, ...targetGroupIds].filter(Boolean) : []);

      // لا نُنشئ ID محلياً — السيرفر هو مصدر الحقيقة للمعرفات الدائمة
      const payload: Omit<Quiz, 'id'> & { id?: string } = {
        ...(editingId ? { id: editingId } : {}),
        title: title.trim() || 'اختبار محاكي',
        description,
        pathId: selectedPathId,
        subjectId: firstSubjectId,
        quizKind: 'mock' as const,
        type: 'quiz',
        placement: 'mock',
        showInTraining: false,
        // ضروري: isMockQuiz() يتحقق من showInMock — يجب أن يكون true ليظهر في QuizzesManager
        showInMock: true,
        mode: isAdminPlatform ? 'saher' : 'central',
        settings: {
          ...getDefaultQuizSettings({ mode: isAdminPlatform ? 'saher' : 'central', mockExam: true }),
          passingScore,
          timeLimit: cleanSections.reduce((sum, section) => sum + (Number(section.timeLimit) || 0), 0) || 60,
        },
        access: isAdminPlatform
          ? { type: accessType, price: accessType === 'paid' ? accessPrice : undefined, allowedGroupIds: [] }
          : { type: 'free', allowedGroupIds: [] },
        questionIds: allQuestionIds,
        mockExam: { enabled: true, pathId: selectedPathId, sections: cleanSections },
        targetGroupIds: finalTargetGroupIds,
        dueDate: (!isAdminPlatform && dueDate) ? dueDate : undefined,
        createdAt: now,
        isPublished: true,
        showOnPlatform: isAdminPlatform,
        approvalStatus: 'approved',
        approvedAt: now,
      };

      if (editingId) await updateQuiz(editingId, payload as Quiz);
      else await addQuiz(payload as Quiz);
      resetDraft();
    } catch (err) {
      // النموذج يبقى مفتوحاً عند الفشل — لا نستدعي resetDraft
      setSaveError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ. تحقق من الاتصال وحاول مرة أخرى.');
    }
  };

  const handlePreviewQuiz = (quiz: Quiz) => setPreviewQuiz(quiz);

  const getPreviewSubjectNames = (quiz: Quiz) =>
    getMockExamSections(quiz)
      .map((section) => subjects.find((subject) => subject.id === section.subjectId)?.name || '')
      .filter(Boolean);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Back button (for supervisor mode) */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold"
        >
          <ArrowRight size={20} />
          العودة لقائمة الاختبارات
        </button>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              <Award size={16} />
              {role === 'supervisor' ? 'إنشاء اختبار موجه' : 'مركز إنشاء الاختبارات'}
            </div>
            <h2 className="mt-3 text-2xl font-black text-gray-900">
              {role === 'supervisor' ? 'منشئ الاختبارات الموجهة' : 'مركز الاختبارات والمحاكيات'}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-gray-500">
              {examType === 'mock'
                ? 'الاختبار المحاكي على مستوى المسار — أقسام متعددة مثل نظام قياس (قدرات / تحصيلي)'
                : 'اختبار عادي موجه على مستوى المادة — يظهر للطلاب في اختباراتي'}
            </p>
          </div>
          <select
            value={selectedPathId}
            onChange={(event) => {
              setSelectedPathId(event.target.value);
              setEditingId(null);
              setSections([]);
              setSaveError('');
            }}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold"
          >
            {availablePaths.map((path) => (
              <option key={path.id} value={path.id}>{path.name}</option>
            ))}
          </select>
        </div>

        {/* ── Exam Type Selector ── */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setExamType('regular'); setSections([]); setSaveError(''); }}
            className={`rounded-2xl border-2 p-4 text-right transition-all ${
              examType === 'regular'
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-gray-50 hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${examType === 'regular' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                <FileText size={20} />
              </div>
              <div className="font-black text-gray-900">اختبار عادي موجه</div>
            </div>
            <p className="text-xs text-gray-500 font-bold">على مستوى المادة • قسم واحد • موجه لطلاب محددين</p>
          </button>

          <button
            type="button"
            onClick={() => { setExamType('mock'); setSaveError(''); }}
            className={`rounded-2xl border-2 p-4 text-right transition-all ${
              examType === 'mock'
                ? 'border-violet-400 bg-violet-50'
                : 'border-gray-200 bg-gray-50 hover:border-violet-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${examType === 'mock' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                <Award size={20} />
              </div>
              <div className="font-black text-gray-900">اختبار محاكي</div>
            </div>
            <p className="text-xs text-gray-500 font-bold">على مستوى المسار • أقسام متعددة • مثل نظام قياس</p>
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        {/* ── Left: Builder Form ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editingId ? 'تعديل' : 'إنشاء'} {examType === 'mock' ? 'محاكاة' : 'اختبار'}</h3>
              <button onClick={resetDraft} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700">
                جديد
              </button>
            </div>

            <div className="space-y-4">
              <input
                aria-label="عنوان الاختبار"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                placeholder="عنوان الاختبار"
              />
              <textarea
                aria-label="وصف الاختبار"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-16 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                placeholder="وصف مختصر (اختياري)"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black text-gray-500">نسبة النجاح %</label>
                  <input
                    type="number"
                    min={0} max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                  />
                </div>

                {/* Regular: subject + time | Mock: access (admin only) */}
                {examType === 'regular' ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-500">المادة</label>
                      <select
                        value={regularSubjectId}
                        onChange={(e) => setRegularSubjectId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                      >
                        <option value="">كل مواد المسار</option>
                        {pathSubjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black text-gray-500">الوقت (دقيقة)</label>
                      <input
                        type="number" min={5}
                        value={regularTimeLimit}
                        onChange={(e) => setRegularTimeLimit(Number(e.target.value) || 30)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                      />
                    </div>
                  </>
                ) : role === 'admin' ? (
                  <div>
                    <label className="mb-1 block text-xs font-black text-gray-500">نوع الوصول</label>
                    <select
                      value={accessType}
                      onChange={(e) => setAccessType(e.target.value as Quiz['access']['type'])}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                    >
                      <option value="free">مجاني للجميع</option>
                      <option value="paid">ضمن باقة مدفوعة</option>
                      <option value="private">خاص بمجموعات</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {/* Admin paid price */}
              {role === 'admin' && examType === 'mock' && accessType === 'paid' && (
                <div>
                  <label className="mb-1 block text-xs font-black text-gray-500">السعر (ر.س)</label>
                  <input
                    type="number" min={1}
                    value={accessPrice}
                    onChange={(e) => setAccessPrice(Number(e.target.value) || 99)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold"
                  />
                </div>
              )}

              {/* ── Mock: Sections ── */}
              {examType === 'mock' && (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-gray-900">الأقسام</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSections(buildQiyasSections(selectedPathName, pathSubjects))}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"
                        title="تجهيز أقسام القدرات أو التحصيلي حسب مواد المسار الحالية"
                      >
                        <Award size={16} />
                        هيكل قياس
                      </button>
                      <button
                        onClick={() => setSections((prev) => [...prev, createSection(`قسم ${prev.length + 1}`, pathSubjects[prev.length]?.id || '', prev.length)])}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"
                      >
                        <Plus size={16} />
                        قسم
                      </button>
                    </div>
                  </div>

                  {sections.length === 0 ? (
                    <button onClick={() => setSections(buildQiyasSections(selectedPathName, pathSubjects))} className="w-full rounded-xl border border-dashed border-gray-300 py-8 text-sm font-black text-gray-500">
                      تجهيز أقسام من مواد المسار
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {sections.map((section, index) => {
                        const sectionPool = pathQuestions.filter((q) => !section.subjectId || q.subject === section.subjectId);
                        const isSmartMode = smartSections.has(section.id);
                        return (
                          <div key={section.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                value={section.title}
                                onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, title: e.target.value } : item))}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                                placeholder="اسم القسم"
                              />
                              <select
                                value={section.subjectId || ''}
                                onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, subjectId: e.target.value, questionIds: [] } : item))}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                              >
                                <option value="">كل مواد المسار</option>
                                {pathSubjects.map((subject) => (
                                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="number"
                                min={5}
                                value={section.timeLimit || 25}
                                onChange={(e) => setSections((prev) => prev.map((item) => item.id === section.id ? { ...item, timeLimit: Number(e.target.value) || 25 } : item))}
                                className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                              />
                              <span className="text-xs font-bold text-gray-500">دقيقة</span>
                              <button
                                type="button"
                                onClick={() => toggleSmartMode(section.id)}
                                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition-all ${isSmartMode ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}
                              >
                                <Sparkles size={13} />
                                {isSmartMode ? 'يدوي' : 'ذكي'}
                              </button>
                              <button
                                onClick={() => { setBuilderTargetSectionId(section.id); setShowQuestionBuilder(true); }}
                                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"
                              >
                                <PenLine size={13} />
                                سؤال جديد
                              </button>
                              <button onClick={() => setSections((prev) => prev.filter((item) => item.id !== section.id))} className="mr-auto rounded-xl bg-red-50 p-2 text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Smart Pick Panel */}
                            {isSmartMode && (
                              <SmartPickPanel
                                pool={sectionPool}
                                pathSkills={pathSkills}
                                currentCount={section.questionIds.length}
                                onApply={(ids) => applySmartPick(section.id, ids)}
                              />
                            )}

                            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                              <span>القسم {index + 1}: {section.questionIds.length} سؤال مختار من {sectionPool.length}</span>
                              <button onClick={() => toggleSectionExpanded(section.id)} className="flex items-center gap-1 text-indigo-600">
                                استعراض {expandedSections.has(section.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>

                            {expandedSections.has(section.id) && (
                              <div className="text-xs text-gray-500">
                                {section.questionIds.length === 0 ? (
                                  <span>لا توجد أسئلة مختارة بعد</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {section.questionIds.slice(0, 5).map((qId) => {
                                      const q = pathQuestions.find((x) => x.id === qId);
                                      return (
                                        <span key={qId} className="rounded-lg bg-indigo-100 px-2 py-0.5 text-indigo-700">
                                          {q ? (plainQuestionText(q.text).slice(0, 20) || '📷 بصري') : qId.slice(0, 8)}
                                        </span>
                                      );
                                    })}
                                    {section.questionIds.length > 5 && (
                                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-gray-600">+{section.questionIds.length - 5}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── Targeting & Publishing Section ── */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  التوجيه والنشر
                </h4>

                {role === 'admin' && examType === 'mock' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPublishMode('platform')}
                      className={`rounded-xl border-2 p-3 text-right transition-all ${publishMode === 'platform' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Globe size={16} className="text-indigo-600" />
                        <span className="text-sm font-black text-gray-900">نشر على المسار</span>
                      </div>
                      <p className="text-xs text-gray-500">يظهر لطلاب المنصة المستقلين</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishMode('school')}
                      className={`rounded-xl border-2 p-3 text-right transition-all ${publishMode === 'school' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 size={16} className="text-indigo-600" />
                        <span className="text-sm font-black text-gray-900">توجيه لمدرسة</span>
                      </div>
                      <p className="text-xs text-gray-500">يظهر لطلاب مدرسة محددة</p>
                    </button>
                  </div>
                )}

                {/* Admin: school targeting */}
                {role === 'admin' && (publishMode === 'school' || examType === 'regular') && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-gray-500 block mb-1">المدرسة</label>
                      <select
                        value={targetSchoolId}
                        onChange={(e) => { setTargetSchoolId(e.target.value); setTargetGroupIds([]); }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                      >
                        <option value="">اختر مدرسة...</option>
                        {adminSchoolGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    {targetSchoolId && adminSchoolClasses.length > 0 && (
                      <div>
                        <label className="text-xs font-black text-gray-500 block mb-1">الفصول (اتركها فارغة لتوجيه المدرسة كلها)</label>
                        <div className="max-h-28 overflow-y-auto space-y-1">
                          {adminSchoolClasses.map((g) => (
                            <label key={g.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-indigo-50">
                              <input
                                type="checkbox"
                                checked={targetGroupIds.includes(g.id)}
                                onChange={(e) => setTargetGroupIds((prev) => e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id))}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span className="text-sm font-bold text-gray-700">{g.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Supervisor: school/class targeting */}
                {role === 'supervisor' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-bold">وجّه هذا الاختبار لـ:</p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {allowedSchoolGroupId && (
                        <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-100">
                          <input
                            type="checkbox"
                            checked={allowedSchoolGroupId ? targetGroupIds.includes(allowedSchoolGroupId) : false}
                            onChange={(e) => setTargetGroupIds((prev) =>
                              e.target.checked
                                ? unique([...prev, allowedSchoolGroupId])
                                : prev.filter((id) => id !== allowedSchoolGroupId)
                            )}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <Building2 size={14} className="text-indigo-500" />
                          <span className="text-sm font-black text-indigo-700">مدرستي كلها</span>
                        </label>
                      )}
                      {scopedGroups.filter((g) => g.id !== allowedSchoolGroupId).map((g) => (
                        <label key={g.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={targetGroupIds.includes(g.id)}
                            onChange={(e) => setTargetGroupIds((prev) => e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id))}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm font-bold text-gray-700">{g.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due date (non-platform) */}
                {(role === 'supervisor' || (role === 'admin' && publishMode === 'school') || examType === 'regular') && (
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1">تاريخ انتهاء الاختبار (اختياري)</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={saveExam}
                disabled={
                  examType === 'mock'
                    ? !selectedPathId || sections.every((section) => section.questionIds.length === 0)
                    : regularQuestionIds.length === 0
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700 transition-all"
              >
                <Save size={18} />
                حفظ {examType === 'mock' ? 'الاختبار المحاكي' : 'الاختبار الموجه'}
              </button>
              {saveError && <p className="text-xs font-bold text-red-600">{saveError}</p>}
            </div>
          </div>
        </div>

        {/* ── Right: Question Bank + Existing Exams ── */}
        <div className="space-y-5">
          {/* Question Bank Panel */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-gray-900">مركز الأسئلة</h3>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                  {questionBankTotal} سؤال معتمد
                </span>
              </div>

              {/* Filters Row */}
              <div className="grid gap-2 md:grid-cols-2">
                <label className="relative block">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    aria-label="بحث في الأسئلة"
                    value={questionSearchTerm}
                    onChange={(event) => setQuestionSearchTerm(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-9 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white"
                    placeholder="ابحث في نص السؤال..."
                  />
                </label>
                <label className="relative block">
                  <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={difficultyFilter}
                    onChange={(event) => setDifficultyFilter(event.target.value as 'all' | Question['difficulty'])}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-9 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white"
                  >
                    <option value="all">كل الصعوبات</option>
                    <option value="Easy">سهل</option>
                    <option value="Medium">متوسط</option>
                    <option value="Hard">صعب</option>
                  </select>
                </label>
                <select
                  value={skillFilter}
                  onChange={(event) => setSkillFilter(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white"
                >
                  <option value="">كل المهارات</option>
                  {pathSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                  ))}
                </select>
                {examType === 'mock' && (
                  <select
                    value={sectionIdFilter}
                    onChange={(event) => setSectionIdFilter(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white"
                  >
                    <option value="">كل الأقسام</option>
                    {pathSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1">
              {isQuestionBankLoading && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm font-black text-gray-500">جارٍ تحميل أسئلة بنك المنصة...</div>
              )}
              {questionBankError && !isQuestionBankLoading && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm font-black text-red-600">{questionBankError}</div>
              )}
              {!isQuestionBankLoading && !questionBankError && pathQuestions.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm font-black text-gray-500">{EXAM_QUESTION_BANK_EMPTY_MESSAGE}</div>
              )}

              {/* Regular exam: SmartQuestionSelector */}
              {examType === 'regular' && (
                <div className="space-y-3">
                  <SmartQuestionSelector
                    pathId={selectedPathId}
                    subjectId={regularSubjectId || undefined}
                    selectedIds={regularQuestionIds}
                    onChange={(ids) => setRegularQuestionIds(ids)}
                    maxQuestions={100}
                  />
                </div>
              )}

              {/* Mock exam: per-section question lists */}
              {examType === 'mock' && sections.map((section) => {
                const pool = filterQuestionsForSection(section);
                const allPoolIds = pool.map((q) => q.id);
                const allSelected = pool.length > 0 && pool.every((q) => section.questionIds.includes(q.id));
                return (
                  <div key={section.id} className="rounded-2xl border border-indigo-50 bg-indigo-50/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="font-black text-indigo-700">{section.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-600">
                          {pool.length} سؤال
                        </span>
                        <button
                          onClick={() => allSelected ? clearSection(section.id) : selectAllInSection(section.id, allPoolIds)}
                          className={`rounded-xl px-3 py-1 text-[11px] font-black transition ${
                            allSelected ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {allSelected ? 'إلغاء الكل' : 'اختيار الكل'}
                        </button>
                        <button
                          onClick={() => { setBuilderTargetSectionId(section.id); setShowQuestionBuilder(true); }}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1 text-[11px] font-black text-white"
                        >
                          <Plus size={12} />
                          جديد
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-1">
                      {pool.slice(0, 100).map((question: Question) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          isSelected={section.questionIds.includes(question.id)}
                          onToggle={() => toggleQuestion(section.id, question.id)}
                        />
                      ))}
                      {pool.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs font-bold text-gray-400">
                          {EXAM_QUESTION_BANK_EMPTY_MESSAGE}
                        </div>
                      )}
                      {pool.length > 100 && (
                        <div className="text-center text-xs font-bold text-gray-400">
                          يُعرض أول 100 سؤال. استخدم فلتر البحث لتضييق النتائج.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Mock Exams (admin only) */}
          {role === 'admin' && examType === 'mock' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-black text-gray-900">المحاكيات الحالية</h3>
              <div className="space-y-3">
                {mockExams.map((quiz) => (
                  <div key={quiz.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-black text-gray-900">{quiz.title}</h4>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                        <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamSections(quiz).length} قسم</span>
                        <span className="rounded-full bg-gray-100 px-3 py-1">{getMockExamQuestionCount(quiz)} سؤال</span>
                        <span className={`rounded-full px-3 py-1 ${quiz.access?.type === 'paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {quiz.access?.type === 'paid' ? `مدفوع${quiz.access?.price ? ` • ${quiz.access.price} ر.س` : ''}` : 'مجاني'}
                        </span>
                        <span className={`rounded-full px-3 py-1 ${quiz.showOnPlatform ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                          {quiz.showOnPlatform ? '🌐 منصة' : '🏫 موجه'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePreviewQuiz(quiz)} className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">معاينة</button>
                      <button onClick={() => loadExam(quiz)} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">تعديل</button>
                      <button onClick={() => updateQuiz(quiz.id, { showOnPlatform: quiz.showOnPlatform === false })} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700">
                        {quiz.showOnPlatform === false ? 'إظهار' : 'إخفاء'}
                      </button>
                      <button onClick={() => { if (window.confirm('هل أنت متأكد من حذف هذا الاختبار؟')) deleteQuiz(quiz.id); }} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
                {mockExams.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-bold text-gray-400">
                    لا توجد محاكيات لهذا المسار بعد.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Question Builder Modal */}
      {showQuestionBuilder && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto" onClick={() => { setShowQuestionBuilder(false); setBuilderTargetSectionId(''); }}>
          <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  <PenLine size={14} />
                  منشئ الأسئلة الموحد
                </div>
                <h3 className="mt-2 text-lg font-black text-gray-900">إضافة سؤال جديد لبنك الأسئلة</h3>
                <p className="text-xs font-bold text-gray-500">
                  {builderTargetSectionId
                    ? `سيُضاف تلقائياً للقسم: ${sections.find((s) => s.id === builderTargetSectionId)?.title || ''}`
                    : 'سيُحفظ في بنك الأسئلة المعتمدة'}
                </p>
              </div>
              <button onClick={() => { setShowQuestionBuilder(false); setBuilderTargetSectionId(''); }} className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <UnifiedQuestionBuilder
                initialQuestion={{ pathId: selectedPathId, subject: sections.find((s) => s.id === builderTargetSectionId)?.subjectId || regularSubjectId || '' }}
                onSave={handleInlineQuestionSave}
                onCancel={() => { setShowQuestionBuilder(false); setBuilderTargetSectionId(''); }}
                subjectId={sections.find((s) => s.id === builderTargetSectionId)?.subjectId || regularSubjectId || ''}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuiz ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6" onClick={() => setPreviewQuiz(null)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  <Eye size={14} />
                  معاينة الاختبار المحاكي
                </div>
                <h3 className="mt-3 text-2xl font-black text-gray-900">{previewQuiz.title}</h3>
              </div>
              <button onClick={() => setPreviewQuiz(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200" aria-label="إغلاق المعاينة">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <div className="text-xs font-black text-slate-500">المسار</div>
                <div className="mt-2 text-sm font-black text-slate-900">{availablePaths.find((path) => path.id === previewQuiz.pathId)?.name || 'غير محدد'}</div>
              </div>
              <div className="rounded-2xl bg-indigo-50 px-4 py-4">
                <div className="text-xs font-black text-indigo-500">عدد الأقسام</div>
                <div className="mt-2 text-sm font-black text-indigo-900">{getMockExamSections(previewQuiz).length} قسم</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                <div className="text-xs font-black text-emerald-500">عدد الأسئلة</div>
                <div className="mt-2 text-sm font-black text-emerald-900">{getMockExamQuestionCount(previewQuiz)} سؤال</div>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-4">
                <div className="text-xs font-black text-amber-500">الوقت الكلي</div>
                <div className="mt-2 text-sm font-black text-amber-900">
                  {getMockExamSections(previewQuiz).reduce((sum, section) => sum + (Number(section.timeLimit) || 0), 0) || previewQuiz.settings?.timeLimit || 60} دقيقة
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-wrap gap-3 text-xs font-black">
                  <span className="rounded-full bg-white px-3 py-2 text-slate-700">
                    الظهور: {previewQuiz.showOnPlatform === false ? 'مخفي عن المنصة' : 'ظاهر على المنصة'}
                  </span>
                  <span className="rounded-full bg-white px-3 py-2 text-slate-700">
                    الوصول: {previewQuiz.access?.type === 'paid' ? `مدفوع${previewQuiz.access?.price ? ` • ${previewQuiz.access.price} ر.س` : ''}` : 'مجاني'}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-black text-slate-900">المواد الداخلة في المحاكاة</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from(new Set(getPreviewSubjectNames(previewQuiz))).length > 0 ? (
                      Array.from(new Set(getPreviewSubjectNames(previewQuiz))).map((name) => (
                        <span key={name} className="rounded-full bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm">{name}</span>
                      ))
                    ) : (
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm">لم يتم ربط مواد بعد</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {getMockExamSections(previewQuiz).map((section, index) => {
                  const linkedSubject = subjects.find((subject) => subject.id === section.subjectId);
                  const sectionQuestions = (section.questionIds || [])
                    .map((questionId) => questionBankQuestions.find((question) => question.id === questionId))
                    .filter(Boolean) as Question[];
                  return (
                    <div key={section.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-slate-400">القسم {index + 1}</div>
                          <h4 className="mt-1 text-lg font-black text-slate-900">{section.title}</h4>
                          <p className="mt-2 text-xs font-black text-slate-500">
                            {linkedSubject?.name || 'كل مواد المسار'} • {sectionQuestions.length} سؤال • {Number(section.timeLimit) || 0} دقيقة
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">محاكاة</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {sectionQuestions.slice(0, 3).map((question, questionIndex) => (
                          <div key={question.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-[11px] font-black text-slate-400">سؤال {questionIndex + 1}</div>
                            {question.imageUrl ? (
                              <img src={question.imageUrl} alt={`سؤال ${questionIndex + 1}`} className="mt-1 max-h-20 w-auto rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : null}
                            {plainQuestionText(question.text) && (
                              <div className="mt-1 line-clamp-2 text-sm font-bold leading-7 text-slate-700">{plainQuestionText(question.text)}</div>
                            )}
                          </div>
                        ))}
                        {sectionQuestions.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs font-black text-slate-400">هذا القسم ما زال بدون أسئلة فعلية.</div>
                        )}
                        {sectionQuestions.length > 3 && (
                          <div className="text-xs font-black text-slate-400">+ {sectionQuestions.length - 3} سؤال إضافي داخل هذا القسم</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => window.open(`${window.location.origin}/#/quiz/${previewQuiz.id}`, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
                >
                  <ExternalLink size={16} />
                  فتح نسخة الطالب
                </button>
                <button onClick={() => setPreviewQuiz(null)} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MockExamManager;
