# Linear with Pi

The optional [Linear context skill](../SKILL.md) describes sourcing and interpreting ticket context. It does not configure a connection.

1. Link that skill into the chosen agent's `skills/` directory if it is not already selected.
2. In that bundle's `pi/mcp.json`, enable the `linear` server. The starter profiles on the architecture and Go code reviewers use `https://mcp.linear.app/mcp/readonly` with an `Authorization: Bearer ${LINEAR_API_KEY}` header.
3. Export `LINEAR_API_KEY` in the shell that starts the agent. Start a new session so the native MCP configuration is loaded. Do not put credentials in prompts or task artifacts.
4. Ask for the issue by identifier or URL. The agent discovers the connection's actual read tools and reports missing access.

These starter profiles expose read operations. Writes need a separately configured connection and authorization. `factory.json` does not select or authenticate MCPs; another runner must configure its own Linear connection. See [Linear's documentation](https://linear.app/docs/mcp) for supported authentication.
