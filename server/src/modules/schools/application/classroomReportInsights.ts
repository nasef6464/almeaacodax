type ReportQuestion = {
  skillIds?: string[];
  subject?: string;
  answered?: number;
  correct?: number;
};

type FinalizedClassroomReport = {
  sessionId?: string;
  schoolId?: string;
  classId?: string;
  className?: string;
  subjectName?: string;
  teacherId?: string;
  endedAt?: string | Date | null;
  roster?: { expected?: number; joined?: number; absentFromSession?: number };
  totals?: { responses?: number; correct?: number };
  questions?: ReportQuestion[];
};

export type ClassroomInsightsPeriod = "today" | "week" | "month" | "all";

type ClassroomSummary = {
  sessions: number;
  participants: number;
  expected: number;
  participationRate: number | null;
  responses: number;
  correct: number;
  accuracy: number | null;
};

type ClassroomSupervisorLabels = {
  schoolNames?: Record<string, string>;
  teacherNames?: Record<string, string>;
};

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

export const summarizeClassroomReports = (reports: FinalizedClassroomReport[]): ClassroomSummary => {
  const participants = reports.reduce((sum, report) => sum + Number(report.roster?.joined || 0), 0);
  const expected = reports.reduce((sum, report) => sum + Number(report.roster?.expected || 0), 0);
  const responses = reports.reduce((sum, report) => sum + Number(report.totals?.responses || 0), 0);
  const correct = reports.reduce((sum, report) => sum + Number(report.totals?.correct || 0), 0);
  return {
    sessions: reports.length,
    participants,
    expected,
    participationRate: expected > 0 ? Math.round((participants / expected) * 100) : null,
    responses,
    correct,
    accuracy: accuracy(correct, responses),
  };
};

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

  for (const report of filtered) {
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

  const classBuckets = new Map<string, FinalizedClassroomReport[]>();
  for (const report of filtered) {
    const cid = String(report.classId || "unknown");
    const bucket = classBuckets.get(cid) || [];
    bucket.push(report);
    classBuckets.set(cid, bucket);
  }

  const classesComparison = Array.from(classBuckets.entries()).map(([cid, classReports]) => ({
    classId: cid,
    className: String(classReports.find((r) => r.className)?.className || cid),
    summary: summarizeClassroomReports(classReports),
  })).sort((left, right) => (right.summary.accuracy ?? -1) - (left.summary.accuracy ?? -1) || right.summary.sessions - left.summary.sessions);

  return {
    generatedAt: new Date().toISOString(),
    source: "finalized_report_snapshots",
    period: input.period,
    classId: input.classId || null,
    weakThreshold,
    totals: summarizeClassroomReports(filtered),
    skills,
    weakSkills: skills.filter((skill) => skill.weak),
    strongSkills: [...skills].filter((skill) => !skill.weak).sort((left, right) => (right.accuracy ?? -1) - (left.accuracy ?? -1)).slice(0, 10),
    classesComparison,
    trend,
  };
};

export const buildClassroomSupervisorDrilldown = (
  reports: FinalizedClassroomReport[],
  labels: ClassroomSupervisorLabels = {},
) => {
  const schoolBuckets = new Map<string, FinalizedClassroomReport[]>();
  for (const report of reports) {
    const schoolId = String(report.schoolId || "");
    if (!schoolId) continue;
    const bucket = schoolBuckets.get(schoolId) || [];
    bucket.push(report);
    schoolBuckets.set(schoolId, bucket);
  }

  const schools = Array.from(schoolBuckets.entries()).map(([schoolId, schoolReports]) => {
    const teacherBuckets = new Map<string, FinalizedClassroomReport[]>();
    for (const report of schoolReports) {
      const teacherId = String(report.teacherId || "unknown");
      const bucket = teacherBuckets.get(teacherId) || [];
      bucket.push(report);
      teacherBuckets.set(teacherId, bucket);
    }

    const teachers = Array.from(teacherBuckets.entries()).map(([teacherId, teacherReports]) => {
      const classBuckets = new Map<string, FinalizedClassroomReport[]>();
      for (const report of teacherReports) {
        const classId = String(report.classId || "unknown");
        const bucket = classBuckets.get(classId) || [];
        bucket.push(report);
        classBuckets.set(classId, bucket);
      }

      const classes = Array.from(classBuckets.entries()).map(([classId, classReports]) => ({
        classId,
        className: String(classReports.find((report) => report.className)?.className || classId),
        summary: summarizeClassroomReports(classReports),
        sessions: classReports
          .map((report) => ({
            sessionId: String(report.sessionId || ""),
            classId,
            className: String(report.className || classId),
            teacherId,
            subjectName: String(report.subjectName || ""),
            endedAt: report.endedAt || null,
            joined: Number(report.roster?.joined || 0),
            expected: Number(report.roster?.expected || 0),
            responses: Number(report.totals?.responses || 0),
            accuracy: accuracy(Number(report.totals?.correct || 0), Number(report.totals?.responses || 0)),
          }))
          .sort((left, right) => new Date(right.endedAt || 0).getTime() - new Date(left.endedAt || 0).getTime()),
      })).sort((left, right) => left.className.localeCompare(right.className, "ar"));

      return {
        teacherId,
        teacherName: labels.teacherNames?.[teacherId] || teacherId,
        summary: summarizeClassroomReports(teacherReports),
        classes,
      };
    }).sort((left, right) => left.teacherName.localeCompare(right.teacherName, "ar"));

    return {
      schoolId,
      schoolName: labels.schoolNames?.[schoolId] || schoolId,
      summary: summarizeClassroomReports(schoolReports),
      teachers,
    };
  }).sort((left, right) => left.schoolName.localeCompare(right.schoolName, "ar"));

  return {
    summary: summarizeClassroomReports(reports),
    schools,
  };
};
