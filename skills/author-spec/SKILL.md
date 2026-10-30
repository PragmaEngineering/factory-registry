---
name: author-spec
description: Author or revise a software specification from a brief and repository evidence, defining behavior and observable acceptance criteria without planning implementation or granting approval.
license: MIT
---

# Author a software specification

Use the [document contract](../../resources/planning/document-contract.md) for artifact semantics, project guidance, identifiers, revisions, and presentation. Use the content-only [spec body](assets/spec.body.html) and [document helper](scripts/document.mjs); remove irrelevant sections. The helper preserves the shared visual shell without loading its CSS into your context. Output to the assignment's path, defaulting to `spec.html`.

Inspect the brief, relevant code, and actual project rules before drafting. Establish intended behavior, users or callers, included/excluded scope, external contracts, compatibility, and material failure cases. Ask only questions whose answers change behavior, scope, or a consequential decision; look up repository facts yourself. Record uncertainty rather than inventing an answer or conducting an unbounded interview.

Write measurable acceptance criteria with representative inputs and expected outcomes. Distinguish required behavior, observed current behavior, assumptions, and proposed constraints. Include sourced architecture or coding constraints only where they affect the task. Keep implementation choices and work ordering in the plan.

When revising, address findings individually and preserve stable IDs. Before handing off, check that every material part of the brief is covered or explicitly excluded, criteria are observable, source claims are grounded, and related document revisions agree. Report unresolved decisions with their impact. Publish the document and a concise summary of changes and limitations; the assignment owns handoff and approval policy.

Adaptation sources and notices: [planning sources](../../resources/planning/SOURCES.md).

## Content-only editing

Write content sections to a temporary body file, then render the deliverable:

```sh
node /path/to/this-skill/scripts/document.mjs render spec \
  --body /path/to/private/body.html --output /assigned/spec.html \
  --title "Change title" --revision 1 --companion-revision 1
```

Use `node /path/to/this-skill/scripts/document.mjs read /assigned/spec.html` to inspect the current metadata and content for revision, without CSS. Edit body sections only; the metadata header is supplied through the render options. Resolve the script from this skill's directory. Keep temporary body files in private runtime storage or the system temporary directory; publish only the assigned deliverables. Write a coherent draft early, then patch the affected sections. Do not repeatedly regenerate the full document or copy its style markup through tool output.
