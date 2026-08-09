# Milestone 2, Batch 5: Control Implementations

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md §8, AGENTS.md, and existing files in src/domain/types.ts, src/tools/contracts.ts, src/controls/types.ts, src/tools/registry.ts before writing code.

## Context
Batch 4 created src/agent/ (agent interface + rule agent) and src/controls/types.ts. Read these files.

## Task

Implement 5 control files:

### 1. src/controls/schema-validation.ts

```typescript
export class SchemaValidationControl implements Control {
  name = "schema-validation";

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    // Validate proposed tool call arguments against the tool's input schema
    // Use the tool registry to look up the tool's inputSchema
    // Use z.ZodType.safeParse() to validate
    // Return "block" if validation fails, "allow" if passes
  }
}
```

### 2. src/controls/authorization.ts

```typescript
export class AuthorizationControl implements Control {
  name = "authorization";

  // Role-based access:
  // customer → cannot invoke createRefund
  // support  → can invoke createRefund (amount checked by refund-limit)
  // finance  → can invoke createRefund
  // admin    → can invoke createRefund
  // All roles can invoke: getTransactions, getTransaction, getRefund
  // writeAuditRecord is always allowed (the control ensures it's called, not blocked)

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    // Check if the proposed tool is createRefund and actor is customer → BLOCK
    // Otherwise → ALLOW
  }
}
```

### 3. src/controls/refund-limit.ts

```typescript
export class RefundLimitControl implements Control {
  name = "refund-limit";

  // Compares refund amount against actor's refundLimitCents
  // Only applies to createRefund tool

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    // Extract amountCents from proposed call arguments
    // Compare against context.actor.refundLimitCents
    // BLOCK if amount > limit
    // Include the limit and requested amount in evidence
  }
}
```

### 4. src/controls/forbidden-actions.ts

```typescript
export class ForbiddenActionsControl implements Control {
  name = "forbidden-actions";

  // Detects attempts to skip mandatory actions
  // Specifically: if the agent's final decision has done=true but
  // a createRefund was executed without a corresponding writeAuditRecord
  // This control runs on the agent's done signal, not individual tool calls

  // For now, implement a simpler version:
  // If the previous events show a createRefund was allowed and executed,
  // but the agent's next decision has done=true without a writeAuditRecord call,
  // return BLOCK with reason "audit record required before completion"

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    // Check previousEvents for createRefund executions
    // If one exists and proposedCall.tool is not writeAuditRecord and agent is trying to finish
    // But note: this control evaluates per-tool-call, so we track via previousEvents
  }
}
```

### 5. src/controls/engine.ts — GuardrailEngine

```typescript
export class GuardrailEngine {
  private controls: Control[];

  constructor(controls: Control[]) {
    this.controls = controls;
  }

  /**
   * Evaluate all controls against a proposed tool call.
   * Returns the first BLOCK decision, or ALLOW if all pass.
   */
  async evaluate(context: ControlContext): Promise<ControlDecision> {
    for (const control of this.controls) {
      const decision = await control.evaluate(context);
      if (decision.decision === "block") {
        return decision; // First block wins
      }
    }
    return {
      control: "guardrail-engine",
      decision: "allow",
      reason: "All controls passed",
    };
  }
}
```

## Key Rules
- Controls are read-only — they never mutate state
- Controls receive WorldState and previousEvents for context
- Schema validation uses zod safeParse (never throws)
- Authorization is role-based, not attribute-based (simple for PoC)
- Refund limit reads amountCents from proposed tool arguments
- Every control returns a ControlDecision with evidence when blocking

## Verification
1. `npx tsc --noEmit` must pass
2. Do NOT run tests
