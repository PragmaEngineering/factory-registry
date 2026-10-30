---
name: author-plan
description: Author or revise an implementation plan for a software specification, defining design decisions, work dependencies, interface contracts, and verification without implementing the work.
license: MIT
---

# Author an implementation plan

Use the [document contract](../../resources/planning/document-contract.md) for artifact semantics, project guidance, identifiers, revisions, and presentation. Use the content-only [plan body](assets/plan.body.html) and [document helper](scripts/document.mjs); remove irrelevant sections. The helper preserves the shared visual shell without loading its CSS into your context. Output to the assignment's path, defaulting to `plan.html`.

Read the applicable spec revision and inspect relevant components, interfaces, tests, tool configuration, and project rules. Identify the smallest adequate change. Explain consequential choices with evidence, alternatives, and costs; a pattern name alone is not a design. Surface spec defects or conflicts rather than silently resolving them through implementation choices.

Define coherent work items with stable IDs, dependencies, affected components or files where known, consumed/produced interfaces, acceptance coverage, and verification. Give enough precision for another engineer to execute the work without reproducing the investigation. Avoid speculative filenames, full implementation transcripts, arbitrary tiny task counts, or blanket refactoring. Include data migration and recovery only when needed.

Map every applicable acceptance criterion and constraint to work and a check or explicit review method. State expected evidence separately from results; planning does not prove that a check passes. Identify tool/environment prerequisites and material failure paths.

Before handing off, check coverage, dependency order, consistency of names/contracts across work items, compatibility with project rules, and proportion to the actual change. Address prior findings individually. Publish the plan with unresolved decisions and limitations. Do not implement, create tracker issues, commit, launch reviewers, or choose workflow transitions merely because a plan contains work items.

Adaptation sources and notices: [planning sources](../../resources/planning/SOURCES.md).

## Content-only editing

Write content sections to a temporary body file, then render the deliverable:

```sh
node /path/to/this-skill/scripts/document.mjs render plan \
  --body /path/to/private/body.html --output /assigned/plan.html \
  --title "Change title" --revision 1 --companion-revision 1
```

Use `node /path/to/this-skill/scripts/document.mjs read /assigned/plan.html` to inspect the current metadata and content for revision, without CSS. Edit body sections only; the metadata header is supplied through the render options. Resolve the script from this skill's directory. Keep temporary body files in private runtime storage or the system temporary directory; publish only the assigned deliverables. Write a coherent draft early, then patch the affected sections. Do not repeatedly regenerate the full document or copy its style markup through tool output.
