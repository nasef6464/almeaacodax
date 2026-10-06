import mongoose from "mongoose";
import { calculateObjectSize } from "bson";
import { env } from "../config/env.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { QuestionModel } from "../models/Question.js";
import { UserModel } from "../models/User.js";

await mongoose.connect(env.MONGODB_URI);
try {
  const [questions, users, results] = await Promise.all([
    QuestionModel.find().select("_id id").limit(5000).lean(),
    UserModel.find().sort({ updatedAt: -1 }).limit(500).lean(),
    QuizResultModel.find().sort({ createdAt: -1 }).limit(500).lean(),
  ]);
  const ids = new Map<string, string>();
  let identityCollisions = 0;
  for (const q of questions as any[]) {
    for (const id of [String(q._id || ""), String(q.id || "")].filter(Boolean)) {
      const owner = ids.get(id);
      if (owner && owner !== String(q._id)) identityCollisions += 1;
      else ids.set(id, String(q._id));
    }
  }
  const sizes = (docs: any[]) => docs.map((doc) => calculateObjectSize(doc));
  const summarize = (values: number[]) => ({
    count: values.length,
    maxBytes: values.length ? Math.max(...values) : 0,
    avgBytes: values.length ? Math.round(values.reduce((a,b)=>a+b,0) / values.length) : 0,
  });
  const report = {
    identity: { sampledQuestions: questions.length, collisions: identityCollisions },
    documentGrowth: { users: summarize(sizes(users)), quizResults: summarize(sizes(results)) },
    budgets: { userMaxBytes: 512 * 1024, quizResultMaxBytes: 1024 * 1024 },
  };
  console.log(JSON.stringify(report, null, 2));
  if (identityCollisions > 0 || report.documentGrowth.users.maxBytes > report.budgets.userMaxBytes || report.documentGrowth.quizResults.maxBytes > report.budgets.quizResultMaxBytes) process.exitCode = 2;
} finally {
  await mongoose.disconnect();
}
