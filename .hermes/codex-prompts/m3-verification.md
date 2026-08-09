# Milestone 3: Verification Layer

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md §9, §18, AGENTS.md, and ALL existing files before writing code.

## Context
- Milestone 1: domain types, tools, tests (68 passing)
- Milestone 2: agent, controls, runtime

## Task

### 1. src/verification/types.ts

```typescript
export interface VerificationEvidence {
  claim: string;
  status: "verified" | "failed" | "unknown";
  evidence: EvidenceReference[];
  confidence: "deterministic" | "high" | "medium" | "low";
  verifier: string;
}

export interface EvidenceReference {
  type: "world_state" | "trace_event" | "control_decision" | "derived";
  reference: string;
  value?: unknown;
}

export interface RefundExpectation {
  transactionId: string;
  amountCents: number;
  auditRequired: boolean;
}

export interface Verifier {
  verify(run: AgentRun, resultingState: WorldState): Promise<VerificationEvidence[]>;
}
```

### 2. src/verification/verify-refund-outcome.ts

THE CENTRAL FUNCTION of the entire project. This is used by both runtime assurance AND the eval harness.

```typescript
export async function verifyRefundOutcome(
  run: AgentRun,
  resultingState: WorldState,
  expectation: RefundExpectation,
): Promise<VerificationEvidence[]>;
```

Checks:
1. Expected transaction exists in final state
2. Exactly one refund exists for the expected transaction
3. Refund amount equals expected amountCents
4. Transaction status reflects "refunded" or "partially_refunded"
5. Required audit record exists (if auditRequired is true)
6. No unrelated transaction was modified (compare initial vs final state)
7. Initiating actor matches run.request.actorId

Each check is a separate VerificationEvidence claim. Never return a single boolean.

### 3. src/verification/verify-audit-record.ts

```typescript
export async function verifyAuditRecord(
  run: AgentRun,
  state: WorldState,
): Promise<VerificationEvidence[]>;
```

Checks:
1. An audit record exists for the refund action
2. The audit record's actorId matches the run's actor
3. The audit record references the correct refund entity

### 4. src/verification/verify-state-isolation.ts

```typescript
export async function verifyStateIsolation(
  run: AgentRun,
): Promise<VerificationEvidence[]>;
```

Checks:
1. No unrelated transactions were modified
2. No unrelated refunds were created
3. Only expected state changes occurred

### 5. src/cli/demo.ts — Demo CLI

A Commander CLI that runs demonstration scenarios:

```typescript
#!/usr/bin/env tsx
import { Command } from "commander";

const program = new Command();
program.name("beyond-evals-lab-demo").description("Demo scenarios");

program.command("success").action(async () => {
  // Run Demo A: correct execution
  // Output formatted assurance report
});

program.command("verification-failure").action(async () => {
  // Run Demo C: refund created, audit missing
  // Uses RuntimeFaults.suppressAuditWrite
});

// Also add: trajectory-failure, validation-failure, control-block, feedback-loop
// These will be fully implemented in Milestones 4-7.
// For now, just export the function stubs so package.json scripts don't fail.

program.parse();
```

The demo MUST:
1. Create a fixture WorldState
2. Create a RuleBasedRefundAgent with appropriate mode
3. Run executeRun()
4. Call verifyRefundOutcome()
5. Print a formatted assurance summary to console

### 6. src/domain/types.ts — ADD RuntimeFaults

Add to the existing types file:
```typescript
export interface RuntimeFaults {
  suppressAuditWrite?: boolean;
  mutateUnrelatedTransaction?: boolean;
  duplicateRefundWrite?: boolean;
}
```

Also add AgentRun and TraceEvent if not already present.

## Verification
After writing all files:
1. `npx tsc --noEmit` must pass
2. Run `pnpm demo:success` — should show assurance report
3. Run `pnpm demo:verification-failure` — should show audit failure

Also write tests:
### test/verification/verify-refund-outcome.test.ts
- Correct refund → all claims verified
- Wrong amount → amount claim failed
- Missing refund → refund claims failed
- Duplicate refunds → exactly-one claim failed
- Missing audit → audit claim failed
- Unrelated transaction changed → isolation claim failed

### test/verification/verify-audit-record.test.ts
- Audit record present → verified
- Audit record missing → failed

### test/verification/verify-state-isolation.test.ts
- Only expected change → verified
- Unrelated transaction modified → failed
