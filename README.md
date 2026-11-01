# Factory registry

This repository holds reusable agent bundles, skills, and example workflow definitions for [Factory Workflows](../controls/README.md). Each agent in [agents/](agents/README.md) can start independently with its own Pi profile and linked skills. A factory in [factories/](factories/) selects agents and defines their step order, outcomes, review routes, and human decisions.

## Software planning skills and documents

The [spec skill](skills/author-spec/SKILL.md) owns specification guidance, templates, and examples. The [plan skill](skills/author-plan/SKILL.md) owns implementation-plan guidance, templates, and examples. Review and implementation skills link to those definitions. The focused skills are:

| Capability bundle | Skills | Default agent |
|---|---|---|
| Authoring | [Author spec](skills/author-spec/SKILL.md), [author plan](skills/author-plan/SKILL.md) | Architect |
| Design review | [Review spec](skills/review-spec/SKILL.md), [review plan](skills/review-plan/SKILL.md) | Architecture reviewer |
| Implementation | [Follow plan](skills/follow-plan/SKILL.md), relevant language skills | Go coder |
| Code review | Spec/plan guidance, implementation-review and language skills | Go code reviewer |

A bundle is a selection of canonical skills linked into an agent's `skills/` directory, not another executable workflow or a chain of wrapper skills. Agents retain their own native provider/model, MCP, and tool configuration. The factory selects their assignments and controls any routing, decisions, and review loops.

Use the [content-only document helper](skills/author-spec/scripts/document.mjs) to render body sections into the self-contained [spec template](skills/author-spec/assets/spec.html) and [plan template](skills/author-plan/assets/plan.html). They share one visual shell and embedded stylesheet, with technical tables, source/version metadata, accessible navigation, and offline SVG support. Keep only sections the change needs; the helper preserves presentation without asking the model to reproduce CSS. First reviews are independent; later reviews track actual revisions, open findings, and affected contracts. Project architecture rules and coding standards remain canonical in the project; the spec cites applicable constraints and the plan explains compliance. Missing rules are unknown, not permission to invent a new standard. No separate requirements document is introduced.

Review the completed, fictional examples before an eval:

- Small change: [spec](skills/author-spec/examples/small/spec.html) and [plan](skills/author-plan/examples/small/plan.html), deliberately without a diagram.
- Service change: [spec](skills/author-spec/examples/service/spec.html) and [plan](skills/author-plan/examples/service/plan.html), with a transaction-boundary diagram and verification matrix.

These are design fixtures, not executed tasks or measured results. Upstream techniques, pinned revisions, adaptation boundaries, and retained MIT notices are documented in [planning sources](skills/author-spec/references/SOURCES.md).

The spec skill owns the shared renderer, HTML shell, stylesheet, and template generator. The plan skill’s `scripts/document.mjs` is a relative symlink to that renderer; its plan templates and examples remain in the plan skill. Preserve this dependency when installing these skills together.

For registry maintenance, edit [document.html](skills/author-spec/assets/document.html), [document.css](skills/author-spec/assets/document.css), and the author skills' `assets/*.body.html` or `examples/*/*.body.html`; then regenerate both skills’ ready-to-edit HTML. Agents do not run this generator during their assignment.

```sh
node skills/author-spec/scripts/build-templates.mjs
node skills/author-spec/scripts/build-templates.mjs --check
node --test tests/*.test.mjs
```

The standalone checks verify generated artifacts, references, example criterion links, and actual launcher arguments using a fake Pi executable. They do not call a model, install dependencies, start Factory, or replace a behavioral eval.

## Use the Go coding factory

Keep Factory Workflows and this repository outside the application. Place a complete `factory.json` in the application root. Start from [the Go factory definition](factories/golang/factory.json), then change `packages[].path` and all hook script arguments to paths for this checkout's agents, classifiers, and Git utilities. This factory requires a committed Git base; it creates a separate execution worktree and commits project changes at approved stage boundaries. See [its Git lifecycle](factories/golang/README.md#execution-storage-and-worktrees) before starting it. A library-relative path such as `../../agents/architect` does not remain valid when copied into another project. `factory.json` has no `extends` mechanism.

From the application root:

```sh
factory exec "Add a small feature"
factory ls
factory EXECUTION-ID
factory inbox
```

See the [Go factory guide](factories/golang/README.md) for its workflow and the [Factory CLI guide](../controls/README.md) for status, decisions, messages, and retries. The [GO-001 eval guide](../evals/README.md) documents repeatable execution setup and measurement.

The bundled Pi profiles currently default to OpenRouter. Provide the configured provider credential through the environment; never put API keys in `factory.json`. Enabled MCPs and extensions may require additional host tools. The local Factory command runner executes agents with the host user's permissions, so use trusted bundles.



## Optional Git lifecycle skills

The deterministic Git hook utilities live in [scripts/](scripts/): [worktree preparation/release](scripts/git-worktree.py) and [commits](scripts/git-commit.py). The [Git worktree](skills/git-worktree/SKILL.md) and [Git commit](skills/git-commit/SKILL.md) skills document their use; the utilities do not depend on loading either skill. Configure them as execution and stage hooks in a project's `factory.json`; the controller invokes the scripts without relying on an agent to remember lifecycle commands. Use an execution after hook to release the execution worktree receipt while retaining its files and branch.

The committer generates a configured Conventional Commit subject and execution/multi-agent identity trailers without a model. It requires explicit commit paths, preserves repository hooks/signing, detects duplicate effects, and never publishes changes. Preparation uses a committed base and leaves the source checkout unchanged; uncommitted source changes are not included. These optional utilities require Python 3.9+ and Git on a Unix host. Read the [Controls hook contract](../controls/docs/hooks.md) before enabling them. Agent bundles can link these canonical skills when Git guidance is useful; no skills are copied into agents automatically.

```sh
node --test tests/git-hooks.test.mjs
```

These tests create temporary repositories and commits; they do not commit changes in this Registry checkout.

## Classification packages

[classifiers/](classifiers/README.md) contains bounded decision-model bundles, separate from agents. Start with [task readiness](classifiers/task-readiness/README.md) and its [Go coding factory](factories/golang/README.md). The classifier returns its original Jev request/response; the planning agent consumes both through explicit Factory input bindings. The Go coding factory enforces an admission threshold and requires explicit operator approval for other valid assessments before planning starts. Credentials and native agent configuration remain package-specific.

## Controls dependencies

The Pi runner adapter and MCP client are maintained in [Controls](../controls/README.md), under [adapters/pi](../controls/adapters/pi/README.md) and [sdk/typescript](../controls/sdk/typescript/README.md). Registry consumes them as local npm packages; it does not contain implementation copies. The checked-in dependencies expect sibling `registry/` and `controls/` checkouts.

From the Registry root, install the Node.js dependencies:

```sh
npm ci --prefix ../controls
npm ci
```

These commands install the Controls adapter/SDK workspace first, then Registry's local package links and test dependencies. Controls’ `./install.sh` separately installs the Go binary; it does not run these commands or install Pi, Go tools, or provider credentials. See [agent prerequisites](agents/README.md#local-tool-preflight) and the [classifier setup](classifiers/task-readiness/README.md) for the selected packages.

For a different checkout layout, update the two `file:` dependencies in Registry’s `package.json` and regenerate its lockfile with `npm install`. Keep the installed Controls and Registry checkouts available: these local dependencies are links, not bundled copies.

## Verification

After dependency installation, run `npm test` from Registry for document generation, links, launchers, classifier submission, and skill discovery metadata. MCP tests bind a loopback port and use fixture servers; no model is called. Run `npm test` from Controls for Pi delivery and telemetry tests, and its Go checks for the controller.

For discovery by an installed Pi, set `PI_SKILL_LOADER` to that installation's `dist/core/skills.js` module and run `node --test tests/skill-discovery.test.mjs` from Registry. That optional check skips when no loader is supplied. The older `tests/*.ts` files target the previous TypeScript coordinator and Comms implementation; they are not part of `npm test` and do not verify the current controller. Use [Factory Go evals](../evals/README.md) for end-to-end workflow evaluation.

## Execution documents

With Controls, `factory_dir` defaults to `.factory` beside factory.json. Specs, plans and review evidence belong to its execution-specific `files/` directory; source stays in the workspace selected by the launcher. No files-directory environment variable is required. [Configuration and references](../controls/docs/execution-files.md) define the directory and argument contract. Go agent entrypoints accept an optional leading `--workspace DIRECTORY`; remaining options pass unchanged to Pi.
