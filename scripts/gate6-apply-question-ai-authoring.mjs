import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/QuestionBankManager.tsx');
let source = readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');

const replaceOnce = (from, to, label) => {
  const occurrences = source.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`[gate6-question-ai] expected exactly one ${label}; found ${occurrences}`);
  }
  source = source.replace(from, to);
};

replaceOnce(
`type QuestionPaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};`,
`type QuestionPaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type AiQuestionDraft = {
  question?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
};`,
  'AI draft type insertion point',
);

replaceOnce(
`  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);`,
`  const [isImporting, setIsImporting] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAiQuestion, setIsGeneratingAiQuestion] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);`,
  'AI state insertion point',
);

replaceOnce(
`  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {`,
`  const handleGenerateAiQuestion = async () => {
    const activeSubjectId = subjectId || selectedSubjectId;
    const selectedSubject = allowedSubjects.find((subject) => subject.id === activeSubjectId);
    if (!selectedSubject) {
      setImportError('اختر المادة أولًا حتى ترتبط مسودة السؤال بالسياق التعليمي الصحيح.');
      setImportMessage(null);
      return;
    }

    const selectedSection = sections.find((section) => section.id === selectedSectionId);
    const selectedSkill = skills.find((skill) => skill.id === selectedSkillId);
    const topic = aiTopic.trim() || [selectedSubject.name, selectedSection?.name, selectedSkill?.name].filter(Boolean).join(' - ');

    if (!topic) {
      setImportError('اكتب موضوع السؤال أو اختر مادة/مهارة واضحة قبل التوليد.');
      setImportMessage(null);
      return;
    }

    setIsGeneratingAiQuestion(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const response = await api.aiQuestion({ topic }) as AiQuestionDraft;
      const questionText = typeof response.question === 'string' ? response.question.trim() : '';
      const options = Array.isArray(response.options)
        ? response.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 6)
        : [];
      const correctOptionIndex = Number(response.correctIndex);

      if (
        !questionText ||
        options.length < 2 ||
        !Number.isInteger(correctOptionIndex) ||
        correctOptionIndex < 0 ||
        correctOptionIndex >= options.length
      ) {
        throw new Error('مزود الذكاء الاصطناعي لم يرجع سؤالًا صالحًا للمراجعة. حاول مرة أخرى أو استخدم المحرر اليدوي.');
      }

      setCurrentQuestion({
        text: questionText,
        options,
        correctOptionIndex,
        explanation: typeof response.explanation === 'string' ? response.explanation.trim() : '',
        difficulty: 'Medium',
        type: 'mcq',
        pathId: selectedPathId || selectedSubject.pathId || '',
        subject: selectedSubject.id,
        sectionId: selectedSectionId || '',
        skillIds: selectedSkillId ? [selectedSkillId] : [],
        ownerType: user.role === 'teacher' ? 'teacher' : 'platform',
        ownerId: user.id,
        createdBy: user.id,
        approvalStatus: user.role === 'admin' ? 'draft' : 'pending_review',
      });
      setImportMessage('تم إنشاء مسودة سؤال بالذكاء الاصطناعي. راجعها في المحرر قبل الحفظ أو الاعتماد.');
      setIsEditing(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'تعذر توليد مسودة السؤال الآن.');
    } finally {
      setIsGeneratingAiQuestion(false);
    }
  };

  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {`,
  'AI handler insertion point',
);

replaceOnce(
`          <p className="text-sm text-gray-500">
            يمكنك استيراد الأسئلة من نموذج Excel أو توليدها تلقائياً من الملازم وملفات PDF باستخدام الذكاء الاصطناعي.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 transition-colors flex items-center gap-2"
            onClick={() => alert('تم رفع الملف بنجاح.. جاري استخراج الأسئلة وتصنيفها آلياً!')}
          >
            <BookOpen size={18} />
            توليد ذكي من ملف (AI)
          </button>`,
`          <p className="text-sm text-gray-500">
            استورد الأسئلة من Excel، أو أنشئ مسودة سؤال واحدة بالذكاء الاصطناعي من الموضوع والسياق المحدد ثم راجعها قبل الحفظ.
          </p>
        </div>
        <div className="flex flex-1 flex-wrap gap-3 lg:justify-end">
          <input
            type="text"
            data-testid="question-bank-ai-topic"
            value={aiTopic}
            onChange={(event) => setAiTopic(event.target.value)}
            placeholder="موضوع السؤال للذكاء الاصطناعي"
            className="min-w-[220px] flex-1 rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-400 lg:max-w-sm"
          />
          <button
            type="button"
            data-testid="question-bank-ai-generate"
            className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleGenerateAiQuestion()}
            disabled={isGeneratingAiQuestion}
            title="ينشئ مسودة داخل المحرر ولا يحفظ أو ينشر تلقائيًا"
          >
            <BookOpen size={18} />
            {isGeneratingAiQuestion ? 'جارٍ التوليد...' : 'توليد مسودة AI'}
          </button>`,
  'fake AI button replacement',
);

replaceOnce(
`      {(importMessage || importError || isImporting) && (`,
`      {(importMessage || importError || isImporting || isGeneratingAiQuestion) && (`,
  'status visibility condition',
);

replaceOnce(
`          {isImporting ? 'جارٍ قراءة ملف الأسئلة وربطه بمركز المهارات...' : importError || importMessage}`,
`          {isGeneratingAiQuestion
            ? 'جارٍ إنشاء مسودة السؤال بالذكاء الاصطناعي...'
            : isImporting
              ? 'جارٍ قراءة ملف الأسئلة وربطه بمركز المهارات...'
              : importError || importMessage}`,
  'status message rendering',
);

if (source.includes("onClick={() => alert('تم رفع الملف بنجاح.. جاري استخراج الأسئلة وتصنيفها آلياً!')}")) {
  throw new Error('[gate6-question-ai] fake AI alert still exists after patch');
}

writeFileSync(managerPath, source);
console.log('[gate6-question-ai] QuestionBankManager patched successfully');
