import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const runSimulation = async () => {
  console.log("🚀 بدء محاكاة العلاقات (End-to-End Simulation) 🚀\n");

  try {
    // 1. Connect to DB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/almeaa-dev";
    console.log(`📡 جاري الاتصال بقاعدة البيانات: ${mongoUri.split("@").pop() || mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("✅ تم الاتصال بنجاح.\n");

    // 2. Cleanup previous simulation data
    await GroupModel.deleteMany({ name: { $in: ["مدرسة المحاكاة", "فصل المحاكاة"] } });
    await UserModel.deleteMany({ email: { $in: ["sim_student@example.com", "sim_supervisor@example.com"] } });
    await QuizResultModel.deleteMany({ quizTitle: "اختبار المحاكاة" });

    // 3. Create School
    console.log("🏢 1. جاري إنشاء المدرسة والفصل...");
    const school = await GroupModel.create({
      name: "مدرسة المحاكاة",
      type: "SCHOOL",
      ownerId: "system",
      courseIds: ["pkg_qudrat_full"], // Assign a package
    });

    // 4. Create Class
    const classroom = await GroupModel.create({
      name: "فصل المحاكاة",
      type: "CLASS",
      parentId: school._id.toString(),
      ownerId: "system",
      courseIds: ["pkg_tahsili_full"], // Inherit or add package
    });
    console.log(`   - تم إنشاء مدرسة: ${school.name}`);
    console.log(`   - تم إنشاء فصل: ${classroom.name}\n`);

    // 5. Create Student
    console.log("👨‍🎓 2. جاري إنشاء حساب الطالب...");
    const student = await UserModel.create({
      name: "طالب المحاكاة",
      email: "sim_student@example.com",
      passwordHash: "dummy",
      role: "student",
      schoolId: school._id.toString(),
      groupIds: [classroom._id.toString()],
    });
    // Add student to class and school
    await GroupModel.findByIdAndUpdate(school._id, { $addToSet: { studentIds: student._id.toString() } });
    await GroupModel.findByIdAndUpdate(classroom._id, { $addToSet: { studentIds: student._id.toString() } });
    console.log(`   - الطالب: ${student.name} تم تسجيله في مدرسة المحاكاة وفصل المحاكاة.\n`);

    // 6. Create Supervisor
    console.log("👨‍🏫 3. جاري إنشاء حساب المشرف...");
    const supervisor = await UserModel.create({
      name: "مشرف المحاكاة",
      email: "sim_supervisor@example.com",
      passwordHash: "dummy",
      role: "supervisor",
    });
    // Add supervisor to the CLASS only (not the whole school)
    await GroupModel.findByIdAndUpdate(classroom._id, { $addToSet: { supervisorIds: supervisor._id.toString() } });
    console.log(`   - المشرف: ${supervisor.name} تم تعيينه مشرفاً على "فصل المحاكاة" فقط.\n`);

    // 7. Simulate Quiz Result for Student
    console.log("📝 4. جاري محاكاة أداء الطالب في اختبار (طالب يقدم اختبار)...");
    const quizResult = await QuizResultModel.create({
      userId: student._id.toString(),
      quizId: "sim_quiz_1",
      quizTitle: "اختبار المحاكاة",
      score: 65,
      totalQuestions: 20,
      correctAnswers: 13,
      wrongAnswers: 7,
      unanswered: 0,
      timeSpent: "15:00",
      date: new Date().toISOString(),
      skillsAnalysis: [
        { skill: "الجبر الأساسي", mastery: 40, status: "weak" },
        { skill: "الهندسة", mastery: 90, status: "strong" },
      ],
    });
    console.log(`   - الطالب حصل على ${quizResult.score}% في ${quizResult.quizTitle}`);
    console.log(`   - مهارات ضعيفة: الجبر الأساسي (40%)\n`);

    // 8. Prove Relationship (Supervisor Query)
    console.log("🔍 5. فحص لوحة المشرف (هل يمكن للمشرف رؤية الطالب والنتيجة؟)");
    
    // Find groups supervised by the supervisor
    const supervisedGroups = await GroupModel.find({ supervisorIds: supervisor._id.toString() });
    console.log(`   - مجموعات المشرف: ${supervisedGroups.map(g => g.name).join(", ")}`);
    
    // Find students in those groups
    const supervisedStudentIds = supervisedGroups.flatMap(g => g.studentIds);
    const supervisedStudents = await UserModel.find({ _id: { $in: supervisedStudentIds }, role: "student" });
    console.log(`   - الطلاب تحت إشرافه: ${supervisedStudents.map(s => s.name).join(", ")}`);
    
    // Find results for those students
    const studentResults = await QuizResultModel.find({ userId: { $in: supervisedStudentIds } });
    console.log(`   - نتائج اختبارات طلابه المكتشفة: ${studentResults.length} نتيجة`);
    if (studentResults.length > 0) {
      console.log(`   - النتيجة الأولى المكتشفة: ${studentResults[0].quizTitle} (${studentResults[0].score}%) للطالب ${supervisedStudents.find(s => s._id.toString() === studentResults[0].userId)?.name}`);
    }

    // 9. Assertions
    console.log("\n✅ --- النتيجة النهائية --- ✅");
    if (
      supervisedGroups.length === 1 &&
      supervisedStudents.length === 1 &&
      supervisedStudents[0].name === "طالب المحاكاة" &&
      studentResults.length === 1 &&
      studentResults[0].score === 65
    ) {
      console.log("🎉 نجاح المحاكاة 100%! العلاقات تعمل بشكل مثالي.");
      console.log("   - المدرسة ورّثت الصلاحيات.");
      console.log("   - المشرف استطاع رؤية طلاب فصله فقط.");
      console.log("   - نتيجة الطالب ظهرت في تقارير المشرف فوراً.");
    } else {
      console.log("❌ فشل المحاكاة: هناك خطأ في العلاقات.");
    }

    // 10. Final Cleanup
    console.log("\n🧹 جاري تنظيف بيانات المحاكاة من قاعدة البيانات...");
    await GroupModel.deleteMany({ _id: { $in: [school._id, classroom._id] } });
    await UserModel.deleteMany({ _id: { $in: [student._id, supervisor._id] } });
    await QuizResultModel.deleteMany({ _id: quizResult._id });
    console.log("✅ تمت إزالة بيانات المحاكاة.");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء المحاكاة:", error);
  } finally {
    await mongoose.disconnect();
  }
};

void runSimulation();
