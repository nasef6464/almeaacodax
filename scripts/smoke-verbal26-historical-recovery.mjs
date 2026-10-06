import fs from "node:fs";
import path from "node:path";

const p = path.join(process.cwd(), "server", "data", "verbal26_historical_recovery_manifest.json");
const m = JSON.parse(fs.readFileSync(p, "utf8"));
const fail = (msg) => { throw new Error(msg); };

if (m?.historicalDeployment?.deployedQuestionCount !== 938) fail("historical deployed count must remain 938");
if (m?.historicalDeployment?.idRange?.[0] !== "q_verbal_0001") fail("historical ID start mismatch");
if (m?.historicalDeployment?.idRange?.[1] !== "q_verbal_0938") fail("historical ID end mismatch");
const mainTotal = Object.values(m?.legacyMainSkillQuestionCounts || {}).reduce((a,b)=>a+Number(b||0),0);
if (mainTotal !== 938) fail(`legacy skill counts sum to ${mainTotal}, expected 938`);
const domainTotal = Object.values(m?.recoveryCandidates?.domains || {}).reduce((a,v)=>a+Number(v?.count||0),0);
if (domainTotal !== 900) fail(`raw recovery candidate domains sum to ${domainTotal}, expected 900`);
if (m?.recoveryCandidates?.deltaVsHistorical !== 38) fail("historical/candidate delta must remain 38");
if (m?.recoveryCandidates?.authoritative !== false) fail("raw recovery candidates must remain non-authoritative");
if (m?.recoveryPolicy?.rawCandidatesMaySupplyAnswerKeys !== false) fail("raw candidates must never supply trusted answer keys");
if (m?.recoveryPolicy?.productionMigrationRequiresMigrationReadyTrue !== true) fail("migrationReady guard must remain required");

console.log(JSON.stringify({status:"PASS",historical:938,recoveryCandidates:900,delta:38,legacyMainTotal:mainTotal},null,2));
