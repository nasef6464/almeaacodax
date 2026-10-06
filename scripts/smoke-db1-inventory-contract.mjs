import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [ownership, baseline, evidence] = await Promise.all([
  read("server/src/modules/database/dbInventoryOwnership.ts"),
  read("server/src/scripts/db1InventoryBaseline.ts"),
  read("docs/MASTER_CONTROL/DB1_INVENTORY_GROWTH_BASELINE_2026-09-28.md"),
]);

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};

const expectedCollections = [
  "users","phoneotps","parentstudentrelationships",
  "paths","levels","subjects","sections","skills","topics","lessons","courses","libraryitems","activities",
  "studyplans","masterygoals","skillprogresses","lessonprogresses","reviewcards",
  "questionrevisions","quizresults","questions","assessmentresults","liveexamsessions","assessmentmirroraudits",
  "assessmentattempts","assessmentresponses","quizzes","assessmentassignments","publicbarcodetests","assessmentversions",
  "questionattempts","publicbarcodesubmissions","publicbarcodesubmissionguards",
  "classroomtemplates","schoolskillaggregates","schoolinterventions","groups","classroomresponses","schoolmemberships",
  "classroomparticipants","classroomsessions","schoolcontracts","schoolskillevidences","teachingassignments",
  "discountcodes","accesscodes","accessgrants","paymentsettings","paymentgatewayeventguards","b2bpackages","paymentrequests","certificates",
  "notificationdeliveries","notificationtemplates","announcementads",
  "aiusagedailies","aiquestionassistcaches","aiinteractions",
  "platformintegrationsettings","homepagesettings","platformintegrationhistories","platformfontsettings",
  "backupactivities","backupsnapshots","adminauditlogs","clientevents","migrationbackups",
  "discussionthreads","discussionreplies",
];

assert(expectedCollections.length === 69, "DB-1 expected collection inventory changed");
for (const name of expectedCollections) {
  assert(ownership.includes(`${name}:`), `DB-1 ownership missing: ${name}`);
}

for (const marker of [
  "DB_COLLECTION_OWNERS",
  "DB_GROWTH_RISKS",
  "DB_HEAVY_JOURNEYS",
  "classroomsessions",
  "backupsnapshots",
  "announcementads",
  "courses",
  "quizresults",
  "questionattempts",
  "clientevents",
  "notificationdeliveries",
  "aiinteractions",
  "lessonprogresses",
  "users",
  "groups",
]) {
  assert(ownership.includes(marker), `DB-1 growth/ownership marker missing: ${marker}`);
}

for (const marker of [
  "listCollections",
  "$collStats",
  "$bsonSize",
  "unmappedCollections",
  "indexToDataRatio",
  "destructiveOperationsExecuted: 0",
  "allowDiskUse: false",
]) {
  assert(baseline.includes(marker), `DB-1 reproducible baseline capability missing: ${marker}`);
}

for (const forbidden of [
  ".insertOne(",
  ".insertMany(",
  ".updateOne(",
  ".updateMany(",
  ".deleteOne(",
  ".deleteMany(",
  ".bulkWrite(",
  ".drop(",
  ".dropIndex(",
  ".createIndex(",
]) {
  assert(!baseline.includes(forbidden), `DB-1 inventory script must stay read-only: ${forbidden}`);
}

for (const heading of [
  "## Live production baseline",
  "## Complete ownership map",
  "## Growth-risk register",
  "## Heavy read/write journey map",
  "## Exit Gate",
]) {
  assert(evidence.includes(heading), `DB-1 evidence section missing: ${heading}`);
}

assert(evidence.includes("69 collections"), "DB-1 evidence must record live collection count");
assert(evidence.includes("513 indexes"), "DB-1 evidence must record live index count");
assert(evidence.includes("zero destructive"), "DB-1 evidence must explicitly record destructive-write safety");

console.log("PASS DB-1 inventory / ownership / growth baseline contract");
