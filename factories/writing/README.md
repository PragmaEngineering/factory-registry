# Interactive writing factory

This example has **not yet been adapted** to the Go Factory Workflows controller. Its current [factory.json](factory.json) includes fields from the previous TypeScript coordinator, so Factory Workflows rejects it. Do not use it as a project config with `factory exec` until its workflow and agent result protocol are updated.

The [pair writer agent](../../agents/pair_writer/agent.md) can still be launched independently from the document project's directory:

```sh
/path/to/registry/agents/pair_writer/start.sh -p "Help me draft this document"
```

Its standalone Pi profile and linked technical and business writing skills apply. In that mode, the user and agent manage feedback and approval through their conversation.
