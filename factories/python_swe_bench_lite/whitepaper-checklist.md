# Manuscript completion and publication checklist

Internal authoring record for [whitepaper.md](whitepaper.md), not part of the paper.
Publication follows completed experiments, official grading and analysis. No result
is supplied or implied by the manuscript's table/figure placeholders.

## Freeze before held-out runs

- [ ] Pin the full SWE-bench Lite test split: all 300 instance IDs in the test split. Disclose development exposure.
- [ ] Separate workflow-tuning tasks from the held-out evaluation cohorts.
- [x] Add autonomous Python baseline and coder/reviewer configurations.
- [ ] Validate those configurations end to end in the isolated benchmark backend; configuration tests alone do not establish readiness.
- [ ] Compare single-agent and sequential author/reviewer variants. Use official issue resolution as the primary endpoint; report resource use alongside it. Keep fault tests separate.
- [ ] Register baseline and treatment definitions, package/configuration identities,
      total budgets and allocation, human policy, repetition counts and ordering.
- [ ] Register uncertainty methods, analysis populations, missing-result and
      infrastructure-failure policies, and protocol-deviation handling.

## Complete benchmark and reliability integrations

- [ ] Validate isolated instance baseline/environment provisioning and network rules.
- [ ] Keep private tests, reference answers and future commits outside worker access.
- [ ] Export candidate outputs and collect official grading through documented
      component interfaces; the eval client never accesses worker/product internals.
- [ ] Pin the official evaluator and verify its prescribed sanity checks.
- [ ] Validate the public evidence collector and available resource accounting.
- [ ] Define deterministic fault fixtures for the tested execution-contract claims.

Current Bench tooling supports integration pilots, not complete official grading.
Resolve those integration gaps before interpreting any trial as a benchmark score.
The manuscript's description of the evaluated system must match the versions
actually used; implementation work after a run does not retroactively validate it.

## Execute and analyze

- [ ] Preserve all planned/submitted trials, including ambiguity, rejection,
      cancellations, budget exhaustion, infrastructure errors and missing outputs.
- [ ] Complete registered repetitions and record protocol deviations/interventions.
- [ ] Reconcile trial accounting; retain task-level grades and trajectory evidence.
- [ ] Generate results tables and figures from versioned analysis and archived data.
- [ ] Report uncertainty, pairing, repeated-task structure and telemetry coverage.
- [ ] Separate product outcomes, resource measurements, fault tests and judgments.
- [ ] Assess each tested RQ, including negative or inconclusive results.
- [ ] Report actual study limitations and comparator differences.

## Finalize for submission

- [ ] Replace every `[[...]]` field with evidence, analysis or an explicit
      justified omission; remove unused result rows and unperformed ablations.
- [ ] Align abstract, contributions, discussion and conclusion with actual results.
- [ ] Replace study-plan wording with the procedure actually followed, including deviations.
- [ ] Verify that causal claims match the comparisons and controls actually run.
- [ ] Update references and exact SWE-bench Lite dataset/evaluator revisions. Keep the wider benchmark survey outside the study scope.
- [ ] Publish permitted reproducibility materials with stable archive identifiers;
      explain licenses, unavailable artifacts and any redactions.
- [ ] Replace local implementation links where needed for external readers.
- [ ] Remove the manuscript's internal authoring note; confirm no unresolved placeholders.
