# PR565 merge prerequisite — 2026-10-16
Owner requested merging565 before repository cleanup. The original head4f1003b7 failed architecture registration for standard GITHUB_STEP_SUMMARY; commit9dd4337a registered it without changing the baseline/gate. Concurrent head8109c9a4 added an unattended file executor, write permissions on PR audits, blanket staging and dropped existing package test aliases.

Bounded prerequisite repair restores all baseline package scripts (adds only argon shortcut), keeps audits read-only with unpersisted checkout credentials and no API secret on pull_request, and isolates writing to workflow_dispatch-only job from trusted main. Dependency installation there skips lifecycle scripts; write token is provided only during final push/PR creation. No automatic merge.

Shared path checks reject absolute/sibling escapes, protected/hidden/secret/lock/binary paths and symlink traversal for context, writes and deletes; context is tracked files only. Entire plan is validated before writes; dirty working trees are refused before and after model generation. Only validated changedPaths are staged with literal pathspecs; local metadata ignored. No git add dot or production writes.

Validation: Node syntax checks for3scripts, targeted sibling/protected/context/symlink/dirty/duplicate/atomic-plan fixture PASS; all original package aliases parity PASS. No real model/API call performed; AI quality/model availability not certified. Exact-head CI remains required before merge. Existing unrelated primary/worktree modifications preserved.
