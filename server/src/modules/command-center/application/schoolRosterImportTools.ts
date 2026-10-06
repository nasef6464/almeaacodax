import { z } from "zod";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";

const rosterRowSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  classId: z.string().trim().max(180).optional(),
  className: z.string().trim().max(160).optional(),
});

export const schoolRosterImportDraftSchema = z.object({
  schoolId: z.string().trim().min(1).max(180),
  rows: z.array(rosterRowSchema).min(1).max(3000),
  createMissingUsers: z.boolean().default(true),
  createMissingClasses: z.boolean().default(true),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

export async function validateSchoolRosterImportDraft(
  input: z.infer<typeof schoolRosterImportDraftSchema>,
) {
  const issues: Array<{ type: string; message: string; email?: string }> = [];
  const warnings: Array<{ type: string; message: string; email?: string }> = [];

  const school = await GroupModel.findOne({
    _id: input.schoolId,
    type: "SCHOOL",
  }).select("_id name").lean().catch(() => null);

  if (!school) {
    issues.push({ type: "school_not_found", message: "Target school was not found" });
    return {
      ok: false,
      issues,
      warnings,
      stats: { rows: input.rows.length, existingStudents: 0, newStudents: 0, classesReferenced: 0 },
      school: null,
    };
  }

  const seenEmails = new Set<string>();
  const normalizedRows = input.rows.map((row) => ({
    ...row,
    email: row.email.trim().toLowerCase(),
    name: row.name.trim(),
    className: row.className?.trim(),
    classId: row.classId?.trim(),
  }));

  for (const row of normalizedRows) {
    if (seenEmails.has(row.email)) {
      issues.push({
        type: "duplicate_email_in_roster",
        message: "Student email is duplicated in the import file",
        email: row.email,
      });
    }
    seenEmails.add(row.email);
  }

  const existingUsers = await UserModel.find({
    email: { $in: [...seenEmails] },
  }).select("_id email role schoolId isActive").lean();

  const existingByEmail = new Map(
    existingUsers.map((user) => [String(user.email || "").toLowerCase(), user]),
  );

  for (const row of normalizedRows) {
    const user = existingByEmail.get(row.email);
    if (!user) {
      if (!input.createMissingUsers) {
        issues.push({
          type: "student_not_found",
          message: "Student account does not exist and account creation is disabled",
          email: row.email,
        });
      }
      continue;
    }
    if (String(user.role) !== "student") {
      issues.push({
        type: "role_conflict",
        message: "Email belongs to a non-student account",
        email: row.email,
      });
      continue;
    }
    if (user.isActive === false) {
      warnings.push({
        type: "student_will_be_reactivated",
        message: "Existing inactive student will be reactivated on apply",
        email: row.email,
      });
    }
    if (user.schoolId && String(user.schoolId) !== String(school._id)) {
      issues.push({
        type: "cross_school_transfer_blocked",
        message: "Existing student belongs to another school; implicit transfer is blocked",
        email: row.email,
      });
    }
  }

  const classNames = [
    ...new Set(
      normalizedRows
        .map((row) => row.className?.toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  if (!input.createMissingClasses && classNames.length) {
    const existingClasses = await GroupModel.find({
      type: "CLASS",
      parentId: String(school._id),
    }).select("name").lean();
    const existingClassNames = new Set(
      existingClasses.map((item) => String(item.name || "").trim().toLowerCase()),
    );
    for (const className of classNames) {
      if (!existingClassNames.has(className)) {
        issues.push({
          type: "class_not_found",
          message: `Class does not exist and class creation is disabled: ${className}`,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    stats: {
      rows: normalizedRows.length,
      existingStudents: normalizedRows.filter((row) => existingByEmail.has(row.email)).length,
      newStudents: normalizedRows.filter((row) => !existingByEmail.has(row.email)).length,
      classesReferenced: classNames.length,
    },
    school: { id: String(school._id), name: String(school.name || "") },
    normalizedRows,
  };
}
