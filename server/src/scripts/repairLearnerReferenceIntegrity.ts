import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import {
  LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT,
  repairLearnerReferenceIntegrity,
} from "../modules/quizzes/application/learnerReferenceRepair.js";

const getArgValue = (name: string) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function run() {
  const apply = process.argv.includes("--apply");
  const confirmText = getArgValue("confirm");

  if (apply && confirmText !== LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT) {
    throw new Error(
      `Apply requires --confirm=${LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT}. Dry-run remains the default.`,
    );
  }

  await connectToDatabase();
  try {
    const result = await repairLearnerReferenceIntegrity({
      apply,
      confirmText,
      actorId: "system:learner-reference-repair",
      actorEmail: "",
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Learner reference repair failed", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
