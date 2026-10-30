---
name: review-plan
description: Independently review an implementation plan for specification coverage, feasibility, dependency and interface consistency, appropriate complexity, and credible verification.
license: MIT
---

# Review an implementation plan

Read the [document contract](../../resources/planning/document-contract.md), the applicable spec and plan revisions, prior findings, and the relevant repository paths and project rules. Build an independent view before relying on the author's rationale.

Trace acceptance criteria and constraints to work items and verification. Check whether interfaces agree across dependent items, required components and tools exist, changes respect actual ownership/dependency rules, and the sequence can produce verifiable progress. Investigate consequential assumptions against code. Distinguish a spec defect from a plan defect so the right artifact can be corrected.

Challenge unnecessary components, dependencies, abstractions, and operational obligations. Check material compatibility, partial-failure, cancellation, concurrency, migration, and recovery behavior where relevant. Prefer concrete counterexamples to demands that the author justify every routine choice. Do not require a universal pattern, exhaustive implementation code, TDD, a Git branch, or extra documents unless the project or assignment requires them.

Record actionable findings in the assignment's review artifact using stable IDs and the contract's finding fields. If reviewing spec and plan together, use distinct sections and one consistent finding-ID sequence. Close resolved findings explicitly across revisions. State readiness and limitations; a clean review is valid and does not grant approval. Do not modify the author's plan or source or orchestrate further review rounds.

Adaptation sources and notices: [planning sources](../../resources/planning/SOURCES.md).

For content-only reading, use the [document helper](../../resources/planning/document-tool.mjs): `node /path/to/document-tool.mjs read /assigned/spec.html` (or `plan.html`). First review independently; subsequent rounds follow the contract's revision method. Report one consolidated set of findings with the reviewed revisions, stable IDs, resolutions, and any affected contracts that were rechecked. Avoid rereading unchanged documents or issuing a separate message per observation.
