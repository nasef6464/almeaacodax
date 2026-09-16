import mongoose from "mongoose";
import { env } from "../config/env.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";

const explicitProductionApproval = process.env.ALLOW_PAYMENT_GATEWAY_INDEX_MIGRATION === "1";

const duplicateIdentityPipeline = (identityField: "gatewayEventId" | "gatewayTransactionId") => [
  {
    $match: {
      gatewayProvider: { $type: "string", $gt: "" },
      [identityField]: { $type: "string", $gt: "" },
    },
  },
  {
    $group: {
      _id: { provider: "$gatewayProvider", identity: `$${identityField}` },
      count: { $sum: 1 },
      paymentRequestIds: { $push: "$id" },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $limit: 20 },
] as any[];

async function run() {
  if (env.NODE_ENV === "production" && !explicitProductionApproval) {
    throw new Error(
      "Refusing to run payment gateway index migration in production without ALLOW_PAYMENT_GATEWAY_INDEX_MIGRATION=1",
    );
  }

  await mongoose.connect(env.MONGODB_URI);
  try {
    const [eventDuplicates, transactionDuplicates] = await Promise.all([
      PaymentRequestModel.aggregate(duplicateIdentityPipeline("gatewayEventId")),
      PaymentRequestModel.aggregate(duplicateIdentityPipeline("gatewayTransactionId")),
    ]);

    if (eventDuplicates.length > 0 || transactionDuplicates.length > 0) {
      console.error("Duplicate payment gateway identities must be reconciled before creating unique indexes.");
      for (const duplicate of eventDuplicates) {
        console.error(JSON.stringify({
          kind: "event",
          provider: duplicate._id.provider,
          identity: duplicate._id.identity,
          count: duplicate.count,
          paymentRequestIds: duplicate.paymentRequestIds,
        }));
      }
      for (const duplicate of transactionDuplicates) {
        console.error(JSON.stringify({
          kind: "transaction",
          provider: duplicate._id.provider,
          identity: duplicate._id.identity,
          count: duplicate.count,
          paymentRequestIds: duplicate.paymentRequestIds,
        }));
      }
      process.exitCode = 2;
      return;
    }

    await PaymentRequestModel.syncIndexes();
    console.log("Payment gateway indexes synchronized successfully; provider-scoped event and transaction identities are unique.");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
