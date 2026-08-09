# AGENTS.md — Beyond Evals Lab

> Codex conventions. See SPEC.md for the authoritative project specification.

## Project DNA

**beyond-evals-lab** is an executable proof-of-concept demonstrating that agent
assurance is not equivalent to agent evaluation. It implements a deliberately
small expense/refund agent with tests, controls, verification, validation,
trajectory analysis, monitoring, and offline evals — all as separate,
composable mechanisms.

The project exists to make a set of conceptual distinctions *observable* through
running code. It is NOT a production agent framework, NOT an eval benchmark,
and NOT a capability demonstration.

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict mode) |
| Package manager | pnpm |
| Test framework | Vitest |
| Schema validation | zod |
| SQLite | better-sqlite3 |
| CLI | commander |
| Telemetry | @opentelemetry/api |
| HTTP (optional) | fastify |

## Hard Constraints

- **No agent frameworks.** No LangChain, no agent SDKs, no Temporal, no workflow engines.
- **No API keys required by default.** The rule-based agent works without any external service.
- **Tools are the only state mutation path.** No agent, verifier, or grader directly mutates `WorldState`.
- **Controls run before mutation, verification after.** Never invert this ordering.
- **No aggregate "agent quality" score.** Metrics are reported separately. Composite scores are explicitly experimental if they exist at all.
- **Deterministic ≠ test, probabilistic ≠ eval.** These are orthogonal axes. Don't conflate them.

## Architecture Non-Negotiables

### Dependency Direction

```
domain/          ← no deps (pure types + invariants)
  ↑
tools/           ← depends on domain
  ↑
runtime/         ← depends on domain, tools, controls
  ↑
controls/        ← depends on domain
  ↑
agent/           ← depends on domain, tools (interfaces only)
```

Then, operating on run artifacts (but never mutating them):
```
verification/    ← reads AgentRun + WorldState
trajectory/      ← reads AgentRun
validation/      ← reads AgentRun + WorldState
assurance/       ← reads everything above
eval/            ← reads everything + EvalCase expectations
```

**The eval package must not become the parent abstraction for the runtime.**

### Immutable Snapshots

Tools receive a snapshot of `WorldState` and return a new `WorldState`. The
runtime applies mutations. This keeps tools pure and testable.

```typescript
// CORRECT — tool returns new state
execute(input: I, context: ToolExecutionContext): Promise<ToolResult<O>>;

// WRONG — tool mutates shared state
execute(input: I): Promise<void>;
```

### Runtime Pipeline (invariant)

```
parse input → control evaluation → tool execution → state mutation → trace event
```

Never: `agent → tool.execute()` directly. The runtime mediates every interaction.

### Claim-Oriented Verification

Verification returns structured evidence per claim, not a boolean:

```typescript
// CORRECT
{ claim: "audit record exists", status: "failed", evidence: [...] }

// WRONG
false
```

### Verifier/Grader Composition

```typescript
// CORRECT — composition
class VerificationGrader implements Grader {
  constructor(private verifier: Verifier) {}
}

// WRONG — inheritance
class VerificationGrader extends Verifier implements Grader {}
```

## Code Conventions

### TypeScript

- Strict mode in tsconfig.json (`strict: true`)
- Prefer `interface` over `type` for public APIs
- Use `zod` for all runtime validation at boundaries
- Explicit return types on exported functions
- No `any` without a comment explaining why

### Testing

- Vitest for all tests
- Deterministic tests for domain, tools, controls, verifiers
- Integration tests for complete runtime pipeline
- Test files mirror `src/` structure under `test/`
- `pnpm test` must pass before any PR merge

### File Organization

- One concept per file. No "utils.ts" dumping grounds.
- Barrel exports via index.ts re-exports are acceptable but not required.
- Test files: `test/<module>/<file>.test.ts`

### Naming

- Files: kebab-case (`verify-refund-outcome.ts`)
- Interfaces: PascalCase, no `I` prefix (`Agent`, not `IAgent`)
- Types: PascalCase (`ToolName`)
- Functions: camelCase (`verifyRefundOutcome`)
- Constants: UPPER_SNAKE_CASE

### Imports

- Use `import type` for type-only imports
- Relative imports within `src/` (`../domain/types.js` — note `.js` extension for ESM compatibility)
- tsx handles `.ts` extensions; configure tsconfig for NodeNext module resolution

### Error Handling

- Domain errors as typed results, not thrown exceptions
- Tool failures produce `ToolResult` with error variant, not thrown errors
- Verification produces `VerificationEvidence[]` — never throws on verification failure

## Commands

```bash
pnpm install          # install dependencies
pnpm test             # run all tests (must pass before merge)
pnpm test:watch       # watch mode
pnpm eval             # run eval harness against core dataset
pnpm demo:success     # Demo A — correct execution
pnpm demo:trajectory-failure   # Demo B — outcome pass, trajectory fail
pnpm demo:verification-failure # Demo C — verification failure
pnpm demo:validation-failure   # Demo D — verification pass, validation fail
pnpm demo:control-block        # Demo E — guardrail block
pnpm demo:feedback-loop        # Production incident → regression
pnpm traces:mine      # mine traces for candidate regression cases
pnpm assurance:report # generate assurance report
```

## What NOT to Add

- Planner/executor multi-agent orchestration
- Long-term memory or vector databases
- RAG
- Workflow engines (Temporal, etc.)
- Kafka / Kubernetes / distributed infrastructure
- Remote observability infrastructure
- Complex policy languages (OPA, Rego)
- Full OpenTelemetry collectors
- Synthetic-data generation pipelines
- Arbitrary benchmark frameworks

These would increase implementation surface without strengthening the experiment.
The PoC is about assurance architecture, not agent capability.
