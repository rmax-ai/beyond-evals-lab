# Milestone 2, Batch 6: Runtime Executor

You are working in a TypeScript project at /home/rmax-10/src/beyond-evals-lab.

Read SPEC.md §4, §7-8, §13, AGENTS.md, and ALL existing files in src/domain/, src/tools/, src/controls/, src/agent/ before writing code.

## Context
Previous batches created: domain model, tools, agent interface, rule agent, and controls. Read ALL of these before implementing the runtime.

## Task

### 1. src/runtime/run-context.ts

```typescript
import type { AgentRun, TraceEvent, WorldState } from "../domain/types.js";

let nextRunId = 0;

export function createRunContext(
  request: AgentRequest,
  initialState: WorldState,
): {
  runId: string;
  trace: TraceEvent[];
  state: WorldState;
  appendEvent(type: TraceEvent["type"], data: Record<string, unknown>): void;
  buildAgentRun(finalState: WorldState): AgentRun;
};
```

The RunContext manages:
- A unique runId (`run-<timestamp>-<seq>`)
- An append-only trace (TraceEvent[])
- The current WorldState snapshot
- Builds the final AgentRun when complete

### 2. src/runtime/execute-tool.ts

```typescript
import type { ControlDecision } from "../controls/types.js";
import type { ToolResult } from "../tools/contracts.js";

/**
 * Execute a tool through the full runtime pipeline:
 * 1. Parse input (schema validation via control)
 * 2. Control evaluation (guardrail engine)
 * 3. Tool execution (if allowed)
 * 4. State mutation (apply refund/audit to world state)
 * 5. Trace event recording
 */
export async function executeTool(
  toolName: ToolName,
  rawInput: unknown,
  context: {
    state: WorldState;
    actor: User;
    requestId: string;
    guardrailEngine: GuardrailEngine;
    controlEvents: ControlEvent[];
  },
  appendEvent: (type: TraceEvent["type"], data: Record<string, unknown>) => void,
): Promise<{
  result: ToolResult<unknown>;
  controlDecision: ControlDecision;
  newState?: WorldState; // new state if mutation occurred
}>;
```

The function MUST:
1. Look up the tool from the registry
2. Parse input using the tool's schema (this happens inside schema-validation control)
3. Call guardrailEngine.evaluate() for each control
4. Append "tool_proposed" + "control_decision" trace events
5. If blocked: append "tool_failed" event, return block decision
6. If allowed: execute tool, append "tool_started" + "tool_completed"
7. Apply state mutation for refund/audit tools (call world-state.ts functions)
8. Return result + control decision + new state

### 3. src/runtime/execute-run.ts

```typescript
/**
 * Execute a full agent run:
 * 1. Initialize run context
 * 2. Agent loop: decide → execute tools → observe → repeat
 * 3. Stop when agent returns done=true or max iterations reached
 * 4. Build and return AgentRun
 */
export async function executeRun(
  request: AgentRequest,
  initialState: WorldState,
  agent: Agent,
  guardrailEngine: GuardrailEngine,
  maxIterations?: number, // default 20
): Promise<AgentRun>;
```

The agent loop:
```
while (!done && iterations < max):
  1. Build AgentContext (request + tool definitions + observations)
  2. Call agent.decide(context) → AgentDecision
  3. Append "agent_decision" trace event
  4. For each proposed tool call:
     a. executeTool() → result + control decision
     b. Record observation for next iteration
     c. If state mutated, update run context state
  5. If agent.decision.done, break
  6. Increment iteration counter
```

After the loop:
- Build final AgentRun with trace and final state
- Return the run

## Key Rules
- NEVER call tool.execute() directly — always go through executeTool
- State mutation only happens in executeTool (via world-state.ts functions)
- Every significant event becomes a trace event
- Max iterations prevents infinite loops
- The agent receives observations (tool results) not raw WorldState

## Verification
1. `npx tsc --noEmit` must pass
2. Do NOT run tests
