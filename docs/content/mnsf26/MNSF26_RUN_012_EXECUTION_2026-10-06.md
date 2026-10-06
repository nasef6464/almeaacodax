# MNSF26 Heavy Execution Run 012 — 2026-10-06

## Scope
MNSF26 only. Continued from 4e6f299a2ccc24795081c9fde7a77041e61967b2. Batches 001–013 were not reprocessed.

## Cross-bank dedupe converted to executable QA
Audited:
- MNSF26_CONTENT_ENRICHMENT_V1.json
- MNSF26_CROSS_BANK_DEDUPE_V1.json
- current server/package.json MNSF26 QA chain

Current evidence remains:
- 5 total suppressed MNSF26 records
- 1 cross-bank suppression
- QDR-QNT-MNSF26-P005-Q20 is suppressed against QDR-QNT-COL2627-P037-Q28
- existing source = COL2627
- similarity = 1
- production comparison baseline = FND26 + COL2627 = 1804 rows

Added verifyMnsf26CrossBankDedupe.ts.
The verifier fails if:
- baseline comparison is not exactly FND26/COL2627 with 1804 scanned rows;
- suppression counts drift from 5 total / 1 cross-bank;
- evidence file and content manifest disagree;
- the known MNSF26 P005/Q20 -> COL2627 P037/Q28 suppression is removed, retargeted, or loses exact-match evidence.

Commit: 29f115b03e097688b71fedef9ab1e5888b858dbc

Wired:
verify:mnsf26:dedupe = tsx src/scripts/verifyMnsf26CrossBankDedupe.ts

verify:mnsf26:all now runs:
content-manifest -> crop-queue -> geometry-index -> arithmetic-index -> dedupe -> preimport

Commit: 44dac408d77823f6f353bc6d30499a3c222f269f

## Production decision
No import was attempted. Authoritative crop evidence remains the blocking gate.
