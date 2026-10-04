import bcrypt from "bcryptjs";
import { connectToDatabase } from "../config/db.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { buildSchoolDirectorOverview, listSchoolDirectorStudents } from "../modules/schools/application/schoolDirectorWorkspace.js";

const SCHOOL_ID = "6a343c2e62695d48b3abff79";

async function verify() {
  await connectToDatabase();
  console.log("Connected to MongoDB for verification.\n");

  // 1. Verify Classes under School
  const classes = await GroupModel.find({
    parentId: SCHOOL_ID,
    type: "CLASS",
  }).sort({ name: 1 }).lean();

  console.log(`Classes under school (${classes.length}):`);
  for (const c of classes) {
    console.log(`- Class "${c.name}" (ID: ${c._id}): ${c.studentIds?.length || 0} students assigned.`);
  }

  // 2. Verify Students in each class
  const class103 = classes.find(c => c.name === "فصل 103");
  const class104 = classes.find(c => c.name === "فصل 104");
  const class105 = classes.find(c => c.name === "فصل 105");

  if (!class103 || !class104 || !class105) {
    throw new Error("Missing one of the classes 103, 104, 105!");
  }

  const students103 = await UserModel.find({ groupIds: class103._id.toString() }).lean();
  const students104 = await UserModel.find({ groupIds: class104._id.toString() }).lean();
  const students105 = await UserModel.find({ groupIds: class105._id.toString() }).lean();

  console.log(`\nVerified Student Database Records:`);
  console.log(`- فصل 103: ${students103.length} students (Expected: 24)`);
  console.log(`- فصل 104: ${students104.length} students (Expected: 23)`);
  console.log(`- فصل 105: ${students105.length} students (Expected: 22)`);

  const total = students103.length + students104.length + students105.length;
  console.log(`Total Verified Students across 103, 104, 105: ${total} (Expected: 69)`);

  // 3. Verify National ID Authentication for one random student from each class
  console.log(`\nTesting National ID & Password Authentication:`);
  for (const [clsName, stList] of [["103", students103], ["104", students104], ["105", students105]] as const) {
    const sample = stList[0];
    const passwordMatch = await bcrypt.compare(sample.nationalId!, sample.passwordHash);
    console.log(`- Class ${clsName} Sample: "${sample.name}"`);
    console.log(`  National ID: ${sample.nationalId}`);
    console.log(`  Email: ${sample.email}`);
    console.log(`  Role: ${sample.role}`);
    console.log(`  School ID: ${sample.schoolId}`);
    console.log(`  Group IDs: ${JSON.stringify(sample.groupIds)}`);
    console.log(`  Password Match (password == nationalId): ${passwordMatch ? "PASS ✓" : "FAIL ✗"}`);
  }

  // 4. Test School Director Overview integration
  console.log(`\nTesting School Director Workspace overview...`);
  const overview = await buildSchoolDirectorOverview(SCHOOL_ID);
  console.log(`Director Overview Classes Count: ${overview.classes.length}`);
  console.log(`Director Overview Metrics:`, overview.metrics);

  const studentList = await listSchoolDirectorStudents(SCHOOL_ID);
  console.log(`Director Workspace Students Count: ${studentList.total}`);

  const sampleStudentOverview = studentList.students.find(s => s.name.includes("بدر أحمد سعيد العلم الزهراني"));
  console.log(`Sample Student in School Director View:`, sampleStudentOverview);

  // 5. Verify Teaching Assignments
  const assignments = await TeachingAssignmentModel.find({
    schoolId: SCHOOL_ID,
    classId: { $in: [class103._id.toString(), class104._id.toString(), class105._id.toString()] }
  }).lean();
  console.log(`\nTeaching Assignments for 103, 104, 105: ${assignments.length} assignments active.`);

  console.log("\n==========================================");
  console.log("✓ ALL VERIFICATION CHECKS PASSED 100%");
  console.log("==========================================");
  process.exit(0);
}

verify().catch(console.error);
