# MNSF26 — Batch 003 — الحساب/الجبر — PDF page 4

Date: 2026-10-05
Bank: MNSF26 — تجميعات المنصف — القدرات الكمية
Source part: الحساب / الجبر
PDF page: 4
Source heading: الاختبار الثالث — العمليات على الأعداد
Status: ANALYZED — 13 accepted + 1 hold

## Q001 — عدد طلاب مدرسة
Stem: مدرسة بها 5 مسارات، وكل مسار 4 فصول، وكل فصل به 5 طلاب. كم إجمالي عدد الطلاب؟
Correct: د = 100.
Work: 5 × 4 × 5 = 100.
Difficulty: Easy
Canonical candidate: skill_quant_01 / sub_quant_01_2
Question fingerprint: طبقات متساوية متداخلة + ضرب متكرر.
Explanation fingerprint: حوّل كل طبقة إلى عامل ضرب، ثم اضرب من الداخل للخارج.
Voice: "في كل مسار أربعة فصول، وفي كل فصل خمسة طلاب، إذن في المسار عشرون طالبًا. ولدينا خمسة مسارات، فيكون الإجمالي مئة طالب."

## Q002 — عدد صفحات كتاب من عدد أرقام الترقيم
Stem: بدأت الطابعة ترقيم الكتاب من صفحة 1، واستخدمت 258 رقمًا في ترقيم الصفحات. كم عدد صفحات الكتاب؟
Correct: ب = 122.
Work: الصفحات 1–9 تستهلك 9 أرقام. الصفحات 10–99 تستهلك 90×2=180 رقمًا. المتبقي 258-189=69 رقمًا، أي 23 صفحة ثلاثية: 100–122.
Difficulty: Hard
Canonical: skill_quant_13 / sub_quant_13_4
Question fingerprint: عد خانات أرقام الصفحات عكسيًا للوصول إلى آخر صفحة.
Explanation fingerprint: قسّم الترقيم إلى خانات أحادية ثم ثنائية ثم ثلاثية، واطرح استهلاك كل نطاق.
Voice: "أول تسع صفحات تستهلك تسعة أرقام. من عشرة إلى تسعة وتسعين تسعون صفحة، أي مئة وثمانون رقمًا. صار المجموع مئة وتسعة وثمانين. يبقى تسعة وستون رقمًا، وكل صفحة بعد المئة تحتاج ثلاثة أرقام، أي ثلاثًا وعشرين صفحة. من مئة إلى مئة واثنتين وعشرين ثلاث وعشرون صفحة، إذن عدد صفحات الكتاب مئة واثنتان وعشرون."
Common trap: قسمة 258 على عدد ثابت من الخانات.

## Q003 — جمع عددين مكوّنين من أرقام مجهولة
Visual form: 7أ + ب5 = 158. المطلوب أ × ب.
Correct: ب = 24.
Work: الآحاد: أ + 5 = 8 ⇒ أ=3. العشرات: 7 + ب = 15 ⇒ ب=8 بعد حمل المئة. إذن أ×ب=24.
Difficulty: Medium
Canonical candidate: skill_quant_01 / sub_quant_01_5
Question fingerprint: جمع رأسي + أرقام مجهولة + حمل.
Explanation fingerprint: حل الأعمدة من الآحاد إلى العشرات مع مراعاة الحمل.
Voice: "نبدأ من الآحاد: أ زائد خمسة يساوي ثمانية، إذن أ يساوي ثلاثة. في العشرات سبعة زائد ب أعطت خمسة مع حمل واحد للمئات، لذلك سبعة زائد ب يساوي خمسة عشر، وب يساوي ثمانية. حاصل ثلاثة في ثمانية يساوي أربعة وعشرين."
Taxonomy note: closest canonical bucket is digit/place-value handling; keep under QA review if live policy prefers algebra.

## Q004 — ستة أعداد متتالية مجموعها 87
Correct: ج = 12.
Work: الستة أعداد هي 12،13،14،15،16،17 ومجموعها 87، والأصغر 12.
Difficulty: Medium
Canonical: skill_quant_01 / sub_quant_01_3
Question fingerprint: عدد زوجي من الأعداد المتتالية + مجموع معلوم.
Explanation fingerprint: متوسط الستة = 14.5، فالأعداد الثلاثة حول كل جانب تحدد السلسلة 12–17.

## Q005 — ستة أعمدة وصناديق تتناقص واحدًا
Stem: 6 أعمدة، وكل عمود به صندوق أقل من السابق، والعمود الرابع به 5 صناديق. ما مجموع الصناديق؟
Correct: ج = 33.
Work: الأعمدة: 8،7،6،5،4،3. المجموع = 33.
Difficulty: Medium
Canonical: skill_quant_01 / sub_quant_01_3
Question fingerprint: متتابعة حسابية تناقصية + حد داخلي معلوم + مجموع.
Explanation fingerprint: ابنِ المتتابعة يمينًا ويسارًا من الحد المعلوم ثم اجمع.

## Q006 — خمسة بيوت وخمسة أقفاص وخمسة عصافير وخمس حبات
Correct: ب = 625.
Work: 5×5×5×5 = 625.
Difficulty: Easy
Canonical candidate: skill_quant_18 / sub_quant_18_2
Question fingerprint: مبدأ عد متعدد المراحل بعدد ثابت في كل طبقة.
Explanation fingerprint: كل اختيار/وحدة يضاعف العدد بخمسة؛ اضرب عوامل الطبقات.
Voice: "لدينا خمسة بيوت، في كل بيت خمسة أقفاص، وفي كل قفص خمسة عصافير، وكل عصفور يأكل خمس حبات. إذن خمسة في خمسة في خمسة في خمسة، والناتج ستمئة وخمس وعشرون."

## Q007 — خمسة أعداد متتالية ومجموع أول عددين 27
Correct: ج = 16.
Work: إذا كان الأول ن، فالثاني ن+1، ومجموعهما 2ن+1=27 ⇒ ن=13. الأعداد 13،14،15،16،17، والرابع 16.
Difficulty: Medium
Canonical: skill_quant_01 / sub_quant_01_3
Question fingerprint: متتابعة متتالية + مجموع أول حدين + مطلوب حد لاحق.
Explanation fingerprint: استخرج الحد الأول من مجموع أول حدين ثم تحرك بعدد المواقع.

## Q008 — نمط القسمة مع الأصفار
Stem visual: إذا كان 6006 ÷ 6 = 1001، فما ناتج 6000006 ÷ 6؟
Correct: أ = 1000001.
Difficulty: Easy
Canonical candidate: skill_quant_01 / sub_quant_01_5
Question fingerprint: قسمة عدد ذي نمط أصفار مع ثبات المقسوم عليه.
Explanation fingerprint: لاحظ أن 6×1,000,001 = 6,000,006؛ تحقّق بالضرب بدل القسمة الطويلة.

## Q009 — كتب الطالب قبل الإعارة والاستعارة
Stem: طالب أعار أصدقاءه 6 كتب، واستعار 4 كتب، فأصبح معه 28 كتابًا. كم كان معه؟
Correct: ب = 30.
Work: س - 6 + 4 = 28 ⇒ س=30.
Difficulty: Easy
Canonical: skill_quant_07 / sub_quant_07_2
Question fingerprint: حالة ابتدائية مجهولة + نقص ثم زيادة + قيمة نهائية.
Explanation fingerprint: اعكس أثر العمليات أو كوّن معادلة خطية قصيرة.

## Q010 — العملية المناسبة: 8 □ 4 = 2
Correct: ب — القسمة.
Difficulty: Easy
Canonical: skill_quant_01 / sub_quant_01_4
Question fingerprint: اختيار العملية التي تحقق مساواة عددية.
Explanation fingerprint: اختبر العمليات الأساسية ذهنيًا، واختر التي تحقق الطرف الآخر.

## Q011 — العملية المناسبة: 6 □ 5 = 30
Correct: ج — الضرب.
Difficulty: Easy
Canonical: skill_quant_01 / sub_quant_01_4

## Q012 — ثلاثة أعداد متتالية موجبة حاصل ضربها يساوي حاصل جمعها
Correct: ج = 3.
Work: 1×2×3 = 6 و1+2+3 = 6، إذن العدد الأكبر 3.
Difficulty: Medium
Canonical candidate: skill_quant_11 / sub_quant_11_1
Question fingerprint: شرط ضرب = جمع لثلاثة أعداد متتالية صغيرة.
Explanation fingerprint: لأن الأعداد موجبة ومتتالية والخيارات صغيرة، جرّب البداية الدنيا 1،2،3؛ تتحقق فورًا.
Voice: "نجرب أصغر ثلاثة أعداد موجبة متتالية: واحد واثنان وثلاثة. حاصل ضربها ستة، ومجموعها أيضًا ستة. إذن الشرط تحقق، والعدد الأكبر هو ثلاثة."

## Q013 — مقارنة ما دفعه شخصان من مجموعة
Stem: ذهب 5 أشخاص لحفلة ومجموع ما دفعوه 1000 ريال. قارن بين 400 ريال وما دفعه شخصان.
Status: HOLD — المعطيات لا تحدد أي شخصين ولا توزيع المدفوعات، فلا توجد مقارنة وحيدة مضمونة.
Action: لا تعتمد إجابة بالتخمين. احتفظ بالصورة والمصدر للمراجعة.

## Q014 — 9 صناديق داخل كل صندوق 5 صناديق
Correct: ج = 54.
Work: الصناديق الداخلية = 9×5 =45، ومع الصناديق التسعة الأصلية يصبح الإجمالي 54.
Difficulty: Easy
Canonical candidate: skill_quant_18 / sub_quant_18_2
Question fingerprint: عد بنية ذات مستويين مع احتساب الحاويات الأصلية والمحتويات.
Explanation fingerprint: احسب المستوى الداخلي بالضرب ثم أضف المستوى الخارجي إذا كان السؤال يطلب جميع الصناديق.
Common trap: اختيار 45 ونسيان الصناديق التسعة الأصلية.

## Batch result
- Source boxes reviewed: 14
- Accepted with unique answer: 13
- Holds: 1 (Q013)
- New skills: 0
- Taxonomy mutations: 0
- Explanation/voice/fingerprint layer: prepared for accepted items
