import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { QuizModel } from "../models/Quiz.js";
import { QuizResultModel } from "../models/QuizResult.js";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const runSupervisorSimulation = async () => {
  console.log("👨‍🏫 بدء محاكاة (المشرف واختباراته الموجهة) 👨‍🏫\n");

  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/almeaa-dev";
    await mongoose.connect(mongoUri);
    
    // Cleanup previous
    await GroupModel.deleteMany({ ownerId: "sim_supervisor_flow" });
    await UserModel.deleteMany({ email: { $regex: /sim_sup_flow/i } });
    await QuizModel.deleteMany({ ownerId: "sim_sup_flow_owner" });
    await QuizResultModel.deleteMany({ quizTitle: "اختبار القدرات الموجه الأسبوعي" });

    // 1. Setup Environment
    console.log("🏫 1. تجهيز بيئة المدرسة والفصل والمشرف والطلاب...");
    const school = await GroupModel.create({ name: "مدرسة التفوق", type: "SCHOOL", ownerId: "sim_supervisor_flow" });
    const classroom = await GroupModel.create({ name: "فصل الموهوبين", type: "CLASS", parentId: school._id.toString(), ownerId: "sim_supervisor_flow" });
    
    const supervisor = await UserModel.create({
      name: "الأستاذ أحمد (المشرف)", email: "sim_sup_flow_teacher@example.com", passwordHash: "dummy", role: "supervisor"
    });
    
    // Assign supervisor to class
    await GroupModel.findByIdAndUpdate(classroom._id, { $addToSet: { supervisorIds: supervisor._id.toString() } });

    // Create 3 students
    const students = await UserModel.create([
      { name: "طالب أ (ممتاز)", email: "sim_sup_flow_s1@example.com", passwordHash: "dummy", role: "student", schoolId: school._id.toString(), groupIds: [classroom._id.toString()] },
      { name: "طالب ب (متوسط)", email: "sim_sup_flow_s2@example.com", passwordHash: "dummy", role: "student", schoolId: school._id.toString(), groupIds: [classroom._id.toString()] },
      { name: "طالب ج (ضعيف)", email: "sim_sup_flow_s3@example.com", passwordHash: "dummy", role: "student", schoolId: school._id.toString(), groupIds: [classroom._id.toString()] }
    ]);
    
    await GroupModel.findByIdAndUpdate(school._id, { $addToSet: { studentIds: { $each: students.map(s => s._id.toString()) } } });
    await GroupModel.findByIdAndUpdate(classroom._id, { $addToSet: { studentIds: { $each: students.map(s => s._id.toString()) } } });
    console.log(`✅ تم إنشاء المشرف و 3 طلاب في ${classroom.name}.`);

    // 2. Supervisor creates a directed test
    console.log("\n📝 2. المشرف يقوم بإنشاء 'اختبار موجه' لطلابه...");
    const quiz = await QuizModel.create({
      title: "اختبار القدرات الموجه الأسبوعي",
      description: "اختبار لقياس مستوى الطلاب في الجبر والهندسة",
      pathId: "p_qudrat",
      subjectId: "s_math",
      type: "quiz",
      mode: "regular",
      ownerType: "teacher",
      ownerId: "sim_sup_flow_owner", // Using a distinct ID for the test owner
      createdBy: supervisor._id.toString(),
      targetGroupIds: [classroom._id.toString()], // Assigned to this class
      isPublished: true,
      showOnPlatform: true,
      dueDate: new Date(Date.now() + 86400000).toISOString() // Due tomorrow
    });
    console.log(`✅ تم تكليف الطلاب باختبار: "${quiz.title}" بنجاح.`);

    // 3. Students take the test
    console.log("\n👨‍🎓 3. الطلاب يقومون بحل الاختبار (مع تباين في المستويات)...");
    await QuizResultModel.create([
      {
        userId: students[0]._id.toString(), quizId: quiz._id.toString(), quizTitle: quiz.title,
        score: 95, totalQuestions: 20, correctAnswers: 19, wrongAnswers: 1, unanswered: 0, timeSpent: "12:00", date: new Date().toISOString(),
        skillsAnalysis: [{ skill: "الجبر", mastery: 95, status: "strong" }, { skill: "الهندسة", mastery: 95, status: "strong" }]
      },
      {
        userId: students[1]._id.toString(), quizId: quiz._id.toString(), quizTitle: quiz.title,
        score: 60, totalQuestions: 20, correctAnswers: 12, wrongAnswers: 8, unanswered: 0, timeSpent: "14:30", date: new Date().toISOString(),
        skillsAnalysis: [{ skill: "الجبر", mastery: 40, status: "weak" }, { skill: "الهندسة", mastery: 80, status: "strong" }]
      },
      {
        userId: students[2]._id.toString(), quizId: quiz._id.toString(), quizTitle: quiz.title,
        score: 35, totalQuestions: 20, correctAnswers: 7, wrongAnswers: 13, unanswered: 0, timeSpent: "08:15", date: new Date().toISOString(),
        skillsAnalysis: [{ skill: "الجبر", mastery: 30, status: "weak" }, { skill: "الهندسة", mastery: 40, status: "weak" }]
      }
    ]);
    console.log("✅ تم تسجيل نتائج الطلاب (95%، 60%، 35%).");

    // 4. Supervisor views analytics
    console.log("\n📊 4. المشرف يستعرض الاختبارات والتحليلات...");
    
    // 4a. Fetch quizzes created by this supervisor
    const supervisorQuizzes = await QuizModel.find({ createdBy: supervisor._id.toString() });
    console.log(`   - الاختبارات السابقة للمشرف: ${supervisorQuizzes.length} اختبار (اسمه: ${supervisorQuizzes[0].title})`);

    // 4b. Fetch results for this specific quiz
    const quizResults = await QuizResultModel.find({ quizId: quiz._id.toString() });
    
    // Analytics Math
    const totalScore = quizResults.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = Math.round(totalScore / quizResults.length);
    
    // Find weak students (< 65%)
    const weakResults = quizResults.filter(r => r.score < 65);
    const weakStudentIds = weakResults.map(r => r.userId);
    const weakStudents = await UserModel.find({ _id: { $in: weakStudentIds } });

    console.log(`   - إجمالي المشاركين: ${quizResults.length} طلاب`);
    console.log(`   - 📉 متوسط درجات الفصل: ${averageScore}%`);
    console.log(`   - ⚠️ الطلاب الذين يحتاجون خطة علاجية (أقل من 65%):`);
    weakStudents.forEach(s => {
      const res = weakResults.find(r => r.userId === s._id.toString());
      console.log(`      * ${s.name} (جاب ${res?.score}%)`);
    });

    // 5. Cleanup
    console.log("\n🧹 جاري تنظيف بيانات المحاكاة...");
    await GroupModel.deleteMany({ ownerId: "sim_supervisor_flow" });
    await UserModel.deleteMany({ email: { $regex: /sim_sup_flow/i } });
    await QuizModel.deleteMany({ ownerId: "sim_sup_flow_owner" });
    await QuizResultModel.deleteMany({ quizTitle: "اختبار القدرات الموجه الأسبوعي" });
    console.log("✅ تمت الإزالة بنجاح.");
    
    console.log("\n🎉 اكتملت محاكاة سير عمل المشرف بنجاح!");

  } catch (error) {
    console.error("❌ حدث خطأ:", error);
  } finally {
    await mongoose.disconnect();
  }
};

void runSupervisorSimulation();
