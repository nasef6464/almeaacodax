import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import {
  DB_COLLECTION_OWNERS,
  DB_GROWTH_RISKS,
  DB_HEAVY_JOURNEYS,
} from "../modules/database/dbInventoryOwnership.js";

type CollectionBaseline = {
  collection: string;
  domain: string;
  documents: number;
  avgDocumentBytes: number;
  maxDocumentBytes: number;
  logicalDataBytes: number;
  storageBytes: number;
  indexCount: number;
  indexBytes: number;
  indexToDataRatio: number | null;
};

const readOnlyForbidden = [
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "drop",
  "dropIndex",
  "dropIndexes",
  "createIndex",
  "createIndexes",
  "bulkWrite",
  "findOneAndUpdate",
  "findOneAndDelete",
];

const outputArg = process.argv.find((arg) => arg.startsWith("--out="));
const outputPath = outputArg ? outputArg.slice("--out=".length).trim() : "";

const numeric = (value: unknown) => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "$numberLong" in value) {
    return Number((value as { $numberLong: string }).$numberLong);
  }
  return Number(value || 0);
};

const main = async () => {
  await connectToDatabase();
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");

    const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((item) => item.name)
      .filter((name) => !name.startsWith("system."))
      .sort();

    const mapped = Object.keys(DB_COLLECTION_OWNERS).sort();
    const unmappedCollections = collections.filter((name) => !(name in DB_COLLECTION_OWNERS));
    const mappedButMissing = mapped.filter((name) => !collections.includes(name));

    const dbStats = await db.command({ dbStats: 1, scale: 1 });
    const inventory: CollectionBaseline[] = [];

    for (const collection of collections) {
      const statsRows = await db.collection(collection).aggregate(
        [
          { $collStats: { storageStats: { scale: 1 } } },
          {
            $project: {
              _id: 0,
              "storageStats.count": 1,
              "storageStats.avgObjSize": 1,
              "storageStats.size": 1,
              "storageStats.storageSize": 1,
              "storageStats.totalIndexSize": 1,
              "storageStats.nindexes": 1,
            },
          },
        ] as any[],
        { allowDiskUse: false },
      ).toArray();

      const storageStats = (statsRows[0]?.storageStats || {}) as Record<string, unknown>;
      const maxRows = await db.collection(collection).aggregate(
        [
          { $project: { _id: 0, bytes: { $bsonSize: "$$ROOT" } } },
          { $group: { _id: null, maxDocumentBytes: { $max: "$bytes" } } },
        ],
        { allowDiskUse: false },
      ).toArray();

      const logicalDataBytes = numeric(storageStats.size);
      const indexBytes = numeric(storageStats.totalIndexSize);
      inventory.push({
        collection,
        domain: DB_COLLECTION_OWNERS[collection as keyof typeof DB_COLLECTION_OWNERS] || "UNMAPPED",
        documents: numeric(storageStats.count),
        avgDocumentBytes: Math.round(numeric(storageStats.avgObjSize)),
        maxDocumentBytes: numeric(maxRows[0]?.maxDocumentBytes),
        logicalDataBytes,
        storageBytes: numeric(storageStats.storageSize),
        indexCount: numeric(storageStats.nindexes),
        indexBytes,
        indexToDataRatio: logicalDataBytes > 0 ? Number((indexBytes / logicalDataBytes).toFixed(3)) : null,
      });
    }

    const sortedByLogicalBytes = [...inventory].sort((a, b) => b.logicalDataBytes - a.logicalDataBytes);
    const sortedByMaxDocument = [...inventory].sort((a, b) => b.maxDocumentBytes - a.maxDocumentBytes);
    const sortedByIndexBytes = [...inventory].sort((a, b) => b.indexBytes - a.indexBytes);

    const report = {
      generatedAt: new Date().toISOString(),
      database: db.databaseName,
      readOnly: true,
      safety: {
        destructiveOperationsExecuted: 0,
        forbiddenOperations: readOnlyForbidden,
      },
      databaseTotals: {
        collections: numeric(dbStats.collections),
        documents: numeric(dbStats.objects),
        avgDocumentBytes: Math.round(numeric(dbStats.avgObjSize)),
        logicalDataBytes: numeric(dbStats.dataSize),
        storageBytes: numeric(dbStats.storageSize),
        indexCount: numeric(dbStats.indexes),
        indexBytes: numeric(dbStats.indexSize),
        indexToDataRatio:
          numeric(dbStats.dataSize) > 0
            ? Number((numeric(dbStats.indexSize) / numeric(dbStats.dataSize)).toFixed(3))
            : null,
      },
      ownership: {
        mappedCollections: mapped.length,
        liveCollections: collections.length,
        unmappedCollections,
        mappedButMissing,
      },
      inventory,
      topByLogicalDataBytes: sortedByLogicalBytes.slice(0, 15),
      topByMaxDocumentBytes: sortedByMaxDocument.slice(0, 15),
      topByIndexBytes: sortedByIndexBytes.slice(0, 15),
      growthRisks: DB_GROWTH_RISKS,
      heavyJourneys: DB_HEAVY_JOURNEYS,
    };

    const rendered = JSON.stringify(report, null, 2);
    console.log(rendered);

    if (outputPath) {
      const absolute = path.resolve(outputPath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, rendered + "\n", "utf8");
    }

    if (unmappedCollections.length > 0) {
      throw new Error(`DB-1 ownership map incomplete: ${unmappedCollections.join(", ")}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
