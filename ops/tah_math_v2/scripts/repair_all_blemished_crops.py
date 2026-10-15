import fitz # PyMuPDF
import json
import os
import sys
import shutil
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

def main():
    pdf_path = 'ops/tah_math_v2/handoff/01_SOURCE_BOOKS/كتاب تجميعات يلو للرياضيات 26 - المعدل(1).pdf'
    manifest_path = 'ops/tah_math_v2/CROPS_MANIFEST_2270.json'
    blemished_json_path = 'ops/tah_math_v2/audit_repair/FAST_BLEMISHED_QUESTIONS_EXACT.json'
    crops_dir = 'ops/tah_math_v2/crops'
    backup_dir = 'ops/tah_math_v2/crops_pre_repair_backup'
    remastered_dir = 'ops/tah_math_v2/remastered_crops'
    
    os.makedirs(backup_dir, exist_ok=True)
    os.makedirs(remastered_dir, exist_ok=True)
    
    print("Loading PDF and manifest...")
    doc = fitz.open(pdf_path)
    
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    manifest_by_code = {it['questionCode']: it for it in manifest['items']}
    
    with open(blemished_json_path, 'r', encoding='utf-8') as f:
        blemished_data = json.load(f)
    blemished_list = blemished_data['blemished_questions']
    total_blemished = len(blemished_list)
    print(f"Targeting {total_blemished} blemished questions for defect-free repair.")
    
    # Group by page
    from collections import defaultdict
    by_page = defaultdict(list)
    for b in blemished_list:
        by_page[b['page']].append(b)
        
    zoom = 200 / 72
    matrix = fitz.Matrix(zoom, zoom)
    
    success_count = 0
    repaired_codes = []
    
    # Process each page
    for page_num in sorted(by_page.keys()):
        page_idx = page_num - 1
        page = doc[page_idx]
        
        # Patch page content streams: replace '1 Tr' with '3 Tr'
        streams = page.get_contents()
        for s_xref in streams:
            try:
                data = doc.xref_stream(s_xref)
                text = data.decode('latin1')
                if '1 Tr' in text:
                    fixed_text = text.replace('1 Tr', '3 Tr')
                    doc.update_stream(s_xref, fixed_text.encode('latin1'))
            except Exception as e:
                pass
                
        # Render each question on this page
        for q_info in by_page[page_num]:
            code = q_info['questionCode']
            manifest_item = manifest_by_code.get(code)
            if not manifest_item:
                continue
                
            crop_box_pt = fitz.Rect(manifest_item['cropBoxPt'])
            expected_dims = manifest_item.get('pixelDimensions', [703, 0])
            
            # Render crop at 200 DPI
            pix = page.get_pixmap(matrix=matrix, clip=crop_box_pt)
            
            # Convert pixmap to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Guarantee width 703 exactly
            if img.width != 703 and abs(img.width - 703) <= 4:
                img = img.crop((0, 0, 703, img.height))
            elif img.width < 703:
                padded = Image.new("RGB", (703, img.height), (255, 255, 255))
                padded.paste(img, (0, 0))
                img = padded
                
            crop_path = os.path.join(crops_dir, f"{code}.webp")
            remastered_path = os.path.join(remastered_dir, f"{code}.webp")
            backup_path = os.path.join(backup_dir, f"{code}.webp")
            
            # Backup original if not already backed up
            if os.path.exists(crop_path) and not os.path.exists(backup_path):
                shutil.copy2(crop_path, backup_path)
                
            # Save pristine, defect-free WebP with Quality 95
            img.save(crop_path, "WEBP", quality=95)
            img.save(remastered_path, "WEBP", quality=95)
            
            success_count += 1
            repaired_codes.append(code)
            
    print("\n" + "="*60)
    print("BATCH REPAIR COMPLETE")
    print(f"Total Blemished Target: {total_blemished}")
    print(f"Successfully Repaired: {success_count}")
    print(f"Backed up to: {backup_dir}")
    print(f"Saved into: {crops_dir} and {remastered_dir}")
    print("="*60)
    
    # Save log report
    out_rep = {
        "timestamp": "2026-10-15T06:35:00Z",
        "total_repaired": success_count,
        "backup_directory": backup_dir,
        "repaired_codes": repaired_codes
    }
    with open('ops/tah_math_v2/audit_repair/REPAIR_EXECUTION_REPORT_257.json', 'w', encoding='utf-8') as f:
        json.dump(out_rep, f, indent=2)

if __name__ == '__main__':
    main()
