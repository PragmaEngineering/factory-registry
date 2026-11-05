# Task readiness

A small Jev classification package for new-task admission. It asks whether a task provides enough context for meaningful progress, then returns its **original JSON request and validated JSON response**. It does not write a spec or generate questions for the user. An optional admission policy maps validated answers to outcomes; Factory owns their configured routes.

`admission: null` (the bundle default) is advisory: `completed` means the provider call returned valid answers, including `readiness: clarify`. With admission configured, the package returns `admitted` or `review_required`. A valid assessment is never confused with a provider failure. Provider failures, missing credentials, malformed answers and size violations exit nonzero without submitting a successful result; Factory exposes the failed attempt and configured recovery policy.

## Files

| File | Responsibility |
|---|---|
| `config.json` | Model/provider defaults, credential environment name, endpoint, timeout and byte limits. |
| `questions.json` | Versioned task-type, readiness and missing-target questions. |
| `evaluate.mjs` | Input construction, captured-document digest checks, bounded provider call and answer validation. |
| `run.mjs` / `start.sh` | Factory entrypoint: reads bound inputs/settings, connects MCP, saves the evaluation and submits its result. |

Use a copy of this bundle for a different rubric or question set. Factory pins the bundle digest and effective `overrides` settings. Changes after an execution starts invalidate its package hash.

## Configuration

Defaults use OpenRouter's Decisions endpoint and `typesafe/jev-1.14`. Only the OpenRouter decision protocol is supported by this bundle. A custom endpoint can target a gateway implementing that same protocol; it must use HTTPS, except for loopback HTTP test servers. This is not a chat-completions request.

```json
{
  "name": "readiness",
  "path": "/path/to/registry/classifiers/task-readiness",
  "entrypoint": "start.sh",
  "overrides": {
    "provider": "openrouter",
    "endpoint": "https://openrouter.ai/api/alpha/decisions",
    "model": "typesafe/jev-1.14",
    "api_key_env": "OPENROUTER_API_KEY",
    "admission": {"minimum_probability": 0.85}
  }
}
```

The credential value must exist in the **Factory service's environment**, not just a later client terminal. `overrides` contains its variable name, never the secret. Native model/provider configuration for the downstream planning agent is independent of this classifier's configuration.

Requires Node.js 22+ and the Controls SDK dependency, installed through Registry. The Go binary installer does not install these npm dependencies. With sibling Controls and Registry checkouts:

```sh
npm ci --prefix /path/to/controls
npm ci --prefix /path/to/registry
```

## Inputs and outputs

Bind `task` to `{"execution":"input"}`. It contains `brief` and captured document metadata. The classifier loads document bytes from their absolute local paths, checks their captured SHA-256 digests, and decodes UTF-8 before sending the request. It does not scan the repository or invent a context summary. The bundle sets `task_phase: new_task`; it is intended for the start of an execution, not repeated classification of inbox follow-ups.

Its accepted result has:

```json
{
  "outcome": "completed",
  "summary": "Task readiness evaluated; consume the original request and response as fallible assessment data.",
  "data": {
    "request": {"model": "...", "state": {}, "questions": {}},
    "response": {"model": "...", "answers": {}}
  }
}
```

The shown bodies are abbreviated, not actual predictions. Runtime data retains every returned body field, including answer probabilities, model metadata and usage. Bodies are preserved as JSON values, not original whitespace or HTTP bytes. Headers and credentials are excluded. The result is sent to the discovered controller participant using MCP and must receive `effect.state: accepted`.

Bind later step inputs to outputs named `request` and `response`. The original bodies remain unchanged in either mode; no feedback envelope or prose template is added. See the [complete factory example](../../factories/golang/factory.json).

## Enforced admission

Set `overrides.admission` to `{"minimum_probability":0.85}` to enforce readiness. The number is the returned **probability of the `accept` label**, not the separate `confidence` statistic. Any finite threshold from 0 to 1 is valid configuration. The example's 0.85 is an initial policy, not an empirically validated guarantee.

| Valid assessment | Result outcome |
|---|---|
| Selected label is `accept` and its probability meets the threshold | `admitted` |
| `clarify`, `pass_through`, or an `accept` below the threshold | `review_required` |

In the Go coding factory, `admitted` routes to specification. `review_required` routes to the **human admission decision**. Nothing starts the architect until the operator approves; rejection stops the workflow. An approval is an explicit, recorded override of the automated gate. Include missing context in the decision reason so the architect receives it through accepted history.

This does not rerun Jev against the operator's reason or silently treat uncertainty as a pass. To reassess amended input rather than override the gate, reject this execution and submit a new one with that input. Provider errors and invalid answers remain failed attempts; they do not route through human admission as valid assessments.

Omit `admission`, or set it to `null`, for advisory `completed` behavior. The workflow's outcome routes must match its selected mode.

## Operational limits

- Default provider timeout: 20 seconds; configurable up to 120 seconds. No hidden provider retry. Factory retry uses a new attempt.
- Request and response bodies are each capped at 24,000 UTF-8 bytes; settings may lower these limits. These bounds keep the pair within the current 64 KiB MCP message contract. Oversized tasks fail visibly, **never truncate**. Large-document support would need a separate artifact-reference transport.
- `evaluation.json` is saved under the private invocation directory, outside the project. A restarted process in the same invocation can resubmit that pair without another provider call; mismatching or partial saved data blocks recovery. A crash before the saved pair exists may still require another billed request.
- Structured provider usage produces one runner-neutral telemetry event; unavailable usage stays unknown. Request/response bodies are not printed to stdout.
- Current packages execute with host-user permissions; this bundle does not provide a sandbox.

Tests use local fake provider and MCP servers, not a live model:

```sh
cd /path/to/registry
node --test tests/task-readiness.test.mjs
```

API references: [OpenRouter Decisions](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request), [Jev model](https://openrouter.ai/typesafe/jev-1.14), [TypeSafe confidence](https://docs.typesafe.ai/confidence). Versioned model selection does not make semantic judgments deterministic or establish their accuracy.
