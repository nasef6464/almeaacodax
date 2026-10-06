type ReportQuestion = {
  skillIds?: string[];
  subject?: string;
  answered?: number;
  correct?: number;
};

type FinalizedClassroomReport = {
  sessionId?: string;
  classId?: string;
  className?: string;
  endedAt?: string | Date | null;
  roster?: { expected?: number; joined?: number; absentFromSession?: number };
  totals?: { responses?: number; correct?: number };
  questions?: ReportQuestion[];
};

export type ClassroomInsightsPeriod = "today" | "week" | "month" | "all";

const periodStart = (period: ClassroomInsightsPeriod, now = new Date()) => {
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period === "week" ? 6 : 29));
  return start;
};

const accuracy = (correct: number, answered: number) => answered > 0 ? Math.round((correct / answered) * 100) : null;

export const buildClassroomReportInsights = (
  reports: FinalizedClassroomReport[],
  input: { period: ClassroomInsightsPeriod; classId?: string; weakThreshold?: number; now?: Date },
) => {
  const weakThreshold = input.weakThreshold ?? 65;
  const start = periodStart(input.period, input.now || new Date());
  const filtered = reports.filter((report) => {
    if (input.classId && String(report.classId || "") !== input.classId) return false;
    if (!start) return true;
    if (!report.endedAt) return false;
    const endedAt = new Date(report.endedAt);
    return Number.isFinite(endedAt.getTime()) && endedAt >= start;
  });

  const skillMap = new Map<string, { skillId: string; answered: number; correct: number; sessions: Set<string> }>();
  let participants = 0;
  let expected = 0;
  let responses = 0;
  let correct = 0;

  for (const report of filtered) {
    participants += Number(report.roster?.joined || 0);
    expected += Number(report.roster?.expected || 0);
    responses += Number(report.totals?.responses || 0);
    correct += Number(report.totals?.correct || 0);

    for (const question of report.questions || []) {
      const skillIds = Array.from(new Set((question.skillIds || []).map(String).filter(Boolean)));
      const keys = skillIds.length > 0 ? skillIds : (question.subject ? [`subject:${question.subject}`] : []);
      for (const skillId of keys) {
        const current = skillMap.get(skillId) || { skillId, answered: 0, correct: 0, sessions: new Set<string>() };
        current.answered += Number(question.answered || 0);
        current.correct += Number(question.correct || 0);
        if (report.sessionId) current.sessions.add(String(report.sessionId));
        skillMap.set(skillId, current);
      }
    }
  }

  const skills = Array.from(skillMap.values())
    .map((skill) => {
      const skillAccuracy = accuracy(skill.correct, skill.answered);
      return {
        skillId: skill.skillId,
        answered: skill.answered,
        correct: skill.correct,
        sessions: skill.sessions.size,
        accuracy: skillAccuracy,
        weak: skillAccuracy !== null && skillAccuracy < weakThreshold,
      };
    })
    .filter((skill) => skill.accuracy !== null)
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101) || right.answered - left.answered);

  const trend = filtered
    .map((report) => ({
      sessionId: String(report.sessionId || ""),
      classId: String(report.classId || ""),
      className: String(report.className || ""),
      endedAt: report.endedAt || null,
      responses: Number(report.totals?.responses || 0),
      accuracy: accuracy(Number(report.totals?.correct || 0), Number(report.totals?.responses || 0)),
      joined: Number(report.roster?.joined || 0),
      expected: Number(report.roster?.expected || 0),
    }))
    .sort((left, right) => new Date(left.endedAt || 0).getTime() - new Date(right.endedAt || 0).getTime());

  return {
    generatedAt: new Date().toISOString(),
    source: "finalized_report_snapshots",
    period: input.period,
    classId: input.classId || null,
    weakThreshold,
    totals: {
      sessions: filtered.length,
      participants,
      expected,
      participationRate: expected > 0 ? Math.round((participants / expected) * 100) : null,
      responses,
      correct,
      accuracy: accuracy(correct, responses),
    },
    skills,
    weakSkills: skills.filter((skill) => skill.weak),
    strongSkills: [...skills].filter((skill) => !skill.weak).sort((left, right) => (right.accuracy ?? -1) - (left.accuracy ?? -1)).slice(0, 10),
    trend,
  };
};
