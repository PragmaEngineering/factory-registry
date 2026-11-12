# Agent bundles

Each agent bundle under `agents/` owns `agent.md`, `start.sh`, a native Pi profile in `pi/`, and links to shared skills in `skills/`. The shared [scripts/](scripts/) directory contains launcher utilities, not an agent. Skill source files live under [the root skills directory](../skills/); add a skill by linking it into the agent bundle.

Run a bundle independently from the application directory:

```sh
/path/to/registry/agents/coder_golang/start.sh -p "Help me with this Go change"
```

`start.sh` keeps the current working directory, creates a private Pi profile under `~/.factory/agents/` (or `FACTORY_AGENT_RUNTIME_DIR`), and loads the agent instructions and linked skills. The profiles currently default to OpenRouter; supply `OPENROUTER_API_KEY` in the environment or edit the bundle's native Pi profile for another provider.

## Local tool preflight

The shared [preflight script](scripts/preflight.mjs) belongs to the Registry launchers. Before model launch, the entrypoint checks the executable, `rg`, and enabled stdio MCP commands. The Go bundles also require `go`, `gofmt`, and `golangci-lint`, and default `GOTOOLCHAIN=local`; explicit user values are preserved. No tools are downloaded by this check. Enabled MCPs need their own host dependencies. The Go coder and reviewer enable gopls, so `gopls` must be on `PATH` to use that MCP.

## Factory runtime integration

With `protocol: mcp`, [Factory Workflows](../../controls/README.md) supplies a
scoped MCP connection and the adapter retrieves the assignment through the shared
API. Legacy mode additionally provisions its historical communication skill. The [Pi adapter](../../controls/adapters/pi/pi-rpc-session.mjs) configures the native connection, delivers thread messages, streams native output, and keeps the session available between turns. MCP-mode agents use `assignment_complete` for final output/error and the
conversation tools for peer messages. Legacy agents retain `step_result` messages. Factory verifies configured output files according to `outputs_on`; the model does not compute their digests.

See [runtime setup and the runner contract](../../controls/adapters/README.md) and [Registry dependency installation](../README.md#controls-dependencies). The Go binary installer does not install these Node.js dependencies. Standalone entrypoints retain normal Pi behavior. The host runner is not a sandbox. The writing factory example still requires adaptation to the current configuration schema, although the pair writer now supports the same managed runtime adapter.

## Planning responsibilities

| Agent | Linked document skills | Owns |
|---|---|---|
| Architect | `author-spec`, `author-plan` | Assigned design documents |
| Architecture reviewer | `review-spec`, `review-plan` | Independent findings |
| Go coder | `follow-plan` | Assigned implementation and evidence |
| Go code reviewer | Reads spec/plan guidance; uses code-review skills | Implementation findings and verification |

The [spec skill](../skills/author-spec/SKILL.md) and [plan skill](../skills/author-plan/SKILL.md) own their respective artifact conventions. Agent roles do not repeat them. Architecture and domain-modeling skills supply reasoning when relevant, not another set of spec/plan instructions.

To customize a bundle, add or remove symlinks under its `skills/` directory. Keep the skill source and its referenced resources together in the registry. The launcher resolves symlinks and passes each canonical directory to Pi with `--skill`; it does not rely on global discovery. Review and implementation skills link directly to the relevant authoring guidance. Test the wiring without a provider session using `node --test tests/planning.test.mjs` from the registry root.

Conventional commits and Linear context remain optional library skills. Link them into an agent only when needed; neither is a required planning or review phase. Linear runner configuration is documented in [Linear integration](../skills/linear-context/references/setup.md).

Both design agents include the on-demand [Go planning evidence skill](../skills/go-planning-evidence/SKILL.md). Other languages keep the generic planning method. Author skills render content-only HTML bodies with the shared document helper; review skills use the same helper to read content without CSS.

Managed packages may omit Pi-specific `args`: MCP mode retrieves the assignment through the API. Legacy mode reads
`FACTORY_PROMPT_PATH` when `-p` is absent. That assignment includes explicitly bound structured inputs. This does not change standalone `start.sh -p "..."` usage or native provider/model configuration.

## Managed native runtime

Declare `runtime: {"name":"pi","version":"=1.0.3"}` in the package/agent registration in `factory.yaml`. Controls’ Pi preparer owns the private managed profile and exact native executable. These launchers reuse it, select the source workspace, preflight role tools and load linked skills; they do not copy another managed profile. Standalone startup remains independent. The bridge alone injects Factory MCP settings. See [Controls’ runtime contributor guide](../../controls/docs/runtime-adapters.md). Use package-level `overrides` for provider/model/endpoint/credential selection; see [Pi overrides](../../controls/docs/pi-overrides.md).

Managed native selection is checked before launch; Pi 1.0.3 is currently supported. Native identity/capabilities are recorded separately from the command host. See [the preparation ownership diagram](../../controls/docs/images/runtime-adapters.svg). Lifecycle reports are controller-only; native delivery filters them from model input while retaining audit visibility.

## Python repository repair

[coder_python](coder_python/agent.md) and [code_reviewer_python](code_reviewer_python/agent.md)
are independent bundles for focused Python issue repair. Both link to the canonical
[Python repair skill](../skills/python-repository-repair/SKILL.md), own complete native
profiles, and require `python3` and `rg`. They load no Go MCP or Ralph extension.
The [Lite factory](../factories/python_swe_bench_lite/README.md) composes them into an
autonomous review loop; the single-agent baseline uses the same coder.

## Shared assignment MCP

The Go factory now declares `protocol: mcp` for readiness and its four Pi roles.
Programs bootstrap only their authenticated MCP connection; assignments are read
through `assignment_get`, lifecycle is reported through `assignment_status`, and
results/errors use `assignment_complete`. Factory and Fabric use the same agent
contract. Controls still owns native Pi preparation from YAML runtime/provider
settings. The Go roles keep their own instructions and linked skills. Legacy
Factory variables and saved readiness evaluations remain `protocol: legacy`
compatibility, not prerequisites for these MCP-mode packages.
