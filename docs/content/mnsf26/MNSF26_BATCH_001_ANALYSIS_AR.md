# MNSF26 — Batch 001 Analysis — الحساب/الجبر — PDF page 1

Date: 2026-10-05  
Bank: `MNSF26` — تجميعات المنصف — القدرات الكمية  
Source part: الحساب / الجبر  
PDF page: 1  
Status: **ANALYZED — 12 ACCEPTABLE + 1 SOURCE-AMBIGUITY HOLD**

## Production explanation contract used in this batch

Each accepted question gets:

- exact canonical `skillId` / `subSkillId`
- correct answer
- concise visual explanation
- listening-friendly `voiceExplanation.text`
- question fingerprint: what mathematical pattern identifies this question
- explanation fingerprint: the reusable teaching move, not a copy of the source wording
- difficulty
- duplicate evidence / notes

The explanation style follows the approved foundation behavior:
1. فهم المطلوب أولاً.
2. اختيار القاعدة الأسرع.
3. تنفيذ الحساب في خطوات قصيرة.
4. تنبيه إلى الخطأ الشائع.
5. إنهاء واضح بالإجابة.

---

## Q001 — عدد ضغطات الأزرار من 5 إلى 200

**Stem:** شخص يكتب على الكمبيوتر الأعداد من 5 إلى 200. كم مرة يضغط على أزرار الكمبيوتر؟  
**Options:** أ 480 — ب 488 — ج 490 — د 492  
**Correct:** **ب = 488**  
**Difficulty:** Medium  
**Canonical candidate:** `skill_quant_13 / sub_quant_13_4`  
**Taxonomy confidence:** Medium — canonical taxonomy has no dedicated “digit-count in written range” subskill; 13.4 is the closest approved sequential-count/position bucket and is already used for range-count style items.

**Solution:**
- من 5 إلى 9: خمسة أعداد × خانة واحدة = 5 ضغطات.
- من 10 إلى 99: 90 عددًا × خانتين = 180 ضغطة.
- من 100 إلى 199: 100 عدد × 3 خانات = 300 ضغطة.
- العدد 200: ثلاث ضغطات.
- المجموع = 5 + 180 + 300 + 3 = **488**.

**Voice explanation:**  
"لا نعد الأعداد نفسها، بل نعد الخانات التي سيضغطها الشخص. من خمسة إلى تسعة خمس خانات. ومن عشرة إلى تسعة وتسعين تسعون عددًا، وكل عدد خانتان، فيكون مئة وثمانين. ومن مئة إلى مئة وتسعة وتسعين مئة عدد، وكل عدد ثلاث خانات، فيكون ثلاثمئة. ثم العدد مئتان يحتاج ثلاث خانات. نجمع: خمسة زائد مئة وثمانون زائد ثلاثمئة زائد ثلاثة، فنحصل على أربعمئة وثمانية وثمانين. إذن الإجابة ب."

**Question fingerprint:** مدى عددي + كتابة جميع الأعداد + المطلوب عدد الخانات/الضغطات.  
**Explanation fingerprint:** قسّم المدى حسب عدد الخانات: آحاد → عشرات → مئات، ثم احسب (عدد الأعداد × عدد الخانات).  
**Common trap:** حساب عدد الأعداد بدل عدد الخانات.

---

## Q002 — تكرار الرقم 9 من 1 إلى 100

**Stem:** عند كتابة الأعداد من 1 إلى 100، كم مرة يتم كتابة الرقم 9؟  
**Options:** أ 9 — ب 10 — ج 20 — د 11  
**Correct:** **ج = 20**  
**Difficulty:** Medium  
**Canonical candidate:** `skill_quant_13 / sub_quant_13_4`  
**Taxonomy confidence:** Medium.

**Solution:**  
الرقم 9 يظهر في خانة الآحاد عشر مرات: 9، 19، ...، 99.  
ويظهر في خانة العشرات عشر مرات: 90 إلى 99.  
العدد 99 يحسب مرتين لأنه يحتوي رقمين 9.  
إجمالي مرات الظهور = 10 + 10 = **20**.

**Voice explanation:**  
"نحسب ظهور الرقم تسعة حسب الخانة. في الآحاد يظهر عشر مرات، مرة كل عشرة أعداد. وفي العشرات يظهر عشر مرات من تسعين إلى تسعة وتسعين. والعدد تسعة وتسعون طبيعي أن يحسب مرتين لأن فيه رقمين تسعة. إذن المجموع عشرون مرة، والإجابة ج."

**Question fingerprint:** تكرار رقم محدد داخل مدى عددي.  
**Explanation fingerprint:** عد الظهور مستقلًا في كل خانة، ولا تحذف التداخل مثل 99.  
**Common trap:** عد الأعداد التي تحتوي 9 بدل عد مرات ظهور الرقم.

---

## Q003 — ثلاثة أعداد فردية متتالية وأحدها أولي

**Stem (visual read):** إذا كان 14 < س < ص < ع < 26، و س وص وع أعداد فردية متتالية، وأحدهم أولي، أوجد ص + ع.  
**Options:** أ 36 — ب 40 — ج 44 — د 48  
**Correct:** **د = 48**, interpreting “أحدهم أولي” as exactly one of the three is prime.  
**Difficulty:** Medium  
**Canonical:** `skill_quant_02 / sub_quant_02_3`

**Solution:**  
الثلاثيات الفردية المتتالية الممكنة داخل المجال:
- 15،17،19 → فيها عددان أوليان.
- 17،19،21 → فيها عددان أوليان.
- 19،21،23 → فيها عددان أوليان.
- 21،23،25 → فيها عدد أولي واحد فقط، وهو 23.
إذًا ص = 23، ع = 25، والمجموع **48**.

**Voice explanation:**  
"المفتاح هنا كلمة أعداد فردية متتالية، ومعها شرط أن واحدًا منها فقط أولي. نجرب الثلاثيات الفردية داخل المجال. أول ثلاث ثلاثيات فيها عددان أوليان، فلا تحقق الشرط. الثلاثية واحد وعشرون، ثلاثة وعشرون، خمسة وعشرون فيها عدد أولي واحد فقط وهو ثلاثة وعشرون. إذن ص زائد ع يساوي ثلاثة وعشرين زائد خمسة وعشرين، أي ثمانية وأربعين."

**Question fingerprint:** أعداد فردية متتالية + قيد العدد الأولي + اختيار ثلاثية من مجال.  
**Explanation fingerprint:** كوّن المرشحين من القيد الأقوى، ثم استبعد كل ثلاثية لا تحقق عدد الأعداد الأولية المطلوب.  
**Note:** requires source wording QA before import because “أحدهم أولي” may linguistically mean “one of them is prime” rather than “exactly one”.

---

## Q004 — ترتيب خالد وفهد في طابور 251

**Stem:** طابور به 251 شخص، ترتيب خالد من الخلف 25، وترتيب فهد من الأمام 125. كم شخص يقف بين خالد وفهد؟  
**Options:** أ 99 — ب 100 — ج 101 — د 102  
**Correct:** **ج = 101**  
**Difficulty:** Medium  
**Canonical:** `skill_quant_13 / sub_quant_13_4`

**Solution:**  
ترتيب خالد من الأمام = 251 - 25 + 1 = 227.  
عدد الواقفين بين خالد وفهد = 227 - 125 - 1 = **101**.

**Voice explanation:**  
"حوّل ترتيب خالد إلى نفس جهة فهد أولًا. خالد الخامس والعشرون من الخلف في طابور عدده مئتان وواحد وخمسون، إذن ترتيبه من الأمام مئتان وسبعة وعشرون. الآن بين الموقع مئة وخمسة وعشرين والموقع مئتين وسبعة وعشرين نحذف الشخصين نفسيهما، فنحسب مئتين وسبعة وعشرين ناقص مئة وخمسة وعشرين ناقص واحد، فيكون مئة وواحد."

**Question fingerprint:** ترتيب من الأمام + ترتيب من الخلف + مطلوب عدد الواقعين بين شخصين.  
**Explanation fingerprint:** وحّد جهة الترتيب ثم استخدم الفرق ناقص واحد.

---

## Q005 — عدد الأعداد الزوجية من 6 إلى 69

**Correct:** **د = 32**  
**Difficulty:** Easy  
**Canonical:** `skill_quant_13 / sub_quant_13_4` (consistent with current production classification of interval-count items).

**Solution:** أول زوجي 6 وآخر زوجي 68. العدد = (68 - 6) ÷ 2 + 1 = **32**.  
**Question fingerprint:** عد عناصر متتابعة بفارق ثابت داخل مجال.  
**Explanation fingerprint:** حدّد أول وآخر عنصر صالح، ثم (الأخير - الأول) ÷ الفرق + 1.

---

## Q006 — طابور 30 طالبًا: أمام أحمد وخلف خالد

**Stem:** طابور فيه 30 طالبًا، وأمام أحمد 10 طلاب، وخلف خالد 10 طلاب. ما عدد الطلاب الواقفين بين أحمد وخالد؟  
**Options:** أ 12 — ب 10 — ج 8 — د 6  
**Correct:** **ج = 8**  
**Difficulty:** Easy  
**Canonical:** `skill_quant_13 / sub_quant_13_4`

أحمد ترتيبه 11 من الأمام. خالد ترتيبه 20 من الأمام. بينهما = 20 - 11 - 1 = **8**.

---

## Q007 — طابور 30 طالبًا: خلف أحمد وأمام خالد

**Stem:** طابور فيه 30 طالبًا، خلف أحمد 19 طالبًا وأمام خالد 19 طالبًا. كم عدد الطلاب الواقفين بين أحمد وخالد؟  
**Options:** أ 8 — ب 9 — ج 10 — د 11  
**Correct:** **أ = 8**  
**Difficulty:** Easy  
**Canonical:** `skill_quant_13 / sub_quant_13_4`

أحمد ترتيبه من الأمام = 30 - 19 = 11. خالد أمامه 19 → ترتيبه 20. بينهما = **8**.

---

## Q008 — محمد وخالد في طابور 251

**Stem:** طابور به 251 شخص، ترتيب محمد من الخلف 126، وترتيب خالد من الأمام 25. كم شخص يقف بين محمد وخالد؟  
**Options:** أ 99 — ب 100 — ج 101 — د 102  
**Correct:** **ب = 100**  
**Difficulty:** Medium  
**Canonical:** `skill_quant_13 / sub_quant_13_4`

محمد من الأمام = 251 - 126 + 1 = 126.  
بين 25 و126 = 126 - 25 - 1 = **100**.

---

## Q009 — عشرة أشخاص وترتيبان من جهتين

**Stem:** 10 أشخاص في طابور. خالد ترتيبه الخامس من اليمين، وأحمد ترتيبه الثامن على اليسار. كم شخص يقف بين أحمد وخالد؟  
**Options:** أ 1 — ب 2 — ج 4 — د 8  
**Correct:** **أ = 1**  
**Difficulty:** Easy  
**Canonical:** `skill_quant_13 / sub_quant_13_4`

خالد الخامس من اليمين = السادس من اليسار. أحمد الثامن من اليسار. بينهما شخص واحد فقط.

---

## Q010 — عدد من خانتين وتقريبه إلى أقرب 10 يساوي 100

**Status:** **HOLD — source ambiguity / visual verification required**  
The printed answer relations do not produce a clean, internally consistent unique answer from the visually read stem.  
**Action:** Do not invent a correction and do not import until the original crop is re-read at full resolution and source intent is verified.

This is exactly the class of source defect that must be isolated rather than “fixed by guess”.

---

## Q011 — الرقم 7 في خانة الآحاد من 1 إلى 100

**Stem:** كم مرة يظهر الرقم 7 في خانة الآحاد في الأعداد من 1 إلى 100؟  
**Options:** أ 9 — ب 10 — ج 11 — د 12  
**Correct:** **ب = 10**  
**Difficulty:** Easy  
**Canonical candidate:** `skill_quant_01 / sub_quant_01_5`  
**Taxonomy confidence:** High relative to available taxonomy.

الأعداد: 7،17،27،37،47،57،67،77،87،97 → **10 مرات**.

**Question fingerprint:** خانة آحاد ثابتة داخل مدى 100.  
**Explanation fingerprint:** كل عشرة أعداد تتكرر خانة الآحاد مرة واحدة.

---

## Q012 — أعمدة إنارة: جزء كهربائي وجزء شمسي

**Stem:** طريق به 200 عمود إنارة مرقمين ومقسمين إلى جزئين. جزء كهربائي وجزء شمسي. إذا كانت الأعمدة بالطاقة الشمسية من 22 إلى 80، كم عدد الأعمدة التي تعمل بالطاقة الكهربائية؟  
**Options:** أ 140 — ب 141 — ج 142 — د 143  
**Correct:** **ب = 141**  
**Difficulty:** Medium  
**Canonical:** `skill_quant_13 / sub_quant_13_3`

عدد الأعمدة الشمسية = 80 - 22 + 1 = 59.  
الكهربائية = 200 - 59 = **141**.

**Question fingerprint:** مدى مرقم داخل إجمالي، ثم مطلوب متممة العدد.  
**Explanation fingerprint:** احسب المدى الشامل بإضافة 1، ثم اطرحه من الإجمالي.  
**Common trap:** نسيان +1 في العد الشامل.

---

## Q013 — مقارنة القيمة المنزلية للرقم 3

**Stem:** قارن بين القيمة المنزلية للرقم 3 في العدد 1538 والقيمة المنزلية للرقم 3 في العدد 39.  
**Correct:** **ج — القيمتان متساويتان**  
**Difficulty:** Easy  
**Canonical candidate:** `skill_quant_01 / sub_quant_01_5`  
**Taxonomy confidence:** Medium — taxonomy labels 1.5 around digit place/units; this item is broader place-value recognition.

في 1538 الرقم 3 في خانة العشرات → 30.  
وفي 39 الرقم 3 في خانة العشرات → 30.  
إذن القيمتان **متساويتان**.

**Question fingerprint:** نفس الرقم داخل عددين + مقارنة القيمة المنزلية.  
**Explanation fingerprint:** لا تقارن الرقم نفسه؛ حدّد خانته أولًا ثم حوّلها إلى قيمة.

---

## Duplicate gate — first pass

Exact phrase search against live Quant (FND26 + COL2627) did not return exact duplicates for the page-1 stems queried.

Strong **pattern-level overlap** exists with existing canonical families:
- queue/front/back position questions already exist in COL2627 under `sub_quant_13_4`.
- interval count of even/odd numbers also exists in COL2627 and FND26 under `sub_quant_13_4`.

Therefore:
- exact duplicates: **none confirmed in pass 1**
- semantic/pattern duplicates: **present**
- final duplicate decision: run normalized text + image/fingerprint comparison during import prep.

## Batch 001 summary

- Source questions visually reviewed: **13**
- Solved with unique usable answer: **12**
- Held for source ambiguity: **1 (Q010)**
- New skills created: **0**
- Canonical taxonomy changed: **0**
- Exact duplicate confirmed: **0**
- Explanation + voice background + question fingerprint + explanation fingerprint: **prepared for accepted items**
