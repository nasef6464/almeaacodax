export type QuizBuilderDraft = {
  version: 1;
  step: 1 | 2 | 3 | 4;
  kind: "drill" | "test" | "mock";
  title: string;
  description: string;
  pathId: string;
  subjectId: string;
  questionIds: string[];
  qiyasCategory: "qudrat" | "tahsili";
  presentationMode: "qiyas_strict" | "flexible";
  mockSections: Array<{
    id: string;
    title: string;
    subjectId: string;
    questionIds: string[];
    timeLimit?: number;
    order: number;
    domain?: "quantitative" | "verbal" | "math" | "physics" | "chemistry" | "biology" | "general";
  }>;
  activeSectionIdx: number;
  timeLimit: number;
  maxAttempts: number;
  passingScore: number;
  showAnswers: boolean;
  showExplanations: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  targetGroupIds: string[];
  dueDate: string;
  isPublished: boolean;
  showOnPlatform: boolean;
  accessType: "free" | "paid" | "package";
  price: number;
  slots: Array<"tests" | "training" | "course">;
  savedAt: string;
};

const PREFIX = "almeaa-quiz-builder-draft:";

export const getQuizBuilderDraftKey = (scope: string) => `${PREFIX}${scope}`;

export const readQuizBuilderDraft = (scope?: string): QuizBuilderDraft | null => {
  if (!scope || typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getQuizBuilderDraftKey(scope)) || "null") as QuizBuilderDraft | null;
    if (!parsed || parsed.version !== 1 || ![1, 2, 3, 4].includes(parsed.step) || !["drill", "test", "mock"].includes(parsed.kind)) {
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(getQuizBuilderDraftKey(scope));
    return null;
  }
};

export const writeQuizBuilderDraft = (scope: string | undefined, draft: QuizBuilderDraft) => {
  if (!scope || typeof window === "undefined") return false;
  window.localStorage.setItem(getQuizBuilderDraftKey(scope), JSON.stringify(draft));
  return true;
};

export const removeQuizBuilderDraft = (scope?: string) => {
  if (!scope || typeof window === "undefined") return;
  window.localStorage.removeItem(getQuizBuilderDraftKey(scope));
};
