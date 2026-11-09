# Go coding factory

See the [empirical paper manuscript](whitepaper.md) for the control-plane architecture and communication contracts, the configured Go participant workflow, related research, a benchmark/publication inventory, and a protocol for testing whether explicit execution contracts and configurable collaboration policies improve reliability and resource efficiency. It compares the design with Anemoi as direct prior art and contains benchmark-result and analysis placeholders to complete before publication; see the [publication checklist](whitepaper-checklist.md). [Factory issues](issues.md) tracks proposed improvements.

[factory.yaml](factory.yaml) defines the Go coding workflow with an execution worktree/branch, approved-stage project commits, and retained execution files: enforced readiness admission, architect, architecture review, human design approval, Go implementation, code review, and human acceptance. The design and implementation stages each allow up to three architect/reviewer or coder/reviewer rounds before escalating unresolved findings to the human decision. A satisfactory review reaches the same decision sooner. Human `request_changes` starts another bounded set of rounds. Review findings route back to the relevant agent through the prior-result handoff. The agents and their native Pi profiles live in [the agent library](../../agents/README.md).

Copy this factory.yaml into the application's configuration directory, then update each package path and hook script path for the installed Registry. Paths resolve beside factory.yaml. The library's `../../agents`, `../../classifiers` and `../../scripts` paths are examples for this checkout, not install discovery. See [execution files and variables](../../../controls/docs/execution-files.md) and the [workflow tutorial](../../../controls/tutorial.md).

Start the shared service with `factory start`. From the application root, run `factory exec "Your request"`, then inspect `factory ls`, `factory EXECUTION-ID`, and `factory inbox`. Answer human decisions with `factory answer REQUEST-ID OUTCOME --reason "..."`. Agents communicate through the [thread MCP runtime](../../../controls/adapters/README.md) and submit explicit `step_result` messages. The example requires files only for its listed `outputs_on` outcomes, so a blocker can retain its cause without producing success artifacts.

The existing agent profiles use Pi and require Pi, Node.js, working model credentials, and any enabled MCP tools on the host. The `gopls` MCP in the coder and reviewer profiles needs `gopls` on `PATH`. The local command runner is a host process, not a sandbox; only run trusted agent packages. The workflow no longer uses the old Comms task service or Ralph loop configuration. The build agent can still use its coding and checking skills within its assigned step.

Document guidance lives in the [spec skill](../../skills/author-spec/SKILL.md) and [plan skill](../../skills/author-plan/SKILL.md): author-spec/author-plan for the architect, review-spec/review-plan for architecture review, and follow-plan for the coder. The [registry guide](../../README.md#software-planning-skills-and-documents) links the matching HTML templates and completed examples. These skills do not introduce another approval sequence; the decisions above remain defined by this factory's configuration.

## Agent execution quality

The design agents use Go planning evidence on demand for consequential API, version, and concurrency claims. Spec and plan stay proportional to the change and use the content-only HTML helper. First reviews establish independent coverage; later rounds revisit actual changes, open findings, and affected contracts before a final consistency check. Reviewer findings retain their IDs across rounds.

Launchers preflight local commands before model startup. Install `rg`, `go`, `gofmt`, `golangci-lint`, and `gopls` for the Go bundles. `GOTOOLCHAIN` defaults to `local`, avoiding automatic toolchain downloads; provision a compatible version in advance. See [runtime adapters](../../../controls/adapters/README.md) for managed Pi tool exposure and prerequisites. These changes leave workflow routing, loop limits, and human approvals in the factory configuration.

## Readiness admission

The first step is the reusable [task-readiness classifier](../../classifiers/task-readiness/README.md). It admits automatically only when Jev selects `accept` with a reported probability of at least `0.85`. Other valid assessments route to `admission-review` in the operator inbox. No architect, reviewer or coding agent starts until automatic admission or explicit operator approval. Rejection stops the execution.

```text
Input → readiness ─ admitted ────────────────────┐
                 └ review_required → operator   │
                                    ├ approve ──┤
                                    └ reject → stop
                                                ↓
                  design → design approval → implementation → acceptance
```

The threshold is configured under the readiness package's `overrides.admission.minimum_probability`. It is an initial policy, not a validated accuracy guarantee. Install the classifier's MCP dependency with `npm ci --prefix /path/to/controls`, followed by `npm ci --prefix /path/to/registry` and make its configured provider credential available in the Factory service environment. Its provider/model configuration is separate from the agents' native profiles.

```sh
factory answer REQUEST-ID approve --reason "Missing context is ...; I authorize admission."
factory answer REQUEST-ID reject --reason "The task needs revision."
```

Approval is an explicit recorded override, not another Jev assessment. Its reason reaches the architect through accepted history. To obtain a new automated assessment of amended input, reject and create a new execution with the updated input. The architect also receives the original Jev request and response through input bindings. Provider failures remain execution errors, not admission verdicts.

Admission does not replace design approval or final acceptance, and does not change the existing review loop limits. The classifier is a package within this factory, not a separate factory.

## Execution storage and worktrees

`factory_dir` defaults to `.factory`; ignore it in the application's Git repository. Specs, plans and review evidence go to `.factory/executions/<id>/files/`. The controller records their assigned absolute paths and collects them there. They are not project source and are not automatically committed.

The `worktree` variable resolves to `${execution.factory_dir}/worktrees/${execution.id}`. The before hook calls [git-worktree.py](../../scripts/git-worktree.py) with the source repository and this path. It creates both the worktree and its `execution/<id>` branch from the configured base (`HEAD` by default). It does not switch/reset the original checkout or copy its uncommitted changes. The source must have a committed base; it need not be clean. Python 3.9+ and Git must be available to the service.

`project_subdir` defaults to `.`. If factory.yaml belongs to a project below the repository root, set this variable to that project's repository-relative directory. `workspace` combines that suffix with the worktree path. Every Go agent receives `--workspace ${variables.workspace}`; its own launcher selects that cwd. Commit hooks receive the same value. Retries, loops, human feedback and controller restarts retain the execution ID and frozen arguments, so they reuse the same worktree and execution files directory.

The after hook calls the same utility with `--release`, marking completion but retaining the worktree, branch and all files. Failed/cancelled executions retain their worktree for inspection. See [worktree recovery and cleanup](../../skills/git-worktree/SKILL.md). Separate executions can have active worktrees in the same repository; this is checkout isolation, not a security sandbox.

## Commit boundaries

Stage after hooks commit only after the stage exits through its human approval. Agents leave changes unstaged. A review requesting changes or a human sending work back does not conclude the stage.

| Boundary | Source scope | Subject |
|---|---|---|
| Approved design | Nonignored project changes, normally none | `docs(design): record project changes from approved design` |
| Final acceptance | Nonignored project changes | `chore(implementation): record accepted work` |

Specs/plans/review documents remain in execution storage. The design hook records an idempotent no-change receipt if it has no project changes; it does not copy documents into Git. The implementation hook includes source additions and deletions, scoped to the configured workspace. Configure narrower paths when appropriate.

Commit trailers identify the execution, hook invocation, stage and participating agent instances/visits/attempts. Successful retries reuse existing commits; normal repository hooks and signing remain enabled. Worktree preparation/release does not commit, push or merge. See [hook ordering and retries](../../../controls/docs/hooks.md).

## Native runtime integration

The four agent packages require Pi 1.0.3 and explicitly declare that requirement in `runtime`. Readiness remains a deterministic MCP command package. Controls checks native compatibility and prepares a private profile; launchers retain workspace selection and linked skills, and the native bridge owns MCP configuration.

Each package registration explicitly lists its supported `overrides`, populated from the current bundle defaults. Edit them independently for each agent: provider, model, endpoint, credential environment name, thinking and model metadata. The architect and both reviewers use `high` thinking; the coder uses `medium`. Readiness also exposes its endpoint, timeout, request/response limits and existing admission threshold. Pi model pricing is currently unconfigured: the explicit zero costs preserve Pi’s native defaults and must not be interpreted as free usage; replace them with verified pricing when needed. Skills, tools and MCPs remain in the agent bundles because the current Pi override schema does not expose them. See [per-agent provider/model/credential configuration](../../../controls/docs/pi-overrides.md). Concurrent collaboration requires an adapter with peer/idle delivery; lifecycle observations go only to the controller and cannot wake peers. See [the runtime guide](../../../controls/docs/runtime-adapters.md) and [ownership diagram](../../../controls/docs/images/runtime-adapters.svg). Native preparation introduces no workflow steps and supplies no sandboxing.

## Source workspace and execution files

The execution hook selects a workspace; each agent launcher changes into that directory before starting its native adapter. The adapter states its actual working directory in the assignment. All source reads, writes and checks use this selected directory, including review. The `factory.yaml` directory identifies configuration and hook launch context; it does not override the source workspace. Stage commit scripts receive the same `variables.workspace` explicitly.

Workflow documents and evidence use the separate assigned execution-files directory. They are collected from that directory even when a launcher changes its working directory. This contract also works with a plain directory and no Git. Working-directory guidance is not filesystem isolation: host agents still have host permissions.
