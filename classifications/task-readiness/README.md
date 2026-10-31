# Task readiness

A small Jev classification package for new-task admission. It asks whether a task provides enough context for meaningful progress, then returns its **original JSON request and validated JSON response**. It does not write a spec, generate questions for the user, apply confidence thresholds or make a workflow routing decision.

`completed` means the provider call returned valid answers. `readiness: clarify` is still a successful evaluation. A consuming LLM uses the call context to ask a targeted question or proceed. Provider failures, missing credentials, malformed answers and size violations exit nonzero without submitting a successful result; Factory exposes the failed attempt and configured recovery policy.

## Files

| File | Responsibility |
|---|---|
| `config.json` | Model/provider defaults, credential environment name, endpoint, timeout and byte limits. |
| `questions.json` | Versioned task-type, readiness and missing-target questions. |
| `evaluate.mjs` | Input construction, captured-document digest checks, bounded provider call and answer validation. |
| `run.mjs` / `start.sh` | Factory entrypoint: reads bound inputs/settings, connects MCP, saves the evaluation and submits its result. |

Use a copy of this bundle for a different rubric or question set. Factory pins the bundle digest and effective `with` settings. Changes after an execution starts invalidate its package hash.

## Configuration

Defaults use OpenRouter's Decisions endpoint and `typesafe/jev-1.14`. Only the OpenRouter decision protocol is supported by this bundle. A custom endpoint can target a gateway implementing that same protocol; it must use HTTPS, except for loopback HTTP test servers. This is not a chat-completions request.

```json
{
  "name": "readiness",
  "path": "/path/to/registry/classifications/task-readiness",
  "entrypoint": "start.sh",
  "with": {
    "provider": "openrouter",
    "endpoint": "https://openrouter.ai/api/alpha/decisions",
    "model": "typesafe/jev-1.14",
    "api_key_env": "OPENROUTER_API_KEY"
  }
}
```

The credential value must exist in the **Factory service's environment**, not just a later client terminal. `with` contains its variable name, never the secret. Native model/provider configuration for the downstream planning agent is independent of this classifier's configuration.

Requires Node.js 22+ and the Registry MCP dependency:

```sh
npm ci --prefix /path/to/registry/resources
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

Bind later step inputs to outputs named `request` and `response`. No additional feedback envelope, prose template or probability threshold is required. See the [complete factory example](../../factories/readiness/factory.json).

## Operational limits

- Default provider timeout: 20 seconds; configurable up to 120 seconds. No hidden provider retry. Factory retry uses a new attempt.
- Request and response bodies are each capped at 24,000 UTF-8 bytes; settings may lower these limits. These bounds keep the pair within the current 64 KiB MCP message contract. Oversized tasks fail visibly, **never truncate**. Large-document support would need a separate artifact-reference transport.
- `evaluation.json` is saved under the private invocation directory, outside the project. A restarted process in the same invocation can resubmit that pair without another provider call; mismatching or partial saved data blocks recovery. A crash before the saved pair exists may still require another billed request.
- Structured provider usage produces one runner-neutral telemetry event; unavailable usage stays unknown. Request/response bodies are not printed to stdout.
- Current packages execute with host-user permissions; this bundle does not provide a sandbox.

Tests use local fake provider and MCP servers, not a live model:

```sh
cd /path/to/registry
node --test resources/task-readiness.test.mjs
```

API references: [OpenRouter Decisions](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request), [Jev model](https://openrouter.ai/typesafe/jev-1.14), [TypeSafe confidence](https://docs.typesafe.ai/confidence). Versioned model selection does not make semantic judgments deterministic or establish their accuracy.
