export interface ScopedAnalyticsOverview {
    scope: {
        role: string;
        studentCount: number;
        groupCount: number;
        quizAttempts: number;
        questionAttempts?: number;
        earlyWeakSkillSignalCount?: number;
        minSkillEvidence?: number;
    };
    weakestStudents: Array<{
        id: string;
        name: string;
        averageScore: number;
        attempts: number;
        weakSkillCount: number;
        earlyWeakSignalCount?: number;
        schoolName?: string;
        groupIds?: string[];
        groupNames?: string[];
        weakestSkills?: Array<{ skill: string; mastery: number; attempts?: number; isReliable?: boolean; evidenceThreshold?: number }>;
        recommendedAction?: string;
    }>;
    weakestSkills: Array<{
        skillId?: string;
        skill: string;
        section?: string;
        mastery: number;
        affectedStudents: number;
        attempts: number;
        isReliable?: boolean;
        evidenceThreshold?: number;
        recommendedAction?: string;
    }>;
    subjectSummaries: Array<{
        subjectId?: string;
        subjectName: string;
        mastery: number;
        weakStudents: number;
    }>;
    assignedFollowUps: Array<{
        id: string;
        title: string;
        mode: 'regular' | 'saher' | 'central';
        targetGroupIds?: string[];
        targetUserIds?: string[];
        dueDate?: string;
    }>;
}

export interface ScopedQuizResult {
    id?: string;
    _id?: string;
    userId?: string;
    quizId?: string;
    studentName?: string;
    studentEmail?: string;
    studentGroupIds?: string[];
    quizTitle: string;
    score: number;
    totalQuestions?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
    date?: string;
    createdAt?: string;
    skillsAnalysis?: Array<{ skill?: string; mastery?: number; status?: string }>;
}

export interface StudentAggregatedSkill {
    skill: string;
    skillId?: string;
    pathId?: string;
    subjectName?: string;
    sectionName?: string;
    mastery: number;
    attempts: number;
    correctAttempts: number;
    totalEvidence: number;
    isReliable: boolean;
    status: 'weak' | 'average' | 'strong';
}

export type StudentReportPeriod = 'month' | 'quarter' | 'all';

export interface SkillRecommendation {
    lessonTitle?: string;
    lessonLink?: string;
    lessonTopicTitle?: string;
    foundationTopicLink?: string;
    quizTitle?: string;
    quizLink?: string;
    resourceTitle?: string;
    resourceUrl?: string;
    subjectName?: string;
    sectionName?: string;
    actionText?: string;
}

export interface SmartRemediationPlan {
    title?: string;
    summary?: string;
    steps?: Array<{ day?: string; skill?: string; action?: string; check?: string }>;
    parentNote?: string;
}
