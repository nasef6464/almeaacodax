import os
import json
import fitz
from PIL import Image, ImageDraw

def build_batch75():
    pdf_path = r"C:\تحليل الكتاب في اس اكود\كتب ومصادر\ناصف\كتب معدلة\مصدر المنصة كمي\تجميع انشيتن معدل.pdf"
    doc = fitz.open(pdf_path)
    page = doc[82] # Page 83 (0-indexed 82)

    badge_path = r"C:\Users\nasef\.gemini\antigravity\brain\0333e05b-8659-4d06-8a59-27fbaa9366a8\badge_clean_template.png"
    badge_img = Image.open(badge_path).convert("RGBA")

    scale = 600 / 72.0
    mat = fitz.Matrix(scale, scale)

    out_img_dir = "public/questions/v2/qudrat/quant/COL2627/p083"
    os.makedirs(out_img_dir, exist_ok=True)

    questions_def = [
        {
            "code": "QDR-QNT-COL2627-P083-Q33",
            "page": 83,
            "qNum": 33,
            "rect": fitz.Rect(303.0, 85.5, 565.0, 241.0),
            "badge_center": (548.0, 106.6),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_3",
            "correctIndex": 0,
            "text": "إذا كان محيط المستطيل يساوي محيط المربع ، فقارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "مرحباً يا بطل. قاعدة هندسية هامة: عند تساوي المحيط لجميع الأشكال الرباعية، فإن المربع دائماً يمتلك المساحة الكبرى على الإطلاق مقارنة بأي مستطيل آخر غير مربع. على سبيل المثال، إذا كان المحيط عشرين، فإن ضلع المربع خمسة ومساحته خمسة وعشرون، بينما مستطيل بأبعاد ستة وأربعة له نفس المحيط لكن مساحته أربعة وعشرون فقط وهي أقل من مساحة المربع. إذن مساحة المربع أكبر دائماً من مساحة المستطيل، فالقيمة الأولى أكبر. والخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "إذا كان محيط المستطيل يساوي محيط المربع ، فقارن بين: القيمة الأولى: مساحة المربع، القيمة الثانية: مساحة المستطيل. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "إذا كان محيط المستطيل يساوي محيط المربع فقارن بين مساحة المربع ومساحة المستطيل.",
                "visualDescription": "جدول مقارنة كمية بين مساحة المربع ومساحة المستطيل عند تساوي المحيطين.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "P_{\\text{square}} = P_{\\text{rect}} \\implies A_{\\text{square}} > A_{\\text{rect}} \\quad (\\text{for non-square rectangle})",
                        "spokenArabic": "إذا تساوى محيط المربع والمستطيل فإن مساحة المربع تكون أكبر دائما من مساحة المستطيل فالقيمة الأولى أكبر"
                    }
                ]
            }
        },
        {
            "code": "QDR-QNT-COL2627-P083-Q34",
            "page": 83,
            "qNum": 34,
            "rect": fitz.Rect(303.0, 277.5, 565.0, 454.0),
            "badge_center": (548.6, 299.0),
            "badge_radius": 11.5,
            "sectionId": "sec_sub_1777779748206_24",
            "mainSkillId": "skill_quant_24",
            "subSkillId": "sub_quant_24_1",
            "correctIndex": 0,
            "text": "تم تقسيم سلك إلى قسمين متساويين ، صنع من الأول دائرة وصنع من الثاني مستطيل، قارن بين:",
            "type": "quantitative_comparison",
            "options": ["أ", "ب", "ج", "د"],
            "optionTexts": [
                "القيمة الأولى أكبر",
                "القيمة الثانية أكبر",
                "القيمتان متساويتان",
                "المعطيات غير كافية"
            ],
            "voiceSpeech": "أهلاً بك. بما أن السلك قُسم إلى قسمين متساويين، فإن محيط الدائرة يساوي محيط المستطيل. والقاعدة الهندسية الشهيرة تنص على أنه عند ثبوت المحيط فإن الدائرة تعطي أكبر مساحة ممكنة بين جميع الأشكال الهندسية المغلقة على الإطلاق، ومساحتها أكبر من مساحة أي مضلع كالمستطيل أو المربع. وبالتالي فإن مساحة الدائرة أكبر قطعاً من مساحة المستطيل. إذن القيمة الأولى أكبر، والخيار الصحيح هو أ.",
            "aiContext": {
                "readableText": "تم تقسيم سلك إلى قسمين متساويين ، صنع من الأول دائرة وصنع من الثاني مستطيل، قارن بين: القيمة الأولى: مساحة الدائرة، القيمة الثانية: مساحة المستطيل. الخيارات: أ: القيمة الأولى أكبر، ب: القيمة الثانية أكبر، ج: القيمتان متساويتان، د: المعطيات غير كافية.",
                "speechText": "قسم سلك لقسمين متساويين صنع من الأول دائرة ومن الثاني مستطيل، قارن بين مساحة الدائرة ومساحة المستطيل.",
                "visualDescription": "جدول مقارنة كمية بين مساحة الدائرة ومساحة المستطيل عند تساوي محيطيهما.",
                "optionTexts": [
                    "القيمة الأولى أكبر",
                    "القيمة الثانية أكبر",
                    "القيمتان متساويتان",
                    "المعطيات غير كافية"
                ],
                "mathExpressions": [
                    {
                        "latex": "P_{\\text{circle}} = P_{\\text{rect}} = L \\implies A_{\\text{circle}} = \\frac{L^2}{4\\pi} > A_{\\text{rect}} \\le \\frac{L^2}{16}",
                        "spokenArabic": "مساحة الدائرة تساوي لام تربيع على أربعة ط وهي أكبر من مساحة المستطيل التي لا تتجاوز لام تربيع على ستة عشر فالقيمة الأولى أكبر"
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
            "imagePath": f"questions/v2/qudrat/quant/COL2627/p083/{filename}"
        }
        manifest_items.append(item)

    manifest_path = "scratch/col2627_batch75_p083_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_items, f, ensure_ascii=False, indent=2)

    print(f"\nManifest successfully created with {len(manifest_items)} questions at {manifest_path}")

if __name__ == "__main__":
    build_batch75()
