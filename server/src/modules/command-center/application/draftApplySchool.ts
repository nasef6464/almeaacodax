import mongoose from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { importSchoolStudents } from "../../content/application/schoolStudentImportService.js";
import {
  stableObjectId,
  type ApplyResult,
  type CommandDraftLike,
} from "./draftApplyTypes.js";

const loadUserForApply = async (userId: string, expectedRole: string) => {
  const user = await UserModel.findById(userId)
    .select("_id email role isActive schoolId groupIds")
    .lean();
  if (!user || user.isActive === false) {
    throw Object.assign(new Error(`User is missing or inactive: ${userId}`), { statusCode: 422 });
  }
  if (String(user.role) !== expectedRole) {
    throw Object.assign(new Error(`User role mismatch: ${userId}`), { statusCode: 422 });
  }
  return user as any;
};

export async function applySchoolDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const payload = (draft.payload || {}) as any;
  const draftId = String(draft._id);
  const desiredSchoolId = String(payload.schoolId || "").trim();
  const schoolObjectId = desiredSchoolId
    ? new mongoose.Types.ObjectId(desiredSchoolId)
    : stableObjectId(`command-center:school:${draftId}`);

  const existingSchool = await GroupModel.findById(schoolObjectId).lean();
  if (existingSchool && String((existingSchool as any).type) !== "SCHOOL") {
    throw Object.assign(new Error("Deterministic school identifier is occupied"), { statusCode: 409 });
  }
  if (!existingSchool && desiredSchoolId) {
    throw Object.assign(new Error("Target school no longer exists"), { statusCode: 404 });
  }

  if (!existingSchool) {
    const conflict = await GroupModel.findOne({
      type: "SCHOOL",
      name: String(payload.schoolName || "").trim(),
      _id: { $ne: schoolObjectId },
    }).lean();
    if (conflict) {
      throw Object.assign(new Error("A different school with the same name already exists"), { statusCode: 409 });
    }
  }

  const school = await GroupModel.findOneAndUpdate(
    { _id: schoolObjectId },
    {
      $setOnInsert: {
        name: String(payload.schoolName || "").trim(),
        type: "SCHOOL",
        ownerId: actorId,
        studentIds: [],
        supervisorIds: [],
        courseIds: [],
        metadata: {
          description: "",
          location: "",
          settings: { commandCenterDraftId: draftId },
        },
      },
    },
    { new: true, upsert: !desiredSchoolId, runValidators: true },
  );
  if (!school) throw Object.assign(new Error("School apply failed"), { statusCode: 500 });
  const schoolId = String(school._id);

  const classIdByKey = new Map<string, string>();
  for (const classroom of Array.isArray(payload.classes) ? payload.classes : []) {
    const classKey = String(classroom.key || "").trim();
    const className = String(classroom.name || "").trim();
    const classObjectId = stableObjectId(`command-center:class:${draftId}:${classKey}`);
    const collision = await GroupModel.findOne({
      type: "CLASS",
      parentId: schoolId,
      name: className,
      _id: { $ne: classObjectId },
    }).lean();
    if (collision) {
      throw Object.assign(new Error(`Class name already exists: ${className}`), { statusCode: 409 });
    }
    const classDoc = await GroupModel.findOneAndUpdate(
      { _id: classObjectId },
      {
        $setOnInsert: {
          name: className,
          type: "CLASS",
          parentId: schoolId,
          ownerId: actorId,
          studentIds: [],
          supervisorIds: [],
          courseIds: [],
          metadata: {
            description: "",
            location: "",
            settings: { commandCenterDraftId: draftId, classKey },
          },
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
    classIdByKey.set(classKey, String(classDoc!._id));
  }

  for (const studentRef of Array.isArray(payload.students) ? payload.students : []) {
    const userId = String(studentRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "student");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Student belongs to another school: ${user.email}`), { statusCode: 409 });
    }
    const classId = classIdByKey.get(String(studentRef.classKey || ""));
    if (!classId) throw Object.assign(new Error("Student class mapping is missing"), { statusCode: 422 });

    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: { $each: [schoolId, classId] } } },
      ),
      GroupModel.updateOne({ _id: schoolObjectId }, { $addToSet: { studentIds: userId } }),
      GroupModel.updateOne({ _id: classId }, { $addToSet: { studentIds: userId } }),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "student" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "student" } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  for (const teacherRef of Array.isArray(payload.teachers) ? payload.teachers : []) {
    const userId = String(teacherRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "teacher");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Teacher belongs to another school: ${user.email}`), { statusCode: 409 });
    }
    const classId = classIdByKey.get(String(teacherRef.classKey || ""));
    if (!classId) throw Object.assign(new Error("Teacher class mapping is missing"), { statusCode: 422 });
    const subjectId = String(teacherRef.subjectId || "");

    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: { $each: [schoolId, classId] } } },
      ),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "teacher" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "teacher" } },
        { upsert: true, new: true, runValidators: true },
      ),
      TeachingAssignmentModel.findOneAndUpdate(
        { schoolId, teacherId: userId, classId, subjectId },
        { $set: { status: "active" }, $setOnInsert: { schoolId, teacherId: userId, classId, subjectId } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  for (const supervisorRef of Array.isArray(payload.supervisors) ? payload.supervisors : []) {
    const userId = String(supervisorRef.resolvedUserId || "").trim();
    const user = await loadUserForApply(userId, "supervisor");
    if (user.schoolId && String(user.schoolId) !== schoolId) {
      throw Object.assign(new Error(`Supervisor belongs to another school: ${user.email}`), { statusCode: 409 });
    }
    await Promise.all([
      UserModel.updateOne(
        { _id: user._id },
        { $set: { schoolId }, $addToSet: { groupIds: schoolId } },
      ),
      GroupModel.updateOne({ _id: schoolObjectId }, { $addToSet: { supervisorIds: userId } }),
      SchoolMembershipModel.findOneAndUpdate(
        { userId, schoolId, role: "supervisor" },
        { $set: { status: "active" }, $setOnInsert: { userId, schoolId, role: "supervisor" } },
        { upsert: true, new: true, runValidators: true },
      ),
    ]);
  }

  return {
    resourceType: "school",
    resourceId: schoolId,
    summary: {
      schoolCreated: !existingSchool,
      classes: classIdByKey.size,
      students: Array.isArray(payload.students) ? payload.students.length : 0,
      teachers: Array.isArray(payload.teachers) ? payload.teachers.length : 0,
      supervisors: Array.isArray(payload.supervisors) ? payload.supervisors.length : 0,
    },
  };
}


export async function applySchoolRosterImportDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const payload = (draft.payload || {}) as any;
  const schoolId = String(payload.schoolId || "").trim();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!schoolId || rows.length === 0) {
    throw Object.assign(new Error("School roster import draft is incomplete"), {
      statusCode: 422,
    });
  }

  const result = await importSchoolStudents({
    schoolId,
    actorId,
    rows,
    policy: {
      createMissingUsers: payload.createMissingUsers !== false,
      createMissingClasses: payload.createMissingClasses !== false,
      resetExistingPasswords: false,
      allowCrossSchoolTransfer: false,
    },
  });

  return {
    resourceType: "school_roster_import",
    resourceId: schoolId,
    summary: {
      ...result.summary,
      credentialsIssued: result.credentials.length,
      credentialsPersistedInDraft: false,
    },
    transient: {
      credentials: result.credentials,
      note: "هذه بيانات دخول مؤقتة أُعيدت في استجابة التنفيذ فقط ولم تُخزن داخل CommandCenterDraft.",
    },
  };
}
