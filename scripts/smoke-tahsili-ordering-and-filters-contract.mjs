import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const assert = (condition, message) => {
  if (!condition) throw new Error(`[CONTRACT ASSERTION FAILED] ${message}`);
};

// 1. Audit Report Exists & Verified
const auditPath = path.join(root, 'ops', 'platform_ordering', 'PLATFORM_ORDERING_AND_ACCESS_AUDIT.json');
assert(fs.existsSync(auditPath), `Audit report must exist at ${auditPath}`);
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

assert(audit.status === 'PLATFORM_ORDERING_AND_ACCESS_VERIFIED_PASS', 'Status must be PLATFORM_ORDERING_AND_ACCESS_VERIFIED_PASS');
assert(audit.rulesVerified.qudratMockExamsDeleted.actual === 0, 'Remaining Qudurat mock exams must be 0');
assert(audit.rulesVerified.qudratMockExamsDeleted.deletedCount === 40, 'Deleted Qudurat mock exams must be 40');

// Tahsili Math
const math = audit.rulesVerified.first5FreeStrictRule.tahsiliMath;
assert(math.mainTopics.free === 5 && math.mainTopics.total === 30, 'Math main topics must have 5 free / 30');
assert(math.subtopics.mismatches === 0, 'Math subtopics must have 0 parent mismatches');
assert(math.trainingQuizzes.free === 5 && math.trainingQuizzes.total === 61, 'Math training drills must have 5 free / 61');
assert(math.trainingQuizzes.sequentialOrderMismatches === 0, 'Math training drills order must match Yello book sequentially');
assert(math.standardTests.free === 5 && math.standardTests.total === 57, 'Math standard tests must have 5 free / 57');

// Tahsili Physics
const phys = audit.rulesVerified.first5FreeStrictRule.tahsiliPhysics;
assert(phys.mainTopics.free === 5 && phys.mainTopics.total === 25, 'Physics main topics must have 5 free / 25');
assert(phys.subtopics.mismatches === 0, 'Physics subtopics must have 0 parent mismatches');
assert(phys.trainingQuizzes.free === 5 && phys.trainingQuizzes.total === 57, 'Physics training drills must have 5 free / 57');
assert(phys.trainingQuizzes.sequentialOrderMismatches === 0, 'Physics training drills order must match Yello book sequentially');
assert(phys.standardTests.free === 5 && phys.standardTests.total === 43, 'Physics standard tests must have 5 free / 43');

// Tahsili Chemistry
const chem = audit.rulesVerified.first5FreeStrictRule.tahsiliChemistry;
assert(chem.mainTopics.free === 5 && chem.mainTopics.total === 27, 'Chemistry main topics must have 5 free / 27');
assert(chem.subtopics.mismatches === 0, 'Chemistry subtopics must have 0 parent mismatches');
assert(chem.trainingQuizzes.free === 5 && chem.trainingQuizzes.total === 40, 'Chemistry training drills must have 5 free / 40');
assert(chem.trainingQuizzes.sequentialOrderMismatches === 0, 'Chemistry training drills order must match Yello book sequentially');
assert(chem.standardTests.free === 5 && chem.standardTests.total === 35, 'Chemistry standard tests must have 5 free / 35');

// Tahsili Biology
const bio = audit.rulesVerified.first5FreeStrictRule.tahsiliBiology;
assert(bio.mainTopics.free === 5 && bio.mainTopics.total === 29, 'Biology main topics must have 5 free / 29');
assert(bio.subtopics.mismatches === 0, 'Biology subtopics must have 0 parent mismatches');
assert(bio.trainingQuizzes.free === 5 && bio.trainingQuizzes.total === 49, 'Biology training drills must have 5 free / 49');
assert(bio.trainingQuizzes.sequentialOrderMismatches === 0, 'Biology training drills order must match Yello book sequentially');
assert(bio.standardTests.free === 5 && bio.standardTests.total === 71, 'Biology standard tests must have 5 free / 71');

// Qudurat Quant & Verbal
const quant = audit.rulesVerified.first5FreeStrictRule.qudratQuant;
assert(quant.mainTopics.free === 5 && quant.trainingQuizzes.free === 5, 'Qudurat Quant must have 5 free topics and 5 free drills');
const verbal = audit.rulesVerified.first5FreeStrictRule.qudratVerbal;
assert(verbal.mainTopics.free === 5 && verbal.trainingQuizzes.free === 5, 'Qudurat Verbal must have 5 free topics and 5 free drills');

// 2. Component Contract Assertions
const simulatedTestCode = fs.readFileSync(path.join(root, 'components', 'SimulatedTestExperience.tsx'), 'utf8');
assert(simulatedTestCode.includes("filterMode, setFilterMode"), 'SimulatedTestExperience must have filterMode state');
assert(simulatedTestCode.includes("sortedTests"), 'SimulatedTestExperience must sort tests');
assert(simulatedTestCode.includes("displayedTests"), 'SimulatedTestExperience must render displayedTests');
assert(simulatedTestCode.includes("المجاني"), 'SimulatedTestExperience must show المجاني filter button');
assert(simulatedTestCode.includes("المدفوع / باقة"), 'SimulatedTestExperience must show المدفوع / باقة filter button');

const learningSectionCode = fs.readFileSync(path.join(root, 'components', 'LearningSection.tsx'), 'utf8');
assert(learningSectionCode.includes("foundationFilter, setFoundationFilter"), 'LearningSection must have foundationFilter state');
assert(learningSectionCode.includes("mappedSkills.sort"), 'LearningSection must sort mappedSkills free first');
assert(learningSectionCode.includes("المجاني"), 'LearningSection must show المجاني filter button');
assert(learningSectionCode.includes("ضمن باقة"), 'LearningSection must show ضمن باقة filter button');

console.log('✅ smoke-tahsili-ordering-and-filters-contract passed flawlessly.');
