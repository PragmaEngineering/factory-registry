# Factories

The [Go coding factory](golang/README.md) is the current Factory Workflows example. Its `factory.json` defines the step graph, agent paths, expected outputs, review routes, and human decisions. To run it against an application, put a complete copy of that configuration in the application root and resolve its agent paths for the installed tools checkout. See the [eval guide](../../evals/README.md) for a repeatable example. `extends` and library-file execution are not part of the Go controller.

The [writing factory](writing/README.md) still documents the previous TypeScript coordinator and has not been adapted to Factory Workflows. Agent bundles remain available for standalone Pi use.

## Native runtime integration

The Go example declares its agents' Pi 1.0.3 runtime explicitly; readiness remains a deterministic command package. Native preparation is separate from workflow routing. For requirements and other runners, see [the Go example](golang/README.md#native-runtime-integration) and [Controls’ integration guide](../../controls/docs/runtime-adapters.md).
