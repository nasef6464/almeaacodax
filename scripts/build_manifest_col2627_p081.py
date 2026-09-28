import os
import json
import fitz
from PIL import Image, ImageDraw

def build_batch73():
    pdf_path = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تجميع انشيتن معدل.pdf"
    doc = fitz.open(pdf_path)
    page_idx = 80  # Page 81 (0-indexed 80)
    page = doc[page_idx]

    badge_path = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
    badge_img = Image.open(badge_path).convert("RGBA")

    out_img_dir = r"c:\ALMEAA MAY - codax\public\questions\v2\qudrat\quant\COL2627\p081"
    os.makedirs(out_img_dir, exist_ok=True)

    scale = 600 / 72.0
    mat = fitz.Matrix(scale, scale)

    # 11 questions on Page 81 (Q12 to Q22)
    # Strictly excluding Rule 5, 6, 7 banners and bottom answer table
    questions_def = [
        # Right column (Q12 to Q16)
        {
            "num": 12,
            "code": "QDR-QNT-COL2627-P081-Q12",
            "rect": fitz.Rect(301.0, 45.0, 565.0, 181.5),
            "badge_center": (549.35, 68.91),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 1,
            "text": "باب على شكل مستطيل يعلوه نصف دائرة، أوجد مساحة نصف الدائرة؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "ط",
                "2 ط",
                "3 ط",
                "6 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. عرض الباب المستطيل يمثل قطر نصف الدائرة ويساوي أربعة أمتار، وبالتالي فإن نصف قطر نصف الدائرة يساوي نصف الأربعة وهو اثنان متر. مساحة الدائرة الكاملة تساوي ط نق تربيع، أي ط ضرب اثنين تربيع وتساوي أربعة ط. وبما أن المطلوب هو مساحة نصف الدائرة فقط، فنقسم على اثنين: أربعة ط قسمة اثنين تساوي اثنين ط. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "باب على شكل مستطيل يعلوه نصف دائرة، أوجد مساحة نصف الدائرة؟ عرض الباب 4 م. الخيارات: أ: ط، ب: 2 ط، ج: 3 ط، د: 6 ط.",
                "speechText": "باب مستطيل يعلوه نصف دائرة قطرها أربعة فما مساحة نصف الدائرة؟",
                "visualDescription": "باب مستطيل عرضه 4 م يعلوه نصف دائرة قطرها 4 م ونصف قطرها 2 م ومساحتها 2ط.",
                "optionTexts": [
                    "ط",
                    "2 ط",
                    "3 ط",
                    "6 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "2r = 4 \\implies r = 2 \\implies \\text{Area}_{\\text{semicircle}} = \\frac{1}{2} \\pi(2^2) = 2\\pi",
                        "spokenArabic": "قطر الدائرة أربعة ونصف قطرها اثنان ومساحة نصف الدائرة نصف ط في اثنين تربيع وتساوي اثنين ط"
                    }
                ]
            }
        },
        {
            "num": 13,
            "code": "QDR-QNT-COL2627-P081-Q13",
            "rect": fitz.Rect(301.0, 184.0, 565.0, 273.5),
            "badge_center": (549.35, 200.60),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 3,
            "text": "أوجد مساحة الدائرة الصغيرة؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "12 ط",
                "14 ط",
                "15 ط",
                "16 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. في الشكل، قطر الدائرة الصغيرة يساوي ثمانية سنتيمترات، فيكون نصف قطرها نق مساوياً لأربعة سنتيمترات. مساحة الدائرة تساوي ط ضرب نق تربيع، أي ط ضرب أربعة تربيع، وأربعة تربيع تساوي ستة عشر، فتكون مساحة الدائرة الصغيرة ستة عشر ط. فالخيار الصحيح هو د.",
            "aiContext": {
                "readableText": "أوجد مساحة الدائرة الصغيرة؟ قطرها 8 سم. الخيارات: أ: 12 ط، ب: 14 ط، ج: 15 ط، د: 16 ط.",
                "speechText": "أوجد مساحة الدائرة الصغيرة التي قطرها ثمانية سنتيمترات.",
                "visualDescription": "دائرة صغيرة قطرها 8 سم ونصف قطرها 4 سم ومساحتها 16 ط.",
                "optionTexts": [
                    "12 ط",
                    "14 ط",
                    "15 ط",
                    "16 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "2r = 8 \\implies r = 4 \\implies \\text{Area} = \\pi(4^2) = 16\\pi",
                        "spokenArabic": "القطر ثمانية ونصف القطر أربعة والمساحة ط ضرب أربعة تربيع وتساوي ستة عشر ط"
                    }
                ]
            }
        },
        {
            "num": 14,
            "code": "QDR-QNT-COL2627-P081-Q14",
            "rect": fitz.Rect(301.0, 313.0, 565.0, 437.5),
            "badge_center": (549.35, 328.08),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 1,
            "text": "أوجد مساحة الجزء المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "9 ط + 18",
                "9 ط - 18",
                "9 ط + 36",
                "9 ط - 36"
            ],
            "voiceSpeech": "مرحباً يا بطل. لحساب مساحة القطعة الدائرية المظللة، نطرح مساحة المثلث القائم من مساحة قطاع ربع الدائرة. نصف قطر الدائرة ستة، إذن مساحة ربع الدائرة تساوي ربع ضرب ط ضرب ستة تربيع، وستة تربيع بستة وثلاثين، ربعها تسعة ط. مساحة المثلث القائم نصف ضرب ستة ضرب ستة وتساوي ثمانية عشر. بطرح مساحة المثلث من مساحة ربع الدائرة نحصل على: تسعة ط ناقص ثمانية عشر. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "أوجد مساحة الجزء المظلل؟ ربع دائرة نصف قطرها 6 ومثلث قائم ساقاه 6. الخيارات: أ: 9 ط + 18، ب: 9 ط - 18، ج: 9 ط + 36، د: 9 ط - 36.",
                "speechText": "أوجد مساحة الجزء المظلل بطرح مساحة المثلث من ربع الدائرة.",
                "visualDescription": "ربع دائرة نصف قطرها 6 وبداخلها مثلث قائم متطابق الساقين، ومساحة الجزء المظلل 9ط - 18.",
                "optionTexts": [
                    "9 ط + 18",
                    "9 ط - 18",
                    "9 ط + 36",
                    "9 ط - 36"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Area}_{\\text{sector}} = \\frac{1}{4}\\pi(6^2) = 9\\pi, \\quad \\text{Area}_{\\text{triangle}} = \\frac{1}{2} \\times 6 \\times 6 = 18",
                        "spokenArabic": "مساحة ربع الدائرة تسعة ط ومساحة المثلث ثمانية عشر"
                    },
                    {
                        "latex": "\\text{Area}_{\\text{shaded}} = 9\\pi - 18",
                        "spokenArabic": "مساحة الجزء المظلل تساوي تسعة ط ناقص ثمانية عشر"
                    }
                ]
            }
        },
        {
            "num": 15,
            "code": "QDR-QNT-COL2627-P081-Q15",
            "rect": fitz.Rect(301.0, 441.0, 565.0, 575.0),
            "badge_center": (549.35, 457.06),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 1,
            "text": "أوجد مساحة الجزء المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "6 ط + 9 جذر 3",
                "6 ط - 9 جذر 3",
                "36 ط + 9 جذر 3",
                "36 ط - 9 جذر 3"
            ],
            "voiceSpeech": "مرحباً يا بطل. لحساب مساحة القطعة المظللة، نطرح مساحة المثلث متطابق الأضلاع من مساحة القطاع الدائري الذي زاويته المركزية ستون درجة ونصف قطره ستة. مساحة القطاع تساوي ستين على ثلاثمئة وستين ضرب ط ضرب ستة تربيع، أي سدس ضرب ستة وثلاثين ط وتساوي ستة ط. ومساحة المثلث متطابق الأضلاع جذر ثلاثة على أربعة ضرب ستة تربيع وتساوي تسعة جذر ثلاثة. بطرح مساحة المثلث من مساحة القطاع نحصل على ستة ط ناقص تسعة جذر ثلاثة. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "أوجد مساحة الجزء المظلل؟ قطاع زاويته 60° ونصف قطره 6 سم. الخيارات: أ: 6 ط + 9 جذر 3، ب: 6 ط - 9 جذر 3، ج: 36 ط + 9 جذر 3، د: 36 ط - 9 جذر 3.",
                "speechText": "أوجد مساحة القطعة الدائرية المظللة في قطاع زاويته ستون درجة.",
                "visualDescription": "قطاع دائري زاويته المركزية 60° ونصف قطره 6 يحوي مثلثاً متطابق الأضلاع ومساحة المظلل 6ط - 9√3.",
                "optionTexts": [
                    "6 ط + 9 جذر 3",
                    "6 ط - 9 جذر 3",
                    "36 ط + 9 جذر 3",
                    "36 ط - 9 جذر 3"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Area}_{\\text{sector}} = \\frac{60}{360}\\pi(6^2) = 6\\pi",
                        "spokenArabic": "مساحة القطاع الدائري ستين على ثلاثمئة وستين في ستة وثلاثين ط وتساوي ستة ط"
                    },
                    {
                        "latex": "\\text{Area}_{\\text{triangle}} = \\frac{\\sqrt{3}}{4}(6^2) = 9\\sqrt{3} \\implies \\text{Area}_{\\text{shaded}} = 6\\pi - 9\\sqrt{3}",
                        "spokenArabic": "مساحة المثلث تسعة جذر ثلاثة ومساحة المظلل ستة ط ناقص تسعة جذر ثلاثة"
                    }
                ]
            }
        },
        {
            "num": 16,
            "code": "QDR-QNT-COL2627-P081-Q16",
            "rect": fitz.Rect(301.0, 578.0, 565.0, 730.0),
            "badge_center": (549.35, 594.52),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 1,
            "text": "في الشكل 4 أنصاف دوائر، أوجد محيط الشكل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "8 ط + 6",
                "8 ط + 8",
                "9 ط + 10",
                "16 ط - 9"
            ],
            "voiceSpeech": "مرحباً يا بطل. الشكل يتكون من أربعة أنصاف دوائر متطابقة وقطع مستقيمة تربط بينها. الأربعة أنصاف دوائر تشكل محيط دائرتين كاملتين بقطر معطى، ومحيطهما يساوي ثمانية ط. والقطع المستقيمة المستوية مجموع أطوالها يساوي ثمانية، فيكون المحيط الكلي للشكل الخارجي مساوياً لثمانية ط زائد ثمانية. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "في الشكل 4 أنصاف دوائر، أوجد محيط الشكل؟ الخيارات: أ: 8 ط + 6، ب: 8 ط + 8، ج: 9 ط + 10، د: 16 ط - 9.",
                "speechText": "أوجد محيط الشكل المكون من أربعة أنصاف دوائر.",
                "visualDescription": "شكل هندسي مركب من 4 أنصاف دوائر وقطع مستقيمة ومحيطه الكلي 8ط + 8.",
                "optionTexts": [
                    "8 ط + 6",
                    "8 ط + 8",
                    "9 ط + 10",
                    "16 ط - 9"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Perimeter} = 8\\pi + 8",
                        "spokenArabic": "المحيط يساوي ثمانية ط زائد ثمانية"
                    }
                ]
            }
        },
        # Left column (Q17 to Q22)
        {
            "num": 17,
            "code": "QDR-QNT-COL2627-P081-Q17",
            "rect": fitz.Rect(35.0, 45.0, 297.0, 170.0),
            "badge_center": (281.82, 63.24),
            "badge_radius": 11.5,
            "clear_corner": True,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 0,
            "text": "إذا كان محيط المثلث = 24 سم، احسب مساحة الشكل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "8 (2 جذر 3 + ط)",
                "8 (3 جذر 3 + ط)",
                "8 ط",
                "8 (جذر 3 - ط)"
            ],
            "voiceSpeech": "مرحباً يا بطل. المثلث متطابق الأضلاع ومحيطه أربعة وعشرون سنتيمتراً، إذن طول ضلعه يساوي أربعة وعشرين قسمة ثلاثة ويساوي ثمانية سنتيمترات. مساحة هذا المثلث متطابق الأضلاع تساوي جذر ثلاثة على أربعة ضرب ثمانية تربيع وتساوي ستة عشر جذر ثلاثة. ونصف الدائرة المقام على ضلعه قطره ثمانية ونصف قطره أربعة ومساحتها نصف ضرب ط ضرب أربعة تربيع وتساوي ثمانية ط. بجمع مساحة المثلث ومساحة نصف الدائرة: ستة عشر جذر ثلاثة زائد ثمانية ط، وبأخذ ثمانية عاملاً مشتركاً نحصل على ثمانية في اثنين جذر ثلاثة زائد ط. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "إذا كان محيط المثلث = 24 سم، احسب مساحة الشكل؟ الخيارات: أ: 8 (2 جذر 3 + ط)، ب: 8 (3 جذر 3 + ط)، ج: 8 ط، د: 8 (جذر 3 - ط).",
                "speechText": "مثلث متطابق الأضلاع محيطه أربعة وعشرون يعلوه نصف دائرة احسب مساحة الشكل.",
                "visualDescription": "مثلث متطابق الأضلاع ضلعه 8 يعلوه نصف دائرة قطرها 8 ومساحة الشكل 8(2√3 + ط).",
                "optionTexts": [
                    "8 (2 جذر 3 + ط)",
                    "8 (3 جذر 3 + ط)",
                    "8 ط",
                    "8 (جذر 3 - ط)"
                ],
                "mathExpressions": [
                    {
                        "latex": "s = \\frac{24}{3} = 8 \\implies \\text{Area}_{\\text{triangle}} = \\frac{\\sqrt{3}}{4}(8^2) = 16\\sqrt{3}",
                        "spokenArabic": "طول ضلع المثلث ثمانية ومساحة المثلث ستة عشر جذر ثلاثة"
                    },
                    {
                        "latex": "\\text{Area}_{\\text{semicircle}} = \\frac{1}{2}\\pi(4^2) = 8\\pi \\implies \\text{Total} = 8(2\\sqrt{3} + \\pi)",
                        "spokenArabic": "مساحة نصف الدائرة ثمانية ط والمساحة الكلية ثمانية في اثنين جذر ثلاثة زائد ط"
                    }
                ]
            }
        },
        {
            "num": 18,
            "code": "QDR-QNT-COL2627-P081-Q18",
            "rect": fitz.Rect(35.0, 173.0, 297.0, 285.5),
            "badge_center": (281.82, 188.78),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_2",
            "correctIndex": 1,
            "text": "إذا كان أ ب نصف قطر الدائرة، أوجد قيمة س؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "120°",
                "150°",
                "170°",
                "180°"
            ],
            "voiceSpeech": "مرحباً يا بطل. في الدائرة، الزاوية المعطاة بثلاثين درجة هي زاوية مكملة أو مناظرة للزاوية س على خط مستقيم. الزاويتان متكاملتان مجموعهما مئة وثمانون درجة، فتكون قيمة س مساوية لمئة وثمانين ناقص ثلاثين وتساوي مئة وخمسين درجة. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "إذا كان أ ب نصف قطر الدائرة، أوجد قيمة س؟ الزاوية المجاورة 30°. الخيارات: أ: 120°، ب: 150°، ج: 170°، د: 180°.",
                "speechText": "أوجد قيمة الزاوية س في الشكل الهندسي داخل الدائرة.",
                "visualDescription": "دائرة ونصف قطر أ ب مع زاوية متكاملة 30° فتكون س = 150°.",
                "optionTexts": [
                    "120°",
                    "150°",
                    "170°",
                    "180°"
                ],
                "mathExpressions": [
                    {
                        "latex": "x = 180^\\circ - 30^\\circ = 150^\\circ",
                        "spokenArabic": "سين يساوي مئة وثمانين ناقص ثلاثين ويساوي مئة وخمسين درجة"
                    }
                ]
            }
        },
        {
            "num": 19,
            "code": "QDR-QNT-COL2627-P081-Q19",
            "rect": fitz.Rect(35.0, 289.0, 297.0, 377.0),
            "badge_center": (281.82, 305.83),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 1,
            "text": "أوجد مساحة المستطيل إذا علمت أن الدائرتين متطابقتين؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "7",
                "8",
                "10",
                "12"
            ],
            "voiceSpeech": "مرحباً يا بطل. المستطيل يحوي دائرتين متطابقتين متماستين، نصف قطر كل دائرة يساوي واحداً. عرض المستطيل يمثل قطر دائرة واحدة ويساوي اثنين، وطول المستطيل يمثل قطري الدائرتين معاً ويساوي اثنين زائد اثنين أي أربعة. إذن مساحة المستطيل تساوي الطول ضرب العرض: أربعة ضرب اثنين وتساوي ثمانية. فالخيار الصحيح هو ب.",
            "aiContext": {
                "readableText": "أوجد مساحة المستطيل إذا علمت أن الدائرتين متطابقتين؟ الخيارات: أ: 7، ب: 8، ج: 10، د: 12.",
                "speechText": "أوجد مساحة مستطيل بداخله دائرتان متطابقتان متماستان.",
                "visualDescription": "مستطيل أبعاده 4 و 2 بداخله دائرتان متماستان ومساحته 8.",
                "optionTexts": [
                    "7",
                    "8",
                    "10",
                    "12"
                ],
                "mathExpressions": [
                    {
                        "latex": "L = 4, \\quad W = 2 \\implies \\text{Area} = 4 \\times 2 = 8",
                        "spokenArabic": "الطول أربعة والعرض اثنان والمساحة أربعة ضرب اثنين وتساوي ثمانية"
                    }
                ]
            }
        },
        {
            "num": 20,
            "code": "QDR-QNT-COL2627-P081-Q20",
            "rect": fitz.Rect(35.0, 380.5, 297.0, 475.0),
            "badge_center": (281.82, 398.90),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 0,
            "text": "إذا كان نصف قطر الدائرة يساوي 3، أوجد مساحة المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "15/2 ط - 9 جذر 3 / 4",
                "3 ط / 4 - 3 جذر 3",
                "1/6 ط",
                "2/3 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. لحساب مساحة الجزء المظلل، نطرح مساحة المثلث متطابق الأضلاع الداخلي من مساحة القطاع الدائري الأكبر، نصف القطر ثلاثة، فيكون ناتج حساب المساحة المظللة الدقيقة مساوياً لخمسة عشر على اثنين ط ناقص تسعة جذر ثلاثة على أربعة. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "إذا كان نصف قطر الدائرة يساوي 3، أوجد مساحة المظلل؟ الخيارات: أ: 15/2 ط - 9 جذر 3 / 4، ب: 3 ط / 4 - 3 جذر 3، ج: 1/6 ط، د: 2/3 ط.",
                "speechText": "إذا كان نصف قطر الدائرة ثلاثة أوجد مساحة الجزء المظلل.",
                "visualDescription": "دائرة نصف قطرها 3 تحوي قطاعاً ومثلثاً ومساحة المظلل 15/2 ط - 9√3 / 4.",
                "optionTexts": [
                    "15/2 ط - 9 جذر 3 / 4",
                    "3 ط / 4 - 3 جذر 3",
                    "1/6 ط",
                    "2/3 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Area}_{\\text{shaded}} = \\frac{15}{2}\\pi - \\frac{9\\sqrt{3}}{4}",
                        "spokenArabic": "المساحة المظللة خمسة عشر على اثنين ط ناقص تسعة جذر ثلاثة على أربعة"
                    }
                ]
            }
        },
        {
            "num": 21,
            "code": "QDR-QNT-COL2627-P081-Q21",
            "rect": fitz.Rect(35.0, 510.5, 297.0, 609.0),
            "badge_center": (281.91, 527.95),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 0,
            "text": "3 دوائر متطابقة نصف قطرها 1 سم، احسب محيط الجزء المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "ط",
                "2 ط",
                "3 ط",
                "4 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. الجزء المظلل محصور بين ثلاث دوائر متطابقة متماسة مثنى مثنى، أوتار التماس تشكل مثلثاً متطابق الأضلاع زواياه ستون درجة. الأقواس الثلاثة المحددة للمنطقة المظللة قياس كل منها ستون درجة، ومجموع قياساتها الثلاثة ستون ضرب ثلاثة ويساوي مئة وثمانين درجة، أي ما يعادل نصف محيط دائرة كاملة. محيط الدائرة الكاملة اثنين ط ضرب واحد ويساوي اثنين ط، ونصف هذا المحيط يساوي ط. إذن محيط الجزء المظلل يساوي ط. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "3 دوائر متطابقة نصف قطرها 1 سم، احسب محيط الجزء المظلل؟ الخيارات: أ: ط، ب: 2 ط، ج: 3 ط، د: 4 ط.",
                "speechText": "ثلاث دوائر متطابقة نصف قطرها واحد سم احسب محيط الجزء المظلل المحصور بينها.",
                "visualDescription": "3 دوائر متماسة مثنى مثنى نصف قطر كل منها 1 ومحيط الجزء المظلل بينها يساوي نصف محيط دائرة أي ط.",
                "optionTexts": [
                    "ط",
                    "2 ط",
                    "3 ط",
                    "4 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "3 \\times 60^\\circ = 180^\\circ \\implies \\text{Perimeter} = \\frac{1}{2}(2\\pi \\times 1) = \\pi",
                        "spokenArabic": "مجموع الأقواس مئة وثمانون درجة والمحيط نصف في اثنين ط في واحد ويساوي ط"
                    }
                ]
            }
        },
        {
            "num": 22,
            "code": "QDR-QNT-COL2627-P081-Q22",
            "rect": fitz.Rect(35.0, 648.5, 297.0, 735.0),
            "badge_center": (281.91, 662.62),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 0,
            "text": "إذا كانت الدوائر متطابقة ومحيط الواحدة = 36 ط، احسب محيط المظلل؟",
            "type": "multiple_choice",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "36 ط",
                "18 ط",
                "16 ط",
                "12 ط"
            ],
            "voiceSpeech": "مرحباً يا بطل. الشكل يوضح دوائر متماسة متطابقة تحيط بمنطقة مظللة. الأقواس الدائرية التي تحد الجزء المظلل تمثل قطاعات تتكامل مجموع زواياها لتشكل ثلاثمئة وستين درجة، أي ما يعادل محيط دائرة كاملة واحدة بالضبط. وبما أن محيط الدائرة الواحدة معطى بستة وثلاثين ط، فإن محيط الجزء المظلل يساوي تماماً ستة وثلاثين ط. فالخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "إذا كانت الدوائر متطابقة ومحيط الواحدة = 36 ط، احسب محيط المظلل؟ الخيارات: أ: 36 ط، ب: 18 ط، ج: 16 ط، د: 12 ط.",
                "speechText": "دوائر متطابقة محيط الواحدة ستة وثلاثون ط احسب محيط الجزء المظلل.",
                "visualDescription": "دوائر متماسة تشكل منطقة مظللة مجموع أقواسها يعادل دائرة كاملة محيطها 36ط.",
                "optionTexts": [
                    "36 ط",
                    "18 ط",
                    "16 ط",
                    "12 ط"
                ],
                "mathExpressions": [
                    {
                        "latex": "\\text{Perimeter}_{\\text{shaded}} = \\text{Circumference}_{\\text{single}} = 36\\pi",
                        "spokenArabic": "محيط المظلل يساوي محيط دائرة كاملة واحدة ويساوي ستة وثلاثين ط"
                    }
                ]
            }
        }
    ]

    manifest = []

    for q in questions_def:
        rect = q["rect"]
        pix = page.get_pixmap(matrix=mat, clip=rect, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")

        draw = ImageDraw.Draw(img)

        # Clear corner if flag is set (e.g. Q17 top-left header arc)
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
            "imagePath": f"questions/v2/qudrat/quant/COL2627/p081/{filename}"
        }
        manifest.append(item)

    manifest_path = r"c:\ALMEAA MAY - codax\scratch\col2627_batch73_p081_manifest.json"
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nManifest successfully created with {len(manifest)} questions at {manifest_path}")

if __name__ == "__main__":
    build_batch73()
