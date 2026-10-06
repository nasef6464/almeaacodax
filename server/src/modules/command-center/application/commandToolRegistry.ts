export type CommandToolRisk = "read" | "draft_write" | "sensitive";

export type CommandToolDefinition = {
  id: string;
  capability:
    | "taxonomy"
    | "questions"
    | "quizzes"
    | "courses"
    | "schools"
    | "operations";
  description: string;
  requiredScope: string;
  risk: CommandToolRisk;
  approvalRequired: boolean;
  availability: "active" | "planned";
};

export const commandToolRegistry: CommandToolDefinition[] = [
  { id: "get_skill_tree", capability: "taxonomy", description: "Read the current canonical skill tree.", requiredScope: "taxonomy:read", risk: "read", approvalRequired: false, availability: "active" },
  { id: "create_question_drafts", capability: "questions", description: "Create structured question drafts without touching live questions.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "create_quiz_draft", capability: "quizzes", description: "Create a quiz draft for admin review.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "get_course_inventory", capability: "courses", description: "Read reusable lessons, videos, quizzes, files and skills for a course scope.", requiredScope: "courses:read", risk: "read", approvalRequired: false, availability: "active" },
  { id: "create_course_draft", capability: "courses", description: "Create a reuse-first course structure draft from existing platform content before publishing.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "create_school_setup_draft", capability: "schools", description: "Validate and prepare school, class, student, teacher and supervisor setup as a reviewable draft.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "detect_question_duplicates", capability: "questions", description: "Detect exact and high-confidence near-duplicate questions before import.", requiredScope: "drafts:write", risk: "read", approvalRequired: false, availability: "active" },
  { id: "plan_quiz_question_update", capability: "quizzes", description: "Compare candidate questions with an existing quiz and create a reviewable update draft without mutating the quiz.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "apply_approved_draft", capability: "operations", description: "Apply an approved question batch, course, quiz or school setup draft through an idempotent domain adapter without public publication.", requiredScope: "drafts:apply", risk: "sensitive", approvalRequired: true, availability: "active" },
  { id: "publish_approved_draft", capability: "operations", description: "Publish an applied resource to learner-visible production surfaces.", requiredScope: "publish:write", risk: "sensitive", approvalRequired: true, availability: "planned" },
];

export const commandToolById = new Map(commandToolRegistry.map((tool) => [tool.id, tool]));
