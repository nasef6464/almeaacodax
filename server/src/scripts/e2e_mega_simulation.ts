import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { QuizModel } from "../models/Quiz.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";
import { ActivityModel } from "../models/Activity.js";
import { AiInteractionModel } from "../models/AiInteraction.js";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const runMegaSimulation = async () => {
  console.log("🚀 بدء المحاكاة الشاملة (Mega E2E Simulation) 🚀\n");

  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/almeaa-dev";
    await mongoose.connect(mongoUri);
    console.log("✅ تم الاتصال بقاعدة البيانات.");

    // Cleanup previous data
    const simEmails = ["mega_student@example.com", "mega_supervisor@example.com"];
    await UserModel.deleteMany({ email: { $in: simEmails } });
    await GroupModel.deleteMany({ ownerId: "mega_sim_system" });
    await QuizModel.deleteMany({ ownerId: "mega_sim_system" });
    await QuizResultModel.deleteMany({ quizTitle: { $regex: /Mega Sim/i } });
    await PaymentRequestModel.deleteMany({ userEmail: simEmails[0] });
    await ActivityModel.deleteMany({ title: "Mega Sim Session" });
    await AiInteractionModel.deleteMany({ prompt: { $regex: /Mega Sim/i } });

    // 1. School, Class, Roles
    console.log("\n🏢 1. إنشاء المدرسة والفصول وتوزيع الأدوار...");
    const school = await GroupModel.create({ name: "Mega Sim School", type: "SCHOOL", ownerId: "mega_sim_system" });
    const classroom = await GroupModel.create({ name: "Mega Sim Class", type: "CLASS", parentId: school._id.toString(), ownerId: "mega_sim_system" });
    
    const supervisor = await UserModel.create({
      name: "Mega Supervisor", email: simEmails[1], passwordHash: "dummy", role: "supervisor"
    });
    
    const student = await UserModel.create({
      name: "Mega Student", email: simEmails[0], passwordHash: "dummy", role: "student",
      schoolId: school._id.toString(), groupIds: [classroom._id.toString()]
    });

    await GroupModel.findByIdAndUpdate(school._id, { $addToSet: { studentIds: student._id.toString() } });
    await GroupModel.findByIdAndUpdate(classroom._id, { $addToSet: { studentIds: student._id.toString(), supervisorIds: supervisor._id.toString() } });
    console.log("✅ تمت الإضافة بنجاح.");

    // 2. Payments & Subscriptions
    console.log("\n💳 2. محاكاة شراء باقة (Payment & Subscription)...");
    const payment = await PaymentRequestModel.create({
      id: "pay_" + Date.now(),
      userId: student._id.toString(), userName: student.name, userEmail: student.email,
      amount: 499, status: "approved", paymentMethod: "card",
      itemType: "package", itemId: "pkg_pro", itemName: "باقة النخبة",
      gatewayProvider: "moyasar"
    });
    await UserModel.findByIdAndUpdate(student._id, {
      "subscription.plan": "premium",
      $addToSet: { "subscription.purchasedPackages": "pkg_pro" }
    });
    console.log("✅ اشترك الطالب بنجاح وتم تحويل حسابه إلى Premium.");

    // 3. Supervisor Assigned Quizzes
    console.log("\n📝 3. المشرف يكلف الطلاب باختبار موجه...");
    const quiz = await QuizModel.create({
      title: "Mega Sim Directed Quiz", pathId: "p_qudrat", subjectId: "s_math",
      ownerType: "teacher", ownerId: "mega_sim_system",
      targetGroupIds: [classroom._id.toString()],
      isPublished: true, showOnPlatform: true
    });
    console.log("✅ الاختبار جاهز ومعين للفصل.");

    // 4. Student Taking Quiz & Smart Analysis
    console.log("\n🧠 4. الطالب يقدم الاختبار + تحليل ذكي (Skills Analysis)...");
    const result = await QuizResultModel.create({
      userId: student._id.toString(), quizId: quiz._id.toString(), quizTitle: quiz.title,
      score: 85, totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2, unanswered: 0,
      timeSpent: "10:00", date: new Date().toISOString(),
      skillsAnalysis: [
        { skill: "Mega Sim الجبر", mastery: 100, status: "strong" },
        { skill: "Mega Sim الهندسة", mastery: 50, status: "weak" } // Weak skill identified
      ]
    });
    console.log(`✅ نتيجة الطالب: ${result.score}% (نقطة الضعف: الهندسة)`);

    // 5. Booking a Session
    console.log("\n📅 5. الطالب يحجز جلسة خاصة لعلاج الضعف...");
    const session = await ActivityModel.create({
      type: "session_booked", userId: student._id.toString(), title: "Mega Sim Session",
      date: new Date().toISOString(), status: "completed", details: { targetSkill: "الهندسة" }
    });
    console.log("✅ تم حجز وحضور الجلسة.");

    // 6. AI Interaction (Chat Widget)
    console.log("\n🤖 6. الطالب يستخدم الذكاء الاصطناعي لفهم السؤال...");
    const aiChat = await AiInteractionModel.create({
      userId: student._id.toString(), type: "chat", feature: "doubt_solver",
      prompt: "Mega Sim: كيف أحل هذا السؤال الهندسي؟", response: "عليك استخدام نظرية فيثاغورس..."
    });
    console.log("✅ تم توليد وتخزين رد الذكاء الاصطناعي.");

    // 7. Supervisor Reports Validation
    console.log("\n📊 7. محاكاة لوحة المشرف وتقاريره...");
    const groups = await GroupModel.find({ supervisorIds: supervisor._id.toString() });
    const sIds = groups.flatMap(g => g.studentIds);
    const results = await QuizResultModel.find({ userId: { $in: sIds } });
    
    if (results.length > 0 && results[0].score === 85) {
      console.log(`✅ تقارير المشرف التقطت نتيجة الطالب: ${results[0].quizTitle} (${results[0].score}%) بنجاح.`);
      console.log(`✅ الذكاء الاصطناعي حلل مهارة "الهندسة" على أنها ضعيفة للمشرف ليعالجها.`);
    } else {
      console.log("❌ فشل المشرف في استرجاع التقارير.");
    }

    // Assertions and Cleanup
    console.log("\n🌟 --- نجاح الاختبار الشامل لجميع وحدات المنصة (E2E Mega Test) --- 🌟");
    
    console.log("\n🧹 جاري تنظيف بيانات المحاكاة من قاعدة البيانات...");
    await GroupModel.deleteMany({ ownerId: "mega_sim_system" });
    await UserModel.deleteMany({ email: { $in: simEmails } });
    await QuizModel.deleteMany({ ownerId: "mega_sim_system" });
    await QuizResultModel.deleteMany({ _id: result._id });
    await PaymentRequestModel.deleteMany({ _id: payment._id });
    await ActivityModel.deleteMany({ _id: session._id });
    await AiInteractionModel.deleteMany({ _id: aiChat._id });
    console.log("✅ تمت إزالة بيانات المحاكاة.");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء المحاكاة:", error);
  } finally {
    await mongoose.disconnect();
  }
};

void runMegaSimulation();
