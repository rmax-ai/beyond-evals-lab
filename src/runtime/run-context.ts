import { cloneState } from "../domain/world-state.js";

import type { AgentRequest, AgentRun, TraceEvent, WorldState } from "../domain/types.js";

let nextRunId = 0;

export interface RunContext {
  runId: string;
  trace: TraceEvent[];
  state: WorldState;
  appendEvent(type: TraceEvent["type"], data: Record<string, unknown>): void;
  buildAgentRun(finalState: WorldState): AgentRun;
}

/** Creates an append-only trace and immutable state snapshots for one agent run. */
export function createRunContext(request: AgentRequest, initialState: WorldState): RunContext {
  const runId = `run-${Date.now()}-${nextRunId++}`;
  const startedAt = new Date().toISOString();
  const initialStateSnapshot = cloneState(initialState);
  const trace: TraceEvent[] = [];

  const context: RunContext = {
    runId,
    trace,
    state: cloneState(initialStateSnapshot),
    appendEvent(type, data): void {
      trace.push({
        id: `${runId}:event:${trace.length + 1}`,
        runId,
        sequence: trace.length + 1,
        timestamp: new Date().toISOString(),
        type,
        data: structuredClone(data),
      });
    },
    buildAgentRun(finalState): AgentRun {
      return {
        id: runId,
        request: structuredClone(request),
        initialState: cloneState(initialStateSnapshot),
        finalState: cloneState(finalState),
        trace: structuredClone(trace),
        startedAt,
        completedAt: new Date().toISOString(),
      };
    },
  };

  context.appendEvent("request", { request });
  return context;
}
