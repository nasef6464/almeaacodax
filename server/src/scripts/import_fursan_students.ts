import bcrypt from "bcryptjs";
import * as XLSX from "@e965/xlsx";
import fs from "node:fs";
import { connectToDatabase } from "../config/db.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";

const SCHOOL_ID = "6a343c2e62695d48b3abff79";
const SCHOOL_OWNER_ID = "69f5dd94c60cb7cf83c693fd";
const TEACHER_ID = "6a089f059815266c77c4eb28"; // ناصف محمد / nasefnasef601@gmail.com
const SUPERVISOR_IDS = ["69f7b3794cd9bc0c85abe3b6", "6a69e5531bdaff8f4321273d"];

const CLASS_CONFIGS = [
  { classKey: "103", className: "فصل 103", filePath: "C:/book/طلاب/فصل 103.xlsx" },
  { classKey: "104", className: "فصل 104", filePath: "C:/book/طلاب/فصل 104.xlsx" },
  { classKey: "105", className: "فصل 105", filePath: "C:/book/طلاب/فصل 105.xlsx" },
];

interface ParsedStudent {
  name: string;
  nationalId: string;
  email: string;
  classKey: string;
  className: string;
}

function parseClassExcel(filePath: string, classKey: string, className: string): ParsedStudent[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Header is row 0: ['الاسم', 'رقم الهوية', ...]
  const students: ParsedStudent[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;

    const rawName = String(row[0] || "").trim();
    const rawId = String(row[1] || "").trim().replace(/[^\d]/g, "");

    if (!rawName || !rawId) continue;

    if (rawId.length !== 10) {
      console.warn(`[Warning] Student "${rawName}" has invalid nationalId length (${rawId.length}): ${rawId}`);
    }

    students.push({
      name: rawName,
      nationalId: rawId,
      email: `${rawId}@almeaa.com`,
      classKey,
      className,
    });
  }

  return students;
}

async function runImport() {
  await connectToDatabase();
  console.log("Connected to MongoDB successfully.\n");

  const school = await GroupModel.findById(SCHOOL_ID);
  if (!school) {
    throw new Error(`School not found with ID: ${SCHOOL_ID}`);
  }
  console.log(`Target School: "${school.name}" (ID: ${school._id})`);

  const createdSummary: Array<{
    classKey: string;
    className: string;
    classId: string;
    studentCount: number;
    sampleStudents: Array<{ name: string; nationalId: string; email: string }>;
  }> = [];

  const allImportedStudentIds: string[] = [];

  for (const config of CLASS_CONFIGS) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing ${config.className} from: ${config.filePath}`);

    const students = parseClassExcel(config.filePath, config.classKey, config.className);
    console.log(`Parsed ${students.length} students from Excel.`);

    // 1. Ensure Class Group exists
    let classDoc = await GroupModel.findOne({
      parentId: SCHOOL_ID,
      type: "CLASS",
      $or: [{ name: config.className }, { name: config.classKey }],
    });

    if (!classDoc) {
      console.log(`Creating new class: "${config.className}"...`);
      classDoc = await GroupModel.create({
        name: config.className,
        type: "CLASS",
        parentId: SCHOOL_ID,
        ownerId: SCHOOL_OWNER_ID,
        supervisorIds: SUPERVISOR_IDS,
        studentIds: [],
        courseIds: [],
        metadata: {
          code: config.classKey,
          level: "اول ثانوي",
          stage: "المرحلة الثانوية",
        },
      });
      console.log(`Class created with ID: ${classDoc._id}`);
    } else {
      console.log(`Found existing class: "${classDoc.name}" (ID: ${classDoc._id})`);
    }

    const classIdStr = classDoc._id.toString();

    // 2. Ensure Teaching Assignment for teacher (ناصف محمد)
    const existingAssignment = await TeachingAssignmentModel.findOne({
      schoolId: SCHOOL_ID,
      classId: classIdStr,
      teacherId: TEACHER_ID,
    });
    if (!existingAssignment) {
      await TeachingAssignmentModel.create({
        schoolId: SCHOOL_ID,
        classId: classIdStr,
        teacherId: TEACHER_ID,
        subjectId: "",
        status: "active",
      });
      console.log(`Teaching assignment created for teacher ID: ${TEACHER_ID} in ${config.className}`);
    }

    // 3. Create or update each student
    const classStudentIds: string[] = [];
    const sampleStudents: Array<{ name: string; nationalId: string; email: string }> = [];

    for (const st of students) {
      const passwordHash = await bcrypt.hash(st.nationalId, 10);

      // Check if user exists by nationalId or email
      let user = await UserModel.findOne({
        $or: [{ nationalId: st.nationalId }, { email: st.email.toLowerCase() }],
      });

      if (!user) {
        user = await UserModel.create({
          name: st.name,
          email: st.email.toLowerCase(),
          passwordHash,
          role: "student",
          nationalId: st.nationalId,
          schoolId: SCHOOL_ID,
          groupIds: [classIdStr],
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: Date.now(),
          subscription: {
            plan: "free",
            purchasedCourses: [],
            purchasedPackages: [],
          },
        });
      } else {
        // Update student fields
        user.name = st.name;
        user.nationalId = st.nationalId;
        user.schoolId = SCHOOL_ID;
        user.passwordHash = passwordHash;
        user.role = "student";
        user.isActive = true;
        user.emailVerified = true;
        if (!user.groupIds.includes(classIdStr)) {
          user.groupIds.push(classIdStr);
        }
        await user.save();
      }

      const userIdStr = user._id.toString();
      classStudentIds.push(userIdStr);
      allImportedStudentIds.push(userIdStr);

      // 4. Ensure School Membership
      await SchoolMembershipModel.findOneAndUpdate(
        { userId: userIdStr, schoolId: SCHOOL_ID },
        {
          $set: {
            userId: userIdStr,
            schoolId: SCHOOL_ID,
            role: "student",
            status: "active",
          },
        },
        { upsert: true, new: true }
      );

      if (sampleStudents.length < 3) {
        sampleStudents.push({
          name: st.name,
          nationalId: st.nationalId,
          email: st.email,
        });
      }
    }

    // 5. Update Class group studentIds
    const mergedClassStudentIds = Array.from(new Set([...(classDoc.studentIds || []), ...classStudentIds]));
    classDoc.studentIds = mergedClassStudentIds;
    await classDoc.save();
    console.log(`Updated ${config.className}: now has ${mergedClassStudentIds.length} students linked.`);

    createdSummary.push({
      classKey: config.classKey,
      className: config.className,
      classId: classIdStr,
      studentCount: classStudentIds.length,
      sampleStudents,
    });
  }

  // 6. Update School document studentIds
  const mergedSchoolStudentIds = Array.from(new Set([...(school.studentIds || []), ...allImportedStudentIds]));
  school.studentIds = mergedSchoolStudentIds;
  await school.save();
  console.log(`\nUpdated School: total studentIds now ${mergedSchoolStudentIds.length}.`);

  // 7. Verification & Audit
  console.log(`\n==================================================`);
  console.log(`           IMPORT & LINKING AUDIT REPORT           `);
  console.log(`==================================================`);

  for (const sum of createdSummary) {
    console.log(`\nClass: ${sum.className} (ID: ${sum.classId})`);
    console.log(`  Total Students: ${sum.studentCount}`);
    console.log(`  Sample Accounts:`);
    for (const sample of sum.sampleStudents) {
      // Test password hash validation
      const u = await UserModel.findOne({ nationalId: sample.nationalId });
      const passValid = u ? await bcrypt.compare(sample.nationalId, u.passwordHash) : false;
      console.log(`    - [${sample.nationalId}] ${sample.name}`);
      console.log(`      Email: ${sample.email} | Auth password=nationalId valid: ${passValid}`);
    }
  }

  const totalMemberships = await SchoolMembershipModel.countDocuments({
    schoolId: SCHOOL_ID,
    userId: { $in: allImportedStudentIds },
    status: "active",
  });
  console.log(`\nTotal School Active Memberships Verified for imported students: ${totalMemberships}/${allImportedStudentIds.length}`);

  console.log(`\n✓ All students imported, credentials configured, and classes linked successfully!`);
  process.exit(0);
}

runImport().catch((error) => {
  console.error("Import failed with error:", error);
  process.exit(1);
});
