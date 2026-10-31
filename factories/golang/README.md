# Go coding factory

[factory.json](factory.json) defines the Go coding workflow with an execution branch, approved-stage commits, and checkout release: enforced readiness admission, architect, architecture review, human design approval, Go implementation, code review, and human acceptance. The design and implementation stages each allow up to three architect/reviewer or coder/reviewer rounds before escalating unresolved findings to the human decision. A satisfactory review reaches the same decision sooner. Human `request_changes` starts another bounded set of rounds. Review findings route back to the relevant agent through the prior-result handoff. The agents and their native Pi profiles live in [the agent library](../../agents/README.md).

The config belongs in the **application project root** for a run. Copy it there and change each `packages[].path` to the installed package directory, or use [the GO-001 eval preparation script](../../../evals/factory-go/prepare-go-001.py) as an example. Also change the root branch-hook and stage commit-hook script arguments to the installed [branch utility](../../scripts/git-work-branch.py) and [commit utility](../../scripts/git-commit.py), preferably using absolute paths. The eval preparation script illustrates package-path resolution only; hook script paths and Git prerequisites still need setup. Paths relative to `factory.json` resolve inside the application project, so the library's own `../../agents/...` and `../../classifiers/...` values cannot be copied unchanged. Do not run `factory exec -c` against this library file unless the library directory itself is the intended work area.

From the application root, run `factory exec "Your request"`, then inspect `factory ls`, `factory EXECUTION-ID`, and `factory inbox`. Answer human decisions with `factory answer REQUEST-ID OUTCOME --reason "..."`. Agents communicate through the [thread MCP runtime](../../../controls/adapters/README.md) and submit explicit `step_result` messages. The example requires files only for its listed `outputs_on` outcomes, so a blocker can retain its cause without producing success artifacts.

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

The threshold is configured under the readiness package's `with.admission.minimum_probability`. It is an initial policy, not a validated accuracy guarantee. Install the classifier's MCP dependency with `npm ci --prefix /path/to/controls`, followed by `npm ci --prefix /path/to/registry` and make its configured provider credential available in the Factory service environment. Its provider/model configuration is separate from the agents' native profiles.

```sh
factory answer REQUEST-ID approve --reason "Missing context is ...; I authorize admission."
factory answer REQUEST-ID reject --reason "The task needs revision."
```

Approval is an explicit recorded override, not another Jev assessment. Its reason reaches the architect through accepted history. To obtain a new automated assessment of amended input, reject and create a new execution with the updated input. The architect also receives the original Jev request and response through input bindings. Provider failures remain execution errors, not admission verdicts.

Admission does not replace design approval or final acceptance, and does not change the existing review loop limits. The classifier is a package within this factory, not a separate factory.

## Execution branch

The root `hooks.before` runs the [branch utility](../../skills/git-work-branch/SKILL.md) before admission or any agent starts. It creates and checks out `execution/<execution_id>` from the current `HEAD`, then reserves that checkout for this execution. Retrying preparation verifies its receipt and preserves existing work.

The application directory must be the Git repository root with an existing commit and a clean index/worktree, including untracked files. Commit the project-local `factory.json` and intended input files before execution; ignore secrets and generated runtime files. Python 3.9+ and Git must be available to the Factory service. This enables Git for this example factory, not for Controls generally.

The root `hooks.after` releases the reservation after successful completion. It retains the branch and all changes; it neither switches back nor pushes or merges. Failure, rejection, or cancellation does not run this success hook and retains the reservation for inspection. See [branch recovery](../../skills/git-work-branch/SKILL.md) before explicitly releasing an interrupted execution.

This is one reserved working checkout, not a worktree per execution. Another execution against the same checkout is refused until release. Independent checkouts can run concurrently. The next execution branches from whichever commit is then `HEAD`; select the intended base branch before starting it.

## Commit boundaries

Each stage has an `after` hook using the [commit utility](../../skills/git-commit/SKILL.md). Agents leave changes unstaged; the hook creates the commit only after the stage exits successfully through its human approval. Neither branch preparation nor release creates a commit.

| Boundary | Configured snapshot | Why |
|---|---|---|
| Design exits after human approval | `spec.html`, `plan.html`, `reviews/architecture.md` | Captures the reviewed design after all revisions |
| Implementation exits after final acceptance | Every nonignored project change (`--path .`) | Captures accepted work after both agents have finished |

A reviewer returning `changes_requested` does not conclude the stage. Human feedback routed back into that stage also keeps it open. Neither should trigger a stage commit. A stage commit attributes successful agent invocations across its review history; it is not one commit per agent or review round. Failed and rejected stages do not run success hooks.

The deterministic subjects are:

```text
docs(design): record approved specification and plan
chore(implementation): record accepted work
```

Trailers identify the execution, hook invocation, stage, and participating agent instances with their visits and attempts. Retries reuse the hook invocation ID and recover an existing commit instead of duplicating it. No changed files produces a no-change receipt. `chore` deliberately avoids guessing whether an arbitrary task is a feature or fix.

The implementation hook uses `--path .` so it can capture arbitrary source paths, additions, and deletions. This includes every nonignored project change; use repository ignore rules for credentials, binaries, caches, and runtime files, and avoid unrelated edits during an execution. Narrow the configured paths for a project when appropriate. The hooks cannot infer file ownership. Normal repository hooks, Git identity, and signing still apply. Configure those before starting the Factory service. See the [hook lifecycle](../../../controls/docs/hooks.md) for ordering and retry behavior.
