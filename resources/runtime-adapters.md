# Runtime adapters

Agent roles and domain skills describe the work. Runtime adapters connect a native runner to the control plane's conversation protocol.

## Setup

Install the pinned official MCP client dependency once in this registry checkout:

```sh
npm ci --prefix /path/to/registry/resources
```

Each agent still owns its native Pi profile, provider/model, tools, and domain skills. Its standalone entrypoint uses Pi directly.

## Pi under Factory

Factory supplies `FACTORY_MCP_URL`, a scoped `FACTORY_MCP_TOKEN`, `FACTORY_THREAD_ID`, `FACTORY_PARTICIPANT_ID`, and the runtime-provided `FACTORY_COMMS_SKILL` directory. Do not configure these manually or put credentials in model prompts.

`start.sh` selects [pi-rpc-session.mjs](pi-rpc-session.mjs). The adapter:

- Adds the Factory MCP server to the private native Pi profile, preserving existing MCPs. The credential stays in the environment.
- Loads the controller's `control-plane-comms` skill and starts Pi in RPC mode.
- Streams native JSONL output unchanged and accepts operator steering input.
- Waits for thread messages with the official MCP client, delivering peer messages through Pi RPC and acknowledging retained delivery.
- Keeps the session available when Pi settles normally between turns. The agent ends its turn while waiting; the adapter waits in the background and wakes it on messages. The model-facing `wait_for_message` tool is hidden to avoid competing polling.
- Continues a response truncated with `stopReason: length` at most twice per invocation. Each continuation is visible in captured output and asks for concrete incremental work. `FACTORY_PI_CONTINUATION_LIMIT` (0–10, default 2) can change that bound in the service environment before startup.
- Terminates visibly when continuation is exhausted or a model turn ends with `error` or `aborted`. It does not disguise those states as idle waiting. An accepted final result ends the invocation; a normal idle turn does not.

The agent completes its invocation by sending a `step_result` payload to the controller through `send_message`. Its data contains the allowed outcome and factual summary. Factory validates and collects applicable files according to `outputs`/`outputs_on`. There is no completion file or shell result helper.

An accepted member result does not complete a concurrent loop. The engine waits for every member and reduces configured routes: failure takes priority, then a route back to the loop entry, then the common exit. Human approval remains a separate configured decision.

## Another runner

Configure its native MCP client with the provisioned endpoint and environment credential. Load the shared communication skill, accept the supplied assignment, and submit typed messages through the same eight tools. To deliver messages into an idle session, translate them into that runner's supported queued/steering input mechanism. Without automatic delivery, the agent can use `wait_for_message` itself. Do not run two competing delivery loops.

No adapter chooses outcomes, workflow routes, or human authority. Deterministic programs can use an MCP SDK client without an agent skill. A runner that cannot remain available across idle turns needs an explicit continuation capability before it supports concurrent collaboration.

## Verification

```sh
node --test /path/to/registry/tests/*.test.mjs /path/to/registry/resources/*.test.mjs
```

The RPC test uses an official MCP server/client fixture and a fake Pi process. It checks idle-session delivery, operator steering, preservation of existing MCP configuration, accepted-result termination, bounded truncation recovery, and visible provider/abort failures without model calls. It needs permission to bind a local loopback port.

For installed Pi discovery, set `PI_SKILL_LOADER` to its `dist/core/skills.js` module when running the tests. The discovery test skips if no loader is supplied.

## Local tool preflight

Each launcher checks its executable, `rg`, and enabled stdio MCP commands before starting the model. The Go bundles also check `go`, `gofmt`, and `golangci-lint`. Missing commands fail with a local diagnostic. These checks do not validate credentials, provider availability, MCP handshakes, or tool versions. Install compatible tools before the session; the agent must not download replacements during work.

Go launchers default `GOTOOLCHAIN=local` to prevent implicit toolchain downloads. A deliberate user setting is preserved. Pi profiles omit its `find` tool, which requires an additional `fd` executable; use `rg --files` for file discovery.

In managed Pi sessions, `list_participants`, `send_message`, and `read_messages` use native **direct** exposure, so the model calls their schemas without writing a codemode script. Other Factory tools remain available through codemode; the background-delivery wait tool stays hidden. This is a Pi presentation choice. The MCP protocol and shared communication skill remain runner independent; another adapter can expose the same schemas through its runner's native tools.
