# Readiness → planning

This factory calls the [task-readiness classifier](../../classifiers/task-readiness/README.md), then gives its original request/response to the [architect](../../agents/architect/agent.md). This example enforces admission before the architect starts. It does not implement code.

```text
Captured input → Jev readiness → accept probability ≥ 0.85 → architect
                              ↘ otherwise → human admission
                                              approve → architect
                                              reject  → stop
```

Keep Controls and Registry outside the application. Copy `factory.json` into the application root and replace both package paths with absolute paths to this Registry checkout. Relative paths in the example are for the example's location and do not survive copying. Every package starts in the application root.

Install Registry's shared Node dependency with `npm ci --prefix /path/to/registry/resources`. Configure the architect's own Pi credentials/profile as described in the [agent guide](../../agents/README.md). Its provider/model need not match Jev's. Ensure the classifier's configured credential variable is available to the Factory service before starting it. Package `with` overrides are interpreted by the selected package; they do not automatically rewrite an agent's native configuration.

From the application root containing the edited `factory.json`:

```sh
factory exec "Investigate why the gateway is slow."
factory ls
factory monitor
```

`accept` must be the selected readiness label and have a reported probability of at least 0.85. Other valid answers, including uncertain results and `pass_through`, pause at `admission-review`. Its configured operator outcomes are:

```sh
factory answer REQUEST-ID approve --reason "The missing context is ...; I authorize admission."
factory answer REQUEST-ID reject --reason "Input needs revision."
```

Approval explicitly overrides the automated gate; its reason becomes context for the architect. Rejection stops this execution. The model is not rerun against the reason. To obtain a fresh automated assessment, reject and start a new execution with the amended input. The initial threshold is configurable under `packages[].with.admission.minimum_probability`; validate it against labeled tasks before relying on its accuracy.

Inspect `factory EXECUTION-ID -o json` for the accepted readiness result, including the original pair in `steps[].result.data`. Provider errors block the evaluation attempt and never become an admitted assessment. The classifier itself retains advisory mode when `admission` is omitted; **this factory explicitly enables enforcement**.
