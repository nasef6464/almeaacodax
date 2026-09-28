# YLM26 — Source Badge Count Evidence — 2026-09-28

## Scope
Only source question blocks that visibly carry the dark-blue **تجميعات** badge are counted.

## Result
- Source **تجميعات** question blocks: **326**
- Live YLM26 MongoDB records: **156**
- Net source gap: **170**

This result is based on the source PDF itself, not on generic numbered examples or lesson exercises.

The source was rendered page-by-page and the exact rendered **تجميعات** badge was used as the visual marker. Representative pages were manually checked:
- page 5: 3 تجميعات badges
- page 6: 4
- page 8: 4
- page 10: 5
- page 90: 9

The full page-level count sums to 326.

## Live-vs-source page reconciliation
- Page-level missing slots: **172**
- Page-level extra slots: **2**
- Net gap: **170**
- Pages matching exactly: **16**
- Pages with missing live records: **67**
- Pages with excess live records: **2**

The two excess live slots are on pages 5 and 6; these require identity review before any approval.

## Operational consequence
Do **not** approve the current 156-record set as a complete import.
Keep it isolated as draft while the source manifest is rebuilt from all 326 visually marked تجميعات blocks.

The audit will still review the existing 156 record-by-record, but final YLM26 content lock cannot be GREEN until the source-vs-live set reconciles to the actual 326 badge-marked questions or an explicit owner-approved exclusion rule is documented.

## Page counts
```json
{
  "5": 3,
  "6": 4,
  "7": 4,
  "8": 4,
  "9": 4,
  "10": 5,
  "11": 4,
  "12": 3,
  "13": 5,
  "14": 4,
  "15": 4,
  "16": 3,
  "17": 3,
  "18": 3,
  "19": 3,
  "20": 5,
  "21": 4,
  "22": 5,
  "23": 5,
  "25": 3,
  "26": 5,
  "27": 1,
  "28": 8,
  "29": 2,
  "30": 2,
  "31": 6,
  "32": 5,
  "33": 3,
  "34": 5,
  "35": 3,
  "36": 7,
  "37": 5,
  "38": 3,
  "39": 2,
  "40": 5,
  "41": 3,
  "42": 6,
  "43": 4,
  "44": 5,
  "45": 2,
  "46": 5,
  "47": 4,
  "48": 6,
  "49": 4,
  "50": 4,
  "51": 4,
  "52": 3,
  "53": 3,
  "55": 2,
  "56": 4,
  "57": 3,
  "58": 1,
  "59": 3,
  "62": 4,
  "63": 4,
  "64": 5,
  "65": 2,
  "66": 8,
  "67": 2,
  "68": 4,
  "69": 3,
  "70": 4,
  "71": 4,
  "73": 5,
  "74": 4,
  "75": 2,
  "76": 3,
  "77": 3,
  "78": 6,
  "79": 3,
  "80": 3,
  "81": 1,
  "82": 3,
  "83": 4,
  "84": 4,
  "85": 4,
  "86": 2,
  "87": 5,
  "88": 2,
  "89": 1,
  "90": 9,
  "91": 4,
  "92": 4,
  "93": 4,
  "94": 4
}
```
