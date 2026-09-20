import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ensureCanonicalParentRelationship } from "../../../services/parentAuthorityService.js";
import { schoolRelationSchema } from "./schoolOperationsSchemas.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";
import { assertSchoolManagementScope } from "../application/schoolOperationsScope.js";
import { uniqueStrings } from "../application/schoolOperationsUtilities.js";

export const contentSchoolRelationsRouter = Router();

contentSchoolRelationsRouter.post(
  "/schools/:id/relations",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = schoolRelationSchema.parse(req.body);
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const schoolId = school.id || String(school._id);
    const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);

    if (!canManageSchool) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
    }

    const classes = await GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 });
    const classByName = new Map(classes.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
    const studentEmails = payload.rows.map((row) => row.studentEmail.trim().toLowerCase());
    const parentEmails = payload.rows.map((row) => String(row.parentEmail || "").trim().toLowerCase()).filter(Boolean);
    const supervisorEmails = payload.rows.map((row) => String(row.supervisorEmail || "").trim().toLowerCase()).filter(Boolean);
    const teacherEmails = payload.rows.map((row) => String(row.teacherEmail || "").trim().toLowerCase()).filter(Boolean);
    const allEmails = Array.from(new Set([...studentEmails, ...parentEmails, ...supervisorEmails, ...teacherEmails]));
    const users = await UserModel.find({ email: { $in: allEmails } });
    const usersByEmail = new Map(users.map((item) => [String(item.email || "").trim().toLowerCase(), item]));
    const credentials: Array<{ role: "parent" | "supervisor" | "teacher"; name: string; email: string; password: string; linkedTo: string }> = [];
    const summary = {
      rows: payload.rows.length,
      createdParents: 0,
      createdSupervisors: 0,
      createdTeachers: 0,
      linkedParents: 0,
      linkedSupervisors: 0,
      linkedTeachers: 0,
      assignedClasses: 0,
      missingStudents: 0,
      missingParents: 0,
      missingSupervisors: 0,
      missingTeachers: 0,
      missingClasses: 0,
      skippedRows: 0,
    };

    const createUserIfMissing = async (
      email: string,
      role: "parent" | "supervisor" | "teacher",
      name: string,
      linkedTo: string,
    ) => {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = usersByEmail.get(normalizedEmail);
      if (existing || !payload.createMissingUsers) return existing;

      const password = `Alm@${Math.random().toString(36).slice(2, 10)}`;
      const created = await UserModel.create({
        name,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        isActive: true,
        schoolId,
        groupIds: [],
        linkedStudentIds: [],
      });

      usersByEmail.set(normalizedEmail, created);
      credentials.push({ role, name: created.name, email: normalizedEmail, password, linkedTo });
      if (role === "parent") summary.createdParents += 1;
      if (role === "supervisor") summary.createdSupervisors += 1;
      if (role === "teacher") summary.createdTeachers += 1;
      return created;
    };

    for (const row of payload.rows) {
      const studentEmail = row.studentEmail.trim().toLowerCase();
      if (!studentEmail) {
        summary.skippedRows += 1;
        continue;
      }

      const student = usersByEmail.get(studentEmail);
      if (!student || student.role !== "student" || String(student.schoolId || "") !== schoolId) {
        summary.missingStudents += 1;
        continue;
      }

      const className = String(row.className || "").trim();
      const classroom = className ? classByName.get(className.toLowerCase()) : undefined;
      if (className && !classroom) {
        summary.missingClasses += 1;
      }

      if (classroom) {
        const classId = classroom.id || String(classroom._id);
        const studentId = student.id || String(student._id);
        const studentIdAliases = uniqueStrings([student.id, String(student._id)]);
        const currentSchoolClassIds = uniqueStrings(classes.flatMap((item) => [item.id, String(item._id)]));
        const currentGroupIds = Array.isArray(student.groupIds) ? student.groupIds.map(String) : [];
        const nextGroupIds = uniqueStrings([
          ...currentGroupIds.filter((id) => !currentSchoolClassIds.includes(id)),
          classId,
        ]);
        await GroupModel.updateMany(
          { type: "CLASS", parentId: schoolId },
          { $pull: { studentIds: { $in: studentIdAliases } } },
        );
        await Promise.all([
          UserModel.findByIdAndUpdate(student._id, { $set: { schoolId, groupIds: nextGroupIds } }),
          GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $addToSet: { studentIds: studentId } }),
          GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), { $addToSet: { studentIds: studentId } }),
        ]);
        summary.assignedClasses += 1;
      }

      await SchoolMembershipModel.findOneAndUpdate(
        { userId: String(student.id || student._id), schoolId, role: "student" },
        { $set: { status: "active" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const parentEmail = String(row.parentEmail || "").trim().toLowerCase();
      if (parentEmail) {
        const parent = await createUserIfMissing(
          parentEmail,
          "parent",
          row.parentName?.trim() || `ولي أمر ${student.name}`,
          student.name,
        );
        if (!parent) {
          summary.missingParents += 1;
        } else {
          const studentUserId = String(student.id || student._id);
          await Promise.all([
            UserModel.findByIdAndUpdate(parent._id, {
              $set: { schoolId },
              $addToSet: { linkedStudentIds: studentUserId },
            }),
            ensureCanonicalParentRelationship({
              parentUserId: String(parent.id || parent._id),
              studentUserId,
              schoolId,
              createdBy: String(req.authUser!.id),
            }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: String(parent.id || parent._id), schoolId, role: "parent" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ]);
          summary.linkedParents += 1;
        }
      }

      const supervisorEmail = String(row.supervisorEmail || "").trim().toLowerCase();
      if (supervisorEmail) {
        const supervisor = await createUserIfMissing(
          supervisorEmail,
          "supervisor",
          row.supervisorName?.trim() || `مشرف ${school.name}`,
          classroom?.name || school.name,
        );
        if (!supervisor) {
          summary.missingSupervisors += 1;
        } else {
          const targetGroupId = classroom ? classroom.id || String(classroom._id) : schoolId;
          await Promise.all([
            UserModel.findByIdAndUpdate(supervisor._id, { $set: { schoolId }, $addToSet: { groupIds: targetGroupId } }),
            GroupModel.findOneAndUpdate(buildDocumentQuery(targetGroupId), { $addToSet: { supervisorIds: supervisor.id || String(supervisor._id) } }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: String(supervisor.id || supervisor._id), schoolId, role: "supervisor" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ]);
          summary.linkedSupervisors += 1;
        }
      }

      const teacherEmail = String(row.teacherEmail || "").trim().toLowerCase();
      if (teacherEmail) {
        const teacher = await createUserIfMissing(
          teacherEmail,
          "teacher",
          row.teacherName?.trim() || `معلم ${student.name}`,
          classroom?.name || school.name,
        );
        if (!teacher || teacher.role !== "teacher") {
          summary.missingTeachers += 1;
        } else {
          const targetGroupId = classroom ? classroom.id || String(classroom._id) : schoolId;
          const teacherUserId = String(teacher.id || teacher._id);
          const canonicalWrites: Promise<unknown>[] = [
            UserModel.findByIdAndUpdate(teacher._id, { $set: { schoolId }, $addToSet: { groupIds: targetGroupId } }),
            SchoolMembershipModel.findOneAndUpdate(
              { userId: teacherUserId, schoolId, role: "teacher" },
              { $set: { status: "active" } },
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ),
          ];
          if (classroom) {
            canonicalWrites.push(
              TeachingAssignmentModel.findOneAndUpdate(
                { schoolId, teacherId: teacherUserId, classId: targetGroupId, subjectId: "" },
                { $set: { status: "active" } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
              ),
            );
          }
          await Promise.all(canonicalWrites);
          summary.linkedTeachers += 1;
        }
      }
    }

    const latestClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId });
    await Promise.all([
      GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), {
        $set: {
          totalStudents: await UserModel.countDocuments({ schoolId, role: "student" }),
          totalSupervisors: await UserModel.countDocuments({ schoolId, role: "supervisor" }),
        },
      }),
      ...latestClasses.map(async (group) => {
        const classId = group.id || String(group._id);
        const [studentCount, supervisorCount] = await Promise.all([
          UserModel.countDocuments({ role: "student", groupIds: classId }),
          UserModel.countDocuments({ role: "supervisor", groupIds: classId }),
        ]);
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), {
          $set: { totalStudents: studentCount, totalSupervisors: supervisorCount },
        });
      }),
    ]);

    const [updatedGroups, updatedUsers] = await Promise.all([
      GroupModel.find({
        $or: [{ _id: school._id }, { id: schoolId }, { parentId: schoolId }],
      }).sort({ createdAt: -1 }),
      UserModel.find({ schoolId }).select("-passwordHash").sort({ createdAt: -1 }),
    ]);

    return res.status(StatusCodes.CREATED).json({
      summary,
      credentials,
      groups: updatedGroups,
      users: updatedUsers,
    });
  }),
);
