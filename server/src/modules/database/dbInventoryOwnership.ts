export type DatabaseDomain =
  | "identity-access"
  | "learning-catalog"
  | "learner-progress"
  | "assessment"
  | "school-classroom"
  | "commerce-entitlements"
  | "notifications"
  | "ai"
  | "platform-config"
  | "operations-audit"
  | "discussion";

export const DB_COLLECTION_OWNERS = {
  users: "identity-access",
  phoneotps: "identity-access",
  parentstudentrelationships: "identity-access",

  paths: "learning-catalog",
  levels: "learning-catalog",
  subjects: "learning-catalog",
  sections: "learning-catalog",
  skills: "learning-catalog",
  topics: "learning-catalog",
  lessons: "learning-catalog",
  courses: "learning-catalog",
  libraryitems: "learning-catalog",
  activities: "learning-catalog",

  studyplans: "learner-progress",
  masterygoals: "learner-progress",
  skillprogresses: "learner-progress",
  lessonprogresses: "learner-progress",
  reviewcards: "learner-progress",

  questionrevisions: "assessment",
  quizresults: "assessment",
  questions: "assessment",
  assessmentresults: "assessment",
  liveexamsessions: "assessment",
  assessmentmirroraudits: "assessment",
  assessmentattempts: "assessment",
  assessmentresponses: "assessment",
  quizzes: "assessment",
  assessmentassignments: "assessment",
  publicbarcodetests: "assessment",
  assessmentversions: "assessment",
  questionattempts: "assessment",
  publicbarcodesubmissions: "assessment",
  publicbarcodesubmissionguards: "assessment",

  classroomtemplates: "school-classroom",
  schoolskillaggregates: "school-classroom",
  schoolinterventions: "school-classroom",
  groups: "school-classroom",
  classroomresponses: "school-classroom",
  schoolmemberships: "school-classroom",
  classroomparticipants: "school-classroom",
  classroomsessions: "school-classroom",
  schoolcontracts: "school-classroom",
  schoolskillevidences: "school-classroom",
  teachingassignments: "school-classroom",

  discountcodes: "commerce-entitlements",
  accesscodes: "commerce-entitlements",
  accessgrants: "commerce-entitlements",
  paymentsettings: "commerce-entitlements",
  paymentgatewayeventguards: "commerce-entitlements",
  b2bpackages: "commerce-entitlements",
  paymentrequests: "commerce-entitlements",
  certificates: "commerce-entitlements",

  notificationdeliveries: "notifications",
  notificationtemplates: "notifications",
  announcementads: "notifications",

  aiusagedailies: "ai",
  aiquestionassistcaches: "ai",
  aiinteractions: "ai",

  platformintegrationsettings: "platform-config",
  homepagesettings: "platform-config",
  platformintegrationhistories: "platform-config",
  platformfontsettings: "platform-config",

  backupactivities: "operations-audit",
  backupsnapshots: "operations-audit",
  adminauditlogs: "operations-audit",
  clientevents: "operations-audit",
  migrationbackups: "operations-audit",

  discussionthreads: "discussion",
  discussionreplies: "discussion",
} as const satisfies Record<string, DatabaseDomain>;

export type GrowthRiskSeverity = "critical" | "high" | "medium";

export type DatabaseGrowthRisk = {
  id: string;
  severity: GrowthRiskSeverity;
  collection: keyof typeof DB_COLLECTION_OWNERS;
  fields: string[];
  reason: string;
  nextBatch: "DB-2" | "DB-3" | "DB-4" | "DB-5";
};

export const DB_GROWTH_RISKS: DatabaseGrowthRisk[] = [
  {
    id: "DBR-001",
    severity: "critical",
    collection: "classroomsessions",
    fields: ["questionSnapshots", "reportSnapshot", "questionBatches", "publishedQuestionIds"],
    reason: "Session documents embed question and report snapshots; live production already contains documents above 200 KB.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-002",
    severity: "critical",
    collection: "backupsnapshots",
    fields: ["payload"],
    reason: "Full learning payload is embedded in one MongoDB document; current maximum exceeds 1 MB and can grow toward the MongoDB document limit.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-003",
    severity: "high",
    collection: "courses",
    fields: ["thumbnail", "modules.lessons", "qa"],
    reason: "Course content is embedded and a live course stores a large data URL thumbnail in MongoDB.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-004",
    severity: "high",
    collection: "announcementads",
    fields: ["imageUrl"],
    reason: "A live announcement stores an approximately 300 KB data URL in MongoDB instead of external media.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-005",
    severity: "high",
    collection: "quizresults",
    fields: ["questionReview", "skillsAnalysis", "sectionResults"],
    reason: "Compatibility arrays still embed per-attempt review/analysis history; PLAN 4 introduced the safer revision/attempt-facts direction but cutover is not complete.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-006",
    severity: "high",
    collection: "questionattempts",
    fields: ["skillIds"],
    reason: "Append-heavy learner evidence is expected to become one of the highest-cardinality collections as student/test volume grows.",
    nextBatch: "DB-3",
  },
  {
    id: "DBR-007",
    severity: "high",
    collection: "clientevents",
    fields: ["metadata", "stack"],
    reason: "Append-only client telemetry has no TTL/archival policy in the model and can become permanent hot storage.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-008",
    severity: "high",
    collection: "notificationdeliveries",
    fields: ["metadata", "failureReason"],
    reason: "Operational delivery history has retry indexes but no explicit terminal-state retention/archive contract.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-009",
    severity: "medium",
    collection: "aiinteractions",
    fields: ["metadata", "messagePreview", "responsePreview"],
    reason: "TTL is present, but the collection has many secondary indexes relative to write-heavy telemetry volume.",
    nextBatch: "DB-3",
  },
  {
    id: "DBR-010",
    severity: "medium",
    collection: "lessonprogresses",
    fields: ["answeredQuestionIds"],
    reason: "Per-user/per-lesson progress is normalized, but answeredQuestionIds needs an explicit hard growth budget.",
    nextBatch: "DB-4",
  },
  {
    id: "DBR-011",
    severity: "medium",
    collection: "users",
    fields: ["completedLessons", "interactiveVideoProgress", "favorites", "reviewLater", "groupIds", "linkedStudentIds"],
    reason: "Legacy mirrors remain for compatibility after PLAN 4; canonical collections exist for several concerns and parity must precede cleanup.",
    nextBatch: "DB-2",
  },
  {
    id: "DBR-012",
    severity: "medium",
    collection: "groups",
    fields: ["studentIds", "supervisorIds", "courseIds"],
    reason: "Legacy school/class membership arrays coexist with canonical SchoolMembership/TeachingAssignment authority and can drift or grow.",
    nextBatch: "DB-2",
  },
  {
    id: "DBR-013",
    severity: "medium",
    collection: "classroomparticipants",
    fields: ["pendingSubmissionKeys", "finalizedSubmissionKeys"],
    reason: "Retry/idempotency keys are embedded arrays and need a bounded lifecycle tied to the classroom session.",
    nextBatch: "DB-5",
  },
  {
    id: "DBR-014",
    severity: "medium",
    collection: "quizzes",
    fields: ["questionIds", "learningPlacements", "targetGroupIds", "targetUserIds", "skillIds"],
    reason: "Assessment definition arrays can grow with large directed exams and must stay bounded and query-safe.",
    nextBatch: "DB-4",
  },
];

export const DB_HEAVY_JOURNEYS = {
  login: ["users", "phoneotps", "schoolmemberships", "teachingassignments", "accessgrants"],
  dashboard: ["users", "paths", "subjects", "courses", "skillprogresses", "lessonprogresses", "reviewcards", "accessgrants"],
  testSubmit: ["quizzes", "questions", "assessmentattempts", "assessmentresponses", "assessmentresults", "quizresults", "questionattempts", "skillprogresses", "reviewcards"],
  reviewRemediation: ["quizresults", "questionrevisions", "reviewcards", "questionattempts", "skillprogresses"],
  reports: ["quizresults", "questionattempts", "skillprogresses", "schoolskillaggregates", "schoolskillevidences", "groups", "schoolmemberships"],
  school: ["groups", "schoolmemberships", "teachingassignments", "classroomsessions", "classroomparticipants", "classroomresponses", "b2bpackages", "accessgrants"],
  admin: ["users", "adminauditlogs", "clientevents", "platformintegrationsettings", "paymentrequests", "notificationdeliveries"],
} as const;
