import mongoose from "mongoose";
import { env } from "../config/env.js";
import { verifyChem26LearningStructure } from "../app/bootstrap/runChem26LearningStructure.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    await verifyChem26LearningStructure();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("CHEM26_LEARNING_STRUCTURE_VERIFY_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
