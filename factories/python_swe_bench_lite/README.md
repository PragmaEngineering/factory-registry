# Python issue repair for SWE-bench Lite

Autonomous configurations for existing Python repositories. They consume the original
issue and a prepared source baseline; they do not require spec/plan documents.

| Variant | Configuration | Flow |
| --- | --- | --- |
| Author/reviewer | [factory.yaml](factory.yaml) | Coder → reviewer → repair if needed; at most two rounds |
| Single agent | [baseline.yaml](baseline.yaml) | Same coder and tools; implementation and self-review in one step |

Both use Pi 1.0.3 and the same model/thinking defaults. There are no human decisions,
readiness classifier, Git hooks or Ralph loops. Review-limit exhaustion fails the
execution under current Controls semantics; it is not approval. The candidate remains
subject to independent grading once export/grading integration exists.

## Agent configuration

[coder_python](../../agents/coder_python/agent.md) and
[code_reviewer_python](../../agents/code_reviewer_python/agent.md) each own a standalone
entrypoint, native Pi settings/models/MCP configuration, and links to canonical skills.
Their MCP lists are empty; the managed runtime injects Factory communication.
No Go tools or extensions are inherited.

The current defaults use OpenRouter and DeepSeek V4 Flash. Set `OPENROUTER_API_KEY`
in the service environment, or change each package's `overrides` using
[the supported schema](../../../controls/docs/pi-overrides.md). No key values belong
in YAML. Both bundles require Node, Pi, `rg` and a provisioned `python3`. Project tests
must use the instance's interpreter/environment and runner, not a globally imposed
pytest/ruff setup. Launchers do not install dependencies.

## Workspace and files

`variables.workspace` defaults to `workspace/` beside the selected configuration.
It must already contain the intended repository baseline. The launcher refuses a
missing directory rather than working in Registry by accident. Change this variable
when the execution backend provides another workspace. Paths are not isolation.

The coder edits source there. Evidence lives in Controls' execution files directory:
`reviews/implementation.md` and `reviews/code.md`. Reports remain separate from patches.
The reviewer does not edit source. These configs do not clone repositories, construct
containers, export patches or run the official evaluator.

When copying a configuration, update `packages[].path` for the installed Registry;
paths resolve from the config file, not the shell's working directory. For an explicitly
ungraded integration pilot, after preparing a disposable development workspace:

```sh
factory exec -c /absolute/path/to/factory.yaml -f /absolute/path/to/issue.txt
```

This spends model credits. Do not point it at the test cohort until the integrations
below and the study protocol are ready. Bench itself only calls public Factory APIs.

## Budgets

Starter limits are 50,000 reported tokens and 600 seconds per step attempt in the
pair (at most four invocations), and 200,000 tokens/2,400 seconds for the single agent.
These give equal nominal maximum totals without discretionary retries, not identical
allocation. The pair may finish early; unused allowances are not transferred. Tune on
dev tasks and freeze the settings before the study.

Tokens include cache categories and are reported after responses; caps can overshoot,
and missing telemetry cannot enforce a token cap. Wall-clock limits remain enabled.
They are not dollar limits. Repeated attempts reset per-attempt caps; autonomous study
policy forbids manual retries. Aggregate enforcement remains a Controls issue.

## Benchmark readiness

**Configurations and worker bundles are implemented; official scoring is not.**
Host processes are not sandboxed. Instructions against reference lookup do not enforce
isolation. Instance provisioning, private-test separation, immutable candidate export
and official grading remain in [Registry benchmark issues](../../bench_issues.md) and
[Controls benchmark issues](../../../controls/bench_issues.md).

Use the [Bench guide](../../../bench/docs/running.md) and
[study record](../../../bench/study.yaml). Use Lite's separate dev split for tuning.
A completed workflow or clean review never establishes an official benchmark pass.
