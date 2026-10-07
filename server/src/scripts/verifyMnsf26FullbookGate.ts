import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "../docs/content/mnsf26");
const gate = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_FULLBOOK_MAPPING_GATE_RUN022_V1.json"), "utf8"));
const enrichment = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_CONTENT_ENRICHMENT_V1.json"), "utf8"));
const dedupe = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_CROSS_BANK_DEDUPE_V1.json"), "utf8"));

const expected = { arithmetic: 1204, geometry: 931, total: 2135 };
const ready = enrichment.records.filter((r: any) => r.status === "CONTENT_READY_CROP_PENDING");
const normalizedDifficulty = ready.filter((r: any) => ["Easy","Medium","Hard"].includes(r.difficulty));
const failures: Array<{gate:string;detail:unknown}> = [];
if (gate.counts?.arithmetic !== expected.arithmetic || gate.counts?.geometry !== expected.geometry || gate.counts?.total !== expected.total) failures.push({gate:"fullbook-crop-counts",detail:gate.counts});
if (ready.length !== expected.total) failures.push({gate:"fullbook-enrichment-coverage",detail:{expected:expected.total,actual:ready.length}});
if (normalizedDifficulty.length !== ready.length) failures.push({gate:"difficulty-normalization",detail:{ready:ready.length,normalized:normalizedDifficulty.length}});
if (dedupe.mnsfContentReadyRowsScanned !== expected.total) failures.push({gate:"fullbook-dedupe-coverage",detail:{expected:expected.total,actual:dedupe.mnsfContentReadyRowsScanned}});
if (gate.gates?.canonicalMapping !== "COMPLETE") failures.push({gate:"canonical-mapping",detail:gate.gates?.canonicalMapping});
if (gate.gates?.contentIdeaFingerprint !== "COMPLETE") failures.push({gate:"content-idea-fingerprint",detail:gate.gates?.contentIdeaFingerprint});
if (gate.gates?.crossBankDedupe !== "COMPLETE") failures.push({gate:"cross-bank-dedupe",detail:gate.gates?.crossBankDedupe});
const report={ok:failures.length===0,expected,observed:{ready:ready.length,normalizedDifficulty:normalizedDifficulty.length,dedupeRows:dedupe.mnsfContentReadyRowsScanned},failures};
console.log(JSON.stringify(report,null,2));
if(!report.ok) process.exitCode=1;
