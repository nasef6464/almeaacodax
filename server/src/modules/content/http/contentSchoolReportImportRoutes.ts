import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { AccessCodeModel } from "../../../models/AccessCode.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { UserModel } from "../../../models/User.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildPaginatedResponse, resolvePagination } from "../../../utils/pagination.js";
import { schoolImportSchema } from "./schoolOperationsSchemas.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";
import { assertSchoolManagementScope } from "../application/schoolOperationsScope.js";
import { getModelDocumentId, uniqueStrings } from "../application/schoolOperationsUtilities.js";

export const contentSchoolReportImportRouter = Router();

contentSchoolReportImportRouter.get(
  "/schools/:id/report",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const pagination = resolvePagination(req.query, { limit: 200 });
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);
    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const schoolId = school.id || String(school._id);

    const studentFilter = { schoolId, role: "student" };
    const [classes, packages, codes, students, totalStudents, activeStudents] = await Promise.all([
      GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 }).lean(),
      B2BPackageModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      AccessCodeModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      UserModel.find(studentFilter).select("id _id groupIds isActive").sort({ createdAt: -1 }).lean(),
      UserModel.countDocuments(studentFilter),
      UserModel.countDocuments({ ...studentFilter, isActive: { $ne: false } }),
    ]);

    const studentIds = students.map(getModelDocumentId).filter(Boolean);
    const quizResultFilter = { userId: { $in: studentIds } };
    const [quizResults, quizResultTotal, quizResultStats, studentResultStats, skillResultStats] = studentIds.length
      ? await Promise.all([
          QuizResultModel.find(quizResultFilter)
            .select("userId score skillsAnalysis createdAt")
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean(),
          QuizResultModel.countDocuments(quizResultFilter),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $group: { _id: null, attempts: { $sum: 1 }, averageScore: { $avg: "$score" } } },
          ]),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $group: { _id: "$userId", attempts: { $sum: 1 }, scoreTotal: { $sum: "$score" } } },
          ]),
          QuizResultModel.aggregate([
            { $match: quizResultFilter },
            { $unwind: "$skillsAnalysis" },
            {
              $group: {
                _id: {
                  skillId: "$skillsAnalysis.skillId",
                  skill: "$skillsAnalysis.skill",
                  subjectId: "$skillsAnalysis.subjectId",
                  sectionId: "$skillsAnalysis.sectionId",
                },
                attempts: { $sum: 1 },
                masteryTotal: { $sum: "$skillsAnalysis.mastery" },
              },
            },
          ]),
        ])
      : [[], 0, [], [], []];

    const aggregateStats = quizResultStats[0] as { attempts?: number; averageScore?: number } | undefined;
    const averageScore = aggregateStats?.attempts
      ? Math.round(Number(aggregateStats.averageScore) || 0)
      : 0;

    const weakSkillMap = new Map<
      string,
      {
        skillId?: string;
        skill: string;
        subjectId?: string;
        sectionId?: string;
        attempts: number;
        masteryTotal: number;
      }
    >();

    skillResultStats.forEach((item: any) => {
      const key = String(item?._id?.skillId || item?._id?.skill || item?._id?.sectionId || "unknown");
      weakSkillMap.set(key, {
        skillId: item?._id?.skillId,
        skill: String(item?._id?.skill || "مهارة غير مسماة"),
        subjectId: item?._id?.subjectId,
        sectionId: item?._id?.sectionId,
        attempts: Number(item?.attempts) || 0,
        masteryTotal: Number(item?.masteryTotal) || 0,
      });
    });

    const weakestSkills = Array.from(weakSkillMap.values())
      .map((item) => ({
        skillId: item.skillId,
        skill: item.skill,
        subjectId: item.subjectId,
        sectionId: item.sectionId,
        attempts: item.attempts,
        mastery: item.attempts > 0 ? Math.round(item.masteryTotal / item.attempts) : 0,
      }))
      .sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts)
      .slice(0, 8);

    const classSummaries = classes.map((group) => {
      const classId = getModelDocumentId(group);
      const classStudents = students.filter((student) => (student.groupIds || []).includes(classId));
      const classStudentIds = new Set(classStudents.map(getModelDocumentId).filter(Boolean));
      const classResults = studentResultStats.filter((result: any) => classStudentIds.has(String(result._id)));
      const classAttempts = classResults.reduce((sum: number, result: any) => sum + (Number(result.attempts) || 0), 0);
      const classScoreTotal = classResults.reduce((sum: number, result: any) => sum + (Number(result.scoreTotal) || 0), 0);
      const classAverageScore = classAttempts
        ? Math.round(classScoreTotal / classAttempts)
        : 0;

      return {
        id: classId,
        name: group.name,
        studentCount: classStudents.length,
        supervisorCount: Array.isArray(group.supervisorIds) ? group.supervisorIds.length : 0,
        quizAttempts: classAttempts,
        averageScore: classAverageScore,
      };
    });

    return res.json({
      school: {
        id: schoolId,
        name: school.name,
      },
      metrics: {
        totalStudents,
        activeStudents,
        totalClasses: classes.length,
        activePackages: packages.filter((pkg) => pkg.status === "active").length,
        activeCodes: codes.filter((code) => Number(code.expiresAt) > Date.now()).length,
        quizAttempts: quizResultTotal,
        sampledQuizAttempts: quizResults.length,
        averageScore,
      },
      classSummaries,
      weakestSkills,
      quizResultsPagination: buildPaginatedResponse([], pagination, quizResultTotal),
    });
  }),
);

contentSchoolReportImportRouter.post(
  "/schools/:id/import-students",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = schoolImportSchema.parse(req.body);
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);
    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const schoolId = school.id || String(school._id);
    const existingClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 });
    const classById = new Map(existingClasses.map((item) => [item.id || String(item._id), item]));
    const classByName = new Map(existingClasses.map((item) => [item.name.trim().toLowerCase(), item]));
    let currentSchoolClassIds = uniqueStrings(existingClasses.flatMap((item) => [item.id, String(item._id)]));
    const credentials: Array<{ name: string; email: string; password: string; className?: string }> = [];
    const importedUsers: any[] = [];

    for (const row of payload.rows) {
      let targetClass = row.classId ? classById.get(row.classId) : undefined;

      if (!targetClass && row.className?.trim()) {
        targetClass = classByName.get(row.className.trim().toLowerCase());
      }

      if (!targetClass && row.className?.trim()) {
        targetClass = await GroupModel.create({
          id: `class_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: row.className.trim(),
          type: "CLASS",
          parentId: schoolId,
          ownerId: req.authUser?.id,
          supervisorIds: [],
          studentIds: [],
          courseIds: [],
          createdAt: Date.now(),
          totalStudents: 0,
          totalSupervisors: 0,
          totalCourses: 0,
        });

        const createdClassId = targetClass.id || String(targetClass._id);
        classById.set(createdClassId, targetClass);
        classByName.set(targetClass.name.trim().toLowerCase(), targetClass);
        currentSchoolClassIds = uniqueStrings([...currentSchoolClassIds, createdClassId, String(targetClass._id)]);
      }

      const generatedPassword = row.password || `Nn@${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      const normalizedEmail = row.email.toLowerCase().trim();
      const classId = targetClass ? targetClass.id || String(targetClass._id) : undefined;
      const existingUser = await UserModel.findOne({ email: normalizedEmail }).select("groupIds").lean();
      const existingGroupIds = Array.isArray(existingUser?.groupIds) ? existingUser.groupIds.map(String) : [];
      const nextGroupIds = uniqueStrings([
        ...existingGroupIds.filter((id) => !currentSchoolClassIds.includes(id)),
        ...(classId ? [classId] : []),
      ]);

      const user = await UserModel.findOneAndUpdate(
        { email: normalizedEmail },
        {
          name: row.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "student",
          isActive: true,
          schoolId,
          groupIds: nextGroupIds,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      const studentId = user.id || String(user._id);
      const studentIdAliases = uniqueStrings([user.id, String(user._id)]);
      await GroupModel.updateMany(
        { type: "CLASS", parentId: schoolId },
        { $pull: { studentIds: { $in: studentIdAliases } } },
      );
      if (classId) {
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $addToSet: { studentIds: studentId } });
      }

      importedUsers.push(user);
      credentials.push({
        name: row.name.trim(),
        email: normalizedEmail,
        password: generatedPassword,
        className: targetClass?.name,
      });
    }

    const studentIds = importedUsers.map((user) => user.id || String(user._id));

    await GroupModel.findOneAndUpdate(
      buildDocumentQuery(schoolId),
      {
        $addToSet: { studentIds: { $each: studentIds } },
        $set: { totalStudents: await UserModel.countDocuments({ schoolId, role: "student" }) },
      },
      { new: true },
    );

    const latestClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId });
    await Promise.all(
      latestClasses.map(async (group) => {
        const classId = group.id || String(group._id);
        const count = await UserModel.countDocuments({ role: "student", groupIds: classId });
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $set: { totalStudents: count } });
      }),
    );

    const [updatedGroups, updatedUsers] = await Promise.all([
      GroupModel.find({
        $or: [{ _id: school._id }, { id: schoolId }, { parentId: schoolId }],
      }).sort({ createdAt: -1 }),
      UserModel.find({ schoolId }).select("-passwordHash").sort({ createdAt: -1 }),
    ]);

    return res.status(StatusCodes.CREATED).json({
      summary: {
        totalRows: payload.rows.length,
        imported: credentials.length,
        classesTouched: Array.from(
          new Set(credentials.map((item) => item.className).filter(Boolean)),
        ).length,
      },
      credentials,
      groups: updatedGroups,
      users: updatedUsers,
    });
  }),
);
