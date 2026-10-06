import mongoose from "mongoose";
import { env } from "../config/env.js";
import { verifyChem26StandardTests } from "../app/bootstrap/runChem26StandardTests.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    await verifyChem26StandardTests();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("CHEM26_STANDARD_TESTS_VERIFY_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
