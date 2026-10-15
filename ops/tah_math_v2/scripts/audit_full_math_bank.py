import fitz # PyMuPDF
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def audit_pdf_ghosting(pdf_path):
    print("Opening PDF for ghosting audit:", pdf_path)
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"Total pages in PDF: {total_pages}")
    
    ghosted_pages = []
    clean_pages = []
    page_details = {}
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1 # 1-based
        page = doc[page_idx]
        
        # Extract text dict with spans
        page_dict = page.get_text('dict')
        duplicate_span_count = 0
        total_spans = 0
        
        prev_span = None
        for block in page_dict['blocks']:
            if block.get('type') == 0: # text
                for line in block.get('lines', []):
                    for span in line.get('spans', []):
                        total_spans += 1
                        t = span.get('text', '').strip()
                        if not t:
                            continue
                        
                        if prev_span:
                            prev_t = prev_span.get('text', '').strip()
                            # Check if same text and very close origin
                            dx = abs(span['origin'][0] - prev_span['origin'][0])
                            dy = abs(span['origin'][1] - prev_span['origin'][1])
                            
                            # Detect exact duplicate consecutive spans with small offset (<12pt)
                            if t == prev_t and dx < 12 and dy < 2:
                                duplicate_span_count += 1
                        prev_span = span
        
        is_ghosted = duplicate_span_count > 3
        if is_ghosted:
            ghosted_pages.append(page_num)
        else:
            clean_pages.append(page_num)
            
        page_details[page_num] = {
            "page": page_num,
            "total_spans": total_spans,
            "duplicate_spans": duplicate_span_count,
            "is_ghosted": is_ghosted
        }
    
    return {
        "total_pages": total_pages,
        "ghosted_pages_count": len(ghosted_pages),
        "clean_pages_count": len(clean_pages),
        "ghosted_pages": ghosted_pages,
        "clean_pages": clean_pages,
        "page_details": page_details
    }

def audit_crops_and_manifest(manifest_path, crops_dir):
    print("\nAuditing Crops & Manifest...")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        
    items = manifest.get('items', [])
    total_manifest = len(items)
    
    missing_files = []
    corrupt_files = []
    valid_files = 0
    dimensions_mismatch = 0
    
    for it in items:
        code = it['questionCode']
        expected_dims = it.get('pixelDimensions', [703, 0])
        fpath = os.path.join(crops_dir, f"{code}.webp")
        
        if not os.path.exists(fpath):
            missing_files.append(code)
            continue
            
        sz = os.path.getsize(fpath)
        if sz == 0:
            corrupt_files.append(code)
            continue
            
        valid_files += 1
        
    return {
        "total_manifest": total_manifest,
        "valid_crops_on_disk": valid_files,
        "missing_crops": len(missing_files),
        "corrupt_crops": len(corrupt_files),
        "missing_list": missing_files[:10]
    }

def audit_questions_master(master_path):
    print("\nAuditing Master JSONL...")
    total_records = 0
    valid_keys = 0
    invalid_keys = []
    lessons = set()
    skills = set()
    
    with open(master_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if not line.strip():
                continue
            total_records += 1
            data = json.loads(line)
            code = data.get('questionCode_EXPECTED') or data.get('questionCode')
            key = data.get('aiContext', {}).get('correctOption')
            if key in ['A', 'B', 'C', 'D']:
                valid_keys += 1
            else:
                invalid_keys.append((code, key))
                
            l = data.get('lessonName')
            if l:
                lessons.add(l)
            s = data.get('mainSkillName')
            if s:
                skills.add(s)
                
    return {
        "total_master_records": total_records,
        "valid_keys_count": valid_keys,
        "invalid_keys_count": len(invalid_keys),
        "total_lessons": len(lessons),
        "total_skills": len(skills),
        "invalid_sample": invalid_keys[:5]
    }

def main():
    pdf_path = 'ops/tah_math_v2/handoff/01_SOURCE_BOOKS/كتاب تجميعات يلو للرياضيات 26 - المعدل(1).pdf'
    manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'
    crops_dir = 'ops/tah_math_v2/crops'
    master_path = 'ops/tah_math_v2/staged/QUESTION_MASTER_CORRECTED.jsonl'
    
    pdf_audit = audit_pdf_ghosting(pdf_path)
    crops_audit = audit_crops_and_manifest(manifest_path, crops_dir)
    master_audit = audit_questions_master(master_path)
    
    # Cross-reference: how many questions fall on ghosted pages?
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        
    ghosted_set = set(pdf_audit['ghosted_pages'])
    questions_on_ghosted_pages = [
        it['questionCode'] for it in manifest.get('items', [])
        if it.get('printedPageNumber') in ghosted_set
    ]
    questions_on_clean_pages = [
        it['questionCode'] for it in manifest.get('items', [])
        if it.get('printedPageNumber') not in ghosted_set
    ]
    
    report = {
        "audit_timestamp": "2026-10-15T03:57:00Z",
        "total_math_questions": crops_audit['total_manifest'],
        "total_pdf_pages": pdf_audit['total_pages'],
        "ghosted_pages_count": pdf_audit['ghosted_pages_count'],
        "ghosted_pages_list": pdf_audit['ghosted_pages'],
        "clean_pages_count": pdf_audit['clean_pages_count'],
        "questions_on_ghosted_pages_count": len(questions_on_ghosted_pages),
        "questions_on_clean_pages_count": len(questions_on_clean_pages),
        "crops_disk_integrity": crops_audit,
        "master_integrity": master_audit
    }
    
    out_report_path = 'ops/tah_math_v2/audit_repair/TAH_MATH_FULL_BANK_AUDIT_REPORT.json'
    with open(out_report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    print("\n" + "="*60)
    print("TAHSILI MATH FULL BANK AUDIT COMPLETE")
    print(f"Total Questions: {report['total_math_questions']}")
    print(f"Total Pages: {report['total_pdf_pages']}")
    print(f"Ghosted / Blemished Pages: {report['ghosted_pages_count']} pages -> {report['ghosted_pages_list']}")
    print(f"Questions on Blemished Pages: {report['questions_on_ghosted_pages_count']}")
    print(f"Clean Pages: {report['clean_pages_count']} pages")
    print(f"Questions on Clean Pages: {report['questions_on_clean_pages_count']}")
    print(f"Valid Crops on Disk: {crops_audit['valid_crops_on_disk']} / {crops_audit['total_manifest']}")
    print(f"Valid Answer Keys: {master_audit['valid_keys_count']} / {master_audit['total_master_records']}")
    print(f"Saved full report to: {out_report_path}")
    print("="*60)

if __name__ == '__main__':
    main()
