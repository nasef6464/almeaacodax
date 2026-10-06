import mongoose from "mongoose";
import { z } from "zod";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";

const personRefFields = {
  userId: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(2).max(120).optional(),
};

const personRefSchema = z.object(personRefFields).refine(
  (value) => Boolean(value.userId || value.email),
  { message: "userId or email is required" },
);

const classPlanSchema = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(120),
});

const studentPlacementSchema = z.object({
  ...personRefFields,
  classKey: z.string().trim().min(1).max(80),
}).refine((value) => Boolean(value.userId || value.email), {
  message: "userId or email is required",
});

const teacherAssignmentSchema = z.object({
  ...personRefFields,
  classKey: z.string().trim().min(1).max(80),
  subjectId: z.string().trim().max(120).optional().default(""),
}).refine((value) => Boolean(value.userId || value.email), {
  message: "userId or email is required",
});

export const schoolSetupDraftSchema = z.object({
  schoolId: z.string().trim().optional(),
  schoolName: z.string().trim().min(2).max(160),
  classes: z.array(classPlanSchema).min(1).max(100),
  students: z.array(studentPlacementSchema).max(3000).optional().default([]),
  teachers: z.array(teacherAssignmentSchema).max(500).optional().default([]),
  supervisors: z.array(personRefSchema).max(100).optional().default([]),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const normalizeEmail = (value?: string) => String(value || "").trim().toLowerCase();

const resolvePeople = async (refs: Array<z.infer<typeof personRefSchema>>) => {
  const userIds = [...new Set(refs.map((item) => String(item.userId || "").trim()).filter(Boolean))];
  const emails = [...new Set(refs.map((item) => normalizeEmail(item.email)).filter(Boolean))];

  const validObjectIds = userIds.filter((id) => /^[a-f\d]{24}$/i.test(id));
  if (validObjectIds.length === 0 && emails.length === 0) {
    return {
      users: [],
      byId: new Map<string, any>(),
      byEmail: new Map<string, any>(),
    };
  }

  const users = await UserModel.find({
    $or: [
      ...(validObjectIds.length ? [{ _id: { $in: validObjectIds } }] : []),
      ...(emails.length ? [{ email: { $in: emails } }] : []),
    ],
  })
    .select("_id name email role isActive schoolId groupIds")
    .lean();

  const byId = new Map(users.map((user) => [String(user._id), user]));
  const byEmail = new Map(users.map((user) => [normalizeEmail(String(user.email || "")), user]));

  return { users, byId, byEmail };
};

export async function validateSchoolSetupDraft(
  input: z.infer<typeof schoolSetupDraftSchema>,
) {
  const issues: Array<{
    type: string;
    message: string;
    ref?: string;
    classKey?: string;
  }> = [];

  const classKeys = new Set<string>();
  const classNames = new Set<string>();
  for (const classroom of input.classes) {
    const nameKey = classroom.name.trim().toLowerCase();
    if (classKeys.has(classroom.key)) {
      issues.push({
        type: "duplicate_class_key",
        ref: classroom.key,
        message: "Class key is duplicated in the setup plan",
      });
    }
    if (classNames.has(nameKey)) {
      issues.push({
        type: "duplicate_class_name",
        ref: classroom.name,
        message: "Class name is duplicated in the setup plan",
      });
    }
    classKeys.add(classroom.key);
    classNames.add(nameKey);
  }

  const allRefs = [
    ...input.students,
    ...input.teachers,
    ...input.supervisors,
  ];
  const resolved = await resolvePeople(allRefs as Array<z.infer<typeof personRefSchema>>);

  const resolve = (ref: z.infer<typeof personRefSchema>) => {
    if (ref.userId && resolved.byId.has(ref.userId)) return resolved.byId.get(ref.userId);
    const email = normalizeEmail(ref.email);
    if (email && resolved.byEmail.has(email)) return resolved.byEmail.get(email);
    return null;
  };

  for (const student of input.students) {
    if (!classKeys.has(student.classKey)) {
      issues.push({
        type: "student_class_not_found",
        classKey: student.classKey,
        ref: student.email || student.userId,
        message: "Student references a class key that is not in this setup plan",
      });
    }
    const user = resolve(student);
    if (!user) {
      issues.push({
        type: "student_not_found",
        ref: student.email || student.userId,
        message: "Student account was not found; account creation must be an explicit later step",
      });
    } else if (String(user.role) !== "student") {
      issues.push({
        type: "student_role_mismatch",
        ref: String(user.email || user._id),
        message: "Referenced account is not a student",
      });
    } else if (user.isActive === false) {
      issues.push({
        type: "student_inactive",
        ref: String(user.email || user._id),
        message: "Inactive student cannot be assigned",
      });
    }
  }

  for (const teacher of input.teachers) {
    if (!classKeys.has(teacher.classKey)) {
      issues.push({
        type: "teacher_class_not_found",
        classKey: teacher.classKey,
        ref: teacher.email || teacher.userId,
        message: "Teacher assignment references a class key that is not in this setup plan",
      });
    }
    const user = resolve(teacher);
    if (!user) {
      issues.push({
        type: "teacher_not_found",
        ref: teacher.email || teacher.userId,
        message: "Teacher account was not found",
      });
    } else if (String(user.role) !== "teacher") {
      issues.push({
        type: "teacher_role_mismatch",
        ref: String(user.email || user._id),
        message: "Referenced account is not a teacher",
      });
    } else if (user.isActive === false) {
      issues.push({
        type: "teacher_inactive",
        ref: String(user.email || user._id),
        message: "Inactive teacher cannot be assigned",
      });
    }
  }

  for (const supervisor of input.supervisors) {
    const user = resolve(supervisor);
    if (!user) {
      issues.push({
        type: "supervisor_not_found",
        ref: supervisor.email || supervisor.userId,
        message: "Supervisor account was not found",
      });
    } else if (String(user.role) !== "supervisor") {
      issues.push({
        type: "supervisor_role_mismatch",
        ref: String(user.email || user._id),
        message: "Referenced account is not a supervisor; teacher assignments must use the teacher plan",
      });
    } else if (user.isActive === false) {
      issues.push({
        type: "supervisor_inactive",
        ref: String(user.email || user._id),
        message: "Inactive supervisor cannot be assigned",
      });
    }
  }

  let targetSchool = null;
  if (input.schoolId) {
    targetSchool = mongoose.Types.ObjectId.isValid(input.schoolId)
      ? await GroupModel.findOne({ _id: input.schoolId, type: "SCHOOL" })
          .select("_id name type ownerId")
          .lean()
      : null;
    if (!targetSchool) {
      issues.push({
        type: "school_not_found",
        ref: input.schoolId,
        message: "Target school was not found",
      });
    }
  } else {
    const sameNameSchool = await GroupModel.findOne({
      type: "SCHOOL",
      name: input.schoolName,
    }).select("_id name").lean();
    if (sameNameSchool) {
      issues.push({
        type: "school_name_exists",
        ref: String(sameNameSchool._id),
        message: "A school with the same name already exists; use schoolId to update it",
      });
    }
  }

  const targetSchoolId = targetSchool ? String(targetSchool._id) : "";
  for (const user of resolved.users as any[]) {
    const existingSchoolId = String(user.schoolId || "").trim();
    if (!existingSchoolId) continue;
    if (!targetSchoolId || existingSchoolId !== targetSchoolId) {
      issues.push({
        type: "cross_school_assignment_requires_transfer",
        ref: String(user.email || user._id),
        message: "Existing school membership cannot be changed implicitly by a Command Center setup draft",
      });
    }
  }

  const existingClasses = targetSchool
    ? await GroupModel.find({ type: "CLASS", parentId: String(targetSchool._id) })
        .select("_id name parentId")
        .lean()
    : [];
  const existingClassNames = new Set(existingClasses.map((item) => String(item.name || "").trim().toLowerCase()));
  for (const classroom of input.classes) {
    if (existingClassNames.has(classroom.name.trim().toLowerCase())) {
      issues.push({
        type: "class_name_exists",
        ref: classroom.name,
        classKey: classroom.key,
        message: "A class with this name already exists in the target school",
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      classes: input.classes.length,
      students: input.students.length,
      teachers: input.teachers.length,
      supervisors: input.supervisors.length,
      resolvedUsers: resolved.users.length,
      targetExistingSchool: Boolean(targetSchool),
    },
    normalizedPlan: {
      schoolId: targetSchool ? String(targetSchool._id) : null,
      schoolName: input.schoolName,
      classes: input.classes,
      students: input.students.map((student) => ({
        ...student,
        resolvedUserId: resolve(student) ? String(resolve(student)!._id) : null,
      })),
      teachers: input.teachers.map((teacher) => ({
        ...teacher,
        resolvedUserId: resolve(teacher) ? String(resolve(teacher)!._id) : null,
      })),
      supervisors: input.supervisors.map((supervisor) => ({
        ...supervisor,
        resolvedUserId: resolve(supervisor) ? String(resolve(supervisor)!._id) : null,
      })),
    },
  };
}
