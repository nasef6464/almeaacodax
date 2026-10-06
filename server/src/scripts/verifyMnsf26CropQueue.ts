import fs from "fs";
import path from "path";

type CropItem = {
  questionCode: string;
  sourceItemId: string;
  contentStatus: "CONTENT_READY_CROP_PENDING" | "HOLD_SOURCE";
  cropStatus: "PENDING_ORIGINAL_PIXELS" | "READY";
  imageHash: string | null;
  imageUrl: string | null;
};

const queuePath = path.resolve(
  process.cwd(),
  "../docs/content/mnsf26/MNSF26_CROP_QUEUE_V1.json",
);
const data = JSON.parse(fs.readFileSync(queuePath, "utf8")) as {
  bank: string;
  counts: Record<string, number>;
  queue: CropItem[];
};

const failures: Array<{ gate: string; detail: unknown }> = [];
const ready = data.queue.filter((item) => item.contentStatus === "CONTENT_READY_CROP_PENDING");
const sourceReview = data.queue.filter((item) => item.contentStatus === "HOLD_SOURCE");

if (data.bank !== "MNSF26") failures.push({ gate: "bank-code", detail: data.bank });
if (data.queue.length !== 132) {
  failures.push({ gate: "queue-count", detail: data.queue.length });
}
if (ready.length !== 130 || sourceReview.length !== 2) {
  failures.push({
    gate: "content-status-counts",
    detail: { ready: ready.length, sourceReview: sourceReview.length },
  });
}

const declaredCounts = {
  queued: data.counts.queued,
  contentReady: data.counts.contentReady,
  sourceReview: data.counts.sourceReview,
};
const actualCounts = {
  queued: data.queue.length,
  contentReady: ready.length,
  sourceReview: sourceReview.length,
};
if (
  declaredCounts.queued !== actualCounts.queued ||
  declaredCounts.contentReady !== actualCounts.contentReady ||
  declaredCounts.sourceReview !== actualCounts.sourceReview
) {
  failures.push({
    gate: "declared-counts-parity",
    detail: { declared: declaredCounts, actual: actualCounts },
  });
}

const invalidPendingAssets = data.queue.filter(
  (item) =>
    item.cropStatus === "PENDING_ORIGINAL_PIXELS" &&
    (item.imageHash !== null || item.imageUrl !== null),
);
if (invalidPendingAssets.length) {
  failures.push({
    gate: "pending-crop-must-not-claim-assets",
    detail: invalidPendingAssets.map((item) => item.questionCode),
  });
}

const expectedHoldCodes = new Set([
  "QDR-QNT-MNSF26-P001-Q10",
  "QDR-QNT-MNSF26-P013-Q15",
]);
const actualHoldCodes = new Set(sourceReview.map((item) => item.questionCode));
if (
  actualHoldCodes.size !== expectedHoldCodes.size ||
  [...expectedHoldCodes].some((code) => !actualHoldCodes.has(code))
) {
  failures.push({
    gate: "crop-source-hold-allowlist",
    detail: { expected: [...expectedHoldCodes], actual: [...actualHoldCodes] },
  });
}
const unsafeHoldAssets = sourceReview.filter(
  (item) =>
    item.cropStatus !== "PENDING_ORIGINAL_PIXELS" ||
    item.imageHash !== null ||
    item.imageUrl !== null,
);
if (unsafeHoldAssets.length) {
  failures.push({
    gate: "source-hold-crop-fail-closed",
    detail: unsafeHoldAssets.map((item) => item.questionCode),
  });
}

const duplicateCodes = data.queue
  .filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.questionCode === item.questionCode) !== index,
  )
  .map((item) => item.questionCode);
if (duplicateCodes.length) {
  failures.push({
    gate: "question-code-uniqueness",
    detail: [...new Set(duplicateCodes)],
  });
}

const duplicateSourceIds = data.queue
  .filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.sourceItemId === item.sourceItemId) !== index,
  )
  .map((item) => item.sourceItemId);
if (duplicateSourceIds.length) {
  failures.push({
    gate: "source-item-id-uniqueness",
    detail: [...new Set(duplicateSourceIds)],
  });
}

const invalidReadyAssets = data.queue.filter(
  (item) =>
    item.cropStatus === "READY" &&
    (!item.imageHash ||
      !/^[a-f0-9]{64}$/.test(item.imageHash) ||
      !item.imageUrl ||
      !item.imageUrl.includes(`/questions/v2/${item.questionCode}/${item.imageHash}.webp`)),
);
if (invalidReadyAssets.length) {
  failures.push({
    gate: "ready-crop-asset-contract",
    detail: invalidReadyAssets.map((item) => item.questionCode),
  });
}

const report = {
  ok: failures.length === 0,
  counts: {
    total: data.queue.length,
    contentReady: ready.length,
    sourceReview: sourceReview.length,
    cropReady: data.queue.filter((item) => item.cropStatus === "READY").length,
    cropPending: data.queue.filter((item) => item.cropStatus !== "READY").length,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
