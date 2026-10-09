# BIO26 R26 | Original diagnostic mechanisms checkpoint

Date: 2026-10-09
Status: **REVIEW ONLY. NOT PUBLISHED. NOT MERGED TO MAIN.**
Parent checkpoint: `ops/bio26/review/BIO26_R25_CHECKPOINT.md`
Frozen production taxonomy blob SHA: `a2ee6daf6279354db6bce723c8110c9d966e3370`

## Verified source
- Google Drive folder `1Eh-iMaJN9gao8KvjvMjYWiIijHJqkee2`: 159 direct items before and after run; no R26 asset in folder.
- Read R25 checkpoint and frozen production taxonomy. Reused R25 unified HTML and did not recreate the 127 established learning pages.
- Existing 29 main chapter sections and 98 subskill article texts preserved (98/98 article text hashes matched).

## Real new work
- 15 original causal-mechanism and comparison diagrams, BIO26-M01 through BIO26-M15.
- 30 original four-choice diagnostic MCQs, 120 option-by-option explanations, real-world applications and exam traps.
- Editable 75-slide PPTX, 75-page PDF, 75 PNGs, self-contained updated HTML book, original review-only question JSON, contact sheet, manifest, QA and browser smoke test.
- No third-party copyrighted figures: diagrams built as editable original shapes.
- R26 local integration package: `BIO26_R26_Integration_Package.zip` (created in ChatGPT runtime, **not uploaded to GitHub/Drive**).

## Integrity
- PPTX SHA256: `ed5a334ebe6234cb29a5ae0005dc7dd19d0600b7b295f2fedfb6760e1ecaa715`
- PDF SHA256: `7f135a9ff92ab4b255dae91a0809b996b3f5f3e4bde3c903ecd0fb8d138a5d00`
- Unified HTML SHA256: `9c6f913d2e9030c07db1af3c95a4904a2b46986cc874171e609f88ca5d7ddf32`
- Review questions SHA256: `e4b06243eea3384cce543adacff728333ef27d82e8db583206a957235ab6d632`
- Manifest SHA256: `604937be79c63cb012520e19d4407a720a7bb315684f06ca2fbc4ff32a23d926`
- All 75 PPTX slides, PDF pages, and PNG files verified; zero broken internal links or duplicate HTML IDs; zero out-of-bounds shapes.
- Chromium 1366px and 390px smoke tests passed using permitted `page.set_content` fallback; file:// and localhost URL navigation blocked by administrator policy. Not a real-device test.

## Safety boundaries and remaining work
- No modifications to production taxonomy, question bank, student records, exams, training data, commercial policy, or main branch.
- No platform publication, no merge, no Drive upload.
- Scientific review of all 127 established pages and new diagrams, Arabic RTL inspection on real devices, isolated staging import/collision tests and owner approval remain required.
- Next independent slice: M16–M29 original mechanism diagrams and questions; avoid duplicating R26 questions.
