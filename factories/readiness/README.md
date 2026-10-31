# Readiness → planning

This factory calls the [task-readiness classifier](../../classifications/task-readiness/README.md), then gives its original request/response to the [architect](../../agents/architect/agent.md). The architect can ask the operator one focused question through MCP before producing `spec.html` and `plan.html`. This example does not implement code or introduce an enforced quality gate.

```text
Captured execution input → Jev readiness call → architect → spec.html + plan.html
                                                    ↕
                                               operator inbox
```

Keep Controls and Registry outside the application. Copy `factory.json` into the application root and replace both package paths with absolute paths to this Registry checkout. Relative paths in the example are for the example's location and do not survive copying. Every package starts in the application root.

Install Registry's shared Node dependency with `npm ci --prefix /path/to/registry/resources`. Configure the architect's own Pi credentials/profile as described in the [agent guide](../../agents/README.md). Its provider/model need not match Jev's. Ensure the classifier's configured credential variable is available to the Factory service before starting it. Package `with` overrides are interpreted by the selected package; they do not automatically rewrite an agent's native configuration.

From the application root containing the edited `factory.json`:

```sh
factory exec "Investigate why the gateway is slow."
factory ls
factory monitor
```

When the architect asks for clarification, respond through the operator inbox or `factory answer REQUEST-ID "Your contextual answer"`. Inspect `factory EXECUTION-ID -o json` to see accepted results, including the raw evaluation pair in `steps[].result.data`. Provider errors block the evaluation attempt; they do not become a passing readiness judgment.
