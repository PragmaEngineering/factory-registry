#!/bin/sh
# Standalone Pi entrypoint. The caller owns the working directory and native configuration.
set -eu
agent_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
if [ -n "${AGENT_INSTRUCTIONS_FILE:-}" ]; then
  # A caller supplied the complete instruction/skill selection.
  test -f "$AGENT_INSTRUCTIONS_FILE" || { echo "Agent instructions file not found: $AGENT_INSTRUCTIONS_FILE" >&2; exit 1; }
  if [ -n "${PI_CODING_AGENT_DIR:-}" ]; then
    node "$agent_dir/../../resources/preflight.mjs" --agent "${AGENT_EXECUTABLE:-pi}" --require rg --profile "$PI_CODING_AGENT_DIR"
  else
    node "$agent_dir/../../resources/preflight.mjs" --agent "${AGENT_EXECUTABLE:-pi}" --require rg
  fi
  if [ -n "${FACTORY_MCP_URL:-}" ]; then exec node "$agent_dir/pi-rpc-session.mjs" --append-system-prompt "$AGENT_INSTRUCTIONS_FILE" "$@"; fi
  exec "${AGENT_EXECUTABLE:-pi}" --append-system-prompt "$AGENT_INSTRUCTIONS_FILE" "$@"
fi
# Standalone sessions use this bundle's Pi profile and linked skills.
runtime_root=${FACTORY_AGENT_RUNTIME_DIR:-"${HOME}/.factory/agents"}
mkdir -p "$runtime_root"
profile=$(mktemp -d "$runtime_root/${agent_dir##*/}.XXXXXX")
cp "$agent_dir"/pi/*.json "$profile/"
export PI_CODING_AGENT_DIR="$profile"
node "$agent_dir/../../resources/preflight.mjs" --agent "${AGENT_EXECUTABLE:-pi}" --require rg --profile "$profile"
set -- --append-system-prompt "$agent_dir/agent.md" --no-skills "$@"
for skill in "$agent_dir"/skills/*; do
  [ -f "$skill/SKILL.md" ] || continue
  skill_dir=$(CDPATH= cd -- "$skill" && pwd -P)
  set -- --skill "$skill_dir" "$@"
done
if [ -n "${FACTORY_MCP_URL:-}" ]; then exec node "$agent_dir/pi-rpc-session.mjs" "$@"; fi
exec "${AGENT_EXECUTABLE:-pi}" "$@"
