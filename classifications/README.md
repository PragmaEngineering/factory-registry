# Classification bundles

Reusable packages for bounded, structured model judgments. They are not conversational agents. Each bundle owns its model/provider defaults, questions, response validation and entrypoint; Factory owns scheduling, result acceptance and downstream input binding.

- [Task readiness](task-readiness/README.md): Jev assesses the initial task context. Its original request and response are passed to a planning agent without applying a readiness threshold or generating remediation prose.

The public configuration uses ordinary `packages` and `type: "run"` steps. The control plane contains no Jev API adapter. See the [readiness factory](../factories/readiness/README.md) and [package/input contract](../../controls/docs/packages.md).
