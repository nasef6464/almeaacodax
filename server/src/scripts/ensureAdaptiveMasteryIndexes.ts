import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";

const APPLY = process.argv.includes("--apply");
const DROP_LEGACY = process.argv.includes("--drop-legacy");

const keysEqual = (actual: Record<string, unknown>, expected: Record<string, unknown>) =>
  JSON.stringify(actual) === JSON.stringify(expected);

const main = async () => {
  await connectToDatabase();
  const collection = mongoose.connection.collection("skillprogresses");

  const duplicateScoped = await collection.aggregate([
    {
      $group: {
        _id: {
          userId: "$userId",
          pathId: "$pathId",
          subjectId: "$subjectId",
          skillId: "$skillId",
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]).toArray();

  const missingScope = await collection.countDocuments({
    $or: [
      { pathId: "" },
      { pathId: null },
      { pathId: { $exists: false } },
      { subjectId: "" },
      { subjectId: null },
      { subjectId: { $exists: false } },
    ],
  });

  const indexes = await collection.indexes();
  const scopedIdentityKeys = { userId: 1, pathId: 1, subjectId: 1, skillId: 1 };
  const legacyIdentity = indexes.find((index) =>
    index.unique === true && keysEqual(index.key as Record<string, unknown>, { userId: 1, skillId: 1 }),
  );
  const scopedIdentity = indexes.find((index) =>
    keysEqual(index.key as Record<string, unknown>, scopedIdentityKeys),
  );

  const report = {
    apply: APPLY,
    dropLegacyRequested: DROP_LEGACY,
    total: await collection.estimatedDocumentCount(),
    duplicateScopedCount: duplicateScoped.length,
    duplicateScoped,
    missingScope,
    legacyIdentityIndex: legacyIdentity?.name || null,
    scopedIdentityIndex: scopedIdentity
      ? { name: scopedIdentity.name, unique: Boolean(scopedIdentity.unique) }
      : null,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log("DRY RUN ONLY. Re-run with --apply after reviewing the report.");
    return;
  }
  if (duplicateScoped.length > 0 || missingScope > 0) {
    throw new Error("Unsafe scoped identity migration: duplicate or missing scope rows exist.");
  }

  if (!scopedIdentity) {
    await collection.createIndex(scopedIdentityKeys, {
      unique: true,
      name: "userId_1_pathId_1_subjectId_1_skillId_1",
    });
    console.log("Created canonical scoped unique identity index.");
  } else if (!scopedIdentity.unique) {
    throw new Error(
      `Scoped identity index ${scopedIdentity.name} exists but is not unique. Review manually before cutover.`,
    );
  }

  if (DROP_LEGACY) {
    const refreshed = await collection.indexes();
    const verifiedScoped = refreshed.find((index) =>
      index.unique === true && keysEqual(index.key as Record<string, unknown>, scopedIdentityKeys),
    );
    if (!verifiedScoped) {
      throw new Error("Refusing to drop legacy identity before canonical unique index is verified.");
    }
    const refreshedLegacy = refreshed.find((index) =>
      index.unique === true && keysEqual(index.key as Record<string, unknown>, { userId: 1, skillId: 1 }),
    );
    if (refreshedLegacy?.name) {
      await collection.dropIndex(refreshedLegacy.name);
      console.log(`Dropped legacy unique index ${refreshedLegacy.name} after canonical verification.`);
    }
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
