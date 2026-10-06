# MNSF26 Batch 008 — Page 9 Question Analysis

Date: 2026-10-06
Source: `نماذج المنصف مرتبة حسب الدروس -الحساب - الجبر - معدل.pdf`
Source PDF page: 9
Bank: `MNSF26`
Canonical taxonomy: existing Quant 25/95 only.

## Verified source
Page 9 was rendered from the original PDF at high resolution and inspected visually. It contains printed questions 13–20, continuing test 5.

### Q13
- Source: يوجد في مسجد 5 أشخاص وبعد ربع ساعة دخل 5 أشخاص وبعد التكبير لإقامة الصلاة دخل إلى المسجد مثلي عدد الأشخاص الموجودين، كم عدد المصلين عند إقامة الصلاة؟
- Options: 5، 10، 15، 30.
- Solve: 5+5=10 موجودين؛ ثم دخل مثلي الموجودين = 20 إضافيين؛ الإجمالي 30.
- Correct answer: 30.
- Mapping: `skill_quant_01 / sub_quant_01_2`.
- Difficulty: Medium.
- Trap: اعتبار "مثلي" إجمالي العدد بدل عدد الداخلين الجدد.
- Teaching explanation: احسب الموجودين قبل التكبير أولاً، ثم ضاعف هذا العدد لمعرفة الداخلين الجدد، ثم اجمع.
- Speech: "قبل التكبير أصبح العدد عشرة. دخل بعد ذلك مثلي العشرة، أي عشرون شخصاً، فيصبح المجموع ثلاثين."
- Question fingerprint: staged-count / double-current-group / add-new-arrivals.
- Explanation fingerprint: establish intermediate total → multiply current count by 2 → add.
- Duplicate gate: no exact FND26/COL2627 match found.

### Q14
- Source: تقرأ أميرة كل يوم 10 صفحات من كتاب، كم صفحة تقرأ في أربعة أيام؟
- Options: 20، 40، 60، 80.
- Solve: 10×4=40.
- Correct: 40.
- Mapping: `skill_quant_01 / sub_quant_01_2`.
- Difficulty: Easy.
- Trap: جمع 10+4.
- Fingerprint: fixed-daily-rate / repeated-addition.
- Duplicate: no exact hit.

### Q15
- Source: 3 □ 4 □ 3 = 15؛ اختر العمليتين المناسبتين.
- Solve: 3×4+3=15.
- Correct operation sequence: × ثم + (الخيار أ في المصدر).
- Mapping: `skill_quant_01 / sub_quant_01_4` — ترتيب العمليات.
- Difficulty: Medium.
- Trap: تجاهل أولوية الضرب على الجمع.
- Fingerprint: fill-operators / target-value / operation-order.
- Explanation fingerprint: test operation pair → apply precedence → verify target.
- Duplicate: no exact hit.

### Q16
- Source: إذا كان سعر البطيخة 10 ريال ورجل لديه 100 ريال ويريد شراء أكبر عدد من البطيخ، كم بطيخة يستطيع الشراء؟
- Options: 7، 8، 9، 10.
- Solve: 100÷10=10.
- Correct: 10.
- Mapping: `skill_quant_10 / sub_quant_10_3` — المصاريف.
- Difficulty: Easy.
- Trap: طرح السعر مرة واحدة بدل حساب عدد الوحدات.
- Fingerprint: budget / unit-price / maximum-whole-units.
- Duplicate: no exact hit.

### Q17
- Source: طفل كل 3 شهور يزيد وزنه 2 كجم، ما الزيادة في وزنه خلال سنة؟
- Options: 6، 8، 12، 16.
- Solve: 12÷3=4 فترات؛ 4×2=8 كجم.
- Correct: 8.
- Mapping: `skill_quant_14 / sub_quant_14_4` — نمط متكرر دوري.
- Difficulty: Easy.
- Trap: ضرب 12×2 دون تحويل السنة إلى فترات 3 أشهر.
- Fingerprint: periodic-increase / convert-year-to-periods / repeated-gain.
- Duplicate: no exact hit.

### Q18
- Source: إذا كان أحمد يستغرق 2 دقيقة ذهاباً وإياباً إلى منزل صديقه، فإذا سار أحمد لمدة 10 دقائق، كم مرة ذهب لمنزل صديقه؟
- Options: 2، 3، 4، 5.
- Solve: يصل إلى منزل الصديق عند الدقيقة 1 أو 2 بحسب تفسير "ذهاباً وإياباً"؛ لكن المصدر يقصد زمن الذهاب والإياب معاً = دقيقتان، فتكون الزيارة إلى منزل الصديق مرة كل دقيقتين ابتداءً من إتمام الذهاب الأول. على تسلسل الرحلات الكاملة خلال 10 دقائق = 5 دورات، وكل دورة تشمل ذهاباً واحداً؛ النتيجة 5.
- Correct: 5 (وفق قراءة دورة الذهاب والإياب الكاملة في المصدر).
- Mapping: `skill_quant_14 / sub_quant_14_4`.
- Difficulty: Medium.
- QA note: wording allows a timing interpretation alternate if "2 دقيقة" were one-way; source explicitly says ذهاباً وإياباً, so adopt 5 full outbound visits over five 2-minute cycles.
- Fingerprint: repeated-cycle / round-trip-duration / count-visits.
- Duplicate: no exact hit.

### Q19
- Source: أوجد قيمة 6666 ÷ 22.
- Options: 33، 3.3، 333، 303.
- Solve: 22×303 = 6666.
- Correct: 303.
- Taxonomy: HOLD — no exact canonical subskill for plain integer long division; do not force a nearby skill.
- Difficulty: Easy/Medium.
- Trap: dropping a zero or reading 303 as 33.
- Fingerprint: integer-division / quotient-recognition.
- Duplicate: no exact hit.

### Q20
- Source: يصوم خالد 5 أيام في الشهرين، وأحمد يصوم 2 يوم كل شهر؛ قارن بين عدد أيام صيام خالد في السنة وعدد أيام صيام أحمد في السنة.
- Solve: خالد: 6 فترات من شهرين ×5 =30. أحمد: 12×2=24.
- Correct: القيمة الأولى أكبر.
- Mapping: `skill_quant_08 / sub_quant_08_2` — تناسب طردي بالمعدل الزمني.
- Difficulty: Medium.
- Trap: مقارنة 5 مع 2 مباشرة دون توحيد الفترة الزمنية.
- Fingerprint: rate-comparison / normalize-time-window / annualize-rates.
- Explanation: وحّد الفترة أولاً إلى سنة كاملة ثم قارن.
- Duplicate: no exact hit.

## QA totals
- Source cards visually verified: 8/8.
- Solved: 8/8.
- Answer locked: 8/8.
- Canonical mappings locked: 7.
- Taxonomy HOLD: 1 (Q19).
- New taxonomy entities: 0.
- Exact duplicate hits against FND26/COL2627: 0.
- High-resolution source render used: yes.

## Next checkpoint
Proceed to PDF page 10 / test 6, questions 1–12. Final production crop pass remains separate and must preserve original pixels, remove only printed question number inside the blue triangle, keep the approved blank blue triangle, restore dashed border, and remove excess whitespace.
