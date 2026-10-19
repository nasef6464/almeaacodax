export type EvidenceSource='platform_self_study'|'school_assessment';
export type EvidenceStatus='unmeasured'|'insufficient'|'support'|'developing'|'ready';
export type LearningEvidenceQuery={source:EvidenceSource;subjectId:string;search?:string;schoolId?:string;classId?:string;pathId?:string;quizId?:string;days?:number;page?:number;limit?:number;status?:EvidenceStatus};
export type LearningEvidenceSkill={id:string;name:string;accuracy:number|null;questions:number;correct:number;tests:number;latestAt:string;status:EvidenceStatus};
export type LearningEvidenceReport={source:EvidenceSource;subjectId:string;days:number;coverage:'complete';total:number;filteredTotal:number;page:number;limit:number;policy:{minimumAnswers:number;supportBelow:number;readyFrom:number};summary:Record<EvidenceStatus,number>;students:{id:string;name:string;status:EvidenceStatus;skillCount:number;skills:LearningEvidenceSkill[]}[]};
