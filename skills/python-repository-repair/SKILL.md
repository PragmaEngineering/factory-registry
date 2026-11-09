---
name: python-repository-repair
description: Implement or review a focused fix in an existing Python repository using its pinned environment, compatibility rules and test conventions.
---

# Python repository repair

Establish the project's supported Python versions, dependency constraints and test
entrypoints from its own configuration. Existing repositories may predate modern
Python syntax and tooling. Use the provisioned environment; do not upgrade Python,
install a new test stack, or introduce typing/formatting conventions merely because
they are familiar.

Trace the reported behavior through callers and existing tests before changing code.
Choose the smallest change that satisfies the issue and preserves adjacent behavior.
Account for exceptions, mutability, ordering and public compatibility where relevant.
Do not infer a one-file restriction from a benchmark's reference-patch selection.

Reproduce the defect when feasible, add a focused regression test using project
conventions, then run affected existing tests. Use the project's actual test runner;
not every Python repository uses pytest. Broaden checks when the affected behavior
warrants it. A missing dependency or incompatible interpreter is environment evidence,
not permission to rewrite dependency constraints or skip a failing assertion.

For review, inspect the actual source and run independent focused checks without
editing the submitted work. Identify material defects with stable finding IDs, a
reproduction or source trace, and the required correction. Recheck changed behavior
and open findings rather than repeating unrelated full suites.

Report commands, interpreter/environment identity, results, changed files and limits.
Project checks establish only the behavior they exercise; a benchmark grade comes
from its separate evaluator. Do not claim hidden tests passed.
