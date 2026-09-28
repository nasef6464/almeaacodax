import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  dashboard,
  quizPage,
  results,
  favorites,
  reviewSession,
  studentReviewRoutes,
  reviewRoutes,
  assistantPanel,
  skillProgress,
  nextBestAction,
  presentation,
  assessmentAudit,
] = await Promise.all([
  read("pages/Dashboard.tsx"),
  read("pages/QuizPage.tsx"),
  read("pages/Results.tsx"),
  read("pages/Favorites.tsx"),
  read("pages/ReviewSession.tsx"),
  read("server/src/modules/quizzes/http/studentReviewRoutes.ts"),
  read("server/src/routes/review.routes.ts"),
  read("components/results/QuestionAssistantPanel.tsx"),
  read("server/src/modules/quizzes/application/quizSubmissionSkillProgress.ts"),
  read("server/src/modules/quizzes/analytics/nextBestAction.ts"),
  read("utils/quizPresentation.ts"),
  read("scripts/live-assessment-commercial-audit.mjs"),
]);

const assert = (ok, message) => { if (!ok) throw new Error(message); };

assert(dashboard.includes("رحلتي التعليمية") && dashboard.includes("المسار الذكي"), "dashboard journey entry missing");
assert(quizPage.includes("مراجعة لاحق") && quizPage.includes("saveQuestionForReview"), "quiz save-for-review action missing");
assert(results.includes("QuestionAssistantPanel") && results.includes("QuestionVoiceExplanationPlayer"), "result review tutor/voice missing");
assert(favorites.includes("أسئلتي للمراجعة") && favorites.includes("حفظتها للمراجعة") && favorites.includes("أخطأت فيها"), "review library two-source UX missing");
assert(reviewSession.includes("QuestionVoiceExplanationPlayer") && reviewSession.includes("QuestionAssistantPanel"), "PLAN 1 review voice/tutor gap regressed");
assert(studentReviewRoutes.includes('tab: z.enum(["saved", "mistakes", "all"])') && studentReviewRoutes.includes("ReviewCardModel"), "ReviewCard server-truth library missing");
assert(reviewRoutes.includes('evidenceType: String(card.reviewType || "") === "mastery_review" ? "mastery_review" : "remediation"'), "review remediation evidence typing missing");
assert(reviewRoutes.includes("updateSkillProgressFromQuestionAttempt(attempt, userId)"), "review must directly update SkillProgress");
assert(skillProgress.includes("SkillProgressModel.bulkWrite") && skillProgress.includes("recentEvidenceKeys"), "SkillProgress direct evidence/idempotency missing");
assert(skillProgress.includes('{ _id: { $in: ids } }') && skillProgress.includes('"subSkills.id": { $in: ids }') && skillProgress.includes("skillName: String(subSkill?.name"), "remediation must resolve string skill _id and canonical embedded subskill IDs");
assert(nextBestAction.includes("buildServerNextBestAction"), "server Next Best Action missing");
assert(assistantPanel.includes("SpeechRecognition") && assistantPanel.includes("speechSynthesis"), "voice tutor STT/TTS missing");
assert(!assistantPanel.includes("<input"), "student tutor must remain voice-only");
assert(presentation.includes("getLearnerOptionLabel"), "learner option labeling contract missing");
for (const label of ["أ", "ب", "ج", "د"]) assert(presentation.includes(label), `quant option label ${label} missing`);
assert(assessmentAudit.includes("Remediation did not advance SkillProgress evidence"), "direct SkillProgress E2E proof missing");
assert(assessmentAudit.includes('String(attempt.evidenceType || "") === "remediation"'), "direct remediation attempt proof missing");
assert(assessmentAudit.includes("Next Best Action did not consume the remediated skill scope"), "Next Best Action E2E proof missing");
assert(assessmentAudit.includes('getByText("شرح المعلم الصوتي"'), "review voice playback E2E proof missing");

console.log("PASS PLAN 6 Student Journey & Learning Loop contract");
