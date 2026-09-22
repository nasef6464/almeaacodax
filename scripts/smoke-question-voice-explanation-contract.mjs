import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  questionModel,
  questionSchemas,
  questionPresentation,
  answerReview,
  mediaRoutes,
  audioUpload,
  questionsApi,
  builder,
  voiceEditor,
  results,
  voicePlayer,
  aiRoutes,
] = await Promise.all([
  read("server/src/models/Question.ts"),
  read("server/src/modules/quizzes/http/questionQuerySchemas.ts"),
  read("server/src/modules/quizzes/presentation/questionPresentation.ts"),
  read("server/src/modules/quizzes/application/quizSubmissionAnswerReview.ts"),
  read("server/src/routes/media.routes.ts"),
  read("server/src/modules/media/application/questionExplanationAudioUpload.ts"),
  read("services/apiGroups/questionsApi.ts"),
  read("dashboards/admin/builders/UnifiedQuestionBuilder.tsx"),
  read("dashboards/admin/builders/QuestionVoiceExplanationEditor.tsx"),
  read("pages/Results.tsx"),
  read("components/results/QuestionVoiceExplanationPlayer.tsx"),
  read("server/src/routes/ai.routes.ts"),
]);

const checks = [];

const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({
      name,
      status: "FAIL",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const includes = (source, fragment) => {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
};

check("question schema stores manual voice explanation without Base64", () => {
  includes(questionModel, "questionVoiceExplanationSchema");
  includes(questionModel, "audioUrl");
  includes(questionModel, "audioMimeType");
  includes(questionModel, "voiceExplanation: { type: questionVoiceExplanationSchema");
  if (/data:audio/i.test(questionModel)) throw new Error("Question model must not store inline audio data");
});

check("HTTP validation accepts only bounded voice explanation metadata", () => {
  includes(questionSchemas, "questionVoiceExplanationSchema");
  includes(questionSchemas, "text: z.string().max(12000)");
  includes(questionSchemas, "Voice explanation audio URL must be blank or use HTTP(S)");
  includes(questionSchemas, "voiceExplanation: questionVoiceExplanationSchema.optional()");
});

check("learner pre-answer payload strips teacher voice explanation", () => {
  includes(questionPresentation, "voiceExplanation,");
  includes(questionPresentation, "...safeQuestion");
});

check("submitted result snapshots teacher voice explanation", () => {
  includes(answerReview, "voiceExplanation: question.voiceExplanation || undefined");
});

check("R2 media path supports teacher explanation audio", () => {
  includes(mediaRoutes, '"/question-explanations/presign"');
  includes(mediaRoutes, 'requireRole(["admin", "teacher"])');
  includes(audioUpload, "questions/explanations/");
  includes(audioUpload, "audio/webm");
  includes(audioUpload, "audio/mpeg");
  includes(audioUpload, "createR2PresignedPutUrl");
});

check("frontend API uploads explanation audio directly to presigned R2 URL", () => {
  includes(questionsApi, "uploadQuestionExplanationAudio");
  includes(questionsApi, '"/media/question-explanations/presign"');
  includes(questionsApi, "body: file");
});

check("admin editor supports text, upload and microphone recording", () => {
  includes(builder, "QuestionVoiceExplanationEditor");
  includes(voiceEditor, "navigator.mediaDevices.getUserMedia({ audio: true })");
  includes(voiceEditor, "new MediaRecorder");
  includes(voiceEditor, "نص الشرح الصوتي اليدوي");
  includes(voiceEditor, "تسجيل صوتي الآن");
  includes(voiceEditor, "uploadQuestionExplanationAudio");
});

check("post-result review plays teacher audio or reads manual teacher text", () => {
  includes(results, "QuestionVoiceExplanationPlayer");
  includes(voicePlayer, "<audio controls");
  includes(voicePlayer, "SpeechSynthesisUtterance");
  includes(voicePlayer, "utterance.lang = 'ar-SA'");
});

check("question assistant prioritizes teacher-authored explanation after submission", () => {
  includes(aiRoutes, "teacherVoiceExplanation");
  includes(aiRoutes, "teacherVoiceExplanation || review?.explanation");
  includes(aiRoutes, "voiceExplanation updatedAt");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({
  phase: "question-voice-explanation-contract",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
