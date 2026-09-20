import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const route = read("server/src/routes/quiz.routes.ts");
const querySchema = read("server/src/modules/quizzes/http/questionQuerySchemas.ts");
const coverage = read("server/src/modules/quizzes/application/questionBankCoverage.ts");
const questionApi = read("services/apiGroups/questionsApi.ts");
const manager = read("dashboards/admin/QuestionBankManager.tsx");
const builder = read("dashboards/admin/builders/UnifiedQuestionBuilder.tsx");
const editor = read("components/RichTextEditor.tsx");
const mediaRoute = read("server/src/routes/media.routes.ts");
const mediaService = read("server/src/modules/media/application/questionImageUpload.ts");

const checks = [
  ["coverage aggregation exists", coverage.includes("getQuestionBankCoverage") && coverage.includes("$setUnion")],
  ["coverage is based on full filtered query", route.includes("getQuestionBankCoverage(filter)") && route.includes("includeCoverage")],
  ["skill-link filter is server-side", querySchema.includes('skillLinkStatus: z.enum(["linked", "unlinked"])') && route.includes('scopeFilter["skillIds.0"]')],
  ["video status filter is server-side", querySchema.includes('videoStatus: z.enum(["with", "without"])') && route.includes('query.videoStatus === "without"')],
  ["explanation completeness filter is server-side", querySchema.includes('explanationStatus: z.enum(["with", "without"])') && route.includes('query.explanationStatus === "without"')],
  ["client requests global coverage", manager.includes("includeCoverage: true") && manager.includes("questionBankCoverage")],
  ["client exposes linked/unlinked skill filter", manager.includes('data-testid="question-bank-skill-link-filter"') && manager.includes("skillLinkStatus:")],
  ["client exposes missing explanation filter", manager.includes('data-testid="question-bank-missing-explanation-filter"') && manager.includes("explanationStatus:")],
  ["full record is loaded before editing", manager.includes("api.getQuestionForEditing(questionId)") && questionApi.includes("getQuestionForEditing")],
  ["summary row is not directly opened for edit", !manager.includes("setCurrentQuestion(question);\n    setIsEditing(true);")],
  ["builder preserves existing multi-skill ids", builder.includes("Existing skill links are authoritative while taxonomy is loading") && builder.includes("[...(prev.skillIds || []), event.target.value]")],
  ["current external image is visible in editor", editor.includes('data-testid="question-editor-external-image"') && editor.includes("externalImageUrl")],
  ["question images upload direct to external storage", editor.includes("onUploadImage") && questionApi.includes("fetch(intent.uploadUrl")],
  ["base64 paste is rejected in question editor", editor.includes("Base64 غير مسموحة")],
  ["R2 presign is protected", mediaRoute.includes('requireRole(["admin", "teacher"])') && mediaRoute.includes("/question-images/presign")],
  ["R2 upload is bounded", mediaService.includes("R2_UPLOAD_MAX_BYTES") && mediaService.includes("image/webp")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}
if (failed.length) {
  throw new Error(`Question bank coverage/editor contract failed: ${failed.map(([name]) => name).join(", ")}`);
}

console.log("Question bank full coverage/editor contract: PASS");
