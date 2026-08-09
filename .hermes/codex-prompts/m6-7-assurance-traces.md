# Milestone 6-7: Assurance Report + Monitoring Loop Stub

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md §14-15, §19-20, AGENTS.md, and ALL existing source files.

## Context
- Milestones 1-5 complete: 88 tests, eval harness working
- All core mechanisms are in place: controls, verification, trajectory, validation, eval

## Task

### 1. src/assurance/schema.ts

```typescript
export interface AssuranceReport {
  runId: string;
  controls: {
    decisions: ControlDecision[];
    blockedActions: number;
  };
  verification: {
    evidence: VerificationEvidence[];
    allRequiredClaimsVerified: boolean;
  };
  validation: {
    results: ValidationResult[];
  };
  trajectory: {
    status: "acceptable" | "unacceptable" | "unknown";
    findings: TrajectoryFinding[];
  };
  outcome: {
    status: "success" | "failure" | "unknown";
    evidence: EvidenceReference[];
  };
  residualRisk: ResidualRisk[];
}

export interface ResidualRisk {
  description: string;
  severity?: "low" | "medium" | "high" | "unknown";
}
```

### 2. src/assurance/build-report.ts

```typescript
export async function buildAssuranceReport(run: AgentRun): Promise<AssuranceReport>;
```

Combines:
- Control decisions from the trace (filter `control_decision` events)
- Verification evidence from verifyRefundOutcome()
- Trajectory analysis from analyzeTrajectory()
- Validation results from validateRun()
- Outcome determination (were all required claims verified?)
- Residual risks (any blocked attempts, failed claims, validation failures)

### 3. src/assurance/render-report.ts

Console formatter per SPEC.md §14:

```
ASSURANCE REPORT
─────────────────────────────────────
Outcome         PASS
Verification    PASS
Validation      PASS
Controls        1 ACTION BLOCKED
Trajectory      FAIL

Residual risk
  HIGH  Agent attempted refund beyond authorization boundary.

Overall disposition
  NOT ACCEPTABLE
```

Also provide a JSON output mode.

### 4. src/assurance/disposition.ts

```typescript
export function determineDisposition(
  report: AssuranceReport
): "acceptable" | "not_acceptable" | "needs_review" {
  if (!report.verification.allRequiredClaimsVerified) return "not_acceptable";
  if (report.trajectory.status === "unacceptable") return "not_acceptable";
  if (report.validation.results.some(r => r.status === "fail")) return "not_acceptable";
  if (report.residualRisk.some(r => r.severity === "unknown")) return "needs_review";
  return "acceptable";
}
```

Explicit policy rules — no weighted scores.

### 5. src/cli/report.ts — Assurance Report CLI

```typescript
#!/usr/bin/env tsx
// Read a run ID or run from stdin, produce formatted assurance report
// pnpm assurance:report
```

### 6. Update src/cli/demo.ts

Update all demo commands to use buildAssuranceReport() for consistent output.

### 7. src/traces/schema.ts — SQLite DDL (stub)

Create the SQLite trace schema as comments/types (actual SQLite implementation postponed to Milestone 7 when g++ is available):

```typescript
// SQLite schema (requires better-sqlite3 — postponed)
export const TRACE_DDL = `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT
);
CREATE TABLE IF NOT EXISTS trace_events (...);
CREATE TABLE IF NOT EXISTS assurance_reports (...);
CREATE TABLE IF NOT EXISTS eval_candidates (...);
`;

// In-memory store for now (used by trace mining)
export interface TraceStore {
  append(event: TraceEvent): Promise<void>;
  loadRun(runId: string): Promise<AgentRun>;
  query(filter: TraceQuery): Promise<AgentRun[]>;
}
```

### 8. src/traces/trace-store.ts — In-Memory Store

```typescript
export class InMemoryTraceStore implements TraceStore {
  // Store runs in memory (sufficient for PoC)
  // Provides the TraceStore interface for when SQLite is added later
}
```

### 9. src/traces/mine.ts — Trace Mining

```typescript
export interface CandidateFixture {
  id: string;
  sourceRunId: string;
  reason: string;
  fixture: EvalCase;
  status: "candidate";
}

export async function mineTraces(store: TraceStore): Promise<CandidateFixture[]>;
```

Detect:
- Verification failures → candidate
- Control blocks → candidate
- Trajectory failures → candidate
- Validation failures → candidate
- High tool call count → candidate
- Repeated identical tool calls → candidate

### 10. src/cli/mine.ts — Trace Mining CLI

```typescript
pnpm traces:mine
```

### 11. Add feedback-loop demo to src/cli/demo.ts

```
pnpm demo:feedback-loop
```

Sequence:
1. Execute a defective run (skip-audit mode)
2. Store in memory trace store
3. Run mineTraces()
4. Generate candidate fixture
5. Display as candidate (NOT auto-added to eval suite)

## Verification
1. `npx tsc --noEmit` passes
2. `pnpm test` passes
3. `pnpm assurance:report` produces formatted output
4. `pnpm traces:mine` finds anomalous traces
5. `pnpm demo:feedback-loop` works
