# Software planning document contract

This contract defines the registry's software planning artifacts. It does not schedule work, grant permissions, require approval, or prescribe an agent runner. An assignment or factory may select other output paths; `spec.html` and `plan.html` are the defaults. Do not introduce a separate requirements document.

## Responsibilities and authority

| Artifact | Responsibility | Excludes |
|---|---|---|
| Spec | Intended behavior, scope, external contracts, binding constraints, acceptance criteria | Implementation sequence and execution progress |
| Plan | Proposed implementation, interfaces, dependencies, decisions, verification | Invented requirements and claims that planned checks have passed |
| Findings | Evidence-backed defects, questions, requested resolutions | Silent edits to the reviewed documents |
| Progress | Work performed, commands, results, limitations, responses to findings | Rewriting the accepted design to match the implementation |

The assignment determines which documents apply and which actor may change them. Workflow policy determines any approvals, routing, retries, and review limits. Standalone agents follow the user's assignment; no approval gate is implied by this contract. A draft or a clean review is not an approval record.

Read the spec and plan together. The spec defines behavior; the plan explains its delivery. If they conflict, identify the exact conflict and seek a resolution for the affected work rather than silently changing either document. Continue independent assigned work when that does not depend on the unresolved choice.

## Identity and change tracking

Use stable identifiers within an artifact: `AC-001` for acceptance criteria, `P-001` for work items, `C-001` for constraints, and `D-001` for consequential design decisions. Keep an identifier when revising the same requirement; do not reuse a retired identifier for different behavior. These are references, not a new task hierarchy.

Record the document revision, source brief/reference, relevant source versions, and the related document revision. Use a content digest or a recorded revision when available; Git is not required. Do not claim approval unless the assignment supplies its recorded decision and document identity. When accepted scope changes, preserve the old identity and report the proposed revision for whatever decision process the assignment defines.

## Project guidance and evidence

Inspect project instructions and the smallest relevant set of architecture documents, standards, source, and tool configurations. Search for the project's actual guidance rather than assuming a particular filename exists. Common examples include `AGENTS.md`, `CONTRIBUTING.md`, architecture/decision records, coding standards, lint configuration, and module/toolchain configuration.

The spec records applicable binding constraints. The plan records how the change meets them. Use a compact table:

| ID | Source and version | Applicable rule | Effect on this change | Verification |
|---|---|---|---|---|
| C-001 | Repository-relative path + section; revision/digest if known | Concrete rule, not a pattern name | Boundary or implementation consequence | Check or review evidence |

Preserve the actual authority of each source. Explicit instructions and established project rules take precedence over generic skill preferences. Existing code establishes current behavior; it is not permission to ignore a documented rule. Surface conflicting authoritative sources instead of inventing precedence between them. Record missing guidance as unknown, not as a mandatory new standard.

A named pattern such as DDD is not a sufficient requirement or justification. State the actual ownership, invariants, allowed dependencies, and failure behavior that matter. New patterns or exceptions are proposed decisions, with alternatives and consequences. Do not silently turn them into binding constraints. Keep project-wide manuals canonical; include only relevant rules and enough context to understand the artifact independently. Repository-relative source paths may be shown as text when the HTML output has no reliable link to the source checkout.

## Spec content

- Objective and scope: concise objective; included/excluded behavior.
- Behavior: scenario, input or condition, expected result; cover material errors and boundaries.
- External contracts: API, event, data, interface, or compatibility expectations where relevant.
- Constraints and invariants: sourced rules and concrete conditions that must hold.
- Acceptance: stable ID, observable requirement, representative case, verification method. Define required results, not fabricated evidence.
- Uncertainty: assumption or question, its source/status, impact, and decision needed.

## Plan content

- Change overview: affected components and current/proposed relationships, where meaningful.
- Design decisions: selected approach, rationale, alternatives, consequences, unresolved choices.
- Work items: stable ID, intended change, dependencies, acceptance coverage, and observable verification. Prefer coherent, verifiable increments; a broad mechanical change need not be forced into artificial vertical slices.
- Interfaces and data: enough exact contract detail to coordinate affected components without writing the entire implementation in the plan.
- Verification: criterion or constraint, check, expected evidence, and environment prerequisites.
- Risks: failure condition, impact, mitigation or recovery, and unresolved decision where relevant.

Remove inapplicable sections. Small changes should produce small documents. Include deployment, migration, or rollback work only when the actual change requires it. Keep progress separate; work-item checkboxes in an approved document must not become the execution ledger.

## Presentation

The author skills own the [spec template](../../skills/author-spec/assets/spec.html) and [plan template](../../skills/author-plan/assets/plan.html). Both are generated from one [shell](document.html) and [stylesheet](document.css). Use the [content-only helper](document-tool.mjs) to read or render the document body; the helper inserts the canonical shell, navigation, and CSS. Authors edit body fragments rather than repeatedly reading or generating presentation markup. The registry generator is only for maintaining templates. Preserve the visual shell and use only the sections needed for the change.

Use technical tables, contracts, examples, and short decision rationales rather than narrative essays. Prefer a diagram for boundaries, state transitions, interactions, or a meaningful current/proposed comparison. A small change may need no diagram. Charts require actual data and labeled units; never invent measurements to fill a template.

Outputs must work offline: embed styles and SVG, use semantic headings and table headers, provide SVG titles/descriptions and nearby explanations, escape literal user text and code, and avoid scripts, external fonts, CDNs, and remote images. Explain status in text as well as color. Preserve readable narrow-screen and print layouts. A link to the companion document is allowed; rendering must not depend on it.

## Review and implementation use

Reviewers compare the brief, actual document revisions, relevant project evidence, and applicable rules independently. Findings identify a stable ID, artifact/criterion, severity, evidence or explicit uncertainty, triggering scenario, impact, and requested resolution. Blocking findings concern agreed behavior, correctness, safety, or feasibility; preferences remain suggestions. Retain IDs across rounds and record each resolution as addressed with evidence, unresolved, or withdrawn with a reason. A clean review is valid.

Implementers consume the assigned revisions, not every planning skill. Map work and verification evidence to plan items and acceptance criteria in the assignment's progress/result artifact. Distinguish intended results, commands actually run, outcomes, and checks not run. Report design defects or scope changes for resolution rather than editing the documents to make the implementation appear compliant.

Detailed authoring, review, and execution methods live in the five focused skills. This contract is their shared reference, not another skill-loading chain.

## Proportional investigation and revisions

Scale the document to decisions the change actually needs. A small change can use a scope/behavior/acceptance spec and a change/work/verification plan. Remove empty inventories, repeated summaries, textbook explanations, and speculative options. Add contracts or diagrams when they settle a real boundary or decision; no diagram quota applies.

Search for symbols or rules first, then read bounded relevant sections. For checks, retain command, outcome, useful counts, and the failing excerpt; inspect more output when needed to diagnose it. Do not repeatedly dump whole files, transcripts, or message history. Maintain a compact working record of document identities, verified facts and locations, decisions, and open findings.

The first review establishes independent coverage of the brief, documents, and affected boundaries. On later revisions, identify changed sections and source changes, recheck each open finding and affected contract, and record the revision reviewed. Reuse still-valid evidence; expand the review when changes invalidate it. Finish with a cross-document consistency and acceptance-coverage check. A delta review never substitutes the author's summary for the submitted evidence.
