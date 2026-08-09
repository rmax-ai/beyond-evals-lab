# Milestone 2, Batch 4: Agent Interface + Rule Agent + Control Types

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md (sections 7-8, 21), AGENTS.md, docs/TS_DEVELOPMENT.md, and existing files in src/domain/ and src/tools/ before writing code.

## Context
Milestone 1 is complete: domain types, tool implementations, and tests are in place.

## Task

### 1. src/agent/agent.ts — Agent Interface

```typescript
import type { ProposedToolCall, AgentRequest, ToolObservation } from "../domain/types.js";
import type { ToolDefinition } from "../tools/contracts.js";

export interface AgentContext {
  request: AgentRequest;
  visibleToolDefinitions: ToolDefinition[];
  observations: ToolObservation[];
}

export interface AgentDecision {
  message?: string;
  toolCalls: ProposedToolCall[];
  done: boolean;
}

export interface Agent {
  decide(context: AgentContext): Promise<AgentDecision>;
}
```

### 2. src/agent/rule-agent.ts — RuleBasedRefundAgent

Implements the Agent interface with pattern-matched rules. MUST work without any API keys.

The agent should recognize these patterns in user messages:
- "duplicate" + "€42" or "42" → find duplicate transaction, refund
- "most recent" → query transactions sorted, pick most recent
- "charged twice" → check for possible duplicates, do NOT refund unless confirmed
- "€X,XXX" or "X,XXX" → attempt refund of that specific amount
- "refund" with transaction reference → refund that specific transaction

**Configurable defect modes** (for demo scenarios):
```typescript
export type AgentMode = "normal" | "reckless-first-attempt" | "skip-audit" | "refund-without-confirming-duplicate";
```

- `normal`: follows patterns correctly, always includes audit
- `reckless-first-attempt`: first tries €5,000 refund even for €42 transaction (tests trajectory failure)
- `skip-audit`: correctly processes refund but doesn't call writeAuditRecord (tests verification failure)
- `refund-without-confirming-duplicate`: refunds without confirming actual duplicate (tests validation failure)

The agent MUST:
1. Parse the user message for keywords
2. Make appropriate tool calls (getTransactions, getTransaction, createRefund, writeAuditRecord)
3. Set `done: true` when complete
4. Include `rationale` in ProposedToolCall for trajectory analysis

### 3. src/agent/prompts.ts — Pattern Matching

```typescript
import type { AgentDecision, AgentContext } from "./agent.js";

/**
 * Core decision function for the rule-based agent.
 * Examines the request message and previous observations to determine next action.
 */
export function decideNextAction(
  context: AgentContext,
  mode: AgentMode,
): AgentDecision;
```

Implement pattern matching logic here. The rule-agent.ts delegates to this function.

### 4. src/controls/types.ts — Control Interface

```typescript
import type { User, AgentRequest, WorldState } from "../domain/types.js";
import type { ProposedToolCall } from "../domain/types.js";

export interface ControlContext {
  actor: User;
  request: AgentRequest;
  proposedCall: ProposedToolCall;
  state: WorldState;
  previousEvents: ControlEvent[];
}

export interface ControlDecision {
  control: string;
  decision: "allow" | "block";
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface Control {
  name: string;
  evaluate(context: ControlContext): Promise<ControlDecision>;
}

export interface ControlEvent {
  id: string;
  runId: string;
  sequence: number;
  timestamp: string;
  control: string;
  decision: "allow" | "block";
  proposedTool: string;
  reason: string;
}
```

## Conventions
- Import with `.js` extensions for ESM
- Use `interface` for public APIs
- No `any` without comment
- Tools are discovered from the registry — use getToolDefinitions()

## Verification
After writing all files:
1. `npx tsc --noEmit` must pass
2. Do NOT run tests yet
