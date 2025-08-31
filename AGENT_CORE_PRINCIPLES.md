# Agent-Agnostic Software Design Guide (concise, non-opinionated)

> Use these principles for any build (UI app, service, library, script, ML system). Treat everything as guidance; apply only where relevant.

- **DRY (Don’t Repeat Yourself)**: eliminate duplicated logic; extract shared utilities.
- **Separation of Concerns**: each module/agent sub-system handles one kind of responsibility.
- **Single Responsibility**: one reason to change per class/module/function/file.
- **Clear Abstractions & Contracts**: small, stable interfaces; explicit pre/postconditions; hide implementation details.
- **Low Coupling, High Cohesion**: minimize cross-module knowledge; keep related code together.
- **Explicit Boundaries**: keep core logic independent from I/O, UI, frameworks, storage, and transport.
- **KISS**: prefer the simplest working solution; avoid cleverness.
- **YAGNI**: don’t build for hypothetical futures; add only when needed.
- **Prefer Composition**: compose small parts over deep inheritance hierarchies.
- **Least Astonishment**: APIs/behaviors match user expectations; no surprises.
- **Immutability by Default**: use pure functions for core logic; isolate mutation.
- **Side-Effects at the Edges**: keep effects (I/O, tools) outside the domain core.
- **Explicit Dependencies**: inject deps; avoid hidden globals/singletons.
- **Validate at Boundaries**: schema/typing for inputs & outputs; sanitize & encode.
- **Fail Fast, Clear Errors**: assert invariants early; actionable error messages.
- **Idempotency & Safe Retries**: operations can repeat without harm; dedupe where needed.
- **Timeouts, Backoff, Circuit Breakers**: bound waiting; recover gracefully from partial failures.
- **Determinism & Reproducibility**: same inputs → same outputs; seed randomness; version models/prompts/tools.
- **Observability Built-In**: structured logs, metrics, traces; correlation IDs for tool calls.
- **Security & Privacy by Default**: least privilege, secret management, data minimization, encrypted transport.
- **Testability First**: unit + integration + contract tests; deterministic, hermetic tests.
- **Configuration as Data**: env/config, not code; 12-factor friendly.
- **Resource Budgets**: enforce limits (latency, memory, tokens, rate); backpressure where needed.
- **Caching with Correctness**: explicit TTLs and invalidation strategies.
