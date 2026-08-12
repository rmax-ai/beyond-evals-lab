# Roadmap — Beyond Evals Lab

## Milestone 1 — Deterministic World

**Focus:** Domain model, fixtures, tools, state mutation, Vitest tests.

- [ ] `src/domain/types.ts` — all core interfaces
- [ ] `src/domain/world-state.ts` — immutable snapshot utilities
- [ ] `src/domain/fixtures.ts` — sample users, transactions, state
- [ ] `src/domain/invariants.ts` — state consistency checks
- [ ] `src/tools/contracts.ts` — Tool interface + ToolName
- [ ] `src/tools/registry.ts` — tool registration
- [ ] `src/tools/get-transactions.ts`
- [ ] `src/tools/get-transaction.ts`
- [ ] `src/tools/create-refund.ts`
- [ ] `src/tools/get-refund.ts`
- [ ] `src/tools/write-audit-record.ts`
- [ ] `test/tools/*.test.ts` — deterministic tool tests
- [ ] `test/domain/*.test.ts` — domain invariant tests

**AC:** `pnpm test` passes deterministic domain tests.

## Milestone 2 — Controlled Runtime

**Focus:** Agent interface, rule agent, runtime executor, controls, execution trace.

- [ ] `src/agent/agent.ts` — Agent interface + AgentContext
- [ ] `src/agent/rule-agent.ts` — RuleBasedRefundAgent with defect modes
- [ ] `src/agent/prompts.ts` — pattern matching rules
- [ ] `src/runtime/run-context.ts` — RunContext
- [ ] `src/runtime/execute-tool.ts` — parse → control → execute → trace
- [ ] `src/runtime/execute-run.ts` — full agent loop
- [ ] `src/controls/types.ts` — Control interface + ControlDecision
- [ ] `src/controls/engine.ts` — GuardrailEngine
- [ ] `src/controls/authorization.ts`
- [ ] `src/controls/refund-limit.ts`
- [ ] `src/controls/schema-validation.ts`
- [ ] `src/controls/forbidden-actions.ts`
- [ ] `test/controls/*.test.ts`
- [ ] `test/runtime/*.test.ts` — authorized + blocked refunds

**AC:** `pnpm test` passes. Demo E (control-block) works.

## Milestone 3 — Verification

**Focus:** Verification evidence schema, verifyRefundOutcome, audit verifier, state-isolation verifier.

- [ ] `src/verification/types.ts` — VerificationEvidence + EvidenceReference
- [ ] `src/verification/verify-refund-outcome.ts` — central reusable verifier
- [ ] `src/verification/verify-audit-record.ts`
- [ ] `src/verification/verify-authorization.ts`
- [ ] `src/verification/verify-state-isolation.ts`
- [ ] `test/verification/*.test.ts` — synthetic runs for all claim types
- [ ] `src/cli/demo.ts` — Demo A (success) + Demo C (verification-failure)
- [ ] `package.json` scripts for demos

**AC:** `pnpm demo:success` and `pnpm demo:verification-failure` work.

## Milestone 4 — Trajectory and Validation

**Focus:** Trajectory rules, business validators, disagreement demos.

- [ ] `src/trajectory/types.ts` — TrajectoryFinding
- [ ] `src/trajectory/rules.ts` — all trajectory rules
- [ ] `src/trajectory/analyze-trajectory.ts`
- [ ] `src/validation/types.ts` — ValidationResult + Validator
- [ ] `src/validation/business-rules.ts` — duplicate, ambiguity, malicious
- [ ] `src/validation/validate-run.ts`
- [ ] `test/trajectory/*.test.ts`
- [ ] `test/validation/*.test.ts`
- [ ] `src/cli/demo.ts` — Demo B (trajectory-failure) + Demo D (validation-failure)

**AC:** All four disagreement demos work. `pnpm test` passes.

## Milestone 5 — Eval Harness

**Focus:** EvalCase, graders, dataset runner, aggregation, reports.

- [ ] `src/eval/types.ts` — EvalCase, EvalCaseResult, EvalReport
- [ ] `src/eval/graders/grader.ts` — Grader interface
- [ ] `src/eval/graders/deterministic.ts` — VerificationGrader (composition)
- [ ] `src/eval/graders/trajectory.ts`
- [ ] `src/eval/graders/heuristic.ts`
- [ ] `src/eval/graders/model.ts` — optional, with provenance
- [ ] `src/eval/runner.ts` — EvalRunner implementation
- [ ] `src/eval/aggregate.ts` — aggregate statistics
- [ ] `src/eval/datasets.ts` — dataset loading
- [ ] `datasets/core.json` — 20+ initial cases
- [ ] `src/cli/eval.ts` — `pnpm eval` command
- [ ] `test/eval/*.test.ts` — eval infrastructure tests

**AC:** `pnpm eval` reports all dimensions separately. Reuses `verifyRefundOutcome()`.

## Milestone 6 — Assurance Report

**Focus:** Combine evidence without flattening dimensions.

- [ ] `src/assurance/schema.ts` — AssuranceReport type
- [ ] `src/assurance/build-report.ts` — evidence aggregation
- [ ] `src/assurance/render-report.ts` — console + JSON output
- [ ] `src/cli/report.ts` — `pnpm assurance:report`
- [ ] `test/assurance/*.test.ts`

**AC:** Assurance reports include controls, verification, validation, trajectory,
outcome, and residual risk as separate sections.

## Milestone 7 — Monitoring Loop

**Focus:** SQLite trace store, trace mining, candidate fixture generation.

- [ ] `src/traces/schema.ts` — SQLite DDL
- [ ] `src/traces/sqlite.ts` — better-sqlite3 implementation
- [ ] `src/traces/trace-store.ts` — TraceStore interface
- [ ] `src/traces/mine.ts` — anomaly detection rules
- [ ] `src/traces/fixture-generator.ts` — candidate fixture generation
- [ ] `src/cli/mine.ts` — `pnpm traces:mine`
- [ ] `src/cli/demo.ts` — Demo: feedback-loop
- [ ] `test/traces/*.test.ts`

**AC:** `pnpm traces:mine` finds anomalous traces. `pnpm demo:feedback-loop` works.

## Milestone 8 — Optional Model Integration

**Focus:** Eve agent-under-test wiring — delivered after everything above works.

- [x] Eve agent at `agent/` with governed tool wrappers
- [x] Eve scenario evals at `evals/`
- [x] `src/eve/` bridge plus `pnpm demo:eve` assurance report

**AC:** The Eve agent runs through the existing assurance components without
changing them.

The deliverable is the Eve wiring (`agent/`, `evals/`, `src/eve/` bridge, and
`demo:eve`), rather than the originally proposed hand-rolled `ModelAgent`
adapter.

## Milestone 9 — Live Model Run (optional)

**Focus:** Run the Eve agent with a real provider using `EVE_MODEL` and
`OPENAI_API_KEY`, then compare the result against the mock evals.

- [ ] Run a live Eve session with `EVE_MODEL` + `OPENAI_API_KEY`
- [ ] Compare live-model behavior with the keyless mock eval results

**AC:** Optional only; no API key is required by default.
