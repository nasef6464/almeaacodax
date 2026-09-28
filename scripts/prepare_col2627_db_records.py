import json
import os
import re

def prepare_db_batch():
    manifest_path = "scratch/col2627_full_manifest_consolidated.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    print(f"Loaded {len(items)} questions from {manifest_path}...")

    PATH_ID = "p_1777779639431"
    SUBJECT_ID = "sub_1777779748206"
    DOC_CODE = "COL2627"
    DOC_TITLE = "تجميع اينشتاين المحوسب - كمي"

    db_items = []
    errors = []

    for it in items:
        q_code = it.get("code") or it.get("questionCode")
        
        # Parse canonical question code: QDR-QNT-COL2627-P005-Q01
        m = re.match(r"^QDR-QNT-COL2627-P(\d{3})-Q(\d{2,})$", q_code)
        if not m:
            errors.append(f"Invalid questionCode format: {q_code}")
            continue
        
        printed_page = int(m.group(1))
        q_num = int(m.group(2))
        pdf_page_index = printed_page # 1-indexed printed page in doc

        source_item_id = f"COL2627-PDF{pdf_page_index-1:03d}-P{printed_page:03d}-N{q_num:02d}"

        # Main skill, subskill, section
        main_skill_id = it.get("mainSkillId") or it.get("skillId")
        sub_skill_id = it.get("subSkillId")
        section_id = it.get("sectionId")

        if not main_skill_id or not sub_skill_id or not section_id:
            errors.append(f"Missing taxonomy in {q_code}: main={main_skill_id}, sub={sub_skill_id}, sec={section_id}")
            continue

        skill_ids = [main_skill_id, sub_skill_id]

        # Options
        options = ["أ", "ب", "ج", "د"]
        correct_index = it.get("correctIndex") if it.get("correctIndex") is not None else it.get("correctOptionIndex")
        if correct_index not in [0, 1, 2, 3]:
            errors.append(f"Invalid correctIndex {correct_index} in {q_code}")
            continue

        # AI context
        ai_ctx = it.get("aiContext") or {}
        readable_text = ai_ctx.get("readableText") or it.get("text", "")
        speech_text = ai_ctx.get("speechText") or it.get("voiceSpeech", "")
        visual_desc = ai_ctx.get("visualDescription") or ""
        option_texts = it.get("optionTexts") or ai_ctx.get("optionTexts") or ["أ", "ب", "ج", "د"]
        math_exprs = ai_ctx.get("mathExpressions") or []

        ai_context = {
            "readableText": readable_text,
            "speechText": speech_text,
            "visualDescription": visual_desc,
            "optionTexts": option_texts,
            "mathExpressions": math_exprs,
            "concepts": ai_ctx.get("concepts", []),
            "requiredData": ai_ctx.get("requiredData", []),
            "version": 1
        }

        # Voice explanation
        voice_text = it.get("voiceSpeech") or (it.get("voiceExplanation", {}).get("text") if isinstance(it.get("voiceExplanation"), dict) else "") or speech_text
        voice_explanation = {
            "text": voice_text,
            "audioUrl": "",
            "audioMimeType": "audio/mp3",
            "version": 1
        }

        # Image & Hash
        image_url = it.get("publicImageUrl")
        if not image_url:
            errors.append(f"Missing publicImageUrl in {q_code}")
            continue

        image_hash = it.get("imageHash")
        if not image_hash:
            errors.append(f"Missing imageHash in {q_code}")
            continue

        source_meta = {
            "documentCode": DOC_CODE,
            "documentTitle": DOC_TITLE,
            "sourceItemId": source_item_id,
            "pdfPageIndex": pdf_page_index,
            "printedPageNumber": printed_page,
            "printedQuestionNumber": q_num,
            "page": printed_page,
            "questionNumber": str(q_num),
            "cropIndex": q_num,
            "importBatchId": f"col2627_full_import_{printed_page:03d}",
            "imageVersion": 1,
            "imageHash": image_hash
        }

        doc_record = {
            "id": f"q_{q_code.lower().replace('-', '_')}",
            "questionCode": q_code,
            "text": it.get("text", ""),
            "options": options,
            "correctOptionIndex": correct_index,
            "explanation": "",
            "hint": "",
            "solvingStrategy": "",
            "videoUrl": "",
            "imageUrl": image_url,
            "imageAlt": f"سؤال قدرات كمي - {q_code}",
            "optionsEmbeddedInImage": True,
            "aiContext": ai_context,
            "voiceExplanation": voice_explanation,
            "sourceMeta": source_meta,
            "skillIds": skill_ids,
            "skillId": main_skill_id,
            "subSkillId": sub_skill_id,
            "pathId": PATH_ID,
            "subject": "general",
            "subjectId": SUBJECT_ID,
            "sectionId": section_id,
            "examType": "qudurat",
            "source": "imported",
            "difficulty": "Medium",
            "type": "mcq",
            "ownerType": "platform",
            "approvalStatus": "draft", # Strictly draft as required!
            "reviewerNotes": "COL2627 ingested as draft for quality audit pass."
        }
        db_items.append(doc_record)

    print(f"Successfully processed {len(db_items)} questions.")
    print(f"Total errors: {len(errors)}")
    if errors:
        for e in errors[:10]:
            print("  ERROR:", e)
        raise ValueError("Errors occurred during DB record preparation!")

    out_file = "scratch/col2627_db_ready_import_batch.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(db_items, f, ensure_ascii=False, indent=2)
    print(f"Saved DB-ready import batch ({len(db_items)} items) to {out_file}")

if __name__ == "__main__":
    prepare_db_batch()
