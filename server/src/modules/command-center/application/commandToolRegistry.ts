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
  { id: "create_course_draft", capability: "courses", description: "Create a complete course structure draft before publishing.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "create_school_setup_draft", capability: "schools", description: "Prepare a school/class/user setup plan as a reviewable draft.", requiredScope: "drafts:write", risk: "draft_write", approvalRequired: true, availability: "active" },
  { id: "detect_question_duplicates", capability: "questions", description: "Detect exact and near-duplicate questions before import.", requiredScope: "questions:read", risk: "read", approvalRequired: false, availability: "planned" },
  { id: "update_quiz_questions", capability: "quizzes", description: "Prepare changes to the questions of an existing quiz.", requiredScope: "quizzes:write", risk: "sensitive", approvalRequired: true, availability: "planned" },
  { id: "publish_approved_draft", capability: "operations", description: "Publish an already approved draft through the owning domain service.", requiredScope: "publish:write", risk: "sensitive", approvalRequired: true, availability: "planned" },
];

export const commandToolById = new Map(commandToolRegistry.map((tool) => [tool.id, tool]));
