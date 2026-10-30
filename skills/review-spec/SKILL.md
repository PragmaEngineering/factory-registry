---
name: review-spec
description: Independently review a software specification against its brief and repository evidence for ambiguity, missing behavior, contradictions, unintended scope, and observable acceptance criteria.
license: MIT
---

# Review a software specification

Read the [document contract](../../resources/planning/document-contract.md), the brief, the actual spec revision, and relevant project evidence. Do not begin from the author's summary or assume a previously clean review still applies to a changed document.

Check whether the spec describes the requested behavior and boundaries without silently adding policy. Construct representative success, error, and boundary scenarios; look for contradictory outcomes, missing external contracts, assumptions presented as facts, incompatible project rules, and acceptance criteria that cannot distinguish success from failure. Apply performance, security, concurrency, or recovery scrutiny only where the change makes it relevant.

Use precise questions to expose material uncertainty. Find discoverable facts yourself; do not turn every possible concern into a question for the user. A theoretical possibility without a credible trigger or material impact is not a confirmed defect. Separate required corrections, unresolved decisions, and optional suggestions.

Write evidence-backed findings in the assignment's review artifact using the contract's finding fields and stable IDs. Recheck revised documents against original findings and name their resolutions. State explicitly when there are no blocking findings and what remains unverified. Review readiness is a recommendation, not approval. Do not edit the submitted spec or application source, seek a quota of findings, interview indefinitely, or start a review loop yourself.

Adaptation sources and notices: [planning sources](../../resources/planning/SOURCES.md).

For content-only reading, use the [document helper](../../resources/planning/document-tool.mjs): `node /path/to/document-tool.mjs read /assigned/spec.html` (or `plan.html`). First review independently; subsequent rounds follow the contract's revision method. Report one consolidated set of findings with the reviewed revisions, stable IDs, resolutions, and any affected contracts that were rechecked. Avoid rereading unchanged documents or issuing a separate message per observation.
