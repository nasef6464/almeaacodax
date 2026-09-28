import os
import json
import fitz
from PIL import Image, ImageDraw

def build_batch76():
    pdf_path = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تجميع انشيتن معدل.pdf"
    doc = fitz.open(pdf_path)
    page = doc[83] # Page 84 (0-indexed 83)

    badge_path = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
    badge_img = Image.open(badge_path).convert("RGBA")

    scale = 600 / 72.0
    mat = fitz.Matrix(scale, scale)

    out_img_dir = "public/questions/v2/qudrat/quant/COL2627/p084"
    os.makedirs(out_img_dir, exist_ok=True)

    questions_def = [
        # --- Right Column (Q1 to Q6) ---
        {
            "code": "QDR-QNT-COL2627-P084-Q01",
            "page": 84,
            "qNum": 1,
            "rect": fitz.Rect(303.0, 124.0, 565.0, 196.5),
            "badge_center": (549.5, 141.5),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 0,
            "text": "مكعب طول حرفه 2 ، حفر داخل المكعب مكعب آخر طول حرفه 1 ، فكم حجم الفراغ بينهما ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "7",
                "8",
                "9",
                "10"
            ],
            "voiceSpeech": "مرحباً يا بطل. حجم المكعب الخارجي يساوي طول الحرف تكعيب، أي اثنين تكعيب ويساوي ثمانية. وحجم المكعب المحفور داخله يساوي واحداً تكعيب ويساوي واحداً. لإيجاد حجم الفراغ المتبقي بين المكعبين، نطرح حجم المكعب الصغير من المكعب الكبير: ثمانية ناقص واحد ويساوي سبعة. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "مكعب طول حرفه 2 ، حفر داخل المكعب مكعب آخر طول حرفه 1 ، فكم حجم الفراغ بينهما ؟ الخيارات: أ: 7، ب: 8، ج: 9، د: 10.",
                "speechText": "مكعب طول حرفه اثنان حفر داخله مكعب طول حرفه واحد فكم حجم الفراغ بينهما؟",
                "visualDescription": "مكعب كبير طول حرفه 2 بداخله تجويف مكعب طول حرفه 1.",
                "optionTexts": [
                    "7",
                    "8",
                    "9",
                    "10"
                ],
                "mathExpressions": [
                    {
                        "latex": "V_{\\text{void}} = 2^3 - 1^3 = 8 - 1 = 7",
                        "spokenArabic": "حجم الفراغ يساوي اثنين تكعيب ناقص واحد تكعيب ويساوي ثمانية ناقص واحد أي سبعة"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q02",
            "page": 84,
            "qNum": 2,
            "rect": fitz.Rect(303.0, 224.5, 565.0, 298.5),
            "badge_center": (548.0, 238.5),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 2,
            "text": "أوجد حجم متوازي المستطيلات",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "15",
                "9",
                "45",
                "11"
            ],
            "voiceSpeech": "أهلاً بك. حجم متوازي المستطيلات يساوي حاصل ضرب أبعاده الثلاثة: الطول ضرب العرض ضرب الارتفاع. من الرسم الأبعاد هي خمسة وثلاثة وثلاثة. إذن الحجم يساوي خمسة ضرب ثلاثة ضرب ثلاثة، أي خمسة ضرب تسعة ويساوي خمسة وأربعين. فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "أوجد حجم متوازي المستطيلات. أبعاده في الشكل: 5 ، 3 ، 3. الخيارات: أ: 15، ب: 9، ج: 45، د: 11.",
                "speechText": "أوجد حجم متوازي المستطيلات الذي أبعاده خمسة وثلاثة وثلاثة.",
                "visualDescription": "رسم لمتوازي مستطيلات أبعاده 5 و 3 و 3 والمطلوب حجمه.",
                "optionTexts": [
                    "15",
                    "9",
                    "45",
                    "11"
                ],
                "mathExpressions": [
                    {
                        "latex": "V = l \\times w \\times h = 5 \\times 3 \\times 3 = 45",
                        "spokenArabic": "الحجم يساوي الطول في العرض في الارتفاع خمسة في ثلاثة في ثلاثة ويساوي خمسة وأربعين"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q03",
            "page": 84,
            "qNum": 3,
            "rect": fitz.Rect(303.0, 301.0, 565.0, 379.0),
            "badge_center": (547.0, 315.5),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 0,
            "text": "حفرة على شكل متوازي مستطيلات طولها 4 م وعرضها 2 م وارتفاعها 3 م ، إذا أردنا ملئها بالرمل فما حجم الرمل المستخدم ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "24 م³",
                "48 م³",
                "12 م³",
                "6 م³"
            ],
            "voiceSpeech": "مرحباً يا بطل. حجم الرمل المطلوب لملء الحفرة يساوي سعة الحفرة وحجمها. وحجم متوازي المستطيلات يساوي الطول ضرب العرض ضرب الارتفاع: أربعة ضرب اثنين ضرب ثلاثة ويساوي أربعة وعشرين متراً مكعباً. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "حفرة على شكل متوازي مستطيلات طولها 4 م وعرضها 2 م وارتفاعها 3 م ، إذا أردنا ملئها بالرمل فما حجم الرمل المستخدم ؟ الخيارات: أ: 24 م³، ب: 48 م³، ج: 12 م³، د: 6 م³.",
                "speechText": "حفرة على شكل متوازي مستطيلات أبعادها 4 و 2 و 3 م فما حجم الرمل اللازم لملئها؟",
                "visualDescription": "مسألة حساب حجم متوازي مستطيلات أبعاده 4 م، 2 م، 3 م.",
                "optionTexts": [
                    "24 م³",
                    "48 م³",
                    "12 م³",
                    "6 م³"
                ],
                "mathExpressions": [
                    {
                        "latex": "V = 4 \\times 2 \\times 3 = 24\\text{ m}^3",
                        "spokenArabic": "الحجم يساوي أربعة في اثنين في ثلاثة ويساوي أربعة وعشرين مترا مكعبا"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q04",
            "page": 84,
            "qNum": 4,
            "rect": fitz.Rect(303.0, 381.5, 565.0, 482.0),
            "badge_center": (545.5, 402.5),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 1,
            "text": "إناء على شكل متوازي مستطيلات طوله 60 سم وعرضه 50 سم وارتفاعه 12 سم ، قمنا بصب فيه 30000 سم³ زيت ، فما ارتفاع الزيت في الإناء ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "5 سم",
                "10 سم",
                "15 سم",
                "20 سم"
            ],
            "voiceSpeech": "أهلاً بك. مساحة قاعدة الإناء تساوي الطول ضرب العرض، أي ستين ضرب خمسين وتساوي ثلاثة آلاف سنتيمتر مربع. ولإيجاد ارتفاع الزيت، نقسم حجم الزيت المصبوب على مساحة القاعدة: ثلاثون ألفاً قسمة ثلاثة آلاف وتساوي عشرة سنتيمترات. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "إناء على شكل متوازي مستطيلات طوله 60 سم وعرضه 50 سم وارتفاعه 12 سم ، قمنا بصب فيه 30000 سم³ زيت ، فما ارتفاع الزيت في الإناء ؟ الخيارات: أ: 5 سم، ب: 10 سم، ج: 15 سم، د: 20 سم.",
                "speechText": "إناء متوازي مستطيلات قاعدته 60 في 50 سم صب فيه 30000 سم مكعب زيت فما ارتفاع الزيت؟",
                "visualDescription": "إناء متوازي مستطيلات صُب فيه حجم زيت والمطلوب ارتفاع السائل.",
                "optionTexts": [
                    "5 سم",
                    "10 سم",
                    "15 سم",
                    "20 سم"
                ],
                "mathExpressions": [
                    {
                        "latex": "h = \\frac{V}{A_{\\text{base}}} = \\frac{30000}{60 \\times 50} = \\frac{30000}{3000} = 10\\text{ cm}",
                        "spokenArabic": "ارتفاع الزيت يساوي الحجم على مساحة القاعدة ثلاثون ألفا على ثلاثة آلاف ويساوي عشرة سنتيمترات"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q05",
            "page": 84,
            "qNum": 5,
            "rect": fitz.Rect(303.0, 485.0, 565.0, 569.0),
            "badge_center": (546.0, 505.5),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 1,
            "text": "غرفة طولها 20 م وعرضها 10 م وارتفاعها 2 م ، أوجد المساحة الكلية للغرفة ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "500 م²",
                "520 م²",
                "540 م²",
                "580 م²"
            ],
            "voiceSpeech": "مرحباً يا بطل. المساحة الكلية لمتوازي المستطيلات تساوي اثنين مضروبة في مجموع حاصل ضرب كل بُعدين: اثنين في افتح قوس الطول في العرض زائد الطول في الارتفاع زائد العرض في الارتفاع. بالتعويض: عشرون ضرب عشرة يساوي مئتين، وعشرون ضرب اثنين يساوي أربعين، وعشرة ضرب اثنين يساوي عشرين. المجموع مئتان وستون، نضربه في اثنين فنحصل على خمسمئة وعشرين متراً مربعاً. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "غرفة طولها 20 م وعرضها 10 م وارتفاعها 2 م ، أوجد المساحة الكلية للغرفة ؟ الخيارات: أ: 500 م²، ب: 520 م²، ج: 540 م²، د: 580 م².",
                "speechText": "غرفة أبعادها 20 و 10 و 2 م فما مساحتها الكلية؟",
                "visualDescription": "حساب المساحة السطحية الكلية لغرفة على شكل متوازي مستطيلات بأبعاد 20 م، 10 م، 2 م.",
                "optionTexts": [
                    "500 م²",
                    "520 م²",
                    "540 م²",
                    "580 م²"
                ],
                "mathExpressions": [
                    {
                        "latex": "A_{\\text{total}} = 2(20 \\times 10 + 20 \\times 2 + 10 \\times 2) = 2(200 + 40 + 20) = 520\\text{ m}^2",
                        "spokenArabic": "المساحة الكلية تساوي اثنين في مئتين زائد أربعين زائد عشرين وتساوي خمسمئة وعشرين مترا مربعا"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q06",
            "page": 84,
            "qNum": 6,
            "rect": fitz.Rect(303.0, 571.5, 565.0, 655.5),
            "badge_center": (548.0, 592.0),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_1",
            "correctIndex": 0,
            "text": "متوازي مستطيلات أبعاده 4 ، 5 ، 8 ، نريد أن نضع به مكعبات متطابقة طول حرفها 2 ، فكم مكعب يمكن أن نضع ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "16",
                "18",
                "20",
                "24"
            ],
            "voiceSpeech": "أهلاً بك. عند رص المكعبات الصلبة داخل صندوق، نقسم كل بُعد على طول حرف المكعب ونأخذ العدد الصحيح فقط: على البُعد الأول أربعة قسمة اثنين تعطي مكعبين. وعلى البُعد الثاني خمسة قسمة اثنين تعطي مكعبين كاملين ويهمل الكسر. وعلى البُعد الثالث ثمانية قسمة اثنين تعطي أربعة مكعبات. عدد المكعبات التي يمكن وضعها يساوي حاصل ضرب هذه الأعداد: اثنين ضرب اثنين ضرب أربعة ويساوي ستة عشر مكعباً. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "متوازي مستطيلات أبعاده 4 ، 5 ، 8 ، نريد أن نضع به مكعبات متطابقة طول حرفها 2 ، فكم مكعب يمكن أن نضع ؟ الخيارات: أ: 16، ب: 18، ج: 20، د: 24.",
                "speechText": "متوازي مستطيلات أبعاده 4 و 5 و 8 كم مكعبا طول حرفه 2 يمكن وضعه داخله؟",
                "visualDescription": "مسألة تعبئة مكعبات صلبة طول حرفها 2 داخل صندوق متوازي مستطيلات أبعاده 4 و 5 و 8.",
                "optionTexts": [
                    "16",
                    "18",
                    "20",
                    "24"
                ],
                "mathExpressions": [
                    {
                        "latex": "N = \\lfloor 4/2 \\rfloor \\times \\lfloor 5/2 \\rfloor \\times \\lfloor 8/2 \\rfloor = 2 \\times 2 \\times 4 = 16",
                        "spokenArabic": "عدد المكعبات يساوي اثنين ضرب اثنين ضرب أربعة ويساوي ستة عشر مكعبا"
                    }
                ]
            }
        },

        # --- Left Column (Q7 to Q11) ---
        {
            "code": "QDR-QNT-COL2627-P084-Q07",
            "page": 84,
            "qNum": 7,
            "rect": fitz.Rect(35.0, 124.0, 298.0, 211.5),
            "badge_center": (286.66, 139.51),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_2",
            "correctIndex": 2,
            "text": "الشكل الذي أمامك أسطوانة ، ما شكل القاعدة ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "مثلث",
                "مربع",
                "دائرة",
                "مستطيل"
            ],
            "voiceSpeech": "مرحباً يا بطل. الأسطوانة مجسم هندسي يتميز بوجود قاعدتين متطابقتين ومتوازيتين، وشكل كل منهما دائرة. إذن شكل قاعدة الأسطوانة هو دائرة، فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "الشكل الذي أمامك أسطوانة ، ما شكل القاعدة ؟ الخيارات: أ: مثلث، ب: مربع، ج: دائرة، د: مستطيل.",
                "speechText": "الشكل أسطوانة ما شكل قاعدتها؟",
                "visualDescription": "رسم مجسم أسطوانة والمطلوب تحديد شكل قاعدتها.",
                "optionTexts": [
                    "مثلث",
                    "مربع",
                    "دائرة",
                    "مستطيل"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Base of a cylinder} = \\text{Circle}",
                        "spokenArabic": "قاعدة الأسطوانة هي دائرة"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q08",
            "page": 84,
            "qNum": 8,
            "rect": fitz.Rect(35.0, 214.0, 298.0, 345.0),
            "badge_center": (285.0, 231.7),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_2",
            "correctIndex": 3,
            "text": "إذا كان محيط الإناء الأول أكبر من محيط الإناء الثاني ، قارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "أهلاً بك. بما أن نوع وشكل كل إناء لم يتم تحديده في نص السؤال (فقد يكون أحدهما دائرياً والآخر مستطيلاً أو متعرجاً، والمساحة تعتمد بشدة على الشكل الهندسي وليس المحيط فقط)، فإنه لا يمكن الجزم بأيهما أكبر مساحة. وبالتالي فإن المعطيات غير كافية، والخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "إذا كان محيط الإناء الأول أكبر من محيط الإناء الثاني ، قارن بين: القيمة الأولى: مساحة الإناء الأول، القيمة الثانية: مساحة الإناء الثاني. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "محيط الإناء الأول أكبر من محيط الثاني قارن بين مساحة الإناء الأول ومساحة الثاني.",
                "visualDescription": "جدول مقارنة كمية بين مساحتي إنائين عند معرفة أن محيط الأول أكبر دون تحديد الشكل الهندسي.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "P_1 > P_2 \\not\\implies A_1 > A_2 \\quad (\\text{shapes unspecified})",
                        "spokenArabic": "كبر المحيط لا يستلزم كبر المساحة لاختلاف الأشكال المعطيات غير كافية"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q09",
            "page": 84,
            "qNum": 9,
            "rect": fitz.Rect(35.0, 347.5, 298.0, 482.0),
            "badge_center": (284.5, 363.0),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_2",
            "correctIndex": 0,
            "text": "أسطوانة مملوءة عصير إلى نهايتها كما بالرسم ، قارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "مرحباً يا بطل. من الرسم قطر قاعدة الأسطوانة عشرة سنتيمترات، فيكون نصف القطر خمسة، والارتفاع عشرة سنتيمترات. حجم العصير يساوي حجم الأسطوانة: ط نق تربيع في الارتفاع، أي ط ضرب خمسة وعشرين ضرب عشرة ويساوي مئتين وخمسين ط. وبما أن ط تساوي تقريباً ثلاثة فاصلة أربعة عشر، فإن الحجم يساوي مئتين وخمسين ضرب ثلاثة فاصلة أربعة عشر ويساوي سبعمئة وخمسة وثمانين سنتيمتراً مكعباً. وبمقارنة القيمة الأولى وهي سبعمئة وخمسة وثمانون مع القيمة الثانية وهي سبعمئة وخمسون، نجد أن القيمة الأولى أكبر. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "أسطوانة مملوءة عصير إلى نهايتها كما بالرسم ، قارن بين: القيمة الأولى: كمية العصير، القيمة الثانية: 750 سم³. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "أسطوانة قطرها 10 وارتفاعها 10 مملوءة عصير قارن بين كمية العصير و 750 سم مكعب.",
                "visualDescription": "أسطوانة قطر قاعدتها 10 سم وارتفاعها 10 سم مملوءة بالعصير ومقارنتها مع 750 سم³.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "V = \\pi r^2 h = 3.14 \\times 5^2 \\times 10 = 785\\text{ cm}^3 > 750\\text{ cm}^3",
                        "spokenArabic": "حجم العصير يساوي ط في خمسة وعشرين في عشرة ويساوي سبعمئة وخمسة وثمانين سنتيمترا مكعبا وهو أكبر من سبعمئة وخمسين فالقيمة الأولى أكبر"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q10",
            "page": 84,
            "qNum": 10,
            "rect": fitz.Rect(35.0, 484.5, 298.0, 612.0),
            "badge_center": (284.5, 499.8),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_2",
            "correctIndex": 3,
            "text": "قارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "أهلاً بك. حجم الأسطوانة يعتمد على نصف قطر القاعدة والارتفاع معاً وفق القانون ط نق تربيع عين. وفي هذه المسألة لم يُذكر نصف قطر أي من الأسطوانتين، وبالتالي لا يمكن المقارنة بالاعتماد على الارتفاع وحده. إذن المعطيات غير كافية، والخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "قارن بين: القيمة الأولى: حجم أسطوانة ارتفاعها 6، القيمة الثانية: حجم أسطوانة ارتفاعها 2. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "قارن بين حجم أسطوانة ارتفاعها 6 وحجم أسطوانة ارتفاعها 2 دون معرفة نصفي القطرين.",
                "visualDescription": "جدول مقارنة كمية بين حجمي أسطوانتين بمعرفة الارتفاع فقط دون أنصاف الأقطار.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "V = \\pi r^2 h \\quad (r \\text{ is unknown}) \\implies \\text{Insufficient Data}",
                        "spokenArabic": "الحجم يعتمد على نصف القطر وهو مجهول إذن المعطيات غير كافية"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P084-Q11",
            "page": 84,
            "qNum": 11,
            "rect": fitz.Rect(35.0, 615.0, 298.0, 710.5),
            "badge_center": (285.8, 637.3),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_25",
            "mainSkillId": "skill_quant_25",
            "subSkillId": "sub_quant_25_2",
            "correctIndex": 2,
            "text": "كم عدد رؤوس الهرم الرباعي ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "3",
                "4",
                "5",
                "6"
            ],
            "voiceSpeech": "مرحباً يا بطل. الهرم الرباعي قاعدته شكل رباعي له أربعة رؤوس، بالإضافة إلى رأس الهرم العلوي الذي تلتقي عنده الأوجه الجانبية. وبالتالي فإن عدد رؤوس الهرم الرباعي يساوي أربعة زائد واحد ويساوي خمسة رؤوس. فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "كم عدد رؤوس الهرم الرباعي ؟ الخيارات: أ: 3، ب: 4، ج: 5، د: 6.",
                "speechText": "كم عدد رؤوس الهرم الرباعي؟",
                "visualDescription": "مسألة هندسة فراغية لتحديد عدد رؤوس الهرم الرباعي.",
                "optionTexts": [
                    "3",
                    "4",
                    "5",
                    "6"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Vertices} = 4 + 1 = 5",
                        "spokenArabic": "عدد الرؤوس أربعة زائد واحد ويساوي خمسة"
                    }
                ]
            }
        }
    ]

    manifest_items = []

    for q in questions_def:
        rect = q["rect"]
        pix = page.get_pixmap(matrix=mat, clip=rect, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")

        draw = ImageDraw.Draw(img)

        # Circular badge masking
        bx, by = q["badge_center"]
        rel_bx = (bx - rect.x0) * scale
        rel_by = (by - rect.y0) * scale
        rad_px = q["badge_radius"] * scale

        # Pre-clear badge area with pure white
        draw.rectangle(
            [rel_bx - rad_px - 4, rel_by - rad_px - 4, rel_bx + rad_px + 20, rel_by + rad_px + 4],
            fill=(255, 255, 255, 255)
        )

        bw = int(rad_px * 2)
        b_resized = badge_img.resize((bw, bw), Image.Resampling.LANCZOS)
        img.paste(b_resized, (int(rel_bx - rad_px), int(rel_by - rad_px)), b_resized)

        # Save lossless WebP
        filename = f"{q['code']}.webp"
        out_path = os.path.join(out_img_dir, filename)
        img.convert("RGB").save(out_path, "WEBP", lossless=True, quality=100)

        # Border verification
        rgb = img.convert("RGB")
        w, h = rgb.size
        top_dark = sum(1 for x in range(w) if any(c < 200 for c in rgb.getpixel((x, 0))))
        bot_dark = sum(1 for x in range(w) if any(c < 200 for c in rgb.getpixel((x, h - 1))))
        left_dark = sum(1 for y in range(h) if any(c < 200 for c in rgb.getpixel((0, y))))
        right_dark = sum(1 for y in range(h) if any(c < 200 for c in rgb.getpixel((w - 1, y))))

        print(f"[{q['code']}] {w}x{h} -> top={top_dark}, bot={bot_dark}, left={left_dark}, right={right_dark}")
        if top_dark > 0 or bot_dark > 0 or left_dark > 0 or right_dark > 0:
            raise ValueError(f"Border line detected on {q['code']}!")

        item = {
            "code": q["code"],
            "sectionId": q["sectionId"],
            "mainSkillId": q["mainSkillId"],
            "subSkillId": q["subSkillId"],
            "text": q["text"],
            "type": q["type"],
            "options": q["options"],
            "optionTexts": q["optionTexts"],
            "correctIndex": q["correctIndex"],
            "explanation": "",
            "hint": "",
            "voiceSpeech": q["voiceSpeech"],
            "aiContext": q["aiContext"],
            "imagePath": f"questions/v2/qudrat/quant/COL2627/p084/{filename}"
        }
        manifest_items.append(item)

    manifest_path = "scratch/col2627_batch76_p084_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_items, f, ensure_ascii=False, indent=2)

    print(f"\nManifest successfully created with {len(manifest_items)} questions at {manifest_path}")

if __name__ == "__main__":
    build_batch76()
