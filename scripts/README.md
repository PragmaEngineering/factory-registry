# Workflow utilities

Standalone programs invoked by configured lifecycle hooks. Factories select these executables through `command` and `arguments`; no skill loading is involved.

| Script | Responsibility | Hook boundary |
|---|---|---|
| [git-work-branch.py](git-work-branch.py) | Create/reserve an execution branch; release its checkout with `--release` | Execution `before` / `after` |
| [git-commit.py](git-commit.py) | Commit selected paths with deterministic messages and participation trailers | Stage `after` |

Both read the [versioned hook context](../../controls/docs/hooks.md#standard-input) from stdin. They require Python 3.9+ and Git on a Unix host. The commit utility also uses the repository's Git identity, hooks, and signing configuration.

[Work-branch guidance](../skills/git-work-branch/SKILL.md) and [commit guidance](../skills/git-commit/SKILL.md) describe policy and recovery. These scripts own executable behavior; skills own instructions; factory configurations choose when to run them. Agent-specific launch helpers remain with the agents, and document-rendering scripts remain with their authoring skills.

Script paths in hook arguments resolve from the application directory containing `factory.json`. Use installed absolute paths when Registry is outside that application. Controls executes the injected command without a Registry lookup. Hook scripts are not copied or hashed with the execution, so keep the selected Registry revision available for its lifetime.

Verify behavior with `node --test tests/git-hooks.test.mjs tests/golang-factory.test.mjs` from the Registry root. The tests use disposable Git repositories.
