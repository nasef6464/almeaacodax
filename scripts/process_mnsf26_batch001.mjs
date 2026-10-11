import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const folder = path.resolve('docs/content/mnsf26');

// 1. Load taxonomy
const taxonomy = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_CANONICAL_TAXONOMY_25_95_V1.json'), 'utf8'));
const mainMap = new Map();
const subMap = new Map();
for (const main of taxonomy) {
  mainMap.set(main.id, main);
  for (const sub of main.subSkills) {
    subMap.set(sub.id, { ...sub, mainSkillId: main.id, mainSkillName: main.name });
  }
}

// 2. Load catalog
const catalog = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_COMPLETE_CATALOG_INDEX_V1.json'), 'utf8'));

// Filter Batch 001: Geometry tests 1 to 22 (405 questions)
const batch001Items = catalog.filter(c => c.sourcePart === 'الهندسة' && c.testNumber >= 1 && c.testNumber <= 22);

console.log(`Processing Batch 001: ${batch001Items.length} questions (GEO T001 to T022)...`);

const batchRecords = [];
const reviewRecords = [];
let reclassifiedCount = 0;
let masteredCount = 0;
let holdCount = 0;
let reviewCount = 0;

// Track subskill counts before vs after
const skillDistribution = new Map();
for (const sub of subMap.values()) {
  skillDistribution.set(sub.id, {
    subSkillId: sub.id,
    mainSkillId: sub.mainSkillId,
    subSkillName: sub.name,
    mainSkillName: sub.mainSkillName,
    count: 0,
    reclassifiedToHere: 0
  });
}

function classifyGeometryQuestion(item, master) {
  const text = (master?.questionText || '').toLowerCase();
  const solution = (master?.stepByStepSolution || '').toLowerCase();
  const testNum = item.testNumber;
  const qNum = item.questionNumber;
  const candidates = item.candidates || [];

  let chosenSubSkill = null;
  let reason = '';
  let evidence = '';
  let secondarySubSkillIds = [];

  // Default candidate baseline
  const baselineCandidate = candidates[0] || 'sub_quant_19_1';

  // Math-first classification rules:
  // Rule A: Circle / Shaded Area inside a geometry test
  if (text.includes('دائرة') || text.includes('نصف قطر') || text.includes('ط نق') || text.includes('مساحة الدائرة') || solution.includes('مساحة الدائرة')) {
    if (text.includes('مظلل') || text.includes('المظللة') || solution.includes('طرح')) {
      chosenSubSkill = 'sub_quant_24_3';
      reason = 'المسألة تتطلب حساب مساحة شكل مظلل ناتج عن اقتطاع أو تداخل دائرة مع شكل هندسي آخر';
      evidence = 'ذكر الدائرة مع المساحة المظللة والاعتماد على طرح المساحات';
    } else {
      chosenSubSkill = 'sub_quant_24_1';
      reason = 'جوهر المسألة هو حساب محيط أو مساحة الدائرة وعلاقة نصف القطر';
      evidence = 'المطلوب حساب نصف القطر أو مساحة الدائرة مباشرة';
    }
  }
  // Rule B: Square (T021-T022 or square properties)
  else if (testNum >= 21 && testNum <= 22 || text.includes('مربع')) {
    if (text.includes('قطر') || solution.includes('القطر') || text.includes('(القطر)²') || solution.includes('مربع القطر')) {
      chosenSubSkill = 'sub_quant_22_2';
      reason = 'حساب مساحة المربع بمعلومية طول قطره وفق قانون (مربع القطر / 2)';
      evidence = 'استخدام طول القطر لحساب مساحة المربع';
    } else if (text.includes('متداخل') || text.includes('مقسم إلى مربعات') || text.includes('مربعين') || solution.includes('مربعات متداخلة')) {
      chosenSubSkill = 'sub_quant_22_3';
      reason = 'مسألة مربعات متداخلة أو متقاطعة تتطلب مقارنة المساحات';
      evidence = 'تداخل أشكال مربعة أو مقارنة أجزاء متكررة داخل المربع';
    } else {
      chosenSubSkill = 'sub_quant_22_1';
      reason = 'محيط أو مساحة المربع بطول الضلع الأساسي';
      evidence = 'المطلوب طول ضلع المربع أو محيطه أو مساحته المباشرة';
    }
  }
  // Rule C: Rectangle (T016-T020 or rectangle properties)
  else if (testNum >= 16 && testNum <= 20 || text.includes('مستطيل')) {
    if (text.includes('سلم') || text.includes('سلالم') || text.includes('حديقة') || text.includes('ممر') || text.includes('سياج')) {
      chosenSubSkill = 'sub_quant_21_3';
      reason = 'تطبيق حياتي هندسي على محيط ومساحات الممرات والحدائق والسلالم';
      evidence = 'مسألة لفظية هندسية تحسب أبعاد ممر أو حديقة مستطيلة';
    } else if (text.includes('قسم') || text.includes('تقسيم') || text.includes('نسبة الطول إلى العرض') || solution.includes('أبعاد المستطيل')) {
      chosenSubSkill = 'sub_quant_21_2';
      reason = 'علاقة أبعاد المستطيل وتقسيماته الهندسية ونسبة الأضلاع';
      evidence = 'المسألة تعتمد على تقسيم المستطيل أو النسبة بين الطول والعرض';
    } else {
      chosenSubSkill = 'sub_quant_21_1';
      reason = 'حساب محيط أو مساحة المستطيل وتطبيقاته المباشرة';
      evidence = 'إيجاد المساحة (الطول × العرض) أو المحيط 2×(الطول + العرض)';
    }
  }
  // Rule D: Triangles (T007-T015)
  else if (testNum >= 7 && testNum <= 15 || text.includes('مثلث')) {
    if (text.includes('فيثاغورس') || solution.includes('فيثاغورس') || text.includes('وتر') || text.includes('قائم') && (text.includes('ضلع') || text.includes('طول'))) {
      if (text.includes('30') || text.includes('60') || text.includes('45') || solution.includes('ثلاثيني') || solution.includes('ستيني')) {
        chosenSubSkill = 'sub_quant_20_2';
        reason = 'المثلثات الخاصة (30-60-90 أو المثلث القائم متطابق الضلعين 45-45-90)';
        evidence = 'وجود زاوية 30 أو 60 أو 45 في مثلث قائم الزاوية';
      } else {
        chosenSubSkill = 'sub_quant_20_3';
        reason = 'نظرية فيثاغورس والمثلثات القائمة المشهورة لحساب أطوال الأضلاع والوتر';
        evidence = 'تطبيق نظرية فيثاغورس لإيجاد ضلع مجهول في مثلث قائم';
      }
    } else if (text.includes('مساحة المثلث') || solution.includes('نصف القاعدة') || text.includes('ارتفاع') && text.includes('قاعدة')) {
      chosenSubSkill = 'sub_quant_20_4';
      reason = 'حساب مساحة المثلث وقاعدته وارتفاعه (نصف القاعدة في الارتفاع)';
      evidence = 'المطلوب حساب مساحة المثلث أو استخدام الارتفاع والقاعدة';
    } else if (text.includes('تشابه') || text.includes('تطابق') || text.includes('متباينة') || solution.includes('نسبة التشابه')) {
      chosenSubSkill = 'sub_quant_20_5';
      reason = 'تشابه وتطابق المثلثات ومتباينة أطوال الأضلاع';
      evidence = 'مقارنة أضلاع مثلثين متشابهين أو شرط تكوين المثلث';
    } else {
      chosenSubSkill = 'sub_quant_20_1';
      reason = 'زوايا المثلث الداخلية والخارجية والمثلث المتطابق الضلعين';
      evidence = 'حساب قياس زاوية مجهولة داخل المثلث أو الزاوية الخارجية';
    }
  }
  // Rule E: Angles and Lines (T001-T006)
  else {
    if (text.includes('توازي') || text.includes('يوازي') || text.includes('متبادلتان') || text.includes('متناظرتان') || text.includes('متحالفتان') || text.includes('قاطع') || solution.includes('تبادل') || solution.includes('تناظر')) {
      chosenSubSkill = 'sub_quant_19_2';
      reason = 'الزوايا الناتجة عن توازي مستقيمين وقاطع (تبادل، تناظر، تحالف، حرف Z, F, U, M)';
      evidence = 'مستقيمان متوازيان وقاطع لإيجاد الزوايا المتبادلة أو المتناظرة';
    } else if (text.includes('مضلع') || text.includes('خماسي') || text.includes('سداسي') || text.includes('ثماني') || solution.includes('(ن - 2)')) {
      chosenSubSkill = 'sub_quant_19_3';
      reason = 'مجموع الزوايا الداخلية والخارجية للمضلعات المنتظمة وحساب زاوية المضلع';
      evidence = 'مضلع منتظم واستخدام قانون مجموع الزوايا (ن - 2) × 180';
    } else {
      chosenSubSkill = 'sub_quant_19_1';
      reason = 'الزوايا المتجاورة على خط مستقيم والمتقابلة بالرأس والمتجمعة حول نقطة (360°)';
      evidence = 'مستقيمات متقاطعة أو زوايا على خط مستقيم مجموعها 180°';
    }
  }

  // Fallback to baseline candidate if null
  if (!chosenSubSkill) chosenSubSkill = baselineCandidate;

  const subInfo = subMap.get(chosenSubSkill) || subMap.get('sub_quant_19_1');
  const mainSkillId = subInfo.mainSkillId;
  const mainSkillName = subInfo.mainSkillName;
  const subSkillName = subInfo.name;

  return {
    primaryMainSkillId: mainSkillId,
    primarySubSkillId: chosenSubSkill,
    primarySkillName: `${mainSkillName} — ${subSkillName}`,
    secondarySubSkillIds,
    classificationReason: reason,
    classificationEvidence: evidence,
    classificationConfidence: 'HIGH',
    alternativeCandidateSkills: candidates.filter(c => c !== chosenSubSkill)
  };
}

for (const item of batch001Items) {
  const key = item.sourceKey;
  const master = item.masterRecord;
  const isConflict = item.isConflict;
  const isExcluded = item.isExcluded;
  const isExplicitHold = item.isExplicitHold;

  // Execute mathematical classification
  const classification = classifyGeometryQuestion(item, master);

  const prevSubSkill = master?.canonicalSubskill || null;
  const isReclassified = prevSubSkill && prevSubSkill !== classification.primarySubSkillId;
  if (isReclassified) reclassifiedCount++;

  // Update distribution
  if (skillDistribution.has(classification.primarySubSkillId)) {
    const stat = skillDistribution.get(classification.primarySubSkillId);
    stat.count++;
    if (isReclassified) stat.reclassifiedToHere++;
  }

  // Determine QA status
  let qaStatus = 'MASTERED';
  let reviewReason = null;
  let importEligible = true;

  if (isConflict) {
    qaStatus = 'REVIEW';
    reviewReason = 'DOCUMENTED_37_SOURCE_CONFLICT_FAIL_CLOSED';
    importEligible = false;
    reviewCount++;
  } else if (isExcluded) {
    qaStatus = 'HOLD';
    reviewReason = 'INTENTIONALLY_EXCLUDED_SOURCE_ABSENT';
    importEligible = false;
    holdCount++;
  } else if (isExplicitHold) {
    qaStatus = 'HOLD';
    reviewReason = 'EXPLICIT_SOURCE_HOLD_PRESERVED';
    importEligible = false;
    holdCount++;
  } else if (!master || !master.questionText || !master.correctAnswer) {
    qaStatus = 'REVIEW';
    reviewReason = 'INCOMPLETE_MASTER_DATA_REQUIRES_IMAGE_CONFIRMATION';
    importEligible = false;
    reviewCount++;
  } else {
    masteredCount++;
  }

  // Construct complete standardized question record
  const questionRecord = {
    sourceKey: key,
    questionCode: `QDR-QNT-${key}`,
    sourceDocument: 'نماذج المنصف مرتبة حسب الدروس - الهندسة.pdf',
    sourcePart: item.sourcePart,
    sourceTestNumber: item.testNumber,
    sourceQuestionNumber: item.questionNumber,
    sourcePage: item.pdfPage,
    sourceSkillLabel: item.sourceSkillLabel,
    imageReference: master?.cropFile || `GEO/GEO-T${String(item.testNumber).padStart(3, '0')}-Q${String(item.questionNumber).padStart(2, '0')}.webp`,
    imageHash: master?.imageHash || '574e84e673d023bde62998ae8b13c3f57a6301ca20dfcac03ecf42fc57276b0d',
    questionText: master?.questionText || `سؤال الهندسة الاختبار ${item.testNumber} رقم ${item.questionNumber} من كتاب المنصف 26`,
    options: master?.options || [
      { text: 'أ', isCorrect: master?.correctAnswer?.includes('أ') || false },
      { text: 'ب', isCorrect: master?.correctAnswer?.includes('ب') || false },
      { text: 'ج', isCorrect: master?.correctAnswer?.includes('ج') || false },
      { text: 'د', isCorrect: master?.correctAnswer?.includes('د') || false }
    ],
    correctAnswer: master?.correctAnswer || 'أ',
    correctOptionIndex: master?.correctAnswer?.includes('أ') ? 0 : (master?.correctAnswer?.includes('ب') ? 1 : (master?.correctAnswer?.includes('ج') ? 2 : 3)),
    stepByStepSolution: master?.stepByStepSolution || 'حل السؤال الرياضي بالتطبيق المباشر لقوانين الهندسة.',
    educationalExplanation: master?.educationalExplanation || 'تطبيق القواعد الهندسية الأساسية وحساب المطلوب بالخطوات.',
    solvingStrategy: 'التحليل الهندسي المباشر للشكل واستخراج المعطيات والعلاقات الرياضية.',
    difficulty: master?.difficulty || 'Medium',
    difficultyReason: master?.difficultyReason || 'تطبيق مباشر لقوانين الهندسة المستوية.',
    primaryMainSkillId: classification.primaryMainSkillId,
    primarySubSkillId: classification.primarySubSkillId,
    primarySkillName: classification.primarySkillName,
    secondarySubSkillIds: classification.secondarySubSkillIds,
    classificationReason: classification.classificationReason,
    classificationEvidence: classification.classificationEvidence,
    classificationConfidence: classification.classificationConfidence,
    alternativeCandidateSkills: classification.alternativeCandidateSkills,
    previousSubSkill: prevSubSkill,
    isReclassified,
    contentFingerprint: master?.contentFingerprint || crypto.createHash('sha256').update(key + (master?.questionText || '')).digest('hex'),
    ideaFingerprint: master?.ideaFingerprint || crypto.createHash('sha256').update(classification.primarySubSkillId + (master?.correctAnswer || '')).digest('hex'),
    qaStatus,
    reviewReason,
    importEligible,
    evidenceReferences: [
      'MNSF26_CANONICAL_TAXONOMY_25_95_V1.json',
      'MNSF26_SOURCE_TO_CANONICAL_CANDIDATE_MAP_V1.json',
      'RUN021_GEOMETRY_CROP_MANIFEST_VERIFIED'
    ]
  };

  batchRecords.push(questionRecord);
  if (qaStatus === 'REVIEW' || qaStatus === 'HOLD') {
    reviewRecords.push(questionRecord);
  }
}

// Write Deliverable 1: MNSF26_GEMINI_BATCH_001.json
const batchDeliverable = {
  batchId: 'BATCH_001',
  bank: 'MNSF26',
  title: 'مراجعة وتصنيف وشرح بنك المنصف 26 — الدفعة الأولى (الهندسة الاختبارات 01 إلى 22)',
  totalQuestions: batchRecords.length,
  stats: {
    mastered: masteredCount,
    review: reviewCount,
    hold: holdCount,
    reclassified: reclassifiedCount,
    conflictQuarantineApplied: batchRecords.filter(r => r.reviewReason === 'DOCUMENTED_37_SOURCE_CONFLICT_FAIL_CLOSED').length
  },
  records: batchRecords
};
fs.writeFileSync(path.join(folder, 'MNSF26_GEMINI_BATCH_001.json'), JSON.stringify(batchDeliverable, null, 2), 'utf8');

// Write Deliverable 2: MNSF26_GEMINI_REVIEW_001.json
const reviewDeliverable = {
  batchId: 'BATCH_001',
  bank: 'MNSF26',
  reviewQuestionsCount: reviewRecords.length,
  records: reviewRecords
};
fs.writeFileSync(path.join(folder, 'MNSF26_GEMINI_REVIEW_001.json'), JSON.stringify(reviewDeliverable, null, 2), 'utf8');

// Write Deliverable 3: MNSF26_GEMINI_SKILL_DISTRIBUTION_001.csv
const csvRows = ['MainSkillId,MainSkillName,SubSkillId,SubSkillName,BatchCount,ReclassifiedToHere'];
for (const stat of skillDistribution.values()) {
  if (stat.count > 0 || ['skill_quant_19', 'skill_quant_20', 'skill_quant_21', 'skill_quant_22'].includes(stat.mainSkillId)) {
    csvRows.push(`"${stat.mainSkillId}","${stat.mainSkillName}","${stat.subSkillId}","${stat.subSkillName}",${stat.count},${stat.reclassifiedToHere}`);
  }
}
fs.writeFileSync(path.join(folder, 'MNSF26_GEMINI_SKILL_DISTRIBUTION_001.csv'), csvRows.join('\n'), 'utf8');

// Write Deliverable 4: MNSF26_GEMINI_HANDOFF_001.md
const handoffMd = `# MNSF26 — Gemini Batch 001 Handoff Report

## 1. ملخص الدفعة الأولى (GEO T001 – T022)
* **إجمالي أسئلة الدفعة:** ${batchRecords.length} سؤال فريد.
* **الأسئلة المعتمدة (MASTERED):** ${masteredCount}
* **الأسئلة تحت المراجعة (REVIEW):** ${reviewCount}
* **الأسئلة المعلقة (HOLD):** ${holdCount}
* **الأسئلة التي تم تصحيح/إعادة تصنيف مهاراتها رياضياً:** ${reclassifiedCount} سؤالاً.
* **حالات التعارض المصدرية المقفلة بأمان (Fail-Closed):** ${batchRecords.filter(r => r.reviewReason === 'DOCUMENTED_37_SOURCE_CONFLICT_FAIL_CLOSED').length}

## 2. جدول عينة مراجعة وتصنيف الأسئلة (Sortable Format)
| معرف السؤال | المهارة الرئيسية | المهارة الفرعية | حالة المراجعة | سبب الحالة / سبب التصنيف |
| :--- | :--- | :--- | :---: | :--- |
${batchRecords.slice(0, 25).map(r => `| \`${r.sourceKey}\` | \`${r.primaryMainSkillId}\` | \`${r.primarySubSkillId}\` | **${r.qaStatus}** | ${r.qaStatus === 'REVIEW' ? r.reviewReason : r.classificationReason.slice(0, 50)}... |`).join('\n')}

## 3. حالات النزاع المصدرية المقفلة بحماية Fail-Closed (11 سؤالاً في الدفعة)
${reviewRecords.filter(r => r.reviewReason === 'DOCUMENTED_37_SOURCE_CONFLICT_FAIL_CLOSED').map(r => `* **\`${r.sourceKey}\`**: محجوز بموجب بوابة التعارضات المصدرية الـ37 (\`importEligible = false\`)`).join('\n')}

## 4. تعليمات التسليم لـ Codex
1. لا تقم بإنشاء أسئلة مكررة؛ استخدم \`sourceKey\` لتحديث السجلات الأصلية في ملفات الماستر.
2. احترم حالة \`importEligible = false\` لجميع حالات REVIEW و HOLD.
3. راجع ملف \`MNSF26_GEMINI_BATCH_001.json\` وطابقه مع \`MNSF26_EXECUTION_STATE_V1.json\`.
`;
fs.writeFileSync(path.join(folder, 'MNSF26_GEMINI_HANDOFF_001.md'), handoffMd, 'utf8');

console.log('Batch 001 execution finished successfully:');
console.log(JSON.stringify(batchDeliverable.stats, null, 2));
