import os
import sys
import json
import hashlib
import pymupdf
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

PDF_PATH = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تاسيس انشتين معدل .pdf"
TPL_PATH = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
OUTPUT_DIR = "scratch/fnd26_batch25_crops"
MANIFEST_PATH = "scratch/fnd26_batch25_manifest.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs("scratch", exist_ok=True)

DPI = 600
SCALE = DPI / 72.0

badge_tmpl = Image.open(TPL_PATH).convert("RGBA")
doc = pymupdf.open(PDF_PATH)

BATCH25_QUESTIONS = [
    # Page 50 (p=49)
    {
        "code": "QDR-QNT-FND26-P050-Q19",
        "p": 49,
        "printedQuestionNumber": 19,
        "box": (305, 52, 565, 140),
        "badge": (547.34, 75.12, 9.5),
        "text": "3 مصابيح الأول يعمل كل 3 ساعات والثاني يعمل كل 8 ساعات والثالث يعمل كل 12 ساعة ، كم مرة ستعمل جميع المصابيح في نفس الوقت خلال 80 ساعة",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["6 مرات", "4 مرات", "3 مرات", "10 مرات"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_02",
        "subSkillId": "sub_quant_02_3",
        "sectionId": "sec_sub_1777779748206_2",
        "voiceSpeech": "أهلاً بك يا بطل. لمعرفة وقت التقاء المصابيح معاً نحسب المضاعف المشترك الأصغر للفترات الزمنية ثلاثة وثمانية واثنا عشر. بتحليل الأعداد لعواملها الأولية، نجد أن المضاعف المشترك الأصغر هو أربعة وعشرون ساعة. إذن تلتقي المصابيح مرة كل أربعة وعشرين ساعة. ولمعرفة عدد المرات خلال ثمانين ساعة، نقسم ثمانين على أربعة وعشرين، والناتج هو ثلاثة مرات ويتبقى ثماني ساعات. إذن ستعمل معاً ثلاث مرات، والخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "3 مصابيح الأول يعمل كل 3 ساعات والثاني يعمل كل 8 ساعات والثالث يعمل كل 12 ساعة ، كم مرة ستعمل جميع المصابيح في نفس الوقت خلال 80 ساعة",
            "visualDescription": "مسألة دوريات وتزامن باستخدام المضاعف المشترك الأصغر للأزمنة.",
            "speechText": "ثلاثة مصابيح الأول يعمل كل ثلاثة ساعات والثاني يعمل كل ثمانية ساعات والثالث يعمل كل اثنا عشر ساعة، كم مرة ستعمل جميع المصابيح في نفس الوقت خلال ثمانين ساعة.",
            "mathExpressions": [
                {"latex": "\\text{LCM}(3, 8, 12) = 24", "spokenArabic": "المضاعف المشترك الأصغر للأعداد ثلاثة وثمانية واثنا عشر يساوي أربعة وعشرين"},
                {"latex": "\\lfloor \\frac{80}{24} \\rfloor = 3", "spokenArabic": "ثمانون تقسيم أربعة وعشرين يساوي ثلاثة والباقي ثمانية"}
            ],
            "concepts": ["المضاعف المشترك الأصغر", "مسائل التزامن والدوريات"],
            "requiredData": ["أزمنة المصابيح: 3، 8، 12 ساعة", "المدة الإجمالية: 80 ساعة"]
        }
    },
    # Page 51 (p=50) Right Column
    {
        "code": "QDR-QNT-FND26-P051-Q19",
        "p": 50,
        "printedQuestionNumber": 19,
        "box": (320, 60, 565, 98),
        "badge": (549.35, 84.45, 9.5),
        "text": "إذا كان 3/س = 3/40 أوجد 2س + 20",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["80", "90", "100", "120"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. بما أن الكسرين متساويين والبسط يساوي البسط وهو ثلاثة، فإن المقام يساوي المقام أيضاً، أي أن سين تساوي أربعين. والمطلوب إيجاد اثنين سين زائد عشرين: نعوض عن سين بأربعين، فيكون اثنين ضرب أربعين يساوي ثمانين، زائد عشرين يساوي مئة. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان 3/س = 3/40 أوجد 2س + 20",
            "visualDescription": "معادلة كسرية مباشرة: تساوي البسطين يقتضي تساوي المقامين ثم التعويض.",
            "speechText": "إذا كان ثلاثة على سين يساوي ثلاثة على أربعين أوجد اثنين سين زائد عشرين.",
            "mathExpressions": [
                {"latex": "\\frac{3}{x} = \\frac{3}{40} \\implies x = 40", "spokenArabic": "ثلاثة على سين يساوي ثلاثة على أربعين ومنها سين تساوي أربعين"},
                {"latex": "2x + 20 = 2(40) + 20 = 80 + 20 = 100", "spokenArabic": "اثنين سين زائد عشرين يساوي اثنين في أربعين زائد عشرين ويساوي مئة"}
            ],
            "concepts": ["تساوي الكسور", "التعويض في المقادير الجبرية"],
            "requiredData": ["3/س = 3/40"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q20",
        "p": 50,
        "printedQuestionNumber": 20,
        "box": (320, 168, 565, 196),
        "badge": (549.35, 183.66, 9.5),
        "text": "إذا كان س + ص = 2 ، س - ص = 4 أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["2", "3", "4", "6"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. لدينا نظام معادلتين خطيتين. بجمع المعادلتين معاً: سين زائد سين يعطي اثنين سين، وصاد ناقص صاد تُلغى، واثنان زائد أربعة يساوي ستة. إذن اثنان سين يساوي ستة، وبقسمة الطرفين على اثنين نجد أن سين تساوي ثلاثة. إذن الخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 2 ، س - ص = 4 أوجد قيمة س",
            "visualDescription": "حل نظام معادلتين آنيتين بطريقة الجمع لحذف المتغير صاد.",
            "speechText": "إذا كان سين زائد صاد يساوي اثنين، وسين ناقص صاد يساوي أربعة أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "(x+y) + (x-y) = 2 + 4 \\implies 2x = 6 \\implies x = 3", "spokenArabic": "سين زائد صاد زائد سين ناقص صاد يساوي اثنين زائد أربعة ومنها اثنين سين يساوي ستة ومنها سين تساوي ثلاثة"}
            ],
            "concepts": ["حل المعادلات الآنية بالجمع", "حذف المتغيرات"],
            "requiredData": ["س + ص = 2", "س - ص = 4"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q21",
        "p": 50,
        "printedQuestionNumber": 21,
        "box": (320, 285, 565, 315),
        "badge": (549.35, 299.17, 9.5),
        "text": "إذا كان س + ص = 4 ، س - ص = 8 أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["4", "5", "6", "8"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. نجمع المعادلتين لحذف المتغير صاد: سين زائد سين يساوي اثنين سين، موجب صاد وسالب صاد تحذفان، وأربعة زائد ثمانية يساوي اثنا عشر. إذن اثنان سين يساوي اثنا عشر، وبقسمة الطرفين على اثنين نجد أن سين تساوي ستة. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 4 ، س - ص = 8 أوجد قيمة س",
            "visualDescription": "حل معادلتين خطيتين بالجمع لإيجاد قيمة المتغير الأول.",
            "speechText": "إذا كان سين زائد صاد يساوي أربعة، وسين ناقص صاد يساوي ثمانية أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "2x = 4 + 8 = 12 \\implies x = 6", "spokenArabic": "اثنين سين يساوي أربعة زائد ثمانية ويساوي اثنا عشر ومنها سين تساوي ستة"}
            ],
            "concepts": ["المعادلات الآنية بالجمع"],
            "requiredData": ["س + ص = 4", "س - ص = 8"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q22",
        "p": 50,
        "printedQuestionNumber": 22,
        "box": (320, 411, 565, 434),
        "badge": (549.35, 424.61, 9.5),
        "text": "إذا كان س + ص = 10 ، س - ص = صفر أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["0", "5", "10", "20"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. بما أن سين ناقص صاد يساوي صفراً، فهذا يعني أن سين تساوي صاد. وبما أن مجموعهما يساوي عشرة، فإن كل منهما يساوي نصف العشرة أي خمسة. أو بجمع المعادلتين: اثنان سين يساوي عشرة، ومنها سين تساوي خمسة. إذن الخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "إذا كان س + ص = 10 ، س - ص = صفر أوجد قيمة س",
            "visualDescription": "معادلتان آنيتان حيث الفرق صفر أي أن المتغيرين متساويان.",
            "speechText": "إذا كان سين زائد صاد يساوي عشرة، وسين ناقص صاد يساوي صفر أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "x - y = 0 \\implies x = y \\implies 2x = 10 \\implies x = 5", "spokenArabic": "سين ناقص صاد يساوي صفر ومنها سين تساوي صاد ومنها اثنين سين يساوي عشرة ومنها سين تساوي خمسة"}
            ],
            "concepts": ["المعادلات الآنية وتساوي المتغيرات"],
            "requiredData": ["س + ص = 10", "س - ص = 0"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q23",
        "p": 50,
        "printedQuestionNumber": 23,
        "box": (320, 531, 565, 557),
        "badge": (549.35, 546.50, 9.5),
        "text": "إذا كان أ - ب = 5 ، ب - ج = 3 ، ج + د = 1 أوجد قيمة أ + د؟",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["7", "8", "9", "10"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. نجمع المعادلات الثلاث جميعاً: الطرف الأيمن هو (أ ناقص باء) زائد (باء ناقص جيم) زائد (جيم زائد دال). نلاحظ أن سالب باء تُلغي موجب باء، وسالب جيم تُلغي موجب جيم، فيتبقى فقط ألف زائد دال. والطرف الأيسر يساوي خمسة زائد ثلاثة زائد واحد ويساوي تسعة. إذن ألف زائد دال يساوي تسعة، والخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان أ - ب = 5 ، ب - ج = 3 ، ج + د = 1 أوجد قيمة أ + د؟",
            "visualDescription": "جمع متسلسل لثلاث معادلات خطية يؤدي لاختصار الحدود الوسطية والحصول على المطلوب مباشرة.",
            "speechText": "إذا كان ألف ناقص باء يساوي خمسة، وباء ناقص جيم يساوي ثلاثة، وجيم زائد دال يساوي واحد أوجد قيمة ألف زائد دال.",
            "mathExpressions": [
                {"latex": "(a-b) + (b-c) + (c+d) = 5 + 3 + 1 \\implies a + d = 9", "spokenArabic": "ألف ناقص باء زائد باء ناقص جيم زائد جيم زائد دال يساوي خمسة زائد ثلاثة زائد واحد ومنها ألف زائد دال يساوي تسعة"}
            ],
            "concepts": ["جمع المعادلات الخطية المتعددة", "الحذف التلسكوبي"],
            "requiredData": ["أ - ب = 5", "ب - ج = 3", "ج + د = 1"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q24",
        "p": 50,
        "printedQuestionNumber": 24,
        "box": (320, 646, 565, 696),
        "badge": (548.83, 660.21, 9.5),
        "text": "إذا كان س/ص = 4 ، ع - ص = 6 ، ع = 8 أوجد س + ص + ع",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["14", "16", "18", "20"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. نبدأ من المعلوم: عين تساوي ثمانية. نعوض في المعادلة الثانية: ثمانية ناقص صاد يساوي ستة، إذن صاد تساوي اثنين. نعوض بصاد في المعادلة الأولى: سين على اثنين يساوي أربعة، وبضرب الطرفين في اثنين نجد أن سين تساوي ثمانية. والآن نجمع سين وصاد وعين: ثمانية زائد اثنين زائد ثمانية ويساوي ثمانية عشر. إذن الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان س/ص = 4 ، ع - ص = 6 ، ع = 8 أوجد س + ص + ع",
            "visualDescription": "سلسلة تعويض تتابعي بين ثلاث معادلات لحساب ثلاث متغيرات ثم جمعها.",
            "speechText": "إذا كان سين على صاد يساوي أربعة، وعين ناقص صاد يساوي ستة، وعين يساوي ثمانية أوجد سين زائد صاد زائد عين.",
            "mathExpressions": [
                {"latex": "z = 8 \\implies 8 - y = 6 \\implies y = 2", "spokenArabic": "عين تساوي ثمانية ومنها ثمانية ناقص صاد يساوي ستة ومنها صاد تساوي اثنين"},
                {"latex": "\\frac{x}{2} = 4 \\implies x = 8", "spokenArabic": "سين على اثنين يساوي أربعة ومنها سين تساوي ثمانية"},
                {"latex": "x + y + z = 8 + 2 + 8 = 18", "spokenArabic": "سين زائد صاد زائد عين يساوي ثمانية زائد اثنين زائد ثمانية ويساوي ثمانية عشر"}
            ],
            "concepts": ["التعويض التتابعي في المعادلات", "حل المعادلات الخطية"],
            "requiredData": ["س/ص = 4", "ع - ص = 6", "ع = 8"]
        }
    },
    # Page 51 (p=50) Left Column
    {
        "code": "QDR-QNT-FND26-P051-Q25",
        "p": 50,
        "printedQuestionNumber": 25,
        "box": (55, 65, 295, 102),
        "badge": (291.26, 89.53, 9.5),
        "text": "إذا كان 2س = 6 ، س ص = صفر أوجد س + ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["0", "2", "3", "6"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. من المعادلة الأولى اثنين سين يساوي ستة، بقسمة الطرفين على اثنين نجد أن سين تساوي ثلاثة. وبما أن حاصل ضرب سين في صاد يساوي صفراً، وسين لا تساوي صفراً (لأنها ثلاثة)، فلا بد أن تكون صاد هي التي تساوي صفراً. إذن سين زائد صاد يساوي ثلاثة زائد صفر ويساوي ثلاثة. الخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان 2س = 6 ، س ص = صفر أوجد س + ص",
            "visualDescription": "خاصية الضرب الصفري: حاصل الضرب صفر وأحد العاملين غير صفري يقتضي أن الآخر صفر.",
            "speechText": "إذا كان اثنين سين يساوي ستة، وسين صاد يساوي صفر أوجد سين زائد صاد.",
            "mathExpressions": [
                {"latex": "2x = 6 \\implies x = 3", "spokenArabic": "اثنين سين يساوي ستة ومنها سين تساوي ثلاثة"},
                {"latex": "xy = 0 \\text{ and } x=3 \\implies y = 0", "spokenArabic": "سين صاد يساوي صفر وحيث أن سين تساوي ثلاثة إذن صاد تساوي صفر"},
                {"latex": "x + y = 3 + 0 = 3", "spokenArabic": "سين زائد صاد يساوي ثلاثة زائد صفر ويساوي ثلاثة"}
            ],
            "concepts": ["خاصية الضرب الصفري", "حل المعادلات البسيطة"],
            "requiredData": ["2س = 6", "س ص = 0"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q26",
        "p": 50,
        "printedQuestionNumber": 26,
        "box": (55, 203, 295, 230),
        "badge": (291.26, 218.98, 9.5),
        "text": "إذا كان س ص = صفر ، 4س = 8 أوجد 2س + ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["2", "4", "6", "8"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. من المعادلة أربعة سين يساوي ثمانية، بقسمة الطرفين على أربعة نجد أن سين تساوي اثنين. وبما أن حاصل ضرب سين في صاد يساوي صفراً، وسين تساوي اثنين، إذن صاد تساوي صفراً. والمطلوب اثنين سين زائد صاد: نعوض فيكون اثنين ضرب اثنين زائد صفر ويساوي أربعة. إذن الخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "إذا كان س ص = صفر ، 4س = 8 أوجد 2س + ص",
            "visualDescription": "خاصية الضرب الصفري مع تعويض قيمة المتغير في تعبير جبري.",
            "speechText": "إذا كان سين صاد يساوي صفر، وأربعة سين يساوي ثمانية أوجد اثنين سين زائد صاد.",
            "mathExpressions": [
                {"latex": "4x = 8 \\implies x = 2", "spokenArabic": "أربعة سين يساوي ثمانية ومنها سين تساوي اثنين"},
                {"latex": "xy = 0 \\implies y = 0", "spokenArabic": "سين صاد يساوي صفر ومنها صاد تساوي صفر"},
                {"latex": "2x + y = 2(2) + 0 = 4", "spokenArabic": "اثنين سين زائد صاد يساوي اثنين في اثنين زائد صفر ويساوي أربعة"}
            ],
            "concepts": ["خاصية الضرب الصفري", "التعويض الجبري"],
            "requiredData": ["س ص = 0", "4س = 8"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q27",
        "p": 50,
        "printedQuestionNumber": 27,
        "box": (55, 309, 295, 348),
        "badge": (290.76, 324.93, 9.5),
        "text": "أوجد قيمة (1 / 2س) + (3 / 5س)",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["4 / 7س", "11 / 10س", "11 / 10س^2", "15 / 10س"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_3",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. لجمع كسرين جبريين نوحد المقامات بطريقة المقص أو بإيجاد المضاعف المشترك الأصغر للمقامين: المقام المشترك لـ اثنين سين وخمسة سين هو عشرة سين. نضرب بسط ومقام الكسر الأول في خمسة فنحصل على خمسة على عشرة سين، ونضرب بسط ومقام الكسر الثاني في اثنين فنحصل على ستة على عشرة سين. بجمع البسطين: خمسة زائد ستة يساوي أحد عشر، والمقام يبقى عشرة سين. إذن الناتج هو أحد عشر على عشرة سين، والخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "أوجد قيمة (1 / 2س) + (3 / 5س)",
            "visualDescription": "جمع كسرين جبريين بتوحيد المقامات وتبسيط الناتج.",
            "speechText": "أوجد قيمة واحد على اثنين سين زائد ثلاثة على خمسة سين.",
            "mathExpressions": [
                {"latex": "\\frac{1}{2x} + \\frac{3}{5x} = \\frac{5(1) + 2(3)}{10x} = \\frac{5 + 6}{10x} = \\frac{11}{10x}", "spokenArabic": "واحد على اثنين سين زائد ثلاثة على خمسة سين يساوي خمسة في واحد زائد اثنين في ثلاثة على عشرة سين ويساوي أحد عشر على عشرة سين"}
            ],
            "concepts": ["جمع الكسور الجبرية", "توحيد المقامات الجبرية"],
            "requiredData": ["المقدار: 1/(2س) + 3/(5س)"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q28",
        "p": 50,
        "printedQuestionNumber": 28,
        "box": (55, 394, 295, 429),
        "badge": (290.76, 409.02, 9.5),
        "text": "إذا كان س + (1/3) = 5 + (1/3) أوجد قيمة س",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["1/3", "3", "5", "16/3"],
        "correctLetter": "ج",
        "correctIndex": 2,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. بملاحظة طرفي المعادلة، نجد أن الكسر ثلث موجود ومضاف في الطرفين. بحذف الثلث من الطرفين (أو بطرح ثلث من كلا الطرفين)، يتبقى مباشرة في الطرف الأيمن سين وفي الطرف الأيسر خمسة. إذن سين تساوي خمسة، والخيار الصحيح هو جيم.",
        "aiContext": {
            "readableText": "إذا كان س + (1/3) = 5 + (1/3) أوجد قيمة س",
            "visualDescription": "خاصية الحذف في المعادلات عند وجود مقدار مطابق في كلا الطرفين.",
            "speechText": "إذا كان سين زائد ثلث يساوي خمسة زائد ثلث أوجد قيمة سين.",
            "mathExpressions": [
                {"latex": "x + \\frac{1}{3} = 5 + \\frac{1}{3} \\implies x = 5", "spokenArabic": "سين زائد ثلث يساوي خمسة زائد ثلث وبحذف ثلث من الطرفين سين تساوي خمسة"}
            ],
            "concepts": ["خاصية الحذف في المعادلات", "حل المعادلات الخطية بالتبسيط الفوري"],
            "requiredData": ["س + 1/3 = 5 + 1/3"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q29",
        "p": 50,
        "printedQuestionNumber": 29,
        "box": (55, 473, 295, 507),
        "badge": (290.76, 494.53, 9.5),
        "text": "إذا كان ص + (1/4) = 12 + (1/4) أوجد قيمة ص",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["4", "12", "48", "49/4"],
        "correctLetter": "ب",
        "correctIndex": 1,
        "type": "mcq",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_2",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "مرحباً يا بطل. نحذف الكسر ربع المشترك من طرفي المعادلة، فيتبقى لنا في الطرف الأيمن صاد وفي الطرف الأيسر اثنا عشر. إذن قيمة صاد تساوي اثنا عشر، والخيار الصحيح هو باء.",
        "aiContext": {
            "readableText": "إذا كان ص + (1/4) = 12 + (1/4) أوجد قيمة ص",
            "visualDescription": "حذف الحدود المتطابقة من طرفي المعادلة لحساب قيمة المتغير فورياً.",
            "speechText": "إذا كان صاد زائد ربع يساوي اثنا عشر زائد ربع أوجد قيمة صاد.",
            "mathExpressions": [
                {"latex": "y + \\frac{1}{4} = 12 + \\frac{1}{4} \\implies y = 12", "spokenArabic": "صاد زائد ربع يساوي اثنا عشر زائد ربع وبحذف ربع من الطرفين صاد تساوي اثنا عشر"}
            ],
            "concepts": ["خاصية الحذف في المعادلات"],
            "requiredData": ["ص + 1/4 = 12 + 1/4"]
        }
    },
    {
        "code": "QDR-QNT-FND26-P051-Q30",
        "p": 50,
        "printedQuestionNumber": 30,
        "box": (55, 537, 295, 635),
        "badge": (289.76, 554.24, 9.5),
        "text": "إذا كان أ ، ب أعداد صحيحة موجبة قارن بين: القيمة الأولى ((1/أ) + (1/ب)) والقيمة الثانية (1 / (أ + ب))",
        "options": ["أ", "ب", "ج", "د"],
        "optionTexts": ["القيمة الأولى أكبر", "القيمة الثانية أكبر", "القيمتان متساويتان", "المعطيات غير كافية"],
        "correctLetter": "أ",
        "correctIndex": 0,
        "type": "comparison",
        "mainSkillId": "skill_quant_07",
        "subSkillId": "sub_quant_07_3",
        "sectionId": "sec_sub_1777779748206_7",
        "voiceSpeech": "أهلاً بك يا بطل. نوحد مقامات القيمة الأولى فتصبح (ألف زائد باء) على (ألف ضرب باء)، بينما القيمة الثانية هي واحد على (ألف زائد باء). ولتسهيل المقارنة نجرب قيماً عددية موجبة، مثلاً ألف يساوي اثنين وباء يساوي ثلاثة: القيمة الأولى تصبح نصف زائد ثلث أي خمسة على ستة. بينما القيمة الثانية تصبح واحد على (اثنين زائد ثلاثة) أي خمس أو واحد على خمسة. وبما أن خمسة أسداس أكبر بكثير من الخمس، فالقيمة الأولى أكبر دائماً لأي أعداد صحيحة موجبة. إذن الخيار الصحيح هو ألف.",
        "aiContext": {
            "readableText": "إذا كان أ ، ب أعداد صحيحة موجبة قارن بين: القيمة الأولى ((1/أ) + (1/ب)) والقيمة الثانية (1 / (أ + ب))",
            "visualDescription": "مقارنة جبرية بين مجموع مقلوبي عددين ومقلوب مجموعهما للأعداد الصحيحة الموجبة.",
            "speechText": "إذا كان ألف وباء أعداد صحيحة موجبة قارن بين القيمة الأولى واحد على ألف زائد واحد على باء، والقيمة الثانية واحد على ألف زائد باء.",
            "mathExpressions": [
                {"latex": "\\text{Value 1} = \\frac{1}{a} + \\frac{1}{b} = \\frac{a+b}{ab}", "spokenArabic": "القيمة الأولى تساوي واحد على ألف زائد واحد على باء وتساوي ألف زائد باء على ألف باء"},
                {"latex": "\\text{Value 2} = \\frac{1}{a+b}", "spokenArabic": "القيمة الثانية تساوي واحد على ألف زائد باء"},
                {"latex": "\\text{Let } a=2, b=3 \\implies \\frac{5}{6} > \\frac{1}{5} \\implies \\text{Value 1} > \\text{Value 2}", "spokenArabic": "بفرض ألف يساوي اثنين وباء يساوي ثلاثة يكون خمسة على ستة أكبر من خمس إذن القيمة الأولى أكبر"}
            ],
            "concepts": ["مقارنة المقادير النسبية", "خصائص الأعداد الصحيحة الموجبة ومقلوباتها"],
            "requiredData": ["أ ، ب أعداد صحيحة موجبة", "القيمة الأولى: 1/أ + 1/ب", "القيمة الثانية: 1/(أ + ب)"]
        }
    }
]

# Cache rendered pages
rendered_pages = {}
for pno in [49, 50]:
    page = doc[pno]
    mat = pymupdf.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    rendered_pages[pno] = img

manifest_items = []

for q in BATCH25_QUESTIONS:
    pno = q["p"]
    page_img = rendered_pages[pno].copy()
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
            "batch": "FND26_BATCH_25"
        }
    }
    manifest_items.append(item)
    print(f"Processed {q['code']}: {crop.width}x{crop.height} ({len(file_bytes)} bytes)")

manifest_data = {
    "batch": "FND26_BATCH_25",
    "totalQuestions": len(manifest_items),
    "items": manifest_items
}

with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)

print(f"\nManifest saved to {MANIFEST_PATH} with {len(manifest_items)} questions.")

