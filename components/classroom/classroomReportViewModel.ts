export interface ClassroomSavedReport {
  sessionId: string;
  schoolId: string;
  classId: string;
  className?: string;
  subjectName?: string;
  subject?: string;
  day?: string;
  period?: number | string | null;
  teacherId?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  participantCount?: number;
  responseCount?: number;
  correctCount?: number;
  roster?: { expected: number; joined: number; absentFromSession: number };
  totals?: { responses: number; correct: number };
  batches?: Array<{
    batchId: string;
    number?: number;
    label?: string;
    questionIds?: string[];
    startedAt?: string | null;
    endedAt?: string | null;
    durationSeconds?: number | null;
    totals?: { questions?: number; answered?: number; correct?: number; wrong?: number; unanswered?: number; accuracy?: number | null };
    skillIds?: string[];
  }>;
  questions?: Array<{
    index?: number;
    questionId: string;
    text: string;
    options?: string[];
    skillIds?: string[];
    skillId?: string;
    skillName?: string;
    pathId?: string;
    sectionId?: string;
    subject?: string;
    answered?: number;
    answeredCount?: number;
    correct?: number;
    correctCount?: number;
    wrong?: number;
    unanswered?: number;
    isChallenge?: boolean;
  }>;
}

export type CanonicalQuestionReport = {
  index: number;
  questionId: string;
  text: string;
  skillIds: string[];
  pathId?: string;
  sectionId?: string;
  subject?: string;
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
};

export type CanonicalBatchReport = {
  batchId: string;
  number: number;
  label: string;
  questionIds: string[];
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  totals: { questions: number; answered: number; correct: number; wrong: number; unanswered: number; accuracy: number | null };
  skillIds: string[];
};

export type CanonicalClassroomReport = {
  sessionId: string;
  schoolId: string;
  classId: string;
  className: string;
  subjectName: string;
  day: string;
  period: number | null;
  teacherId?: string;
  status: string;
  startedAt?: string;
  endedAt: string | null;
  durationMinutes: number | null;
  roster: { expected: number; joined: number; absentFromSession: number };
  totals: { responses: number; correct: number };
  batches: CanonicalBatchReport[];
  questions: CanonicalQuestionReport[];
};

export type ClassroomReportTimeFilter = 'all' | 'today' | 'week' | 'month';

export type ClassroomSkillDiagnostic = {
  skillId: string;
  skillName: string;
  totalAnswered: number;
  correct: number;
  sessions: Set<string>;
  accuracy: number | null;
  isWeak: boolean;
};

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const elapsedSeconds = (startedAt?: string | null, endedAt?: string | null) => {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 1000));
};

export const formatClassroomDuration = (seconds: number | null) => {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds} ث`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes} د ${remainingSeconds} ث` : `${minutes} د`;
};

export const normalizeClassroomReport = (raw: ClassroomSavedReport): CanonicalClassroomReport => {
  const joined = raw.roster?.joined ?? raw.participantCount ?? 0;
  const expected = raw.roster?.expected ?? joined;
  const responses = raw.totals?.responses ?? raw.responseCount ?? 0;
  const correct = raw.totals?.correct ?? raw.correctCount ?? 0;
  const questions = (raw.questions || []).map((question, index): CanonicalQuestionReport => {
    const answered = question.answered ?? question.answeredCount ?? 0;
    const questionCorrect = question.correct ?? question.correctCount ?? 0;
    const skillIds = question.skillIds?.filter(Boolean) || (question.skillId ? [question.skillId] : []);
    return {
      index: question.index ?? index,
      questionId: question.questionId,
      text: question.text,
      skillIds,
      pathId: question.pathId,
      sectionId: question.sectionId,
      subject: question.subject,
      answered,
      correct: questionCorrect,
      wrong: question.wrong ?? Math.max(0, answered - questionCorrect),
      unanswered: question.unanswered ?? Math.max(0, joined - answered),
    };
  });
  const questionById = new Map(questions.map((question) => [question.questionId, question]));
  const batches = (raw.batches || []).map((batch, index): CanonicalBatchReport => {
    const questionIds = batch.questionIds || [];
    const batchQuestions = questionIds.map((questionId) => questionById.get(questionId)).filter(Boolean) as CanonicalQuestionReport[];
    const answered = batch.totals?.answered ?? batchQuestions.reduce((sum, question) => sum + question.answered, 0);
    const batchCorrect = batch.totals?.correct ?? batchQuestions.reduce((sum, question) => sum + question.correct, 0);
    return {
      batchId: batch.batchId,
      number: batch.number ?? index + 1,
      label: batch.label || `الدفعة ${index + 1}`,
      questionIds,
      startedAt: batch.startedAt || null,
      endedAt: batch.endedAt || null,
      durationSeconds: batch.durationSeconds ?? elapsedSeconds(batch.startedAt, batch.endedAt),
      totals: {
        questions: batch.totals?.questions ?? questionIds.length,
        answered,
        correct: batchCorrect,
        wrong: batch.totals?.wrong ?? batchQuestions.reduce((sum, question) => sum + question.wrong, 0),
        unanswered: batch.totals?.unanswered ?? batchQuestions.reduce((sum, question) => sum + question.unanswered, 0),
        accuracy: batch.totals?.accuracy ?? (answered > 0 ? Math.round((batchCorrect / answered) * 100) : null),
      },
      skillIds: (batch.skillIds || Array.from(new Set(batchQuestions.flatMap((question) => question.skillIds)))).filter(Boolean),
    };
  });
  const period = raw.period === null || raw.period === undefined || raw.period === '' ? null : toNumber(raw.period, 0) || null;
  return {
    sessionId: raw.sessionId,
    schoolId: raw.schoolId,
    classId: raw.classId,
    className: raw.className || '',
    subjectName: raw.subjectName || raw.subject || '',
    day: raw.day || '',
    period,
    teacherId: raw.teacherId,
    status: raw.status || 'ended',
    startedAt: raw.startedAt,
    endedAt: raw.endedAt || null,
    durationMinutes: raw.durationMinutes ?? null,
    roster: { expected, joined, absentFromSession: raw.roster?.absentFromSession ?? Math.max(0, expected - joined) },
    totals: { responses, correct },
    batches,
    questions,
  };
};

export const isClassroomReportWithinPeriod = (endedAt: string | null | undefined, filter: ClassroomReportTimeFilter) => {
  if (filter === 'all') return true;
  if (!endedAt) return false;
  const ended = new Date(endedAt);
  if (Number.isNaN(ended.getTime())) return false;
  if (filter === 'today') return ended.toDateString() === new Date().toDateString();
  const age = Date.now() - ended.getTime();
  return age <= (filter === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000;
};

export const buildClassroomSkillDiagnostics = (reports: CanonicalClassroomReport[], weakThreshold = 65) => {
  const map = new Map<string, Omit<ClassroomSkillDiagnostic, 'accuracy' | 'isWeak'>>();
  for (const report of reports) {
    for (const question of report.questions) {
      const skillIds = Array.from(new Set(question.skillIds.filter(Boolean)));
      const keys = skillIds.length > 0 ? skillIds : (question.subject ? [`subject:${question.subject}`] : []);
      for (const key of keys) {
        const current = map.get(key) || { skillId: key, skillName: key.startsWith('subject:') ? key.slice(8) : key, totalAnswered: 0, correct: 0, sessions: new Set<string>() };
        current.totalAnswered += question.answered;
        current.correct += question.correct;
        current.sessions.add(report.sessionId);
        map.set(key, current);
      }
    }
  }
  return Array.from(map.values())
    .map((entry): ClassroomSkillDiagnostic => {
      const accuracy = entry.totalAnswered > 0 ? Math.round((entry.correct / entry.totalAnswered) * 100) : null;
      return { ...entry, accuracy, isWeak: accuracy !== null && accuracy < weakThreshold };
    })
    .filter((entry) => entry.accuracy !== null)
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101));
};
