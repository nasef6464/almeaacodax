import mongoose, { Schema } from "mongoose";

const quizSectionResultSchema = new Schema(
  {
    sectionId:   { type: String, required: true },
    sectionName: { type: String, default: "" },
    total:       { type: Number, default: 0 },
    correct:     { type: Number, default: 0 },
    wrong:       { type: Number, default: 0 },
    unanswered:  { type: Number, default: 0 },
    score:       { type: Number, default: 0 }, // percentage 0-100
  },
  { _id: false },
);

const quizResultSchema = new Schema(
  {
    userId:         { type: String, required: true, index: true },
    quizId:         { type: String, required: true, index: true },
    quizTitle:      { type: String, required: true, trim: true },
    score:          { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers:   { type: Number, default: 0 },
    unanswered:     { type: Number, default: 0 },
    passed:         { type: Boolean, default: false, index: true },
    attemptNumber:  { type: Number, default: 1 },
    source:         { type: String, default: "" },
    timeSpentSeconds: { type: Number, default: 0 },
    timeSpent:      { type: String, default: "" },
    date:           { type: String, default: "" },
    skillsAnalysis: { type: [Schema.Types.Mixed], default: [] },
    questionReview: { type: [Schema.Types.Mixed], default: [] },
    // تحليل الأداء لكل قسم (للمحاكيات فقط — اختياري للتوافق مع السجلات القديمة)
    sectionResults: { type: [quizSectionResultSchema], default: undefined },
    submissionKey:  { type: String, default: undefined, unique: true, sparse: true, index: true },
    // ── لقطة الاختبار ──────────────────────────────────────────────────────
    // تُحفظ لقطة مجمدة من بيانات الاختبار الجوهرية وقت التسليم
    // الغرض: حماية سلامة البيانات إذا عُدِّل الاختبار الأصلي أو حُذف لاحقاً
    quizSnapshot: {
      type: new Schema(
        {
          title:          { type: String, default: "" },
          mode:           { type: String, default: "regular" },     // regular | saher | central
          quizKind:       { type: String, default: "test" },        // drill | test | mock
          passingScore:   { type: Number, default: 60 },
          targetGroupIds: { type: [String], default: [] },
          targetUserIds:  { type: [String], default: [] },
          dueDate:        { type: String, default: null },
          pathId:         { type: String, default: "" },
          subjectId:      { type: String, default: "" },
          totalQuestions: { type: Number, default: 0 },
          snapshotAt:     { type: Number, default: () => Date.now() },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

quizResultSchema.index({ userId: 1, createdAt: -1 });
quizResultSchema.index({ quizId: 1, createdAt: -1 });
quizResultSchema.index({ userId: 1, quizId: 1, attemptNumber: 1 });
quizResultSchema.index({ "skillsAnalysis.skillId": 1, userId: 1 });
quizResultSchema.index({ "skillsAnalysis.subjectId": 1, createdAt: -1 });

export const QuizResultModel = mongoose.model("QuizResult", quizResultSchema);
