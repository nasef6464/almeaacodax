# DB-1 — Inventory, Ownership & Growth Baseline

Date: 2026-09-28  
Plan: #300 — ALM-DB-001  
Baseline source SHA: `main@983b004d18818166bf97c9096411e2707551a0bd`  
Execution mode: **production Atlas read-only** + repository static audit.  
Question-bank content was not edited by this batch.

## Live production baseline

Atlas project/cluster:
- project: `almeaacodax`
- cluster: `almeaa`
- MongoDB: 8.0.32
- provider/region: AWS `AP_SOUTHEAST_1`
- tier: FREE

Database `almeaa` read-only snapshot:
- **69 collections**
- **5,219 documents**
- logical data: **14,215,258 bytes**
- storage: **13,561,856 bytes**
- **513 indexes**
- index bytes: **16,670,720 bytes**
- index/data logical-byte ratio: **1.173x**
- database average document: ~**2,724 bytes**

The index/data ratio is a baseline signal, not a deletion recommendation. DB-3 must correlate real query shapes and index usage before any index removal.

### Complete live collection inventory

| Collection | Docs | Avg B | Max B | Data B | Indexes | Index B |
|---|---:|---:|---:|---:|---:|---:|
| studyplans | 6 | 442 | 498 | 2,656 | 5 | 184,320 |
| platformintegrationsettings | 1 | 6,457 | 6,457 | 6,457 | 2 | 73,728 |
| homepagesettings | 1 | 4,270 | 4,270 | 4,270 | 2 | 73,728 |
| backupactivities | 5 | 564 | 684 | 2,821 | 7 | 258,048 |
| questionrevisions | 0 | 0 | 0 | 0 | 4 | 16,384 |
| masterygoals | 0 | 0 | 0 | 0 | 9 | 36,864 |
| subjects | 12 | 418 | 432 | 5,024 | 5 | 184,320 |
| classroomtemplates | 1 | 379 | 379 | 379 | 5 | 184,320 |
| platformintegrationhistories | 24 | 6,740 | 7,580 | 161,771 | 2 | 73,728 |
| lessons | 51 | 1,605 | 23,043 | 81,894 | 8 | 294,912 |
| discussionthreads | 0 | 0 | 0 | 0 | 8 | 32,768 |
| courses | 19 | 17,328 | 308,194 | 329,239 | 12 | 409,600 |
| backupsnapshots | 5 | 415,330 | 1,759,380 | 2,076,654 | 4 | 147,456 |
| topics | 210 | 494 | 731 | 103,782 | 12 | 454,656 |
| publicbarcodesubmissions | 1 | 1,401 | 1,401 | 1,401 | 10 | 368,640 |
| platformfontsettings | 1 | 585 | 585 | 585 | 2 | 73,728 |
| skillprogresses | 777 | 511 | 2,669 | 397,638 | 15 | 684,032 |
| schoolskillaggregates | 0 | 0 | 0 | 0 | 3 | 12,288 |
| schoolinterventions | 1 | 480 | 480 | 480 | 8 | 294,912 |
| groups | 24 | 363 | 612 | 8,730 | 5 | 184,320 |
| adminauditlogs | 593 | 492 | 689 | 291,988 | 12 | 540,672 |
| discountcodes | 0 | 0 | 0 | 0 | 8 | 32,768 |
| classroomresponses | 17 | 240 | 244 | 4,086 | 4 | 147,456 |
| accesscodes | 0 | 0 | 0 | 0 | 8 | 245,760 |
| reviewcards | 51 | 508 | 598 | 25,911 | 12 | 442,368 |
| accessgrants | 13 | 866 | 928 | 11,269 | 18 | 663,552 |
| certificates | 0 | 0 | 0 | 0 | 7 | 28,672 |
| phoneotps | 6 | 234 | 235 | 1,404 | 4 | 147,456 |
| quizresults | 6 | 11,253 | 26,012 | 67,518 | 13 | 479,232 |
| questions | 1,960 | 3,210 | 5,066 | 6,293,293 | 16 | 1,179,648 |
| notificationdeliveries | 83 | 748 | 880 | 62,116 | 12 | 442,368 |
| assessmentresults | 0 | 0 | 0 | 0 | 10 | 40,960 |
| parentstudentrelationships | 0 | 0 | 0 | 0 | 9 | 36,864 |
| sections | 100 | 183 | 281 | 18,345 | 3 | 110,592 |
| activities | 6 | 432 | 638 | 2,593 | 4 | 147,456 |
| liveexamsessions | 0 | 0 | 0 | 0 | 6 | 217,088 |
| paths | 3 | 269 | 314 | 809 | 4 | 147,456 |
| schoolmemberships | 11 | 201 | 205 | 2,216 | 5 | 192,512 |
| libraryitems | 19 | 689 | 754 | 13,101 | 10 | 335,872 |
| paymentsettings | 1 | 1,117 | 1,117 | 1,117 | 2 | 73,728 |
| paymentgatewayeventguards | 0 | 0 | 0 | 0 | 5 | 20,480 |
| assessmentmirroraudits | 0 | 0 | 0 | 0 | 6 | 24,576 |
| assessmentattempts | 8 | 297 | 302 | 2,378 | 9 | 299,008 |
| classroomparticipants | 17 | 173 | 225 | 2,955 | 4 | 147,456 |
| classroomsessions | 26 | 106,419 | 237,197 | 2,766,908 | 9 | 331,776 |
| levels | 2 | 123 | 124 | 246 | 3 | 110,592 |
| announcementads | 5 | 61,156 | 303,448 | 305,784 | 5 | 184,320 |
| assessmentresponses | 34 | 235 | 235 | 7,990 | 5 | 184,320 |
| users | 110 | 858 | 1,326 | 94,486 | 17 | 626,688 |
| quizzes | 2 | 1,962 | 2,181 | 3,925 | 17 | 626,688 |
| aiusagedailies | 44 | 305 | 313 | 13,438 | 4 | 147,456 |
| schoolcontracts | 4 | 289 | 441 | 1,156 | 3 | 110,592 |
| assessmentassignments | 3 | 305 | 327 | 917 | 8 | 294,912 |
| b2bpackages | 3 | 399 | 406 | 1,198 | 8 | 294,912 |
| aiquestionassistcaches | 0 | 0 | 0 | 0 | 4 | 131,072 |
| publicbarcodetests | 2 | 1,238 | 1,275 | 2,476 | 16 | 557,056 |
| assessmentversions | 7 | 2,337 | 2,477 | 16,359 | 5 | 184,320 |
| schoolskillevidences | 0 | 0 | 0 | 0 | 3 | 12,288 |
| skills | 183 | 928 | 4,395 | 169,932 | 7 | 258,048 |
| aiinteractions | 645 | 1,132 | 2,460 | 730,511 | 18 | 757,760 |
| lessonprogresses | 13 | 325 | 343 | 4,233 | 9 | 200,704 |
| questionattempts | 20 | 407 | 411 | 8,152 | 13 | 479,232 |
| paymentrequests | 17 | 1,085 | 1,398 | 18,458 | 12 | 385,024 |
| discussionreplies | 0 | 0 | 0 | 0 | 6 | 24,576 |
| clientevents | 52 | 1,548 | 2,332 | 80,519 | 8 | 294,912 |
| teachingassignments | 6 | 227 | 235 | 1,366 | 6 | 221,184 |
| notificationtemplates | 0 | 0 | 0 | 0 | 5 | 20,480 |
| publicbarcodesubmissionguards | 0 | 0 | 0 | 0 | 2 | 8,192 |
| migrationbackups | 8 | 290 | 456 | 2,324 | 1 | 36,864 |

## Complete ownership map

The executable source of truth is:
`server/src/modules/database/dbInventoryOwnership.ts`.

Ownership covers **all 69 live collections**; the DB-1 runtime audit fails if a new live collection is not mapped.

- **identity-access:** users, phoneotps, parentstudentrelationships
- **learning-catalog:** paths, levels, subjects, sections, skills, topics, lessons, courses, libraryitems, activities
- **learner-progress:** studyplans, masterygoals, skillprogresses, lessonprogresses, reviewcards
- **assessment:** questionrevisions, quizresults, questions, assessmentresults, liveexamsessions, assessmentmirroraudits, assessmentattempts, assessmentresponses, quizzes, assessmentassignments, publicbarcodetests, assessmentversions, questionattempts, publicbarcodesubmissions, publicbarcodesubmissionguards
- **school-classroom:** classroomtemplates, schoolskillaggregates, schoolinterventions, groups, classroomresponses, schoolmemberships, classroomparticipants, classroomsessions, schoolcontracts, schoolskillevidences, teachingassignments
- **commerce-entitlements:** discountcodes, accesscodes, accessgrants, paymentsettings, paymentgatewayeventguards, b2bpackages, paymentrequests, certificates
- **notifications:** notificationdeliveries, notificationtemplates, announcementads
- **ai:** aiusagedailies, aiquestionassistcaches, aiinteractions
- **platform-config:** platformintegrationsettings, homepagesettings, platformintegrationhistories, platformfontsettings
- **operations-audit:** backupactivities, backupsnapshots, adminauditlogs, clientevents, migrationbackups
- **discussion:** discussionthreads, discussionreplies

## Growth-risk register

The machine-readable registry is `DB_GROWTH_RISKS` in the ownership module.

### Critical

1. **classroomsessions**
   - current avg ~106 KB; max ~237 KB.
   - largest rows contain 5 question snapshots.
   - measured snapshot payload ~118 KB and reportSnapshot ~118 KB in the same document.
   - this is direct duplication inside a hot session document and is a DB-4 design target.

2. **backupsnapshots.payload**
   - avg ~415 KB; max ~1.76 MB.
   - this is not current hot learner traffic, but embedding a full backup payload in one MongoDB document has a clear future 16 MB ceiling.
   - keep historical safety; redesign only through an additive migration later.

### High

3. **courses.thumbnail / embedded course content**
   - max course document ~308 KB.
   - the largest course has a thumbnail string of **303,079 bytes**; almost the entire document is the thumbnail.
   - this must move to external media without changing visible behavior.

4. **announcementads.imageUrl**
   - max announcement ~303 KB.
   - the large `imageUrl` is **303,079 bytes and confirmed to be a `data:` URL**.
   - DB-4 must externalize this media safely.

5. **quizresults.questionReview / skillsAnalysis**
   - max current result ~26 KB with 19 questionReview entries.
   - PLAN 4 established QuestionRevision/attempt-facts direction; compatibility arrays remain and need measured cutover, not deletion.

6. **questionattempts**
   - currently only 20 rows, but structurally append-heavy per student/question attempt and expected to become a top-cardinality collection.

7. **clientevents**
   - append-only operational telemetry; no TTL in the current model.

8. **notificationdeliveries**
   - terminal sent/failed history has no explicit archive/retention contract.

### Medium

9. **aiinteractions**
   - TTL exists, but live collection has 18 indexes; DB-3 must compare query frequency against write amplification.

10. **lessonprogresses.answeredQuestionIds**
    - normalized progress is good; the embedded history still needs a hard maximum/semantic budget.

11. **users legacy mirrors**
    - `completedLessons`, `interactiveVideoProgress`, `favorites`, `reviewLater`, and relationship arrays remain for compatibility.
    - current documents are small, but DB-2 must prove canonical/legacy parity before cleanup.

12. **groups membership arrays**
    - `studentIds` / `supervisorIds` coexist with canonical SchoolMembership/TeachingAssignment.

13. **classroomparticipants submission-key arrays**
    - currently empty/small, but must remain bounded to session lifecycle.

14. **quizzes embedded assignment/question arrays**
    - questionIds, learning placements, group/user targeting and skill arrays need explicit assessment-size budgets.

## Index baseline observations

No index was changed in DB-1.

Signals for DB-3:
- database-wide: **513 indexes / 16.67 MB index storage** against **14.22 MB logical data**.
- high-count examples:
  - accessgrants: 18 indexes / 13 documents.
  - aiinteractions: 18 indexes / 645 documents.
  - users: 17 indexes / 110 documents.
  - quizzes: 17 indexes / 2 documents.
  - publicbarcodetests: 16 indexes / 2 documents.
  - questions: 16 indexes / 1,960 documents.
  - skillprogresses: 15 indexes / 777 documents.
- small current cardinality makes ratios look extreme; **no removal is allowed until DB-3 has query/explain/index-usage evidence**.

## Heavy read/write journey map

The executable journey-to-collection map is `DB_HEAVY_JOURNEYS`.

### Login / authority resolution
Reads/writes around:
`users → phoneotps → schoolmemberships → teachingassignments → accessgrants`.

### Student dashboard
Primary reads:
`users, paths, subjects, courses, skillprogresses, lessonprogresses, reviewcards, accessgrants`.

### Test submission
Critical write chain spans:
`quizzes/questions → assessmentattempts/responses/results and/or quizresults → questionattempts → skillprogresses → reviewcards`.

This path is the main DB-5 idempotency/race target.

### Review / remediation
Reads/writes:
`quizresults + questionrevisions + reviewcards + questionattempts + skillprogresses`.

### Reports
Reads:
`quizresults, questionattempts, skillprogresses, schoolskillaggregates, schoolskillevidences, groups, schoolmemberships`.

DB-4 must prevent full-history scans as cardinality grows.

### School / Smart Classroom
Reads/writes:
`groups, schoolmemberships, teachingassignments, classroomsessions, classroomparticipants, classroomresponses, b2bpackages, accessgrants`.

### Admin / operations
Reads/writes:
`users, adminauditlogs, clientevents, platformintegrationsettings, paymentrequests, notificationdeliveries`.

## Reproducible baseline

A read-only runtime auditor is included:

`server/src/scripts/db1InventoryBaseline.ts`

It:
- connects through the normal hardened DB configuration;
- calls `listCollections`;
- uses `$collStats` for counts/data/storage/index totals;
- uses `$bsonSize` only to measure the maximum document;
- checks every live collection has a domain owner;
- emits database totals, full collection inventory, top growth/index tables, risk register and heavy journeys;
- executes **zero destructive changes** and no database writes.

Example from a trusted environment with its own secret configuration:

`cd server && npx tsx src/scripts/db1InventoryBaseline.ts --out=../audit-artifacts/db1-baseline.json`

Never put `MONGODB_URI` in Git, chat, command history, or generated evidence.

## DB-1 decisions

- Do **not** delete or rebuild indexes yet.
- Do **not** remove legacy arrays yet.
- Do **not** migrate ClassroomSession/BackupSnapshot/Course/Announcement media in DB-1.
- DB-2 receives canonical-vs-legacy relationship parity and orphan checks.
- DB-3 receives index/query engineering from real query shapes.
- DB-4 receives document-growth redesign, data-URL removal and high-volume retention/rollup design.
- DB-5 receives transaction/idempotency/race safety.
- DB-6 receives scale certification.

## Exit Gate

**Data ownership map:** COMPLETE — 69/69 live collections assigned to explicit domains.  
**Growth-risk register:** COMPLETE — 14 concrete risks with next-batch ownership.  
**Live size/index baseline:** COMPLETE — counts, average/max document size, logical/storage/index bytes and index counts recorded read-only.  
**Heavy journey map:** COMPLETE.  
**Reproducibility:** COMPLETE — read-only executable auditor + static contract.  
**Safety:** COMPLETE — zero destructive changes and zero production database writes in DB-1.

DB-1 is eligible for closure only after its exact branch head passes CI with the DB-1 contract and the evidence is recorded in #300. The overall ALM-DB-001 plan remains open for DB-2 → DB-6.
