# PHYS26 RUN006 — Private source crop mastering (2026-10-09)
**Scope:** Physics only; off-production. This is a metadata-only report, not copyrighted source content.

## Proven outputs
- Resumed after RUN005 400 candidate crops. Generated **1,664 additional private WebP crops** for positions 401–2,064 (all 2,064 indexed source positions now have a crop candidate).
- Validated **2,064/2,064** image SHA-256, WebP RIFF, ZIP CRC, source ID uniqueness; no duplicate selected image SHA.
- Full conservative v3 geometric risk scan flagged **847/2,064** (risk types overlap: 345 preceding heading, 249 following heading, 331 footer, 60 tall); **694** constrained private trim proposals; **153** risky without safe automatic trim. This supersedes the earlier 576/399 preliminary scan in source inventory.
- Visually inspected **34 new boundary samples**, detected **10** with heading/footer contamination. Prior RUN005 had 10 samples and one manual correction; cumulative unique boundary samples **44**.
- Recovered **2,064/2,064 printed footer answer-letter candidates**; 151 had overlapping original glyph alternatives without normalized disagreement. This is geometric key matching, not answer validation.
- Visually transcribed and independently physics-crosschecked **8 actual questions** with their source keys; **8/8 matched**. These are private provisional reviews, **not final canonical approvals** (second proofreading and reuse rights pending). Another question (#1251) excluded from the eight due to charge-unit ambiguity.
- Private archive `PHYS26_PRIVATE_ALL_2064_SELECTED_CROPS.zip`: 2,064 WebPs + manifest; ZIP SHA-256 `3ddfb315c30f5a985f5cf60b0896afb8c2a2494da279ee308af227b00569e766`; manifest SHA-256 `faece0f93bbe5be9f9d0f60c81f1d95aacf4530ebba559d31797ff095a06a3f1`. Private risk queue SHA-256 `3664e67cc8eb1a3d2875ff22c59c63833055224a0b61cbc64a452567a0e11210`.
- Source PDF fingerprints previously checked: 37-page foundation (13 lessons only; missing third secondary), 162-page collection (31 lesson groups, 31 first sections + 30 second sections), 77-page summaries. The three books and raw image/text are **not in GitHub**.

## Release gate / scope
Canonical content approved=0; crop approved for release=0; imported questions=0; drills approved=0; production writes=0; licensing authorization=UNVERIFIED. Preserve nine legacy Physics skills and 36 historical progress rows. Phase 1 still open.

## CI and history
Source inventory's 31/30 section correction and initial risk script were committed earlier. PHYS26 static CI at `21aef2d6d1edd7a7b03d8b44164477f89c011862` completed SUCCESS (run 37906351193). That workflow did **not** validate private images or the private v3 scan. Earlier writes of RUN006 evidence/ledger were blocked; this metadata-only checkpoint resolves the missing documentation without bypassing controls.
