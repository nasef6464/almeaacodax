process.env.QUESTION_PILOT_MODE = "prepare";
process.env.QUESTION_PILOT_PAYLOAD_FILE = "scratch/fnd26_batch26_manifest.json";
process.env.QUESTION_PILOT_IMAGE_DIR = "scratch/fnd26_batch26_crops";
process.env.QUESTION_PILOT_OUTPUT_FILE = "scratch/fnd26_batch26_prepare_report.json";
process.env.QUESTION_PILOT_EXPECTED_COUNT = "11";
process.env.QUESTION_PILOT_BATCH_ID = "QBANK-FND26-BATCH26-20260926-V1";

await import("./run-question-bank-v2-pilot.mjs");
