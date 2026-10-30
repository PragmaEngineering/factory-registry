# Agent bundles

Each directory under `agents/` owns one runnable agent: `agent.md`, `start.sh`, a native Pi profile in `pi/`, and links to shared skills in `skills/`. Skill source files live under [the root skills directory](../skills/); add a skill by linking it into the agent bundle.

Run a bundle independently from the application directory:

```sh
/path/to/registry/agents/coder_golang/start.sh -p "Help me with this Go change"
```

`start.sh` keeps the current working directory, creates a private Pi profile under `~/.factory/agents/` (or `FACTORY_AGENT_RUNTIME_DIR`), and loads the agent instructions and linked skills. The profiles currently default to OpenRouter; supply `OPENROUTER_API_KEY` in the environment or edit the bundle's native Pi profile for another provider. Before model launch, the entrypoint checks the executable, `rg`, and enabled stdio MCP commands. The Go bundles also require `go`, `gofmt`, and `golangci-lint`, and default `GOTOOLCHAIN=local`; explicit user values are preserved. No tools are downloaded by this check. Enabled MCPs need their own host dependencies. The Go coder and reviewer enable gopls, so `gopls` must be on `PATH` to use that MCP.

## Factory runtime integration

When [Factory Workflows](../../controls/README.md) starts an agent, it supplies the private MCP connection and injects the shared communication skill. The [Pi adapter](../resources/pi-rpc-session.mjs) configures the native connection, delivers thread messages, streams native output, and keeps the session available between turns. Agents use `send_message` for progress, input requests, and final results. Factory verifies configured output files according to `outputs_on`; the model does not compute their digests.

See [runtime setup and the runner contract](../resources/runtime-adapters.md). Run `npm ci --prefix /path/to/registry/resources` once before managed agent sessions. Standalone entrypoints retain normal Pi behavior. The host runner is not a sandbox. The writing factory example still requires adaptation to the current configuration schema, although the pair writer now supports the same managed runtime adapter.

## Planning responsibilities

| Agent | Linked document skills | Owns |
|---|---|---|
| Architect | `author-spec`, `author-plan` | Assigned design documents |
| Architecture reviewer | `review-spec`, `review-plan` | Independent findings |
| Go coder | `follow-plan` | Assigned implementation and evidence |
| Go code reviewer | Reads the shared contract; uses code-review skills | Implementation findings and verification |

The [shared document contract](../resources/planning/document-contract.md) owns artifact conventions. Agent roles do not repeat them. Architecture and domain-modeling skills supply reasoning when relevant, not another set of spec/plan instructions.

To customize a bundle, add or remove symlinks under its `skills/` directory. Keep the skill source and its referenced resources together in the registry. The launcher resolves symlinks and passes each canonical directory to Pi with `--skill`; it does not rely on global discovery. The selected skill can reference its shared contract directly without loading every planning skill. Test the wiring without a provider session using `node --test tests/planning.test.mjs` from the registry root.

Conventional commits and Linear context remain optional library skills. Link them into an agent only when needed; neither is a required planning or review phase. Linear runner configuration is documented in [Linear integration](../resources/integrations/linear.md).

Both design agents include the on-demand [Go planning evidence skill](../skills/go-planning-evidence/SKILL.md). Other languages keep the generic planning method. Author skills render content-only HTML bodies with the shared document helper; review skills use the same helper to read content without CSS.
