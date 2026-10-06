import bcrypt from "bcryptjs";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { UserModel } from "../../../models/User.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";
import { uniqueStrings } from "./schoolOperationsUtilities.js";

export type SchoolStudentImportRow = {
  name: string;
  email: string;
  classId?: string;
  className?: string;
  password?: string;
};

export type SchoolStudentImportPolicy = {
  createMissingUsers?: boolean;
  createMissingClasses?: boolean;
  resetExistingPasswords?: boolean;
  allowCrossSchoolTransfer?: boolean;
};

const generateStudentPassword = () =>
  `Nn@${Math.floor(100000 + Math.random() * 900000)}`;

export async function importSchoolStudents(input: {
  schoolId: string;
  actorId: string;
  rows: SchoolStudentImportRow[];
  policy?: SchoolStudentImportPolicy;
}) {
  const policy = {
    createMissingUsers: input.policy?.createMissingUsers !== false,
    createMissingClasses: input.policy?.createMissingClasses !== false,
    resetExistingPasswords: input.policy?.resetExistingPasswords === true,
    allowCrossSchoolTransfer: input.policy?.allowCrossSchoolTransfer === true,
  };

  const school = await GroupModel.findOne({
    ...buildDocumentQuery(input.schoolId),
    type: "SCHOOL",
  });
  if (!school) {
    throw Object.assign(new Error("School not found"), { statusCode: 404 });
  }

  const schoolId = String(school._id);
  const existingClasses = await GroupModel.find({
    type: "CLASS",
    parentId: schoolId,
  }).sort({ createdAt: -1 });
  const classById = new Map(
    existingClasses.flatMap((item) => [
      [String(item._id), item] as const,
      ...((item as any).id ? [[String((item as any).id), item] as const] : []),
    ]),
  );
  const classByName = new Map(
    existingClasses.map((item) => [item.name.trim().toLowerCase(), item]),
  );
  let currentSchoolClassIds = uniqueStrings(
    existingClasses.flatMap((item) => [
      String(item._id),
      String((item as any).id || ""),
    ]),
  );

  const credentials: Array<{
    name: string;
    email: string;
    password: string;
    className?: string;
  }> = [];
  const importedUsers: any[] = [];
  const changes: Array<{
    email: string;
    action: "created" | "updated";
    className?: string;
    passwordChanged: boolean;
  }> = [];

  for (const rawRow of input.rows) {
    const row = {
      ...rawRow,
      name: rawRow.name.trim(),
      email: rawRow.email.trim().toLowerCase(),
      classId: rawRow.classId?.trim(),
      className: rawRow.className?.trim(),
      password: rawRow.password?.trim(),
    };

    let targetClass = row.classId ? classById.get(row.classId) : undefined;
    if (!targetClass && row.className) {
      targetClass = classByName.get(row.className.toLowerCase());
    }

    if (!targetClass && row.className) {
      if (!policy.createMissingClasses) {
        throw Object.assign(new Error(`Class does not exist: ${row.className}`), {
          statusCode: 422,
        });
      }
      targetClass = await GroupModel.create({
        name: row.className,
        type: "CLASS",
        parentId: schoolId,
        ownerId: input.actorId,
        supervisorIds: [],
        studentIds: [],
        courseIds: [],
        metadata: {
          description: "",
          location: "",
          settings: { createdByImport: true },
        },
      });
      const createdClassId = String(targetClass._id);
      classById.set(createdClassId, targetClass);
      classByName.set(targetClass.name.trim().toLowerCase(), targetClass);
      currentSchoolClassIds = uniqueStrings([...currentSchoolClassIds, createdClassId]);
    }

    const existingUser = await UserModel.findOne({ email: row.email });
    if (existingUser && existingUser.role !== "student") {
      throw Object.assign(
        new Error(`Existing account is not a student: ${row.email}`),
        { statusCode: 409 },
      );
    }
    if (
      existingUser?.schoolId &&
      String(existingUser.schoolId) !== schoolId &&
      !policy.allowCrossSchoolTransfer
    ) {
      throw Object.assign(
        new Error(`Student belongs to another school: ${row.email}`),
        { statusCode: 409 },
      );
    }
    if (!existingUser && !policy.createMissingUsers) {
      throw Object.assign(
        new Error(`Student account does not exist: ${row.email}`),
        { statusCode: 422 },
      );
    }

    const classId = targetClass ? String(targetClass._id) : undefined;
    const existingGroupIds = Array.isArray(existingUser?.groupIds)
      ? existingUser!.groupIds.map(String)
      : [];
    const nextGroupIds = uniqueStrings([
      ...existingGroupIds.filter((id) => !currentSchoolClassIds.includes(id)),
      ...(classId ? [classId] : []),
    ]);

    const shouldSetPassword =
      !existingUser || (policy.resetExistingPasswords && Boolean(row.password));
    const plainPassword = !existingUser
      ? row.password || generateStudentPassword()
      : shouldSetPassword
        ? row.password!
        : "";
    const passwordHash = shouldSetPassword
      ? await bcrypt.hash(plainPassword, 10)
      : undefined;

    let user;
    if (existingUser) {
      existingUser.name = row.name;
      existingUser.schoolId = schoolId;
      existingUser.groupIds = nextGroupIds;
      existingUser.isActive = true;
      if (passwordHash) existingUser.passwordHash = passwordHash;
      user = await existingUser.save();
    } else {
      user = await UserModel.create({
        name: row.name,
        email: row.email,
        passwordHash,
        role: "student",
        isActive: true,
        schoolId,
        groupIds: nextGroupIds,
      });
    }

    const userId = String(user._id);
    const studentIdAliases = uniqueStrings([
      userId,
      String((user as any).id || ""),
    ]);

    await SchoolMembershipModel.findOneAndUpdate(
      { userId, schoolId, role: "student" },
      { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "student" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await GroupModel.updateMany(
      { type: "CLASS", parentId: schoolId },
      { $pull: { studentIds: { $in: studentIdAliases } } },
    );
    if (classId) {
      await GroupModel.updateOne(
        { _id: classId },
        { $addToSet: { studentIds: userId } },
      );
    }

    await GroupModel.updateOne(
      { _id: school._id },
      { $addToSet: { studentIds: userId } },
    );

    if (plainPassword) {
      credentials.push({
        name: row.name,
        email: row.email,
        password: plainPassword,
        className: targetClass?.name,
      });
    }
    importedUsers.push(user);
    changes.push({
      email: row.email,
      action: existingUser ? "updated" : "created",
      className: targetClass?.name,
      passwordChanged: Boolean(plainPassword),
    });
  }

  const [updatedGroups, updatedUsers] = await Promise.all([
    GroupModel.find({
      $or: [{ _id: school._id }, { parentId: schoolId }],
    }).sort({ createdAt: -1 }),
    UserModel.find({ schoolId }).select("-passwordHash").sort({ createdAt: -1 }),
  ]);

  return {
    summary: {
      totalRows: input.rows.length,
      imported: importedUsers.length,
      createdUsers: changes.filter((item) => item.action === "created").length,
      updatedUsers: changes.filter((item) => item.action === "updated").length,
      passwordsIssued: credentials.length,
      classesTouched: new Set(changes.map((item) => item.className).filter(Boolean)).size,
    },
    credentials,
    changes,
    groups: updatedGroups,
    users: updatedUsers,
  };
}
