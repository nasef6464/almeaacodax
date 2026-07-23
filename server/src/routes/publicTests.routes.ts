import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PublicBarcodeTestModel } from "../models/PublicBarcodeTest.js";
import { PublicBarcodeSubmissionModel } from "../models/PublicBarcodeSubmission.js";
import { QuestionModel } from "../models/Question.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";

export const publicTestsRouter = Router();

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-zA-Z0-9\u0600-\u06ff-]+$/);

const publicBarcodeTestSchema = z.object({
  id: z.string().trim().optional(),
  slug: slugSchema.optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(600).optional().default(""),
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().optional().default(""),
  skillIds: z.array(z.string().trim().min(1)).optional().default([]),
  questionIds: z.array(z.string().trim().min(1)).min(1).max(120),
  testKind: z.enum(["quick", "mock"]).optional().default("quick"),
  audience: z.enum(["open", "targeted"]).optional().default("open"),
  targetGroupIds: z.array(z.string().trim().min(1)).optional().default([]),
  targetUserIds: z.array(z.string().trim().min(1)).optional().default([]),
  status: z.enum(["draft", "active", "paused", "archived"]).optional().default("draft"),
  showResultToStudent: z.boolean().optional().default(true),
  collectSchool: z.boolean().optional().default(true),
  collectClassroom: z.boolean().optional().default(true),
  settings: z
    .object({
      showExplanations: z.boolean().optional().default(true),
      showAnswers: z.boolean().optional().default(true),
      showResultsReport: z.boolean().optional().default(true),
      maxAttempts: z.number().int().min(1).max(20).optional().default(1),
      passingScore: z.number().int().min(0).max(100).optional().default(60),
      timeLimit: z.number().int().min(0).max(300).optional().default(20),
      randomizeQuestions: z.boolean().optional().default(true),
      randomizeOptions: z.boolean().optional().default(false),
      showProgressBar: z.boolean().optional().default(true),
      requireAnswerBeforeNext: z.boolean().optional().default(false),
      allowQuestionReview: z.boolean().optional().default(true),
      optionLayout: z.enum(["auto", "horizontal", "two_columns"]).optional().default("auto"),
    })
    .optional()
    .default({}),
  startsAt: z.number().nullable().optional().default(null),
  endsAt: z.number().nullable().optional().default(null),
  maxSubmissions: z.number().int().min(1).nullable().optional().default(null),
  ownerType: z.enum(["platform", "school", "teacher"]).optional().default("platform"),
  ownerId: z.string().trim().optional().default(""),
});

const publicBarcodeSubmitSchema = z.object({
  studentName: z.string().trim().min(2).max(160),
  schoolName: z.string().trim().max(160).optional().default(""),
  classroomName: z.string().trim().max(120).optional().default(""),
  contact: z.string().trim().max(160).optional().default(""),
  sessionFingerprint: z.string().trim().max(200).optional().default(""),
  timeSpentSeconds: z.number().int().min(0).max(24 * 60 * 60).optional().default(0),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        selectedOptionIndex: z.number().int().min(-1).max(50),
      }),
    )
    .min(1)
    .max(120),
});

const createSlug = (title: string) =>
  `${title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "test"}-${randomUUID().slice(0, 8)}`;

const ensureActiveWindow = (test: any) => {
  const now = Date.now();
  if (test.status !== "active") return false;
  if (test.startsAt && now < Number(test.startsAt)) return false;
  if (test.endsAt && now > Number(test.endsAt)) return false;
  return true;
};

const publicQuestionFields = "_id id text options imageUrl skillIds pathId subject sectionId type difficulty";

const buildSkillsAnalysis = (questions: any[], answersByQuestionId: Map<string, number>) => {
  const skillStats = new Map<string, { skillId: string; total: number; correct: number }>();
  for (const question of questions) {
    const questionId = String(question.id || question._id);
    const selected = answersByQuestionId.get(questionId) ?? -1;
    const isCorrect = selected === Number(question.correctOptionIndex);
    const skillIds = Array.isArray(question.skillIds) && question.skillIds.length ? question.skillIds.map(String) : ["unclassified"];
    for (const skillId of skillIds) {
      const current = skillStats.get(skillId) || { skillId, total: 0, correct: 0 };
      current.total += 1;
      if (isCorrect) current.correct += 1;
      skillStats.set(skillId, current);
    }
  }

  return Array.from(skillStats.values())
    .map((item) => ({
      skillId: item.skillId,
      attempts: item.total,
      mastery: item.total ? Math.round((item.correct / item.total) * 100) : 0,
      status: item.total && item.correct / item.total < 0.5 ? "weak" : item.correct / Math.max(item.total, 1) < 0.75 ? "average" : "strong",
    }))
    .sort((a, b) => a.mastery - b.mastery);
};

const shuffleArray = <T>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const buildAttemptIdentityFilter = (testId: string, payload: z.infer<typeof publicBarcodeSubmitSchema>) => {
  const or: Array<Record<string, unknown>> = [];
  if (payload.sessionFingerprint) or.push({ sessionFingerprint: payload.sessionFingerprint });
  if (payload.contact) or.push({ contact: payload.contact });
  or.push({
    studentName: payload.studentName,
    schoolName: payload.schoolName,
    classroomName: payload.classroomName,
  });
  return { testId, $or: or };
};

const assertTargetScope = async (authUser: any, targetGroupIds: string[], targetUserIds: string[]) => {
  if (authUser.role === "admin" || (targetGroupIds.length === 0 && targetUserIds.length === 0)) return;

  const directGroupIds = Array.isArray(authUser.groupIds) ? authUser.groupIds.map(String) : [];
  const ownedGroups = await GroupModel.find({
    $or: [
      ...(directGroupIds.length ? [{ id: { $in: directGroupIds } }, { _id: { $in: directGroupIds.filter((id: string) => /^[a-f0-9]{24}$/i.test(id)) } }] : []),
      { supervisorIds: String(authUser.id) },
    ],
  }).select("id _id parentId type").lean();
  const ownedGroupIds = new Set(ownedGroups.map((group: any) => String(group.id || group._id)));
  const schoolIds = new Set<string>();
  ownedGroups.forEach((group: any) => {
    if (group.type === "SCHOOL") schoolIds.add(String(group.id || group._id));
  });
  const schoolGroups = schoolIds.size
    ? await GroupModel.find({ parentId: { $in: Array.from(schoolIds) } }).select("id _id").lean()
    : [];
  schoolGroups.forEach((group: any) => ownedGroupIds.add(String(group.id || group._id)));

  if (targetGroupIds.some((groupId) => !ownedGroupIds.has(groupId))) {
    const error = new Error("Barcode test targets are outside the staff scope") as Error & { statusCode?: number };
    error.statusCode = StatusCodes.FORBIDDEN;
    throw error;
  }

  if (targetUserIds.length) {
    const students = await UserModel.find({
      $or: [
        { id: { $in: targetUserIds } },
        { _id: { $in: targetUserIds.filter((id) => /^[a-f0-9]{24}$/i.test(id)) } },
      ],
    }).select("id _id role schoolId groupIds").lean();
    const allowedStudents = students.filter((student: any) =>
      student.role === "student" &&
      ((!authUser.schoolId || String(student.schoolId || "") === String(authUser.schoolId)) ||
        (student.groupIds || []).some((groupId: string) => ownedGroupIds.has(String(groupId)))),
    );
    if (allowedStudents.length !== targetUserIds.length) {
      const error = new Error("Barcode test targets include students outside the staff scope") as Error & { statusCode?: number };
      error.statusCode = StatusCodes.FORBIDDEN;
      throw error;
    }
  }
};

publicTestsRouter.post(
  "/admin",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = publicBarcodeTestSchema.parse(req.body || {});
    const targetGroupIds = [...new Set(payload.targetGroupIds.map(String))];
    const targetUserIds = [...new Set(payload.targetUserIds.map(String))];
    if (payload.audience === "targeted" && targetGroupIds.length === 0 && targetUserIds.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Targeted barcode tests require groups or students." });
    }
    await assertTargetScope(req.authUser, targetGroupIds, targetUserIds);
    const questionDocs = await QuestionModel.find({
      $or: [{ id: { $in: payload.questionIds } }, { _id: { $in: payload.questionIds.filter((id) => /^[a-f0-9]{24}$/i.test(id)) } }],
      pathId: payload.pathId,
      subject: payload.subjectId,
      approvalStatus: "approved",
    })
      .select("_id id")
      .lean();
    const approvedQuestionIds = questionDocs.map((question: any) => String(question.id || question._id));

    if (approvedQuestionIds.length !== payload.questionIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "All barcode test questions must exist in the approved question center for the selected path and subject.",
      });
    }

    const now = Date.now();
    const test = await PublicBarcodeTestModel.create({
      ...payload,
      targetGroupIds: payload.audience === "targeted" ? targetGroupIds : [],
      targetUserIds: payload.audience === "targeted" ? targetUserIds : [],
      collectSchool: true,
      collectClassroom: true,
      id: payload.id || `pbt_${now}_${randomUUID().slice(0, 8)}`,
      slug: payload.slug || createSlug(payload.title),
      questionIds: approvedQuestionIds,
      createdBy: req.authUser!.id,
    });

    return res.status(StatusCodes.CREATED).json({
      test,
      publicUrl: `/barcode-test/${test.slug}`,
      qrPayload: `/barcode-test/${test.slug}`,
    });
  }),
);

publicTestsRouter.get(
  "/admin",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        pathId: z.string().trim().optional(),
        subjectId: z.string().trim().optional(),
        status: z.enum(["draft", "active", "paused", "archived"]).optional(),
        testKind: z.enum(["quick", "mock"]).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional().default(30),
      })
      .parse(req.query || {});

    const filter: Record<string, unknown> = {};
    if (query.pathId) filter.pathId = query.pathId;
    if (query.subjectId) filter.subjectId = query.subjectId;
    if (query.status) filter.status = query.status;
    if (query.testKind) filter.testKind = query.testKind;

    const tests = await PublicBarcodeTestModel.find(filter).sort({ createdAt: -1 }).limit(query.limit).lean();
    const testIds = tests.map((test: any) => String(test.id));
    const submissionSummary = testIds.length
      ? await PublicBarcodeSubmissionModel.aggregate([
          { $match: { testId: { $in: testIds } } },
          {
            $group: {
              _id: "$testId",
              submissions: { $sum: 1 },
              averageScore: { $avg: "$score" },
              lastSubmittedAt: { $max: "$submittedAt" },
            },
          },
        ])
      : [];
    const summaryByTestId = new Map(
      submissionSummary.map((item: any) => [
        String(item._id),
        {
          submissions: Number(item.submissions || 0),
          averageScore: Math.round(Number(item.averageScore || 0)),
          lastSubmittedAt: Number(item.lastSubmittedAt || 0),
        },
      ]),
    );

    return res.json({
      items: tests.map((test: any) => ({
        id: test.id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        pathId: test.pathId,
        subjectId: test.subjectId,
        testKind: test.testKind || "quick",
        audience: test.audience || "open",
        targetGroupIds: test.targetGroupIds || [],
        targetUserIds: test.targetUserIds || [],
        status: test.status,
        questionCount: Array.isArray(test.questionIds) ? test.questionIds.length : 0,
        settings: test.settings || {},
        createdAt: test.createdAt,
        publicUrl: `/barcode-test/${test.slug}`,
        qrPayload: `/barcode-test/${test.slug}`,
        summary: summaryByTestId.get(String(test.id)) || { submissions: 0, averageScore: 0, lastSubmittedAt: 0 },
      })),
    });
  }),
);

publicTestsRouter.get(
  "/assigned",
  requireAuth,
  requireRole(["student"]),
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "");
    const groupIds = Array.isArray(req.authUser?.groupIds) ? req.authUser.groupIds.map(String) : [];
    const tests = await PublicBarcodeTestModel.find({
      status: "active",
      audience: "targeted",
      $or: [
        { targetUserIds: userId },
        ...(groupIds.length ? [{ targetGroupIds: { $in: groupIds } }] : []),
      ],
    }).sort({ createdAt: -1 }).limit(30).lean();

    return res.json({
      items: tests.filter(ensureActiveWindow).map((test: any) => ({
        id: test.id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        testKind: test.testKind || "quick",
        questionCount: Array.isArray(test.questionIds) ? test.questionIds.length : 0,
        settings: test.settings || {},
        publicUrl: `/barcode-test/${test.slug}`,
      })),
    });
  }),
);

publicTestsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const test = await PublicBarcodeTestModel.findOne({ slug }).lean();
    if (!test || !ensureActiveWindow(test)) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Public test is not available" });
    }

    const questions = await QuestionModel.find({
      $or: [{ id: { $in: test.questionIds } }, { _id: { $in: test.questionIds.filter((id: string) => /^[a-f0-9]{24}$/i.test(id)) } }],
      approvalStatus: "approved",
    })
      .select(publicQuestionFields)
      .lean();

    return res.json({
      test: {
        id: test.id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        testKind: test.testKind || "quick",
        pathId: test.pathId,
        subjectId: test.subjectId,
        sectionId: test.sectionId,
        collectSchool: true,
        collectClassroom: true,
        showResultToStudent: test.showResultToStudent,
        settings: test.settings || {},
        questionCount: questions.length,
      },
      questions: (test.settings?.randomizeQuestions ? shuffleArray(questions) : questions).map((question: any) => {
        const options = Array.isArray(question.options) ? question.options : [];
        const optionOrder = test.settings?.randomizeOptions ? shuffleArray(options.map((_: unknown, index: number) => index)) : options.map((_: unknown, index: number) => index);
        return {
          id: String(question.id || question._id),
          text: question.text,
          options: optionOrder.map((optionIndex: number) => options[optionIndex]),
          optionOrder,
          imageUrl: question.imageUrl,
          skillIds: question.skillIds || [],
          type: question.type,
          difficulty: question.difficulty,
        };
      }),
    });
  }),
);

publicTestsRouter.post(
  "/:slug/submit",
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const payload = publicBarcodeSubmitSchema.parse(req.body || {});
    const test = await PublicBarcodeTestModel.findOne({ slug }).lean();
    if (!test || !ensureActiveWindow(test)) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Public test is not available" });
    }
    if (!payload.schoolName.trim() || !payload.classroomName.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Student name, school name, and classroom are required for barcode public tests.",
      });
    }

    if (test.maxSubmissions) {
      const currentCount = await PublicBarcodeSubmissionModel.countDocuments({ testId: test.id });
      if (currentCount >= Number(test.maxSubmissions)) {
        return res.status(StatusCodes.CONFLICT).json({ message: "Public test reached the submission limit" });
      }
    }

    const maxAttempts = Number(test.settings?.maxAttempts || 1);
    if (maxAttempts > 0) {
      const previousAttempts = await PublicBarcodeSubmissionModel.countDocuments(buildAttemptIdentityFilter(test.id, payload));
      if (previousAttempts >= maxAttempts) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "وصل الطالب للحد المسموح من محاولات هذا الاختبار.",
          attemptsUsed: previousAttempts,
          maxAttempts,
        });
      }
    }

    const timeLimitMinutes = Number(test.settings?.timeLimit || 0);
    if (timeLimitMinutes > 0 && payload.timeSpentSeconds > timeLimitMinutes * 60 + 60) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "انتهى وقت الاختبار قبل الإرسال." });
    }

    const questions = await QuestionModel.find({
      $or: [{ id: { $in: test.questionIds } }, { _id: { $in: test.questionIds.filter((id: string) => /^[a-f0-9]{24}$/i.test(id)) } }],
      approvalStatus: "approved",
    })
      .select("_id id correctOptionIndex skillIds")
      .lean();
    const answersByQuestionId = new Map(payload.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex]));
    const answerRows = questions.map((question: any) => {
      const questionId = String(question.id || question._id);
      const selectedOptionIndex = answersByQuestionId.get(questionId) ?? -1;
      return {
        questionId,
        selectedOptionIndex,
        isCorrect: selectedOptionIndex === Number(question.correctOptionIndex),
        skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
      };
    });
    const correctAnswers = answerRows.filter((answer) => answer.isCorrect).length;
    const totalQuestions = questions.length;
    const unanswered = answerRows.filter((answer) => answer.selectedOptionIndex < 0).length;
    const wrongAnswers = Math.max(totalQuestions - correctAnswers - unanswered, 0);
    const score = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const skillsAnalysis = buildSkillsAnalysis(questions, answersByQuestionId);
    const submission = await PublicBarcodeSubmissionModel.create({
      id: `pbts_${Date.now()}_${randomUUID().slice(0, 8)}`,
      testId: test.id,
      slug,
      studentName: payload.studentName,
      schoolName: payload.schoolName,
      classroomName: payload.classroomName,
      contact: payload.contact,
      sessionFingerprint: payload.sessionFingerprint,
      answers: answerRows,
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      skillsAnalysis,
      timeSpentSeconds: payload.timeSpentSeconds,
      submittedAt: Date.now(),
    });

    return res.status(StatusCodes.CREATED).json({
      submissionId: submission.id,
      result: test.showResultToStudent
        ? {
            score,
            passed: score >= Number(test.settings?.passingScore || 60),
            passingScore: Number(test.settings?.passingScore || 60),
            totalQuestions,
            correctAnswers,
            wrongAnswers,
            unanswered,
            weakestSkill: skillsAnalysis[0] || null,
            strongestSkill: [...skillsAnalysis].sort((a, b) => b.mastery - a.mastery)[0] || null,
            showAnswers: test.settings?.showAnswers !== false,
            showExplanations: test.settings?.showExplanations !== false,
            nextAction: "راجع أضعف مهارة، ثم ادخل المنصة لتكمل تدريبًا قصيرًا عليها.",
          }
        : null,
    });
  }),
);

publicTestsRouter.get(
  "/admin/:id/report",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const test = await PublicBarcodeTestModel.findOne({ id: req.params.id }).lean();
    if (!test) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Public test not found" });
    }
    const submissions = await PublicBarcodeSubmissionModel.find({ testId: test.id }).sort({ submittedAt: -1 }).limit(1000).lean();
    const averageScore = submissions.length
      ? Math.round(submissions.reduce((total, item: any) => total + Number(item.score || 0), 0) / submissions.length)
      : 0;
    const passingScore = Number(test.settings?.passingScore || 60);
    const passCount = submissions.filter((submission: any) => Number(submission.score || 0) >= passingScore).length;
    const highestScore = submissions.length ? Math.max(...submissions.map((submission: any) => Number(submission.score || 0))) : 0;
    const lowestScore = submissions.length ? Math.min(...submissions.map((submission: any) => Number(submission.score || 0))) : 0;
    const averageTimeSeconds = submissions.length
      ? Math.round(submissions.reduce((total, item: any) => total + Number(item.timeSpentSeconds || 0), 0) / submissions.length)
      : 0;
    const skillMap = new Map<string, { skillId: string; total: number; count: number }>();
    const schoolMap = new Map<string, { name: string; submissions: number; totalScore: number; passed: number }>();
    const classroomMap = new Map<string, { name: string; schoolName: string; submissions: number; totalScore: number; passed: number }>();
    submissions.forEach((submission: any) => {
      const score = Number(submission.score || 0);
      const schoolName = String(submission.schoolName || "غير محدد").trim() || "غير محدد";
      const classroomName = String(submission.classroomName || "غير محدد").trim() || "غير محدد";
      const schoolCurrent = schoolMap.get(schoolName) || { name: schoolName, submissions: 0, totalScore: 0, passed: 0 };
      schoolCurrent.submissions += 1;
      schoolCurrent.totalScore += score;
      if (score >= passingScore) schoolCurrent.passed += 1;
      schoolMap.set(schoolName, schoolCurrent);

      const classroomKey = `${schoolName}::${classroomName}`;
      const classroomCurrent = classroomMap.get(classroomKey) || {
        name: classroomName,
        schoolName,
        submissions: 0,
        totalScore: 0,
        passed: 0,
      };
      classroomCurrent.submissions += 1;
      classroomCurrent.totalScore += score;
      if (score >= passingScore) classroomCurrent.passed += 1;
      classroomMap.set(classroomKey, classroomCurrent);

      (submission.skillsAnalysis || []).forEach((skill: any) => {
        const current = skillMap.get(skill.skillId) || { skillId: skill.skillId, total: 0, count: 0 };
        current.total += Number(skill.mastery || 0);
        current.count += 1;
        skillMap.set(skill.skillId, current);
      });
    });
    const weakestSkills = Array.from(skillMap.values())
      .map((skill) => ({ skillId: skill.skillId, mastery: skill.count ? Math.round(skill.total / skill.count) : 0, attempts: skill.count }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5);
    const bySchool = Array.from(schoolMap.values())
      .map((item) => ({
        name: item.name,
        submissions: item.submissions,
        averageScore: item.submissions ? Math.round(item.totalScore / item.submissions) : 0,
        passRate: item.submissions ? Math.round((item.passed / item.submissions) * 100) : 0,
      }))
      .sort((a, b) => b.submissions - a.submissions || a.averageScore - b.averageScore);
    const byClassroom = Array.from(classroomMap.values())
      .map((item) => ({
        name: item.name,
        schoolName: item.schoolName,
        submissions: item.submissions,
        averageScore: item.submissions ? Math.round(item.totalScore / item.submissions) : 0,
        passRate: item.submissions ? Math.round((item.passed / item.submissions) * 100) : 0,
      }))
      .sort((a, b) => b.submissions - a.submissions || a.averageScore - b.averageScore);
    const lowPerformers = submissions
      .filter((submission: any) => Number(submission.score || 0) < passingScore)
      .sort((a: any, b: any) => Number(a.score || 0) - Number(b.score || 0))
      .slice(0, 20)
      .map((submission: any) => ({
        id: submission.id,
        studentName: submission.studentName,
        schoolName: submission.schoolName,
        classroomName: submission.classroomName,
        score: submission.score,
        submittedAt: submission.submittedAt,
      }));

    return res.json({
      test: {
        id: test.id,
        slug: test.slug,
        title: test.title,
        testKind: test.testKind || "quick",
        passingScore,
        questionCount: Array.isArray(test.questionIds) ? test.questionIds.length : 0,
      },
      summary: {
        submissions: submissions.length,
        averageScore,
        passingScore,
        passRate: submissions.length ? Math.round((passCount / submissions.length) * 100) : 0,
        highestScore,
        lowestScore,
        averageTimeSeconds,
        weakestSkills,
        bySchool,
        byClassroom,
        lowPerformers,
      },
      rows: submissions.map((submission: any) => ({
        id: submission.id,
        studentName: submission.studentName,
        schoolName: submission.schoolName,
        classroomName: submission.classroomName,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        correctAnswers: submission.correctAnswers,
        wrongAnswers: submission.wrongAnswers,
        unanswered: submission.unanswered,
        timeSpentSeconds: submission.timeSpentSeconds,
        skillsAnalysis: submission.skillsAnalysis || [],
        submittedAt: submission.submittedAt,
      })),
    });
  }),
);
