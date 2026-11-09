# Go factory issues

Factory-specific proposals. These do not change Controls' generic workflow or MCP contracts unless a separate Controls issue is agreed.

## GOLANG-001 — Make review, repair, and closure consistently evidence-driven

Status: proposed; not implemented by this issue.

### Problem and existing behavior

The factory already routes architecture findings back to the architect and code findings back to the coder. The [review-spec](../../skills/review-spec/SKILL.md), [review-plan](../../skills/review-plan/SKILL.md), [critical-code-review](../../skills/critical-code-review/SKILL.md), and [follow-plan](../../skills/follow-plan/SKILL.md) skills already require stable finding IDs, evidence, and reassessment of repairs. The [code review method](../../skills/critical-code-review/references/review-method.md#resolve-findings) also assigns finding resolution to the reviewer.

Those foundations should be consolidated into a consistent finding–response–verification contract. Narrative handoffs can otherwise lose the connection between a defect, the revision that addressed it, and the evidence supporting closure. A coder reporting success or citing a passing suite does not establish that the particular finding was resolved. Evaluation should distinguish the recorded interaction from the observed outcome. ([Anthropic, Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)) Repeated reviews can also introduce new preferences, repeat closed findings, or reuse evidence invalidated by a later change.

### Research rationale and limits

Self-repair research found that feedback quality can constrain repair effectiveness and that additional attempts do not reliably justify their cost across the studied models and tasks. That motivates comparing actionable evidence against generic retry prompts; it does not establish that our reviewer pair is effective. ([Olausson et al., ICLR 2024, v5](https://arxiv.org/abs/2306.09896v5))

Retaining concise feedback across attempts has a research precedent in Reflexion, which uses language-based episodic memory rather than weight updates. The proposed finding ledger is a narrower engineering contract, not an implementation of that algorithm. ([Shinn et al., NeurIPS 2023](https://arxiv.org/abs/2303.11366v4))

Multi-agent failure research also identifies inter-agent misalignment and task-verification failures. Explicit revision identity and reviewer closure address those risks by design, but their benefit here still requires evaluation. ([Cemri et al., 2025 preprint, v3](https://arxiv.org/abs/2503.13657v3))

### Required behavior

1. **Finding:** the reviewer identifies a contract or criterion, the reviewed revision, a concrete trigger, evidence, impact, blocking status, and a verifiable required result. Distinguish demonstrated defects, unresolved questions, optional suggestions, and verification limitations. Do not require an executable reproduction for a design contradiction or a source-established defect.
2. **Response:** the architect/coder references the same finding ID and identifies its response revision, changes or counterevidence, checks actually performed, and remaining limitations. A response can repair a defect, dispute it with evidence, or surface a scope/design decision. It cannot unilaterally close the finding.
3. **Verification:** the reviewer inspects the submitted revision and evidence. It records the finding as resolved, still open, or withdrawn with a reason. Evidence reused from an earlier review must still apply to the current revision and affected behavior. Reopen a finding explicitly when later changes invalidate its resolution.
4. **Readiness:** material unresolved findings produce the configured `changes_requested` route. Technical execution failures remain failures, not invented findings. A clean review can return `completed`; it is not a claim that no defects exist. Loop-limit escalation and human approval retain their existing semantics.
5. **Human decision:** expose unresolved findings and verification limitations to the operator. A deliberate human override is recorded separately; it must not rewrite an open technical finding as verified or change the reviewed revision.

### Illustrative finding and response

These are proposed artifact content, not new factory.yaml fields, MCP message kinds, or an approved parser schema. Reuse the existing review artifacts and completion envelope.

```yaml
finding:
  id: CR-007
  classification: demonstrated_defect
  blocking: true
  reviewed_revision: implementation-r2
  criterion: AC-4
  contract: Cancelling a request stops its background work.
  location: internal/service/process.go
  trigger: Cancellation while the downstream call is blocked.
  evidence:
    observation: The worker creates context.Background instead of using the request context.
    reproduction: TestProcessCancellation times out waiting for worker exit.
  required_result: The worker and its downstream call observe cancellation and terminate.
response:
  finding: CR-007
  revision: implementation-r3
  disposition: repaired
  changes: Propagated the request context through the worker and downstream call.
  verification:
    command: go test -race ./internal/service -run TestProcessCancellation -count=1
    result: passed
    evidence: checks/cancellation-r3.txt
  limitations: Cancellation of the real remote service was not exercised.
reviewer_assessment:
  finding: CR-007
  reviewed_revision: implementation-r3
  status: resolved
  basis: Inspected context propagation and independently reran the focused regression test.
```

Example names and revisions are fictional. A future implementation must define how a revision identifies the actual source/documents rather than trusting an agent-invented label. A test pass is scoped to the behavior exercised; race detection does not prove that unexecuted paths are race-free. ([Go, Data Race Detector](https://go.dev/doc/articles/race_detector))

The cancellation example follows the Go API contract: contexts carry cancellation through the call chain; the implementation must observe that signal. It is not enough to cancel a context and assume an unrelated blocking operation or goroutine stopped. ([Go, context package overview](https://pkg.go.dev/context#pkg-overview))

### Implementation scope for a future task

- Consolidate finding fields and resolution rules in the existing review-method reference; link it from the relevant authoring/review/follow-plan skills. Do not create duplicate procedures in every agent role or put Go defect semantics in Controls.
- Add compact finding/response/closure examples for both design and code review. Retain the existing HTML spec/plan presentation and Markdown review artifacts.
- Define revision/evidence references using the existing publication and retained-artifact interfaces. Do not make agents inspect peer session files, controller internals, or hidden runtime storage. Where the public contract cannot identify the required source revision, record that gap for Controls rather than fabricating provenance.
- Update factory instructions only enough to require the shared contract. Preserve current routes, loop limits, human gates, model choices, and Git hooks.
- Keep verification proportional: focused checks for a repair, broader checks when affected contracts change, and a final acceptance-coverage check. Do not rerun all checks simply because another message arrived.
- Review the final-acceptance evidence configuration: it currently has an empty `artifacts` list. Make findings and verification accessible through supported operator interfaces; do not infer that empty means no other evidence can be displayed.

### Acceptance criteria

- The same finding ID connects the original finding, response, reviewer assessment, and any reopening across iterations.
- Worked examples cover a valid repair, evidence-based dispute and withdrawal, stale evidence, unresolved environmental verification, and human acceptance despite an explicitly open finding.
- A response without applicable evidence cannot be described as independently verified. Agent-reported, reviewer-executed, and operator-assessed evidence remain distinguishable.
- Reviewers do not edit submitted source/design to make checks pass or silently convert preferences into blocking requirements.
- Existing generic MCP completion and outcome routing continue to work without a special `repair` operation or a control-plane Go defect model.
- Automated guidance/fixture checks validate links and examples. An authorized, declared benchmark trial evaluates behavior through the public Factory interface; the eval harness never invokes workers or tests product workspaces directly.
- Compare material finding closure, reopenings, human interventions, active time, tokens, and product verification where available. Finding count alone is not a quality score. Preserve failed and inconclusive trials.

### References

- [Factory white paper](whitepaper.md): current architecture, implementation status, measurement boundaries, and source bibliography.
- [Google: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html): evidence and engineering judgment over personal preference; improving code health without demanding perfection.
- [Anthropic: Building effective agents](https://www.anthropic.com/research/building-effective-agents): evaluator–optimizer loops require useful evaluation criteria and bounded iteration.
- [Go: Data Race Detector](https://go.dev/doc/articles/race_detector): findings depend on code paths actually exercised.

Additional research and engineering sources:

- [Olausson et al. — Is Self-Repair a Silver Bullet for Code Generation?](https://arxiv.org/abs/2306.09896v5), ICLR 2024: feedback quality and repair-cost limits.
- [Shinn et al. — Reflexion](https://arxiv.org/abs/2303.11366v4), NeurIPS 2023: retaining feedback across attempts.
- [Cemri et al. — Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657v3), 2025 preprint: coordination and verification failure taxonomy.
- [Go — context package](https://pkg.go.dev/context#pkg-overview): cancellation semantics behind the worked example.
