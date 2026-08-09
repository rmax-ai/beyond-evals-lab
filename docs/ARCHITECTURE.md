# Architecture — Beyond Evals Lab

## Executive Summary

Beyond Evals Lab implements a deliberately small expense/refund agent to
demonstrate that agent assurance requires multiple distinct mechanisms, not
just evaluation. The architecture separates tests, controls, verification,
validation, trajectory analysis, monitoring, and offline evals into composable
components that operate at different points in the agent lifecycle.

## Component Architecture

```
                        ┌── controls
                        │
request → agent → runtime → world state
               │           │
               │           ├── execution trace
               │           └── runtime verification
               │
               └── trajectory
                        │
                        v
                 assurance evidence
                        │
        ┌───────────────┼───────────────┐
        v               v               v
   validation       monitoring      eval harness
                                        │
                                        v
                              population statistics
```

## Dependency Direction

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

Operating on run artifacts (read-only):
```
verification/    ← reads AgentRun + WorldState
trajectory/      ← reads AgentRun
validation/      ← reads AgentRun + WorldState
assurance/       ← reads everything above
eval/            ← reads everything + EvalCase expectations
```

**The eval package must not become the parent abstraction for the runtime.**

## Runtime Pipeline

```
UserRequest
    │
    v
Agent.decide()
    │ proposes ToolIntent[]
    v
GuardrailEngine.evaluate()
    │
    ├── BLOCK → trace event (blocked) → continue/stop
    │
    v ALLOW
ToolExecutor.execute()
    │
    v
WorldState (new immutable snapshot)
    │
    v
ExecutionTrace (append-only trace event)
    │
    └── repeat until AgentDecision.done === true
              │
              v
         RuntimeVerifier.verify()
         TrajectoryAnalysis.analyze()
         Validation.validate()
              │
              v
         AssuranceReport
```

## Key Design Decisions

1. **Same verifier function, two epistemic roles.** `verifyRefundOutcome()` is
   used for both runtime assurance (one run) and eval grading (population
   estimate). What changes is context, not implementation.

2. **Claim-oriented verification.** Returns `VerificationEvidence[]` per claim,
   not a boolean. Enables partial verification visibility.

3. **Separate metric reporting.** No aggregate "agent quality" score. Outcome,
   verification, validation, trajectory, controls, and efficiency reported
   independently.

4. **Controls + verification complement each other.** Controls prevent (pre-action),
   verifiers detect (post-action). Neither replaces the other.

5. **Immutable state snapshots.** Tools return new `WorldState`, runtime applies
   mutations. Keeps tools pure and testable.

6. **Human curation in the feedback loop.** Production anomalies become
   candidate fixtures, not automatic eval cases. Expected behavior requires
   human interpretation.

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | Node.js 22+ | LTS, native ESM, good TS support |
| Language | TypeScript strict | Type safety for assurance evidence |
| Package manager | pnpm | Fast, strict, workspace support |
| Test framework | Vitest | Fast, native ESM, TS-native |
| Schema validation | zod | Runtime type safety at boundaries |
| SQLite | better-sqlite3 | Synchronous API, no async overhead for PoC |
| CLI | commander | Lightweight, well-typed |
| Telemetry | @opentelemetry/api | Standard observability, optional |
| HTTP (optional) | fastify | Fast, typed, if HTTP surface needed |

## What's Deliberately Omitted

No: multi-agent orchestration, long-term memory, vector DBs, RAG, workflow
engines, Kafka, Kubernetes, remote observability infra, complex policy
languages, full OTel collectors, synthetic-data pipelines, arbitrary benchmark
frameworks.

The PoC is about assurance architecture, not agent capability.

## Repository Structure

```
src/
├── domain/          # Pure types, WorldState, fixtures, invariants
├── agent/           # Agent interface, RuleBasedRefundAgent, optional ModelAgent
├── tools/           # Tool contracts + implementations (only mutation path)
├── controls/        # Pre-action guardrails (auth, limits, schema, forbidden)
├── runtime/         # executeRun, executeTool, RunContext
├── verification/    # verifyRefundOutcome, verifyAuditRecord, verifyStateIsolation
├── trajectory/      # analyzeTrajectory, rules
├── validation/      # validateRun, business-rules
├── assurance/       # buildReport, renderReport
├── eval/            # EvalRunner, graders, aggregation
├── traces/          # SQLite trace store, mining, fixture generation
├── telemetry/       # OpenTelemetry spans
└── cli/             # Commander entry points (demo, eval, mine, report)
```

## Evidence Hierarchy

| Strength | Example | Mechanism |
|----------|---------|-----------|
| invariant | Refund row exists in WorldState | Direct state observation |
| direct-observation | Tool completed with result X | Trace event |
| derived | Transaction status reflects refund | Cross-reference computation |
| heuristic | Tool calls > 8 is inefficient | Deterministic rule, weaker proxy |
| model-judgment | Response was appropriately cautious | LLM assessment, lowest weight |

Evidence strength metadata is included in verification results without
constructing a universal ranking function. This lets consumers weigh evidence
appropriately for their context.
