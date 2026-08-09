# Beyond Evals Lab — Project Specification

> Preserved verbatim from the original project brief. This document is the
> authoritative ground-truth reference. Every downstream document references
> SPEC.md sections.

---

## 1. Project Thesis

Agent assurance is not equivalent to agent evaluation.

A production agent needs several distinct mechanisms:
- **tests** establish properties of deterministic software components;
- **controls** constrain actions before they occur;
- **verification** establishes evidence about a particular execution;
- **evals** estimate behavior over a distribution of tasks;
- **validation** asks whether behavior serves the intended real-world purpose;
- **trajectory analysis** evaluates how the system reached its result;
- **monitoring** records evidence from deployed executions;
- **assurance** combines these pieces without pretending they are interchangeable.

The PoC demonstrates these distinctions using a deliberately small expense/refund agent.

The central executable demonstration is:

```
verifyRefundOutcome(...)
        │
        ├── runtime execution
        │      └── verification evidence for run R
        │
        └── offline eval harness
               └── verified_outcome_rate over dataset D
```

The same deterministic checker participates in both workflows. What changes is not
whether the checker is deterministic or probabilistic, but the context in which
its evidence is used.

The system must avoid `agent -> evaluator -> score` and instead implement:

```
                        ┌── controls
                        │
request -> agent -> runtime -> world state
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

No single numeric "agent quality" score is authoritative.

---

## 2. Learning Objectives

A developer running the repository should be able to experimentally observe:

- **LO1 — Tests and evals are orthogonal:** Deterministic ≠ test, probabilistic ≠ eval. The distinction is primarily about what question is being answered.
- **LO2 — Verification concerns a specific execution:** `verifyRefundOutcome(run, finalState)` returns evidence about that particular execution.
- **LO3 — Evaluation concerns a task distribution:** Running 100 cases yields `verified_outcome_rate: 0.91` — an estimate over the dataset.
- **LO4 — Outcome and trajectory are separate:** An agent can produce the correct refund while attempting prohibited actions first. Outcome PASS + Trajectory FAIL = NOT_ACCEPTABLE.
- **LO5 — Controls and verification operate at different boundaries:** Controls ask "May this action execute?" Verifiers ask "What evidence exists about what actually happened?"
- **LO6 — Verification and validation answer different questions:** Verification = "Did the system execute the refund correctly?" Validation = "Was issuing a refund the correct response to the user's actual situation?"
- **LO7 — Monitoring closes the assurance loop:** Production traces → anomaly detection → candidate fixtures → human curation → eval dataset → regression evaluation.

---

## 3. Problem Framing

The project is not trying to create a capable autonomous financial agent. Agent
intelligence should deliberately remain simple so that assurance mechanisms are
visible.

The simulated environment provides deterministic world state. The agent receives
natural-language requests and emits proposed tool calls. A policy-controlled
runtime executes those calls against the world.

**Dominant constraints:**
- Implementation by one experienced engineer
- ~1–2 weeks for basic version, 3–4 weeks for polished research PoC
- Transparent execution
- Reproducible experiments
- Minimal infrastructure
- No production financial integration
- No distributed runtime
- No complex agent framework
- No real authentication
- No real payments
- Model APIs must remain optional

SQLite is used for trace persistence. Eval fixtures and reports remain JSON.

---

## 4. Architecture

**Stack:** Node.js 22+, TypeScript, pnpm, Vitest, SQLite (better-sqlite3).
Fastify optional for HTTP surface. Primary interface: CLI-driven.

**Recommended packages:** typescript, tsx, vitest, zod, better-sqlite3, commander, @opentelemetry/api

**Avoid:** LangChain, Temporal, agent SDKs, workflow frameworks.

### Runtime Pipeline

```
UserRequest → Agent → ToolIntent → GuardrailEngine → ToolExecutor → WorldState
                                                              ↓
                                                       ExecutionTrace
                                                              ↓
                                              ┌───────────────┴───────────────┐
                                              v                               v
                                       RuntimeVerifier                TrajectoryAnalysis
                                              │                               │
                                              └───────────────┬───────────────┘
                                                              v
                                                         Validation
                                                              │
                                                              v
                                                       AssuranceReport
```

### Offline Evaluation Pipeline

```
EvalDataset → EvalRunner → EvalCaseResult[] → AggregateEvalReport
```

---

## 5. Repository Tree

```
beyond-evals-lab/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── domain/          # types.ts, world-state.ts, fixtures.ts, invariants.ts
│   ├── agent/           # agent.ts, rule-agent.ts, model-agent.ts, prompts.ts
│   ├── tools/           # contracts.ts, registry.ts, get-transactions.ts, etc.
│   ├── controls/        # types.ts, engine.ts, authorization.ts, refund-limit.ts, etc.
│   ├── runtime/         # execute-run.ts, execute-tool.ts, run-context.ts
│   ├── verification/    # types.ts, verify-refund-outcome.ts, verify-audit-record.ts, etc.
│   ├── trajectory/      # types.ts, analyze-trajectory.ts, rules.ts
│   ├── validation/      # types.ts, validate-run.ts, business-rules.ts
│   ├── assurance/       # schema.ts, build-report.ts, render-report.ts
│   ├── eval/            # types.ts, runner.ts, aggregate.ts, datasets.ts, graders/
│   ├── traces/          # schema.ts, trace-store.ts, sqlite.ts, mine.ts, fixture-generator.ts
│   ├── telemetry/       # tracing.ts
│   └── cli/             # index.ts, demo.ts, eval.ts, mine.ts, report.ts
├── datasets/            # core.json, validation.json, regressions/
├── examples/            # success.json, trajectory-failure.json, etc.
├── traces/              # .gitkeep
├── reports/             # .gitkeep
└── test/                # tools/, controls/, verification/, validation/, trajectory/,
    │                    # assurance/, eval/, integration/
```

---

## 6. Domain and Data Model

Use immutable snapshots around tool execution where practical.

```typescript
export type UserRole = "customer" | "support" | "finance" | "admin";

export interface User {
  id: string; name: string; role: UserRole; refundLimitCents: number;
}

export interface Transaction {
  id: string; customerId: string; amountCents: number; currency: "EUR";
  createdAt: string; merchantReference: string; fingerprint: string;
  status: "settled" | "refunded" | "partially_refunded";
}

export interface Refund {
  id: string; transactionId: string; amountCents: number;
  initiatedBy: string; createdAt: string;
}

export interface AuditRecord {
  id: string; actorId: string; action: string; entityType: string;
  entityId: string; metadata: Record<string, unknown>; createdAt: string;
}

export interface WorldState {
  users: User[]; transactions: Transaction[];
  refunds: Refund[]; auditRecords: AuditRecord[];
}
```

State transitions must happen exclusively through tools. No agent may directly mutate WorldState.

---

## 7. Agent and Tool Contracts

Agent depends on abstract tool descriptions, not implementations.

```typescript
export interface Agent {
  decide(context: AgentContext): Promise<AgentDecision>;
}

export interface Tool<I, O> {
  name: ToolName;
  inputSchema: z.ZodType<I>;
  execute(input: I, context: ToolExecutionContext): Promise<ToolResult<O>>;
}
```

Runtime must execute: parse → control evaluation → tool → state mutation → trace event. Never `agent → tool.execute()` directly.

---

## 8. Guardrail Model

Controls are pre-action authorization and policy mechanisms.

```typescript
export interface Control {
  name: string;
  evaluate(context: ControlContext): Promise<ControlDecision>;
}
```

Implement: Schema control, Authorization control (customer→no refund, support→€100, finance→€5K, admin→€20K), Refund-limit control, Transaction ownership/scope control, Forbidden-action control (never skip mandatory auditing).

Control events are recorded even when blocked.

---

## 9. Runtime Verifier Architecture

Verification must be independent from the agent's self-reported success.

```typescript
export interface VerificationEvidence {
  claim: string;
  status: "verified" | "failed" | "unknown";
  evidence: EvidenceReference[];
  confidence: "deterministic" | "high" | "medium" | "low";
  verifier: string;
}
```

Central reusable verifier: `verifyRefundOutcome(run, resultingState, expectation)` — checks transaction exists, one matching refund, correct amount, transaction state reflects refund, audit record exists, initiating actor matches, no unrelated transaction changed.

Verification failures describe claims individually rather than returning false.

---

## 10. Eval Harness

```typescript
export interface EvalCase {
  id: string; description: string;
  initialState: WorldState; request: AgentRequest;
  expectations: { outcome?: RefundExpectation; requiredTools?: ToolName[]; ... };
  tags: string[];
}
```

Aggregate output reports outcome, verification, validation, trajectory, controls, and efficiency separately. No default aggregate "agent quality" number.

---

## 11. Grader Taxonomy

All graders implement `Grade { grader, dimension, status, score?, evidence, explanation? }`.

- **Deterministic grader:** Wraps `verifyRefundOutcome()` — explicit demonstration that deterministic code can be an eval grader.
- **Trajectory grader:** Inspects tool calls and blocked attempts.
- **Heuristic grader:** Deterministic heuristics (tool count, duplicate reads) — weaker proxies.
- **Optional model grader:** Model-judged dimensions with explicit provenance; never presented as equivalent to deterministic evidence.

Verifier vs grader: separate abstractions. Use composition: `VerificationGrader implements Grader { constructor(private verifier: Verifier) {} }`.

---

## 12. Validation Approach

Validation represents business-intent scenarios that cannot be reduced to checking whether a requested operation executed correctly.

Implement: Duplicate suspicion rule, Ambiguous-most-recent rule, Explicit malicious instruction rule.

A system can have: verification = PASS, validation = FAIL.

---

## 13. Trajectory Model

Every significant runtime event becomes a trace event:

```typescript
export interface TraceEvent {
  id: string; runId: string; sequence: number; timestamp: string;
  type: "request" | "agent_decision" | "tool_proposed" | "control_decision"
     | "tool_started" | "tool_completed" | "tool_failed" | "verification"
     | "validation" | "agent_response" | "user_correction";
  data: Record<string, unknown>;
}

export interface AgentRun {
  id: string; request: AgentRequest;
  initialState: WorldState; finalState: WorldState;
  trace: TraceEvent[];
  startedAt: string; completedAt: string;
  usage?: { inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number };
}
```

---

## 14. Assurance Evidence Schema

Per-run report with controls, verification, validation, trajectory, outcome, and residualRisk. Overall disposition derived by explicit policy rules, not weighted scores.

---

## 15. Sample Eval Dataset

`datasets/core.json`: ~20 initial cases, target 30-50.
Categories: happy path (5), authorization (5), ambiguous requests (5), trajectory hazards (5), validation failures (5), state-integrity failures (5).

---

## 16. Required Demonstration Scenarios

- **Demo A:** Correct execution (`pnpm demo:success`)
- **Demo B:** Outcome passes, trajectory fails (`pnpm demo:trajectory-failure`)
- **Demo C:** Verification failure (`pnpm demo:verification-failure`)
- **Demo D:** Verification passes, validation fails (`pnpm demo:validation-failure`)
- **Demo E:** Guardrail prevents executable action (`pnpm demo:control-block`)

---

## 17. Verification-vs-Evaluation Central Experiment

`verifyRefundOutcome()` is not intrinsically a verifier or an eval grader. It is an evidence-producing mechanism. Its role depends on whether we use the evidence to reason about one execution or estimate performance across a task distribution.

---

## 18. Monitoring and Feedback Loop

SQLite trace store (`traces/assurance.db`). `pnpm traces:mine` detects candidate regression cases. Human curation step preserved between detection and eval suite inclusion.

---

## 19. CLI Workflow

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "eval": "tsx src/cli/eval.ts",
    "demo:success": "tsx src/cli/demo.ts success",
    "demo:trajectory-failure": "tsx src/cli/demo.ts trajectory-failure",
    "demo:verification-failure": "tsx src/cli/demo.ts verification-failure",
    "demo:validation-failure": "tsx src/cli/demo.ts validation-failure",
    "demo:control-block": "tsx src/cli/demo.ts control-block",
    "demo:feedback-loop": "tsx src/cli/demo.ts feedback-loop",
    "traces:mine": "tsx src/cli/mine.ts",
    "assurance:report": "tsx src/cli/report.ts"
  }
}
```

---

## 20. Test Strategy

- **Unit tests:** Deterministic software properties (createRefund, refund-limit, audit persistence)
- **Verifier tests:** Synthetic runs — correct refund, wrong amount, missing refund, duplicate refunds, missing audit, unrelated modification
- **Trajectory tests:** Clean trajectory, blocked unauthorized refund, foreign customer lookup, repeated reads
- **Validation tests:** Confirmed duplicate → pass, unconfirmed duplicate → fail, ambiguous → fail
- **Integration tests:** Complete runtime pipeline
- **Eval-harness tests:** Fixed tiny dataset, assert aggregation — this is a deterministic test of eval infrastructure, not an agent evaluation

---

## 21. Rule-Based Baseline Agent

`RuleBasedRefundAgent implements Agent` — recognizes limited patterns. Configurable defect modes: `normal | reckless-first-attempt | skip-audit | refund-without-confirming-duplicate`. Optional `ModelAgent` with thin adapter later.

---

## 22. Failure Injection

```typescript
export interface RuntimeFaults {
  suppressAuditWrite?: boolean;
  mutateUnrelatedTransaction?: boolean;
  duplicateRefundWrite?: boolean;
}
```

Faults are demo/testing mechanisms, not hidden behavior.

---

## 23. Evidence Hierarchy

`EvidenceStrength`: invariant | direct-observation | derived | heuristic | model-judgment. Included without constructing a universal ranking function.

---

## 24. Decision Rules for Assurance Disposition

Explicit policy rules, not weighted scores:

```typescript
function determineDisposition(report: AssuranceReport): "acceptable" | "not_acceptable" | "needs_review"
```

---

## 25. Core Interfaces

`Agent`, `Tool<I,O>`, `Control`, `Verifier`, `Validator`, `Grader`, `TraceStore`, `EvalRunner` — with clear dependency direction: domain → tools → runtime ← controls → agent.

---

## 26. Implementation Milestones

1. **Deterministic world:** Domain model, fixtures, tools, state mutation, Vitest tests.
2. **Controlled runtime:** Agent interface, rule agent, runtime executor, controls, execution trace.
3. **Verification:** Evidence schema, verifyRefundOutcome, audit verifier, state-isolation verifier.
4. **Trajectory and validation:** Trajectory rules, business validators, disagreement demos.
5. **Eval harness:** EvalCase, graders, dataset runner, aggregation, JSON/console reports.
6. **Assurance report:** Combine evidence without flattening dimensions.
7. **Monitoring loop:** SQLite trace store, trace mining, candidate fixture generation, feedback-loop demo.
8. **Optional model integration:** Thin model adapter — only after everything above works.

---

## 27. Acceptance Criteria (AC1–AC19)

Key criteria: all tests pass, deterministic without LLM, every tool passes controls, blocked ops can't mutate state, claim-level evidence, same verifier in runtime and eval, outcome/trajectory disagreement demo, verification/validation disagreement demo, pre-action control block demo, post-action verification failure demo, 20+ eval scenarios, separate metric reporting, no aggregate quality number, trace persistence, trace mining, candidate fixture generation, human curation gate, demos require no API key, README explains concepts through commands.

---

## 28. README Narrative

Structured around experiments rather than package descriptions. Each experiment has a `pnpm` command, shows output, and explains the conceptual distinction.

---

## 29. What This Architecture Deliberately Avoids

No: multi-agent orchestration, long-term memory, vector databases, RAG, workflow engines, Kafka, Kubernetes, remote observability, complex policy languages, full OTel collectors, synthetic-data generation, arbitrary benchmark frameworks.

---

## 30. Likely Failure Modes

1. Recreating a conventional eval framework and renaming graders.
2. Coupling verification to expected eval fixtures (use `verify(run, state, claims)`, not `verify(run, evalCase)`).
3. Treating controls as successful verification.
4. Treating blocked unsafe attempts as harmless.
5. Auto-converting production traces into ground-truth eval cases.

---

## 31. Evolution Paths

A. Probabilistic graders (model-based) with evidence provenance.
B. Mutation testing for verifiers.
C. Dataset distribution shift analysis.
D. Formal assurance claims.

---

## 32. Final Conceptual Map

| Mechanism | Primary Question | Scope |
|-----------|-----------------|-------|
| Test | Does this software property hold? | implementation |
| Control | Is this proposed action permitted? | pre-action |
| Verification | What can we establish about this execution? | one run |
| Trajectory analysis | Was the path acceptable? | one run |
| Validation | Was this behavior appropriate for the intended purpose? | scenario/system |
| Monitoring | What is happening in deployed executions? | production |
| Eval | How does behavior vary across a task distribution? | population |
| Assurance | What evidence supports the claims we care about? | system-level reasoning |

Deterministic/probabilistic describes the evidence mechanism. Tests/verification/evals/monitoring/controls describe how the evidence is being used. These are different axes.
