import { getToolDefinitions } from "../tools/registry.js";

import { executeTool } from "./execute-tool.js";
import { createRunContext } from "./run-context.js";

import type { Agent } from "../agent/agent.js";
import type { GuardrailEngine } from "../controls/engine.js";
import type { ControlEvent } from "../controls/types.js";
import type {
  AgentRequest,
  AgentRun,
  RuntimeFaults,
  ToolObservation,
  WorldState,
} from "../domain/types.js";

/** Executes an agent until it completes or reaches the iteration safety limit. */
export async function executeRun(
  request: AgentRequest,
  initialState: WorldState,
  agent: Agent,
  guardrailEngine: GuardrailEngine,
  maxIterations = 20,
  faults: RuntimeFaults = {},
): Promise<AgentRun> {
  const runContext = createRunContext(request, initialState);
  const actor = runContext.state.users.find((user) => user.id === request.actorId);
  if (!actor) {
    runContext.appendEvent("agent_response", {
      error: `Actor not found: ${request.actorId}`,
    });
    return runContext.buildAgentRun(runContext.state);
  }

  const observations: ToolObservation[] = [];
  const controlEvents: ControlEvent[] = [];
  let done = false;
  let iterations = 0;

  while (!done && iterations < maxIterations) {
    const decision = await agent.decide({
      request,
      visibleToolDefinitions: getToolDefinitions(),
      observations: structuredClone(observations),
    });
    runContext.appendEvent("agent_decision", {
      iteration: iterations + 1,
      message: decision.message,
      toolCalls: decision.toolCalls,
      done: decision.done,
    });

    for (const toolCall of decision.toolCalls) {
      const execution = await executeTool(toolCall.tool, toolCall.arguments, {
        state: runContext.state,
        actor,
        requestId: request.requestId,
        request,
        runId: runContext.runId,
        toolCallId: toolCall.id,
        guardrailEngine,
        controlEvents,
        faults,
      }, runContext.appendEvent);

      observations.push({
        toolCallId: toolCall.id,
        toolName: toolCall.tool,
        result: execution.result,
        timestamp: new Date().toISOString(),
      });
      if (execution.newState !== undefined) {
        runContext.state = execution.newState;
      }
    }

    done = decision.done;
    if (done && decision.message !== undefined) {
      runContext.appendEvent("agent_response", { message: decision.message });
    }
    iterations += 1;
  }

  return runContext.buildAgentRun(runContext.state);
}
