# Compact learner counters

Status: IN_PROGRESS; source branch `codex/compact-learning-counters` from main `547084f5`. The previous teacher PR569 was published before this implementation; release evidence is `SMART_TEACHER_PUBLICATION_2026-10-17.json`.

## Delivered scope

- One reusable three-cell counter row for training and subject tests, foundation filters, and path mock inventory. Training/test counters now act as the existing filters; the duplicate filter row and vertically stacked cards are removed.
- Mobile labels are shorter while full filter names remain accessible. Selected state uses `aria-pressed`, keyboard focus is visible, and interactive cells retain at least 44px height.
- The shared completion summary uses smaller spacing/type and a thinner accessible progress bar. Full completed/total and locked-item counts remain visible. Topic-level completion stays unchanged.
- No API, data calculation, access, ordering, filter predicates, results, or persisted progress changes. Parent components keep owning values/actions; the shared component only presents them.

## Verification

- A styled synthetic browser fixture reproduced the missing unified controls before implementation.
- Browser checks cover 320/360/390/430/1280 widths, one row of three counters, large completion/mock counts, 44px interactive cells, no horizontal overflow, free/paid/all transitions, foundation selection and noninteractive mock counts.
- Completion logic and existing Tahsili ordering/filter contracts pass. Focused React/accessibility review found no confirmed P1/P2 issue.
- Synthetic screenshots are local/CI artifacts only; no tracked PNGs or production user data.
- Final typecheck/build/required CI and new UI publication remain pending at this note. Previous teacher publication is verified separately; physical Android audible quality is not certified by layout tests.
