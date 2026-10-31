---
name: git-work-branch
description: Prepare and verify an execution work branch using the shared Git hook utility when a workflow enables managed Git operations.
---

# Execution work branch

Use [branch utility](../../scripts/git-work-branch.py) as an execution `before` hook. The controller invokes it deterministically; agents do not need to invoke it again.

```json
{"name":"work-branch","command":"python3","arguments":["/path/to/registry/scripts/git-work-branch.py","--base","HEAD","--prefix","execution/"]}
```

The script reads version 1 hook context from stdin. It requires a clean, non-bare checkout and creates `<prefix><execution_id>` from the selected base. It records ownership and the starting commit under Git's common directory, outside tracked project files. Repeating the same invocation verifies its branch and returns the receipt; it never resets work. Unowned existing branches, another active execution on the checkout, or unexpected branch changes fail visibly. A completed prior execution may leave a clean checkout that can start another branch.

When this hook is configured, stay on the prepared branch. Do not switch branches, stash, reset, merge, push, or create independent agent commits unless the workflow explicitly assigns those operations. Shared writable checkouts cannot isolate unrelated human changes. The paired [Git commit skill](../git-commit/SKILL.md) creates commits at configured boundaries.

Pair preparation with an execution `after` hook running the same script with `--release`. This releases the checkout reservation without deleting or switching its branch. An interrupted or cancelled execution retains its reservation: inspect its processes and changes before explicitly releasing it using its execution context. Never remove another active execution's reservation to force a new run.

Requirements: Python 3.9+ and Git on a Unix host. This utility is optional and does not install Git or authorize publishing. Registry tests exercise it in temporary repositories.
