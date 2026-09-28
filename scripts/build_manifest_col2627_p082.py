import os
import json
import fitz
from PIL import Image, ImageDraw

def build_batch74():
    pdf_path = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تجميع انشيتن معدل.pdf"
    doc = fitz.open(pdf_path)
    page = doc[81] # Page 82 (0-indexed 81)

    badge_path = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
    badge_img = Image.open(badge_path).convert("RGBA")

    scale = 600 / 72.0
    mat = fitz.Matrix(scale, scale)

    out_img_dir = "public/questions/v2/qudrat/quant/COL2627/p082"
    os.makedirs(out_img_dir, exist_ok=True)

    questions_def = [
        # --- Right Column (Q23 to Q27) ---
        {
            "code": "QDR-QNT-COL2627-P082-Q23",
            "page": 82,
            "qNum": 23,
            "rect": fitz.Rect(303.0, 79.5, 565.0, 215.5),
            "badge_center": (544.0, 94.3),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 2,
            "text": "إذا كان طول ضلع المربع 10 سم، احسب مساحة الجزء المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "5 (ط + 6)",
                "25 (ط + 2)",
                "50 (ط - 2)",
                "100 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. طول ضلع المربع عشرة سنتيمتر، فتكون مساحته مئة سنتيمتر مربع. الشكل المظلل ناتج عن تقاطع ربعي دائرة نصف قطر كل منهما عشرة سنتيمتر. مساحة ربع الدائرة هي ربع ط نق تربيع، أي ربع ط في مئة وتساوي خمسة وعشرين ط. وبجمع ربعي الدائرة نحصل على خمسين ط. بطرح مساحة المربع الكامل نجد مساحة المنطقة المظللة المشتركة: خمسون ط ناقص مئة، وبأخذ خمسين عاملاً مشتركاً تصبح خمسين في افتح قوس ط ناقص اثنين. فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "إذا كان طول ضلع المربع 10 سم، احسب مساحة الجزء المظلل؟ الخيارات: أ: 5 (ط + 6)، ب: 25 (ط + 2)، ج: 50 (ط - 2)، د: 100 ط.",
                "speechText": "إذا كان طول ضلع المربع عشرة سم فاحسب مساحة الجزء المظلل.",
                "visualDescription": "مربع طول ضلعه 10 سم وبداخله ربعا دائرة متقاطعان، والمنطقة المظللة تمثل التقاطع ومساحتها 50(ط - 2).",
                "optionTexts": [
                    "5 (ط + 6)",
                    "25 (ط + 2)",
                    "50 (ط - 2)",
                    "100 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Area}_{\\text{shaded}} = 2 \\times \\left(\\frac{1}{4} \\pi \\times 10^2\\right) - 10^2 = 50\\pi - 100 = 50(\\pi - 2)",
                        "spokenArabic": "مساحة الجزء المظلل تساوي ضعف ربع مساحة الدائرة ناقص مساحة المربع وتساوي خمسين ط ناقص مئة أي خمسين في ط ناقص اثنين"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q24",
            "page": 82,
            "qNum": 24,
            "rect": fitz.Rect(303.0, 217.5, 565.0, 321.5),
            "badge_center": (544.0, 236.4),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 3,
            "text": "في الشكل، أوجد الفرق بين محيطي الدائرتين ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "ط",
                "2 ط",
                "3 ط",
                "4 ط"
            ],
            "voiceSpeech": "أهلاً بك. نلاحظ من الشكل أن الفرق بين نصفي قطري الدائرتين يساوي اثنين. الفرق بين محيطي الدائرتين يعطى بالقانون: اثنين ط مضروبة في الفرق بين نصفي القطرين نق اثنين ناقص نق واحد. بما أن الفرق بين نصفي القطرين هو اثنان، فإن الفرق في المحيط يساوي اثنين ط ضرب اثنين، وهو أربعة ط. فالخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "في الشكل، أوجد الفرق بين محيطي الدائرتين ؟ الخيارات: أ: ط، ب: 2 ط، ج: 3 ط، د: 4 ط.",
                "speechText": "في الشكل أوجد الفرق بين محيطي الدائرتين المتحدة المركز والفرق بين نصف قطريهما اثنان.",
                "visualDescription": "دائرتان متحدتا المركز والمسافة بين محيطيهما تساوي 2، والمطلوب الفرق بين محيطيهما.",
                "optionTexts": [
                    "ط",
                    "2 ط",
                    "3 ط",
                    "4 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\Delta C = 2\\pi r_2 - 2\\pi r_1 = 2\\pi (r_2 - r_1) = 2\\pi (2) = 4\\pi",
                        "spokenArabic": "الفرق بين المحيطين يساوي اثنين ط في الفرق بين نصفي القطرين ويساوي أربعة ط"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q25",
            "page": 82,
            "qNum": 25,
            "rect": fitz.Rect(303.0, 361.0, 565.0, 472.5),
            "badge_center": (544.0, 377.7),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 3,
            "text": "أوجد مساحة الدائرة الكبيرة؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "ط",
                "3 ط",
                "6 ط",
                "9 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. في الشكل نرى دائرة كبيرة تحوي دائرتين متماستين داخلياً، نصف قطر الدائرة م يساوي واحد ونصف قطر الدائرة ن يساوي اثنين. نصف قطر الدائرة الكبيرة يساوي مجموع نصفي القطرين: واحد زائد اثنين ويساوي ثلاثة. مساحة الدائرة الكبيرة تساوي ط نق تربيع، أي ط ضرب ثلاثة تربيع وتساوي تسعة ط. فالخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "أوجد مساحة الدائرة الكبيرة؟ الخيارات: أ: ط، ب: 3 ط، ج: 6 ط، د: 9 ط.",
                "speechText": "أوجد مساحة الدائرة الكبيرة التي نصف قطرها ثلاثة.",
                "visualDescription": "دائرة كبيرة نصف قطرها 3 تحوي دائرتين متماستين، والمطلوب مساحتها.",
                "optionTexts": [
                    "ط",
                    "3 ط",
                    "6 ط",
                    "9 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "R = 1 + 2 = 3 \\implies \\text{Area} = \\pi R^2 = \\pi (3^2) = 9\\pi",
                        "spokenArabic": "نصف قطر الدائرة الكبيرة واحد زائد اثنين يساوي ثلاثة ومساحتها ط في ثلاثة تربيع تساوي تسعة ط"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q26",
            "page": 82,
            "qNum": 26,
            "rect": fitz.Rect(303.0, 474.5, 565.0, 616.5),
            "badge_center": (544.0, 494.7),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 2,
            "text": "إذا كان قطر الدائرة الكبيرة يساوي 6 سم، وقطر الدائرة الصغيرة 4 سم، أوجد مساحة الجزء المظلل في الدائرة؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "6 ط",
                "9 ط",
                "12 ط",
                "18 ط"
            ],
            "voiceSpeech": "أهلاً بك. الدائرتان الداخليتان غير المظللتين قطراهما ستة وأربعة، ومجموع قطريهما يساوي عشرة، وهو قطر الدائرة المحيطة الكبرى. إذن نصف قطر الدائرة الكبرى يساوي نصف العشرة وهو خمسة، فتكون مساحتها خمسة وعشرين ط. أما الدائرة الأولى فنصف قطرها ثلاثة ومساحتها تسعة ط، والدائرة الثانية نصف قطرها اثنان ومساحتها أربعة ط. مساحة الجزء المظلل تساوي مساحة الدائرة الكبرى ناقص مجموع مساحتي الدائرتين: خمسة وعشرون ط ناقص ثلاثة عشر ط وتساوي اثني عشر ط. فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "إذا كان قطر الدائرة الكبيرة يساوي 6 سم، وقطر الدائرة الصغيرة 4 سم، أوجد مساحة الجزء المظلل في الدائرة؟ الخيارات: أ: 6 ط، ب: 9 ط، ج: 12 ط، د: 18 ط.",
                "speechText": "دائرتان داخليتان قطراهما ستة وأربعة فما مساحة الجزء المظلل من الدائرة الكبرى؟",
                "visualDescription": "دائرة كبرى تحوي دائرتين متماستين بقطرين 6 و4، والجزء المتبقي مظلل ومساحته 12ط.",
                "optionTexts": [
                    "6 ط",
                    "9 ط",
                    "12 ط",
                    "18 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "D_{\\text{outer}} = 6 + 4 = 10 \\implies R = 5 \\implies A_{\\text{outer}} = 25\\pi",
                        "spokenArabic": "قطر الدائرة الكبرى ستة زائد أربعة يساوي عشرة ونصف قطرها خمسة ومساحتها خمسة وعشرون ط"
                    },
                    {
                        "latex": "A_{\\text{shaded}} = 25\\pi - (\\pi \\times 3^2 + \\pi \\times 2^2) = 25\\pi - 13\\pi = 12\\pi",
                        "spokenArabic": "مساحة الجزء المظلل تساوي خمسة وعشرين ط ناقص ثلاثة عشر ط وتساوي اثني عشر ط"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q27",
            "page": 82,
            "qNum": 27,
            "rect": fitz.Rect(303.0, 618.5, 565.0, 733.5),
            "badge_center": (544.0, 638.2),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 2,
            "text": "إذا كانت النسبة بين مساحتي دائرتين تساوي 1 : 144 فما هي النسبة بين طولي نصفي قطريهما ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "1 : 6",
                "1 : 4",
                "1 : 12",
                "1 : 20"
            ],
            "voiceSpeech": "مرحباً يا بطل. النسبة بين مساحتي دائرتين تساوي مربع النسبة بين نصفي قطريهما. ولإيجاد النسبة بين نصفي القطرين، نأخذ الجذر التربيعي للنسبة بين المساحتين: جذر واحد على مئة وأربعة وأربعين يساوي واحداً على اثني عشر. إذن النسبة بين طولي نصفي قطريهما هي واحد إلى اثني عشر. فالخيار الصحيح هو ج.",
            "aiContext": {
                "readableText": "إذا كانت النسبة بين مساحتي دائرتين تساوي 1 : 144 فما هي النسبة بين طولي نصفي قطريهما ؟ الخيارات: أ: 1 : 6، ب: 1 : 4، ج: 1 : 12، د: 1 : 20.",
                "speechText": "إذا كانت النسبة بين مساحتي دائرتين واحد إلى مئة وأربعة وأربعين فما النسبة بين نصفي قطريهما؟",
                "visualDescription": "مسألة رياضية تنص على نسبة المساحتين 1:144 والمطلوب نسبة نصفي القطرين.",
                "optionTexts": [
                    "1 : 6",
                    "1 : 4",
                    "1 : 12",
                    "1 : 20"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\frac{A_1}{A_2} = \\left(\\frac{r_1}{r_2}\\right)^2 = \\frac{1}{144} \\implies \\frac{r_1}{r_2} = \\sqrt{\\frac{1}{144}} = \\frac{1}{12}",
                        "spokenArabic": "النسبة بين نصفي القطرين تساوي جذر واحد على مئة وأربعة وأربعين وتساوي واحداً على اثني عشر"
                    }
                ]
            }
        },

        # --- Left Column (Q28 to Q32) ---
        {
            "code": "QDR-QNT-COL2627-P082-Q28",
            "page": 82,
            "qNum": 28,
            "rect": fitz.Rect(35.0, 50.0, 298.0, 166.0),
            "badge_center": (281.8, 64.3),
            "badge_radius": 11.5,
            "clear_corner": True,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 1,
            "text": "أي التالي أكبر محيط فيما يلي ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "دائرة نصف قطرها 4 سم",
                "مستطيل بعداه 8 ، 14 سم",
                "مثلث متطابق الأضلاع طول ضلعه يساوي 9 سم",
                "مربع طول ضلعه 8 سم"
            ],
            "voiceSpeech": "أهلاً بك. لنحسب محيط كل شكل: أولاً محيط الدائرة يساوي اثنين في ط في أربعة، أي حوالي خمسة وعشرين فاصلة اثني عشر سنتيمتر. ثانياً محيط المستطيل يساوي اثنين في ثمانية زائد أربعة عشر، أي اثنين في اثنين وعشرين ويساوي أربعة وأربعين سنتيمتر. ثالثاً محيط المثلث متطابق الأضلاع يساوي ثلاثة في تسعة ويساوي سبعة وعشرين سنتيمتر. رابعاً محيط المربع يساوي أربعة في ثمانية ويساوي اثنين وثلاثين سنتيمتر. الأكبر محيطاً بوضوح هو المستطيل بمحيط أربعة وأربعين سنتيمتر. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "أي التالي أكبر محيط فيما يلي ؟ الخيارات: أ: دائرة نصف قطرها 4 سم، ب: مستطيل بعداه 8 ، 14 سم، ج: مثلث متطابق الأضلاع طول ضلعه يساوي 9 سم، د: مربع طول ضلعه 8 سم.",
                "speechText": "أي الأشكال التالية له أكبر محيط: دائرة نصف قطرها 4 أم مستطيل بعداه 8 و 14 أم مثلث متطابق الأضلاع ضلعه 9 أم مربع ضلعه 8؟",
                "visualDescription": "مقارنة بين محيط أربعة أشكال هندسية لتحديد المحيط الأكبر.",
                "optionTexts": [
                    "دائرة نصف قطرها 4 سم",
                    "مستطيل بعداه 8 ، 14 سم",
                    "مثلث متطابق الأضلاع طول ضلعه يساوي 9 سم",
                    "مربع طول ضلعه 8 سم"
                ],
                "mathExpressions": [
                    {
                        "latex": "C_{\\text{circle}} = 2\\pi(4) \\approx 25.12, \\quad P_{\\text{rect}} = 2(8+14) = 44",
                        "spokenArabic": "محيط الدائرة خمسة وعشرون ومحيط المستطيل أربعة وأربعون"
                    },
                    {
                        "latex": "P_{\\text{tri}} = 3 \\times 9 = 27, \\quad P_{\\text{square}} = 4 \\times 8 = 32",
                        "spokenArabic": "محيط المثلث سبعة وعشرون ومحيط المربع اثنان وثلاثون والمستطيل هو الأكبر"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q29",
            "page": 82,
            "qNum": 29,
            "rect": fitz.Rect(35.0, 168.0, 298.0, 267.0),
            "badge_center": (281.8, 186.8),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 1,
            "text": "إذا كان مساحة المظلل يساوي 10 ومساحة المستطيل يساوي مساحة الدائرة، أوجد مساحة المستطيل ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "20",
                "40",
                "60",
                "80"
            ],
            "voiceSpeech": "مرحباً يا بطل. الجزء المظلل يمثل ربع الدائرة ومساحته عشرة، وبما أن ربع الدائرة يساوي عشرة، فإن مساحة الدائرة كاملة تساوي عشرة ضرب أربعة وتساوي أربعين. وبما أن نص المسألة يذكر أن مساحة المستطيل تساوي مساحة الدائرة، فإن مساحة المستطيل تساوي أربعين أيضاً. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "إذا كان مساحة المظلل يساوي 10 ومساحة المستطيل يساوي مساحة الدائرة، أوجد مساحة المستطيل ؟ الخيارات: أ: 20، ب: 40، ج: 60، د: 80.",
                "speechText": "إذا كان مساحة المظلل وهو ربع الدائرة يساوي عشرة ومساحة المستطيل تساوي مساحة الدائرة فما مساحة المستطيل؟",
                "visualDescription": "مستطيل يتقاطع مع دائرة في ربع دائرة مظلل مساحته 10، ومساحة المستطيل تساوي مساحة الدائرة كاملة.",
                "optionTexts": [
                    "20",
                    "40",
                    "60",
                    "80"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\frac{1}{4} A_{\\text{circle}} = 10 \\implies A_{\\text{circle}} = 40 \\implies A_{\\text{rect}} = 40",
                        "spokenArabic": "ربع مساحة الدائرة يساوي عشرة إذن مساحة الدائرة أربعون وتساوي مساحة المستطيل"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q30",
            "page": 82,
            "qNum": 30,
            "rect": fitz.Rect(35.0, 269.0, 298.0, 449.5),
            "badge_center": (281.8, 289.1),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 0,
            "text": "إذا كان محيط الدائرة م تساوي 3 أمثال محيط الدائرة ن التي نصف قطرها تساوي 3 سم، فقارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "أهلاً بك. الدائرة ن نصف قطرها ثلاثة، ومحيطها يساوي اثنين في ط في ثلاثة أي ستة ط. محيط الدائرة م يساوي ثلاثة أمثال محيط الدائرة ن، أي ثلاثة ضرب ستة ط ويساوي ثمانية عشر ط. من محيط الدائرة م نستنتج أن نصف قطرها هو تسعة، لأن اثنين ط نق يساوي ثمانية عشر ط. إذن مساحة الدائرة م تساوي ط ضرب تسعة تربيع وتساوي واحداً وثمانين ط. بمقارنة القيمة الأولى وهي واحد وثمانون ط مع القيمة الثانية وهي ستون ط، نجد أن القيمة الأولى أكبر قطعاً. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "إذا كان محيط الدائرة م تساوي 3 أمثال محيط الدائرة ن التي نصف قطرها تساوي 3 سم، فقارن بين: القيمة الأولى: مساحة الدائرة م، القيمة الثانية: 60 ط. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "محيط الدائرة م ثلاثة أمثال محيط الدائرة ن التي نصف قطرها 3 سم، قارن بين مساحة الدائرة م وستين ط.",
                "visualDescription": "جدول مقارنة كمية بين مساحة الدائرة م والقيمة 60 ط.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "C_n = 2\\pi(3) = 6\\pi \\implies C_m = 3 \\times 6\\pi = 18\\pi \\implies r_m = 9",
                        "spokenArabic": "محيط ن يساوي ستة ط ومحيط م ثمانية عشر ط ونصف قطر م يساوي تسعة"
                    },
                    {
                        "latex": "A_m = \\pi(9^2) = 81\\pi > 60\\pi",
                        "spokenArabic": "مساحة الدائرة م واحد وثمانون ط وهي أكبر من ستين ط فالقيمة الأولى أكبر"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q31",
            "page": 82,
            "qNum": 31,
            "rect": fitz.Rect(35.0, 484.0, 298.0, 576.0),
            "badge_center": (281.8, 500.2),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 3,
            "text": "إذا كان محيط الدائرة 3.14 ، أوجد مساحتها ؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "2 ط",
                "ط / 2",
                "4 ط",
                "ط / 4"
            ],
            "voiceSpeech": "مرحباً يا بطل. محيط الدائرة يساوي اثنين ط نق ويساوي ثلاثة فاصلة أربعة عشر، ونعلم أن الثابت ط يساوي تقريباً ثلاثة فاصلة أربعة عشر. بقسمة الطرفين على ط، نجد أن اثنين نق يساوي واحداً، أي أن نصف القطر نق يساوي نصفاً. مساحة الدائرة تساوي ط نق تربيع، أي ط ضرب نصف تربيع، وتساوي ربع ط أو ط على أربعة. فالخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "إذا كان محيط الدائرة 3.14 ، أوجد مساحتها ؟ الخيارات: أ: 2 ط، ب: ط / 2، ج: 4 ط، د: ط / 4.",
                "speechText": "إذا كان محيط الدائرة ثلاثة فاصلة أربعة عشر فما مساحتها بدلالة ط؟",
                "visualDescription": "مسألة محيط دائرة يساوي 3.14 والمطلوب مساحتها بدلالة ط.",
                "optionTexts": [
                    "2 ط",
                    "ط / 2",
                    "4 ط",
                    "ط / 4"
                ],
                "mathExpressions": [
                    {
                        "latex": "2\\pi r = 3.14 \\approx \\pi \\implies 2r = 1 \\implies r = \\frac{1}{2}",
                        "spokenArabic": "اثنين ط نق يساوي ط إذن اثنين نق يساوي واحداً ونق يساوي نصفاً"
                    },
                    {
                        "latex": "\\text{Area} = \\pi r^2 = \\pi \\left(\\frac{1}{2}\\right)^2 = \\frac{1}{4}\\pi = \\frac{\\pi}{4}",
                        "spokenArabic": "المساحة تساوي ط في نصف تربيع وتساوي ربع ط"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P082-Q32",
            "page": 82,
            "qNum": 32,
            "rect": fitz.Rect(35.0, 611.0, 298.0, 733.5),
            "badge_center": (281.8, 631.7),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 3,
            "text": "أوجد مساحة الدائرة التي معادلتها (1/2) س^2 + (1/2) ص^2 = 18",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "6 ط",
                "10 ط",
                "20 ط",
                "36 ط"
            ],
            "voiceSpeech": "أهلاً بك يا بطل. معادلة الدائرة المعطاة هي نصف سين تربيع زائد نصف صاد تربيع يساوي ثمانية عشر. للتخلص من الكسر، نضرب المعادلة بالكامل في اثنين، فنحصل على: سين تربيع زائد صاد تربيع يساوي ستة وثلاثين. المعادلة القياسية للدائرة هي سين تربيع زائد صاد تربيع يساوي نق تربيع، بالمقارنة نجد أن نق تربيع يساوي ستة وثلاثين. وبما أن مساحة الدائرة تساوي ط نق تربيع، فإن المساحة مباشرة تساوي ستة وثلاثين ط. فالخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "أوجد مساحة الدائرة التي معادلتها (1/2) س^2 + (1/2) ص^2 = 18. الخيارات: أ: 6 ط، ب: 10 ط، ج: 20 ط، د: 36 ط.",
                "speechText": "أوجد مساحة الدائرة التي معادلتها نصف سين تربيع زائد نصف صاد تربيع يساوي ثمانية عشر.",
                "visualDescription": "معادلة دائرة نصف سين تربيع زائد نصف صاد تربيع يساوي 18 والمطلوب مساحتها.",
                "optionTexts": [
                    "6 ط",
                    "10 ط",
                    "20 ط",
                    "36 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\frac{1}{2}x^2 + \\frac{1}{2}y^2 = 18 \\implies x^2 + y^2 = 36 = r^2 \\implies \\text{Area} = \\pi r^2 = 36\\pi",
                        "spokenArabic": "نصف سين تربيع زائد نصف صاد تربيع يساوي ثمانية عشر بضرب المعادلة في اثنين ينتج سين تربيع زائد صاد تربيع يساوي ستة وثلاثين ونق تربيع ستة وثلاثون والمساحة ستة وثلاثون ط"
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

        # Clear corner if flag is set (e.g. Q28 top-left header arc)
        if q.get("clear_corner"):
            draw.rectangle([0, 0, int(30 * scale), int(25 * scale)], fill=(255, 255, 255, 255))

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
            "imagePath": f"questions/v2/qudrat/quant/COL2627/p082/{filename}"
        }
        manifest_items.append(item)

    manifest_path = "scratch/col2627_batch74_p082_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_items, f, ensure_ascii=False, indent=2)

    print(f"\nManifest successfully created with {len(manifest_items)} questions at {manifest_path}")

if __name__ == "__main__":
    build_batch74()
