import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ReviewCardModel } from "../models/ReviewCard.js";
import { UserModel } from "../models/User.js";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Math.min(Number(limitArg?.split("=")[1] || 500), 5000));
await mongoose.connect(env.MONGODB_URI);
try {
  const users = await UserModel.find({
    $or: [{ "favorites.0": { $exists: true } }, { "reviewLater.0": { $exists: true } }],
  }).select("_id favorites reviewLater").limit(limit).lean();

  let missingSaved = 0;
  const examples: Array<{ userId: string; questionId: string }> = [];
  for (const user of users as any[]) {
    const userId = String(user._id);
    const legacy = new Set<string>([...(user.favorites || []), ...(user.reviewLater || [])].map((v: unknown) => String(v)));
    if (!legacy.size) continue;
    const cards = await ReviewCardModel.find({ userId, questionId: { $in: [...legacy] }, savedForReview: true })
      .select("questionId").lean();
    const found = new Set(cards.map((card: any) => String(card.questionId)));
    for (const questionId of legacy) {
      if (!found.has(questionId)) {
        missingSaved += 1;
        if (examples.length < 20) examples.push({ userId, questionId });
      }
    }
  }
  const report = { sampledUsers: users.length, missingSaved, parity: missingSaved === 0, examples };
  console.log(JSON.stringify(report, null, 2));
  if (missingSaved > 0) process.exitCode = 2;
} finally {
  await mongoose.disconnect();
}
