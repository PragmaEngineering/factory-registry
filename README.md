# Factory registry

This repository holds reusable agent bundles, skills, and example workflow definitions for [Factory Workflows](../controls/README.md). Each agent in [agents/](agents/README.md) can start independently with its own Pi profile and linked skills. A factory in [factories/](factories/) selects agents and defines their step order, outcomes, review routes, and human decisions.

## Software planning skills and documents

The [document contract](resources/planning/document-contract.md) defines spec versus plan responsibilities, identifiers, revisions, project guidance, findings, and progress. The focused skills are:

| Capability bundle | Skills | Default agent |
|---|---|---|
| Authoring | [Author spec](skills/author-spec/SKILL.md), [author plan](skills/author-plan/SKILL.md) | Architect |
| Design review | [Review spec](skills/review-spec/SKILL.md), [review plan](skills/review-plan/SKILL.md) | Architecture reviewer |
| Implementation | [Follow plan](skills/follow-plan/SKILL.md), relevant language skills | Go coder |
| Code review | Document contract, implementation-review and language skills | Go code reviewer |

A bundle is a selection of canonical skills linked into an agent's `skills/` directory, not another executable workflow or a chain of wrapper skills. Agents retain their own native provider/model, MCP, and tool configuration. The factory selects their assignments and controls any routing, decisions, and review loops.

Use the [content-only document helper](resources/planning/document-tool.mjs) to render body sections into the self-contained [spec template](skills/author-spec/assets/spec.html) and [plan template](skills/author-plan/assets/plan.html). They share one visual shell and embedded stylesheet, with technical tables, source/version metadata, accessible navigation, and offline SVG support. Keep only sections the change needs; the helper preserves presentation without asking the model to reproduce CSS. First reviews are independent; later reviews track actual revisions, open findings, and affected contracts. Project architecture rules and coding standards remain canonical in the project; the spec cites applicable constraints and the plan explains compliance. Missing rules are unknown, not permission to invent a new standard. No separate requirements document is introduced.

Review the completed, fictional examples before an eval:

- Small change: [spec](resources/planning/examples/small/spec.html) and [plan](resources/planning/examples/small/plan.html), deliberately without a diagram.
- Service change: [spec](resources/planning/examples/service/spec.html) and [plan](resources/planning/examples/service/plan.html), with a transaction-boundary diagram and verification matrix.

These are design fixtures, not executed tasks or measured results. Upstream techniques, pinned revisions, adaptation boundaries, and retained MIT notices are documented in [planning sources](resources/planning/SOURCES.md).

For registry maintenance, edit [document.html](resources/planning/document.html), [document.css](resources/planning/document.css), and the author skills' `assets/*.body.html`; then regenerate the ready-to-edit HTML. Agents do not run this generator during their assignment.

```sh
node resources/planning/build-templates.mjs
node resources/planning/build-templates.mjs --check
node --test tests/*.test.mjs resources/*.test.mjs
```

The standalone checks verify generated artifacts, references, example criterion links, and actual launcher arguments using a fake Pi executable. They do not call a model, install dependencies, start Factory, or replace a behavioral eval.

## Use the Go coding factory

Keep Factory Workflows and this repository outside the application. Place a complete `factory.json` in the application root. Start from [the Go factory definition](factories/golang/factory.json), then change `agents[].path` to paths for this checkout's agents. A library-relative path such as `../../agents/architect` does not remain valid when copied into another project. `factory.json` has no `extends` mechanism.

From the application root:

```sh
factory exec "Add a small feature"
factory ls
factory EXECUTION-ID
factory inbox
```

See the [Go factory guide](factories/golang/README.md) for its workflow and the [Factory CLI guide](../controls/README.md) for status, decisions, messages, and retries. The [GO-001 eval preparation script](../evals/factory-go/prepare-go-001.py) demonstrates creating a complete project-local config with resolved agent paths.

The bundled Pi profiles currently default to OpenRouter. Provide the configured provider credential through the environment; never put API keys in `factory.json`. Enabled MCPs and extensions may require additional host tools. The local Factory command runner executes agents with the host user's permissions, so use trusted bundles.

The older `tests/*.ts` integration checks target the previous TypeScript coordinator and Comms implementation; they do not verify the current Go controller. Run `npm ci --prefix resources` before the standalone checks above; the runtime integration test binds a loopback port and uses official MCP SDK clients. Use Factory Workflows' Go tests for the controller and [Factory Go eval](../evals/factory-go/README.md) for an end-to-end coding eval.

## Optional Git lifecycle skills

[Git work branch](skills/git-work-branch/SKILL.md) and [Git commit](skills/git-commit/SKILL.md) are shared skills with deterministic Python utilities. Configure them as execution and stage hooks in a project's `factory.json`; the controller invokes the scripts without relying on an agent to remember lifecycle commands. Use an execution after hook to release the checkout reservation.

The committer generates a configured Conventional Commit subject and execution/multi-agent identity trailers without a model. It requires explicit commit paths, preserves repository hooks/signing, detects duplicate effects, and never publishes changes. Preparation requires a clean checkout and an existing commit. These optional utilities require Python 3.9+ and Git on a Unix host. Read the [Controls hook contract](../controls/docs/hooks.md) before enabling them. Agent bundles can link these canonical skills when Git guidance is useful; no skills are copied into agents automatically.

```sh
node --test tests/git-hooks.test.mjs
```

These tests create temporary repositories and commits; they do not commit changes in this Registry checkout.

## Classification packages

[classifiers/](classifiers/README.md) contains bounded decision-model bundles, separate from agents. Start with [task readiness](classifiers/task-readiness/README.md) and its [readiness → planning factory](factories/readiness/README.md). The classifier returns its original Jev request/response; the planning agent consumes both through explicit Factory input bindings. The readiness example enforces an admission threshold and requires explicit operator approval for other valid assessments before planning starts. Credentials and native agent configuration remain package-specific.
