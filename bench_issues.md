# Autonomous SWE-bench Lite workflow and integrations

Target the full 300-task test split in Python. The existing Go factory
remains a human-reviewed application workflow; do not modify it into a benchmark by
silently auto-approving its decisions. Integration implementation is pending.

## REG-BENCH-001 — Autonomous baseline and treatment

**Configuration implemented; isolated end-to-end verification pending.**
[Python Lite](factories/python_swe_bench_lite/README.md) provides a single-agent baseline
and sequential coder/reviewer treatment. Shared coder/model settings and skills;
no human gates, classifier, Git hooks or internal agent loops. The pair has two rounds;
unresolved review at the limit fails explicitly. The original Go factory is unchanged.

**Remaining:** validate both through the isolated backend, freeze the study budgets
and identities, and verify that candidate export includes failed/budget-exhausted runs.
Nominal budget totals match without retries; per-step allocation and telemetry
overshoot must be recorded. Neither config is an official harness integration.

## REG-BENCH-002 — Python worker environment binding

**Worker bundles implemented; depends on CTRL-BENCH-001/002 for isolation.**
The standalone [coder](agents/coder_python/agent.md) and
[reviewer](agents/code_reviewer_python/agent.md) own Pi profiles and link shared skills.
They use the supplied Python project's tools, not Go checks or a forced modern toolchain.

**Remaining:** bind native file/shell tools to the prepared instance environment using
the public runtime contract. Every role must see the same baseline and changes. Keep
private tests, raw datasets and host credentials inaccessible. Starting host Pi beside
a container is not isolation. Package preparation belongs to Registry/Controls, not Bench.
Validate representative Lite environments, including historical interpreters/dependencies,
and record image/toolchain identity. Enforce restrictions in the runtime, not just prompts.

## REG-BENCH-003 — Thin official SWE-bench evaluator integration

**Depends on:** CTRL-BENCH-003.

Use the pinned upstream SWE-bench harness rather than reimplementing patch application,
log parsers or F2P/P2P rules. Translate allowed instance metadata to environment setup;
export the actual candidate delta against the declared baseline after writes stop.
Account for added/deleted files and staged/unstaged/committed changes. Preserve empty
candidates and export failures as separate observations.

Convert candidates into the official prediction format and grade in fresh isolated
environments. Private test/reference material is available only to the grader. Never
feed grader failures back into the same attempt. Bind cache keys to instance, patch,
dataset and harness revisions; retain official raw reports, logs and normalized results.
Treat tests failing, infrastructure errors and absent grades distinctly.

**Acceptance:** upstream gold/negative fixture checks succeed in the isolated grading
phase without exposing answers to workers; incorrect candidates fail; repeat grading is
reproducible; no stale cache acceptance; all evidence is retrieved through Controls.
Document installation, exact dependencies, container architecture, resource requirements
and supported protocol. Keep executable utilities in appropriate script/integration
packages, not hidden inside unrelated skills.

See [Controls contracts](../controls/bench_issues.md) and
[Bench orchestration/reporting](../bench/bench_issues.md).
