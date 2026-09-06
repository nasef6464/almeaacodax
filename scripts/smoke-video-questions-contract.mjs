import { readFileSync } from "node:fs";

const files = {
  types: "types.ts",
  lessonModel: "server/src/models/Lesson.ts",
  contentRoutes: "server/src/routes/content.routes.ts",
  learningSchemas: "server/src/modules/content/http/learningContentSchemas.ts",
  lessonBuilder: "dashboards/admin/builders/UnifiedLessonBuilder.tsx",
  videoQuestionPicker: "dashboards/admin/builders/VideoQuestionPicker.tsx",
  videoQuestionSnapshot: "utils/videoQuestionSnapshot.ts",
  questionsApi: "services/apiGroups/questionsApi.ts",
  quizRoutes: "server/src/routes/quiz.routes.ts",
  videoPlayer: "components/CustomVideoPlayer.tsx",
  videoModal: "components/VideoModal.tsx",
  subjectPage: "pages/SubjectLearningPage.tsx",
  coursePlayer: "components/CoursePlayer.tsx",
  authRoutes: "server/src/routes/auth.routes.ts",
  userModel: "server/src/models/User.ts",
  videoProgress: "utils/interactiveVideoProgress.ts",
};

const read = (path) => readFileSync(path, "utf8");
const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

const checks = [
  [
    "lesson contract keeps timed interactive questions",
    source.types.includes("interactiveQuestions?: InteractiveQuestion[]") &&
      source.lessonModel.includes("interactiveQuestions") &&
      source.learningSchemas.includes("interactiveQuestions: z") &&
      source.learningSchemas.includes("timestamp: z.number().min(0)") &&
      source.learningSchemas.includes("correctOptionIndex: z.number().min(0)") &&
      source.contentRoutes.includes("sanitizeLessonPayload(lessonSchema.parse(req.body))") &&
      source.contentRoutes.includes("sanitizeLessonPayload(lessonSchema.partial().parse(req.body))"),
  ],
  [
    "lesson builder can author timed video questions",
    source.lessonBuilder.includes("أسئلة داخل الفيديو") &&
      source.lessonBuilder.includes("اختيار من بنك الأسئلة") &&
      source.lessonBuilder.includes("saveVideoQuestionToBank") &&
      source.lessonBuilder.includes("timestamp") &&
      source.lessonBuilder.includes("correctOptionIndex"),
  ],
  [
    "video modal and foundation player pass lesson questions",
    source.videoModal.includes("interactiveQuestions={interactiveQuestions}") &&
      source.subjectPage.includes("interactiveQuestions={videoData.interactiveQuestions"),
  ],
  [
    "picker loads the authoritative question bank with server pagination and scoped filters",
    source.lessonBuilder.includes("VideoQuestionPicker") &&
      source.videoQuestionPicker.includes("api.getQuestionsPaginated") &&
      source.videoQuestionPicker.includes("pathId: context.pathId") &&
      source.videoQuestionPicker.includes("subject: context.subjectId") &&
      source.videoQuestionPicker.includes("sectionId: sectionId") &&
      source.videoQuestionPicker.includes("skillId: skillId") &&
      source.videoQuestionPicker.includes("approvalStatus: 'approved'") &&
      source.videoQuestionPicker.includes("hasExplanationVideo") &&
      source.questionsApi.includes("hasExplanationVideo?: boolean") &&
      source.quizRoutes.includes("query.hasExplanationVideo"),
  ],
  [
    "picker requires explicit selection and blocks duplicates or essay questions",
    source.videoQuestionPicker.includes("selectionMode") &&
      source.videoQuestionPicker.includes("excludedQuestionIds") &&
      source.videoQuestionPicker.includes("question.type === 'mcq' || question.type === 'true_false'") &&
      source.lessonBuilder.includes("لا يمكن ربط السؤال نفسه أكثر من مرة") &&
      !source.lessonBuilder.includes("firstBankQuestion"),
  ],
  [
    "bank selection persists an immutable playback snapshot and legacy inline questions remain supported",
    source.lessonBuilder.includes("createVideoQuestionSnapshot") &&
      source.lessonBuilder.includes("questionId: question.id") &&
      source.videoQuestionSnapshot.includes("correctOptionIndex: question.correctOptionIndex") &&
      source.types.includes("Immutable playback snapshot") &&
      source.learningSchemas.includes("imageUrl: z.string().optional()") &&
      source.videoPlayer.includes("inlineQuestion.imageUrl"),
  ],
  [
    "new questions use the unified builder and attach only after a successful approved response",
    source.lessonBuilder.includes("allowedTypes={['mcq', 'true_false']}") &&
      source.lessonBuilder.includes("const createdQuestion = await addQuestion") &&
      source.lessonBuilder.includes("createdQuestion.approvalStatus") &&
      source.lessonBuilder.includes("appendBankQuestions([createdQuestion])"),
  ],
  [
    "course player uses the same lesson video questions",
    source.coursePlayer.includes("interactiveQuestions={activeLesson.interactiveQuestions || []}") &&
      source.coursePlayer.includes("initialProgress={activeVideoProgress}") &&
      source.coursePlayer.includes("onInteractiveProgress={saveInteractiveVideoProgress}"),
  ],
  [
    "custom player pauses for due video questions",
    source.videoPlayer.includes("VideoQuestionOverlay") &&
      source.videoPlayer.includes("getDueVideoQuestion") &&
      source.videoPlayer.includes("questionBank") &&
      source.videoPlayer.includes("setActiveQuestion(dueQuestion)"),
  ],
  [
    "must-pass video questions are not recorded as answered after a wrong response in either player path",
    source.videoPlayer.split("if (isCorrect || !activeQuestion.mustPass) nextAnsweredQuestionIds.add(activeQuestion.id);").length - 1 === 2 &&
      !source.videoPlayer.includes("new Set(answeredQuestionIds).add(activeQuestion.id)"),
  ],
  [
    "iframe video sources fail closed when required interactive questions cannot be enforced",
    source.videoPlayer.includes("hasUnsupportedRequiredQuestions") &&
      source.videoPlayer.includes("usesNativeIframe && interactiveQuestions.some((question) => question.mustPass)") &&
      source.videoPlayer.includes('data-testid="interactive-video-required-provider-block"') &&
      source.videoPlayer.includes("يحتوي الدرس على سؤال إلزامي"),
  ],
  [
    "interactive video progress is bounded, persisted through the existing preferences route, and restores player state",
    source.types.includes("interface InteractiveVideoProgress") &&
      source.videoProgress.includes("mergeInteractiveVideoProgress") &&
      source.videoPlayer.includes("initialProgressRef.current?.positionSeconds") &&
      source.videoPlayer.includes("onInteractiveProgress") &&
      source.authRoutes.includes("interactiveVideoProgress") &&
      source.authRoutes.includes("max(100)") &&
      source.userModel.includes("interactiveVideoProgress"),
  ],
  [
    "pending authenticated video progress flushes on unmount without crossing user sessions",
    source.coursePlayer.includes("interactiveVideoProgressRef.current = merged") &&
      source.coursePlayer.includes("videoProgressPendingUserIdRef.current") &&
      source.coursePlayer.includes("pendingUserId !== currentVideoProgressUserIdRef.current") &&
      source.coursePlayer.includes("api.updateMyPreferences({ interactiveVideoProgress: interactiveVideoProgressRef.current })"),
  ],
  [
    "course lesson completion cannot bypass unanswered must-pass video questions",
    source.coursePlayer.includes("requiredVideoQuestionIds") &&
      source.coursePlayer.includes(".filter((question) => question.mustPass)") &&
      source.coursePlayer.includes("unansweredRequiredVideoQuestionIds") &&
      source.coursePlayer.includes("activeLesson.type === 'video' && unansweredRequiredVideoQuestionIds.length > 0") &&
      source.coursePlayer.includes("disabled={!completedLessons.includes(activeLesson.id) && unansweredRequiredVideoQuestionIds.length > 0}") &&
      source.coursePlayer.includes('data-testid="interactive-video-required-completion-block"'),
  ],
  [
    "video question overlay renders clean bank question content",
    source.videoPlayer.includes("normalizeQuestionHtml") &&
      source.videoPlayer.includes("bankQuestion?.imageUrl") &&
      source.videoPlayer.includes("dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(inlineQuestion.text) }}") &&
      source.videoPlayer.includes("dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }}"),
  ],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
console.log(`\nAll ${checks.length} video question contract smoke checks passed.`);