import hashlib
import json
import os

manifest_path = "scratch/col2627_full_manifest_consolidated.json"
with open(manifest_path, "r", encoding="utf-8") as f:
    items = json.load(f)

print(f"Total questions in consolidated manifest: {len(items)}")

updated = 0
for it in items:
    q_code = it.get("code") or it.get("questionCode")
    # find local webp image
    # format: QDR-QNT-COL2627-P005-Q01
    parts = q_code.split("-")
    p_folder = ""
    for p in parts:
        if p.startswith("P") and len(p) == 4 and p[1:].isdigit():
            p_folder = p.lower()
            break
    
    local_img = os.path.join("public/questions/v2/qudrat/quant/COL2627", p_folder, f"{q_code}.webp")
    if not os.path.exists(local_img):
        print(f"Missing image file for {q_code} at {local_img}!")
        continue

    with open(local_img, "rb") as img_f:
        h = hashlib.sha256(img_f.read()).hexdigest()
    
    if it.get("imageHash") != h:
        it["imageHash"] = h
        updated += 1

print(f"Computed / updated imageHash for {updated} questions.")

# Save back to scratch and public
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

public_manifest = "public/questions/v2/qudrat/quant/COL2627/full_manifest.json"
with open(public_manifest, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print("Saved updated manifests with imageHash.")
