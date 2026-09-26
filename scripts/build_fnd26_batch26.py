import os
import sys
import json
import hashlib
import pymupdf
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

PDF_PATH = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تاسيس انشتين معدل .pdf"
TPL_PATH = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
OUTPUT_DIR = "scratch/fnd26_batch26_crops"
MANIFEST_PATH = "scratch/fnd26_batch26_manifest.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs("scratch", exist_ok=True)

DPI = 600
SCALE = DPI / 72.0

badge_tmpl = Image.open(TPL_PATH).convert("RGBA")
doc = pymupdf.open(PDF_PATH)

BATCH26_QUESTIONS = [
    # Page 52 (p=51) Right Column
    {
        "code": "QDR-QNT-FND26-P052-Q31",
        "p": 51,
        "printedQuestionNumber": 31,
        "box": (315, 60, 565, 118),
        "badge": (548.6, 87.9, 9.5),
        "text": "أوجد المعادلة التي تمثل هذه العبارة : أقل من 3 أمثال عدد بـ 20 يساوي 70 أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["20", "25", "30", "35"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. نحول العبارة اللفظية إلى معادلة جبرية: ثلاثة أمثال العدد تعني ثلاثة سين، وأقل منها بعشرين تعني ناقص عشرين، وتساوي سبعين، فتكون المعادلة: ثلاثة سين ناقص عشرين يساوي سبعين. بإضافة عشرين للطرفين: ثلاثة سين يساوي تسعين. وبقسمة الطرفين على ثلاثة نجد أن سين تساوي ثلاثين. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "أوجد المعادلة التي تمثل هذه العبارة : أقل من 3 أمثال عدد بـ 20 يساوي 70 أوجد قيمة س",
            "visualDescription": "ترجمة عبارة لفظية إلى معادلة خطية وحلها.",
            "speechText": "أوجد المعادلة التي تمثل هذه العبارة: أقل من ثلاثة أمثال عدد بعشرين يساوي سبعين، أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "3x - 20 = 70 \\implies 3x = 90 \\implies x = 30", "spokenArabic": "ثلاثة سين ناقص عشرين يساوي سبعين ومنها ثلاثة سين يساوي تسعين ومنها سين تساوي ثلاثين"}
            ],
            "concepts": ["ترجمة العبارات اللفظية إلى معادلات", "حل المعادلات الخطية من الدرجة الأولى"],
            "requiredData": ["أقل من 3 أمثال عدد بـ 20 يساوي 70"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q32",
        "p": 51,
        "printedQuestionNumber": 32,
        "box": (315, 220, 565, 268),
        "badge": (549.4, 239.0, 9.5),
        "text": "العبارة الجبرية التي تمثل 5 أمثال عدد أقل من 30 يساوي 20 أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["5", "10", "15", "20"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. العبارة خمسة أمثال عدد أقل من ثلاثين يساوي عشرين تعني: خمسة سين ناقص ثلاثين يساوي عشرين. وبنقل سالب ثلاثين للطرف الآخر تصبح: خمسة سين يساوي عشرين زائد ثلاثين أي خمسين. وبقسمة الطرفين على خمسة نجد أن سين تساوي عشرة. إذن الخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "العبارة الجبرية التي تمثل 5 أمثال عدد أقل من 30 يساوي 20 أوجد قيمة س",
            "visualDescription": "صياغة معادلة خطية من نص لفظي وإيجاد المجهول.",
            "speechText": "العبارة الجبرية التي تمثل خمسة أمثال عدد أقل من ثلاثين يساوي عشرين، أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "5x - 30 = 20 \\implies 5x = 50 \\implies x = 10", "spokenArabic": "خمسة سين ناقص ثلاثين يساوي عشرين ومنها خمسة سين يساوي خمسين ومنها سين تساوي عشرة"}
            ],
            "concepts": ["المعادلات الخطية اللفظية"],
            "requiredData": ["5 أمثال عدد أقل من 30 يساوي 20"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q33",
        "p": 51,
        "printedQuestionNumber": 33,
        "box": (315, 310, 565, 360),
        "badge": (549.4, 327.5, 9.5),
        "text": "إذا كان س + ص = 4 ، س و ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["2", "3", "4", "6"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. قاعدة ذهبية في القدرات: عندما يكون مجموع عددين ثابتاً، فإن أكبر حاصل ضرب لهما يتحقق عندما يكون العددان متساويين قدر الإمكان. نقسم أربعة على اثنين فنحصل على اثنين، إذن نضع سين تساوي اثنين وصاد تساوي اثنين، ويكون حاصل ضربهما اثنين في اثنين ويساوي أربعة. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 4 ، س و ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
            "visualDescription": "تعظيم حاصل ضرب متغيرين مجموعهما ثابت للأعداد الصحيحة الموجبة.",
            "speechText": "إذا كان سين زائد صاد يساوي أربعة، وسين وصاد أعداد صحيحة موجبة أوجد أكبر عدد ممكن لحاصل ضرب سين في صاد.",
            "mathExpressions": [
                {"latex": "x = y = \\frac{4}{2} = 2 \\implies xy = 2 \\times 2 = 4", "spokenArabic": "سين يساوي صاد ويساوي أربعة على اثنين ويساوي اثنين ومنها حاصل ضربهما يساوي اثنين في اثنين ويساوي أربعة"}
            ],
            "concepts": ["تعظيم حاصل الضرب لمجموع ثابت", "خواص الأعداد الصحيحة"],
            "requiredData": ["س + ص = 4", "س، ص أعداد صحيحة موجبة"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q34",
        "p": 51,
        "printedQuestionNumber": 34,
        "box": (315, 465, 565, 518),
        "badge": (549.3, 485.1, 9.5),
        "text": "إذا كان س + ص = 6 ، س ، ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["6", "8", "9", "12"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. للحصول على أكبر حاصل ضرب لعددين مجموعهما ستة، نجعلهما متساويين: نصف الستة هو ثلاثة، إذن نختار سين تساوي ثلاثة وصاد تساوي ثلاثة، فيكون حاصل ضربهما ثلاثة ضرب ثلاثة ويساوي تسعة. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 6 ، س ، ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
            "visualDescription": "تعظيم حاصل الضرب لمجموع 6.",
            "speechText": "إذا كان سين زائد صاد يساوي ستة، وسين وصاد أعداد صحيحة موجبة أوجد أكبر عدد ممكن لحاصل ضرب سين في صاد.",
            "mathExpressions": [
                {"latex": "x = y = 3 \\implies xy = 3 \\times 3 = 9", "spokenArabic": "سين يساوي صاد ويساوي ثلاثة ومنها حاصل ضربهما يساوي ثلاثة في ثلاثة ويساوي تسعة"}
            ],
            "concepts": ["تعظيم حاصل الضرب لمجموع ثابت"],
            "requiredData": ["س + ص = 6", "س، ص أعداد صحيحة موجبة"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q35",
        "p": 51,
        "printedQuestionNumber": 35,
        "box": (315, 558, 565, 612),
        "badge": (549.3, 576.0, 9.5),
        "text": "إذا كان س + ص = 8 ، س ، ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["12", "14", "15", "16"],
        "correctLetter": "د",
        "correctIndex": 3,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. أكبر حاصل ضرب يتحقق عند تساوي العددين: ثمانية تقسيم اثنين يساوي أربعة. إذن سين تساوي أربعة وصاد تساوي أربعة، وحاصل ضربهما أربعة ضرب أربعة ويساوي ستة عشر. إذن الخيار الصحيح هو دال.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 8 ، س ، ص أعداد صحيحة موجبة أوجد أكبر عدد ممكن لـ س × ص",
            "visualDescription": "تعظيم حاصل الضرب لمجموع 8.",
            "speechText": "إذا كان سين زائد صاد يساوي ثمانية، وسين وصاد أعداد صحيحة موجبة أوجد أكبر عدد ممكن لحاصل ضرب سين في صاد.",
            "mathExpressions": [
                {"latex": "x = y = 4 \\implies xy = 4 \\times 4 = 16", "spokenArabic": "سين يساوي صاد ويساوي أربعة ومنها حاصل ضربهما يساوي أربعة في أربعة ويساوي ستة عشر"}
            ],
            "concepts": ["تعظيم حاصل الضرب لمجموع ثابت"],
            "requiredData": ["س + ص = 8", "س، ص أعداد صحيحة موجبة"]
        }
    },
    # Page 52 (p=51) Left Column
    {
        "code": "QDR-QNT-FND26-P052-Q36",
        "p": 51,
        "printedQuestionNumber": 36,
        "box": (55, 60, 295, 144),
        "badge": (285.0, 87.9, 9.5),
        "text": "أوجد قيمة س التي تحقق المعادلة : 4س^2 - س + 4 = س + 3س^2 + 3",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["1", "2", "3", "4"],
        "correctLetter": "أ",
        "correctIndex": 0,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_1",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. ننقل جميع الحدود إلى الطرف الأيمن: أربعة سين تربيع ناقص ثلاثة سين تربيع تعطي سين تربيع، وسالب سين ناقص سين تعطي سالب اثنين سين، وموجب أربعة ناقص ثلاثة تعطي موجب واحد، فتصبح المعادلة: سين تربيع ناقص اثنين سين زائد واحد يساوي صفراً. هذا مقدار ثلاثي مربع كامل مفكوكه (سين ناقص واحد) الكل تربيع يساوي صفراً. وبأخذ الجذر التربيعي: سين ناقص واحد يساوي صفراً، ومنها سين تساوي واحداً. إذن الخيار الصحيح هو ألف.",
        "aiContext": {
            "readableText": "أوجد قيمة س التي تحقق المعادلة : 4س^2 - س + 4 = س + 3س^2 + 3",
            "visualDescription": "تبسيط معادلة تربيعية واختزالها لمربع كامل لإيجاد قيمة س.",
            "speechText": "أوجد قيمة سين التي تحقق المعادلة: أربعة سين تربيع ناقص سين زائد أربعة يساوي سين زائد ثلاثة سين تربيع زائد ثلاثة.",
            "mathExpressions": [
                {"latex": "(4x^2 - 3x^2) + (-x - x) + (4 - 3) = 0 \\implies x^2 - 2x + 1 = 0 \\implies (x-1)^2 = 0 \\implies x = 1", "spokenArabic": "سين تربيع ناقص اثنين سين زائد واحد يساوي صفر ومنها القوس سين ناقص واحد الكل تربيع يساوي صفر ومنها سين تساوي واحد"}
            ],
            "concepts": ["المربع الكامل", "حل المعادلات التربيعية"],
            "requiredData": ["4س^2 - س + 4 = س + 3س^2 + 3"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q37",
        "p": 51,
        "printedQuestionNumber": 37,
        "box": (55, 272, 295, 338),
        "badge": (286.8, 282.7, 9.5),
        "text": "أي المعادلات الآتية لها أكثر من حل؟",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["5س - 3 = 5س - 3", "5س - 4 = 2س + 3", "4س - 12 = 2س + 6", "16س - 4 = 4س + 3"],
        "correctLetter": "أ",
        "correctIndex": 0,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_1",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. المعادلة التي لها أكثر من حل (أي عدد لا نهائي من الحلول) هي المتطابقة الجبرية التي يتطابق فيها الطرف الأيمن مع الطرف الأيسر تماماً لجميع قيم المتغير. نلاحظ في الخيار ألف أن الطرف الأيمن خمسة سين ناقص ثلاثة يطابق تماماً الطرف الأيسر خمسة سين ناقص ثلاثة، وتتحقق لأي قيمة نضعها لسين. إذن الخيار الصحيح هو ألف.",
        "aiContext": {
            "readableText": "أي المعادلات الآتية لها أكثر من حل؟ الخيارات: أ) 5س - 3 = 5س - 3 ، ب) 5س - 4 = 2س + 3 ، ج) 4س - 12 = 2س + 6 ، د) 16س - 4 = 4س + 3",
            "visualDescription": "التمييز بين المعادلة ذات الحل الوحيد والمتطابقة التي لها عدد لا نهائي من الحلول.",
            "speechText": "أي المعادلات الآتية لها أكثر من حل؟ الخيار ألف خمسة سين ناقص ثلاثة يساوي خمسة سين ناقص ثلاثة.",
            "mathExpressions": [
                {"latex": "5x - 3 = 5x - 3 \\implies 0 = 0 \\implies \\text{عدد لا نهائي من الحلول (متطابقة)}", "spokenArabic": "خمسة سين ناقص ثلاثة يساوي خمسة سين ناقص ثلاثة يمثل متطابقة لها عدد لا نهائي من الحلول"}
            ],
            "concepts": ["المتطابقات الجبرية", "عدد حلول المعادلات"],
            "requiredData": ["المعادلات الأربعة المعطاة في الخيارات"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q38",
        "p": 51,
        "printedQuestionNumber": 38,
        "box": (40, 395, 295, 464),
        "badge": (286.8, 414.0, 9.5),
        "text": "أي المعادلات الآتية لها أكثر من حل؟",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["2(3س + 10) = 6س + 10", "3(2س + 4) = 6س + 12", "س + 10 = 2س + 5", "س - 4 = س + 4"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_1",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. نبحث عن المعادلة التي تمثل متطابقة. في الخيار باء: الطرف الأيمن هو ثلاثة ضرب القوس اثنين سين زائد أربعة، بتوزيع الضرب داخل القوس نحصل على: ثلاثة ضرب اثنين سين يساوي ستة سين، زائد ثلاثة ضرب أربعة يساوي اثنا عشر، فيكون الطرف الأيمن هو ستة سين زائد اثنا عشر وهو مطابق تماماً للطرف الأيسر ستة سين زائد اثنا عشر. إذن لها عدد لا نهائي من الحلول، والخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "أي المعادلات الآتية لها أكثر من حل؟ الخيارات: أ) 2(3س + 10) = 6س + 10 ، ب) 3(2س + 4) = 6س + 12 ، ج) س + 10 = 2س + 5 ، د) س - 4 = س + 4",
            "visualDescription": "تطبيق خاصية التوزيع لإثبات تطابق طرفي المعادلة ووجود عدد لا نهائي من الحلول.",
            "speechText": "أي المعادلات الآتية لها أكثر من حل؟ الخيار باء ثلاثة في القوس اثنين سين زائد أربعة يساوي ستة سين زائد اثنا عشر.",
            "mathExpressions": [
                {"latex": "3(2x + 4) = 6x + 12 = 6x + 12 \\implies \\text{متطابقة ولها عدد لا نهائي من الحلول}", "spokenArabic": "ثلاثة في اثنين سين زائد أربعة بالتوزيع يساوي ستة سين زائد اثنا عشر وهو مطابق للطرف الأيسر"}
            ],
            "concepts": ["خاصية التوزيع", "المتطابقات الجبرية"],
            "requiredData": ["خيارات المعادلات المعطاة"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q39",
        "p": 51,
        "printedQuestionNumber": 39,
        "box": (55, 532, 295, 560),
        "badge": (282.7, 549.2, 9.5),
        "text": "إذا كان ص - 4 > 5 أوجد قيمة ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["ص > 1", "ص > 5", "ص > 9", "ص < 9"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_4",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. لحل المتباينة ص ناقص أربعة أكبر من خمسة، نضيف أربعة إلى كلا الطرفين للتخلص من سالب أربعة. فيكون الطرف الأيمن ص، والطرف الأيسر خمسة زائد أربعة ويساوي تسعة، وتبقى إشارة التباين كما هي لأن الجمع لا يغير اتجاه المتباينة. إذن صاد أكبر من تسعة، والخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان ص - 4 > 5 أوجد قيمة ص",
            "visualDescription": "حل متباينة خطية بسيطة بالجمع.",
            "speechText": "إذا كان صاد ناقص أربعة أكبر من خمسة أوجد قيمة صاد.",
            "mathExpressions": [
                {"latex": "y - 4 > 5 \\implies y > 5 + 4 \\implies y > 9", "spokenArabic": "صاد ناقص أربعة أكبر من خمسة ومنها صاد أكبر من خمسة زائد أربعة ومنها صاد أكبر من تسعة"}
            ],
            "concepts": ["حل المتباينات الخطية", "خاصية الجمع في المتباينات"],
            "requiredData": ["ص - 4 > 5"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q40",
        "p": 51,
        "printedQuestionNumber": 40,
        "box": (55, 595, 295, 621),
        "badge": (280.9, 609.7, 9.5),
        "text": "إذا كان 4 - 2ص <= -8 أوجد قيمة ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["ص <= 2", "ص >= 6", "ص <= 6", "ص >= -6"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_4",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. نبدأ بطرح أربعة من الطرفين: سالب اثنين صاد أصغر من أو يساوي سالب ثمانية ناقص أربعة أي سالب اثنا عشر. والآن انتبه جيداً: عند القسمة على عدد سالب في المتباينة نعكس اتجاه إشارة التباين، فتتحول من أصغر من أو يساوي إلى أكبر من أو يساوي. وبقسمة سالب اثنا عشر على سالب اثنين نحصل على موجب ستة. إذن صاد أكبر من أو تساوي ستة، والخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "إذا كان 4 - 2ص <= -8 أوجد قيمة ص",
            "visualDescription": "حل متباينة خطية تتطلب قسمة على معامل سالب وعكس إشارة التباين.",
            "speechText": "إذا كان أربعة ناقص اثنين صاد أصغر من أو يساوي سالب ثمانية أوجد قيمة صاد.",
            "mathExpressions": [
                {"latex": "4 - 2y \\le -8 \\implies -2y \\le -12 \\implies y \\ge \\frac{-12}{-2} = 6", "spokenArabic": "أربعة ناقص اثنين صاد أصغر من أو يساوي سالب ثمانية ومنها سالب اثنين صاد أصغر من أو يساوي سالب اثنا عشر وبالقسمة على سالب اثنين نعكس الإشارة صاد أكبر من أو تساوي ستة"}
            ],
            "concepts": ["عكس إشارة المتباينة عند القسمة على سالب", "حل المتباينات"],
            "requiredData": ["4 - 2ص <= -8"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P052-Q41",
        "p": 51,
        "printedQuestionNumber": 41,
        "box": (55, 692, 295, 720),
        "badge": (283.8, 709.7, 9.5),
        "text": "حل المتباينة 9 < 2س + 3 < 13",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["2 < س < 4", "3 < س < 5", "4 < س < 6", "3 < س < 6"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_4",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. لدينا متباينة مزدوجة: تسعة أصغر من اثنين سين زائد ثلاثة أصغر من ثلاثة عشر. نطرح ثلاثة من جميع الأطراف: تسعة ناقص ثلاثة يعطي ستة، واثنان سين تظل بالوسط، وثلاثة عشر ناقص ثلاثة يعطي عشرة، فيصبح لدينا ستة أصغر من اثنين سين أصغر من عشرة. والآن نقسم جميع الأطراف على اثنين: ستة تقسيم اثنين يساوي ثلاثة، وعشرة تقسيم اثنين يساوي خمسة. إذن ثلاثة أصغر من سين أصغر من خمسة. الخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "حل المتباينة 9 < 2س + 3 < 13",
            "visualDescription": "حل متباينة مزدوجة ذات ثلاثة أطراف.",
            "speechText": "حل المتباينة تسعة أصغر من اثنين سين زائد ثلاثة أصغر من ثلاثة عشر.",
            "mathExpressions": [
                {"latex": "9 < 2x + 3 < 13 \\implies 9-3 < 2x < 13-3 \\implies 6 < 2x < 10 \\implies 3 < x < 5", "spokenArabic": "تسعة أصغر من اثنين سين زائد ثلاثة أصغر من ثلاثة عشر ومنها ستة أصغر من اثنين سين أصغر من عشرة ومنها ثلاثة أصغر من سين أصغر من خمسة"}
            ],
            "concepts": ["المتباينات المزدوجة", "خصائص التباين"],
            "requiredData": ["9 < 2س + 3 < 13"]
        }
    }
]

page = doc[51]
mat = pymupdf.Matrix(SCALE, SCALE)
pix = page.get_pixmap(matrix=mat, alpha=False)
p52_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

manifest_items = []

for q in BATCH26_QUESTIONS:
    page_img = p52_img.copy()
    x0, y0, x1, y1 = q["box"]
    
    # Badge mask
    bx, by, br = q["badge"]
    bw = int(br * 2 * SCALE * 1.05)
    scaled_tmpl = badge_tmpl.resize((bw, bw), Image.Resampling.LANCZOS)
    px = int((bx - br * 1.05) * SCALE)
    py = int((by - br * 1.05) * SCALE)
    page_img.paste(scaled_tmpl, (px, py), scaled_tmpl)
    
    crop = page_img.crop((int(x0 * SCALE), int(y0 * SCALE), int(x1 * SCALE), int(y1 * SCALE)))
    out_name = f"{q['code']}.webp"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    crop.save(out_path, "WEBP", lossless=True)
    
    with open(out_path, "rb") as f:
        file_bytes = f.read()
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    
    item = {
        "questionCode": q["code"],
        "pdfPageIndex": q["p"] + 1,
        "printedQuestionNumber": q["printedQuestionNumber"],
        "cropBox": list(q["box"]),
        "badgeCenter": list(q["badge"]),
        "imageFileName": out_name,
        "localImagePath": os.path.join(OUTPUT_DIR, out_name),
        "sha256": sha256,
        "width": crop.width,
        "height": crop.height,
        "questionText": q["text"],
        "options": q["options"],
        "optionTexts": q["optionTexts"],
        "correctOptionLetter": q["correctLetter"],
        "correctOptionIndex": q["correctIndex"],
        "type": q["type"],
        "mainSkillId": q["mainSkillId"],
        "subSkillId": q["subSkillId"],
        "sectionId": q["sectionId"],
        "voiceExplanationText": q["voiceSpeech"],
        "aiContext": q["aiContext"],
        "sourceMeta": {
            "book": "تاسيس انشتين معدل",
            "page": q["p"] + 1,
            "printedNumber": q["printedQuestionNumber"],
            "batch": "FND26_BATCH_26"
        }
    }
    manifest_items.append(item)
    print(f"Processed {q['code']}: {crop.width}x{crop.height} ({len(file_bytes)} bytes)")

manifest_data = {
    "batch": "FND26_BATCH_26",
    "totalQuestions": len(manifest_items),
    "items": manifest_items
}

with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)

print(f"\nManifest saved to {MANIFEST_PATH} with {len(manifest_items)} questions.")
