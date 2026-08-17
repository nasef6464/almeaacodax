import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

const replaceOnce = (path, from, to, label) => {
  const source = read(path);
  const first = source.indexOf(from);
  if (first === -1) {
    throw new Error(`[baseline-repair] ${label}: expected source fragment was not found in ${path}`);
  }
  const second = source.indexOf(from, first + from.length);
  if (second !== -1) {
    throw new Error(`[baseline-repair] ${label}: source fragment is ambiguous in ${path}`);
  }
  write(path, `${source.slice(0, first)}${to}${source.slice(first + from.length)}`);
  console.log(`[baseline-repair] repaired ${label}`);
};

// 1) Preserve the runtime memberCount fallback while making the legacy Group type explicit.
replaceOnce(
  'dashboards/admin/QuizzesManager.tsx',
  'const totalTargets   = targetedGroups.reduce((s, g) => s + (g.memberCount || g.studentIds?.length || 0), 0) + targetedUsers.length;',
  'const totalTargets   = targetedGroups.reduce((s, g) => s + ((g as typeof g & { memberCount?: number }).memberCount || g.studentIds?.length || 0), 0) + targetedUsers.length;',
  'QuizzesManager Group.memberCount typing',
);

// 2) selectedSectionId was referenced in an effect dependency array before declaration.
replaceOnce(
  'dashboards/admin/SmartQuestionSelector.tsx',
  '  const [totalAvailable, setTotalAvailable] = useState(0);\n\n  const fetchRef = useRef<AbortController | null>(null);',
  '  const [totalAvailable, setTotalAvailable] = useState(0);\n  const [selectedSectionId, setSelectedSectionId] = useState("");\n\n  const fetchRef = useRef<AbortController | null>(null);',
  'SmartQuestionSelector state ordering insert',
);
replaceOnce(
  'dashboards/admin/SmartQuestionSelector.tsx',
  '  const [difficulty, setDifficulty] = useState<Difficulty>("all");\n  const [selectedSectionId, setSelectedSectionId] = useState("");\n  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);',
  '  const [difficulty, setDifficulty] = useState<Difficulty>("all");\n  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);',
  'SmartQuestionSelector state ordering remove old declaration',
);

// 3) isTrueMockExam lives in quizPlacement; keep mockExam ownership helper separate.
replaceOnce(
  'dashboards/admin/SubjectQuizzesPanel.tsx',
  'import { isMaterialQuizCandidate, isTrueMockExam } from "../../utils/mockExam";',
  'import { isMaterialQuizCandidate } from "../../utils/mockExam";\nimport { isTrueMockExam } from "../../utils/quizPlacement";',
  'SubjectQuizzesPanel mock helper import',
);

// 4) Dashboard already contains a local resolvePathProgress implementation.
replaceOnce(
  'pages/Dashboard.tsx',
  "import { resolvePathProgress } from '../utils/pathProgress';\n",
  '',
  'Dashboard stale pathProgress import',
);
replaceOnce(
  'pages/Dashboard.tsx',
  '    Route as RouteIcon, Brain, Calendar, User, Video, Copy, MessageCircle, ClipboardList, Activity as ActivityIcon\n} from \'lucide-react\';',
  '    Route as RouteIcon, Brain, Calendar, User, Video, Copy, MessageCircle, ClipboardList, Activity as ActivityIcon, Calculator\n} from \'lucide-react\';',
  'Dashboard Calculator icon import',
);

// 5) Keep the latest quiz submission calculations and make the legacy inline result panel type-safe.
replaceOnce(
  'pages/QuizPage.tsx',
  '  const [isFinished, setIsFinished] = useState(false);\n',
  "  const [isFinished, setIsFinished] = useState(false);\n  const [submittedSectionResults, setSubmittedSectionResults] = useState<NonNullable<QuizResult['sectionResults']>>([]);\n  const [submittedSkillsAnalysis, setSubmittedSkillsAnalysis] = useState<NonNullable<QuizResult['skillsAnalysis']>>([]);\n",
  'QuizPage submitted analytics state',
);
replaceOnce(
  'pages/QuizPage.tsx',
  '            sectionName: section.name,',
  "            sectionName: section.title || '',",
  'QuizPage MockExamSection title field',
);
replaceOnce(
  'pages/QuizPage.tsx',
  '    const questionReview = quizQuestions.map((question) => {',
  '    setSubmittedSectionResults(sectionResults || []);\n    setSubmittedSkillsAnalysis(skillsAnalysis);\n\n    const questionReview = quizQuestions.map((question) => {',
  'QuizPage retain analytics for inline summary',
);
replaceOnce(
  'pages/QuizPage.tsx',
  '(quiz.mockExam?.enabled && sectionResults && sectionResults.length > 0)',
  '(quiz.mockExam?.enabled && submittedSectionResults.length > 0)',
  'QuizPage inline section summary guard',
);
replaceOnce(
  'pages/QuizPage.tsx',
  '{sectionResults.map((sec) => {',
  '{submittedSectionResults.map((sec) => {',
  'QuizPage inline section summary source',
);
replaceOnce(
  'pages/QuizPage.tsx',
  'const weak = [...skillsAnalysis].filter',
  'const weak = [...submittedSkillsAnalysis].filter',
  'QuizPage inline weak-skills source',
);

// 6) Remove earlier duplicate object keys. The later definitions already won at runtime,
// so deleting the shadowed versions preserves behavior while restoring TypeScript validity.
replaceOnce(
  'services/api.ts',
  '  getMyNotifications: (pagination?: { page?: number; limit?: number }, token?: string | null) =>\n    request<unknown>(withQuery("/notifications/me", pagination || {}), { token }),\n',
  '',
  'API duplicate getMyNotifications',
);
replaceOnce(
  'services/api.ts',
  '  markNotificationRead: (id: string, token?: string | null) =>\n    request<unknown>(`/notifications/${id}/read`, {\n      method: "PATCH",\n      body: {},\n      token,\n    }),\n',
  '',
  'API duplicate markNotificationRead',
);

console.log('[baseline-repair] all guarded repairs applied successfully');
