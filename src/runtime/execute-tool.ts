import { applyAuditRecord, applyRefund } from "../domain/world-state.js";
import { createToolRegistry } from "../tools/registry.js";

import type { GuardrailEngine } from "../controls/engine.js";
import type { ControlDecision, ControlEvent } from "../controls/types.js";
import type {
  AgentRequest,
  AuditRecord,
  ProposedToolCall,
  Refund,
  RuntimeFaults,
  TraceEvent,
  User,
  WorldState,
} from "../domain/types.js";
import type { ToolName, ToolResult } from "../tools/contracts.js";

export interface ExecuteToolContext {
  state: WorldState;
  actor: User;
  requestId: string;
  guardrailEngine: GuardrailEngine;
  controlEvents: ControlEvent[];
  /** Optional complete request for controls that need request context. */
  request?: AgentRequest;
  /** Supplied by executeRun so control records belong to the enclosing run. */
  runId?: string;
  /** Supplied by executeRun to connect trace events to the proposed call. */
  toolCallId?: string;
  /** Deliberate fault injection for demonstrations and verifier tests. */
  faults?: RuntimeFaults;
}

/** Executes one tool proposal through controls, execution, immutable mutation, and tracing. */
export async function executeTool(
  toolName: ToolName,
  rawInput: unknown,
  context: ExecuteToolContext,
  appendEvent: (type: TraceEvent["type"], data: Record<string, unknown>) => void,
): Promise<{
  result: ToolResult<unknown>;
  controlDecision: ControlDecision;
  newState?: WorldState;
}> {
  const tool = createToolRegistry().get(toolName);
  const proposedCall: ProposedToolCall = {
    id: context.toolCallId ?? `${context.requestId}:${toolName}`,
    tool: toolName,
    arguments: rawInput,
  };

  appendEvent("tool_proposed", {
    toolCallId: proposedCall.id,
    tool: toolName,
    arguments: rawInput,
  });

  if (!tool) {
    const controlDecision: ControlDecision = {
      control: "tool-registry",
      decision: "block",
      reason: `Unknown tool: ${toolName}`,
    };
    recordControlEvent(context, toolName, controlDecision);
    appendEvent("control_decision", { toolCallId: proposedCall.id, tool: toolName, ...controlDecision });
    appendEvent("tool_failed", { toolCallId: proposedCall.id, tool: toolName, error: controlDecision.reason });
    return { result: { success: false, error: controlDecision.reason }, controlDecision };
  }

  const request = context.request ?? {
    requestId: context.requestId,
    actorId: context.actor.id,
    message: "",
  };
  const controlDecision = await context.guardrailEngine.evaluate({
    actor: context.actor,
    request,
    proposedCall,
    state: context.state,
    previousEvents: context.controlEvents,
  });
  recordControlEvent(context, toolName, controlDecision);
  appendEvent("control_decision", { toolCallId: proposedCall.id, tool: toolName, ...controlDecision });

  if (controlDecision.decision === "block") {
    appendEvent("tool_failed", { toolCallId: proposedCall.id, tool: toolName, error: controlDecision.reason });
    return { result: { success: false, error: controlDecision.reason }, controlDecision };
  }

  // SchemaValidationControl has authorized this input. Parsing yields the typed boundary value.
  const parsedInput = tool.inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    const schemaFailure: ToolResult<unknown> = {
      success: false,
      error: `Invalid arguments for ${toolName}: ${parsedInput.error.message}`,
    };
    appendEvent("tool_failed", { toolCallId: proposedCall.id, tool: toolName, error: schemaFailure.error });
    return { result: schemaFailure, controlDecision };
  }

  appendEvent("tool_started", { toolCallId: proposedCall.id, tool: toolName });
  const result = await tool.execute(parsedInput.data, {
    state: context.state,
    actor: context.actor,
    requestId: context.requestId,
  });

  if (!result.success) {
    appendEvent("tool_failed", { toolCallId: proposedCall.id, tool: toolName, error: result.error });
    return { result, controlDecision };
  }

  let newState: WorldState | undefined;
  if (toolName === "createRefund") {
    // The registry associates createRefund with a Tool<*, Refund>; its erased
    // registry type requires recovering that known output contract here.
    newState = applyRefund(context.state, result.output as Refund);
  } else if (toolName === "writeAuditRecord" && !context.faults?.suppressAuditWrite) {
    // The registry associates writeAuditRecord with a Tool<*, AuditRecord>.
    newState = applyAuditRecord(context.state, result.output as AuditRecord);
  }

  appendEvent("tool_completed", {
    toolCallId: proposedCall.id,
    tool: toolName,
    result,
    stateMutated: newState !== undefined,
  });
  return { result, controlDecision, newState };
}

function recordControlEvent(
  context: ExecuteToolContext,
  toolName: ToolName,
  controlDecision: ControlDecision,
): void {
  const sequence = context.controlEvents.length + 1;
  context.controlEvents.push({
    id: `${context.runId ?? context.requestId}:control:${sequence}`,
    runId: context.runId ?? context.requestId,
    sequence,
    timestamp: new Date().toISOString(),
    control: controlDecision.control,
    decision: controlDecision.decision,
    proposedTool: toolName,
    reason: controlDecision.reason,
  });
}
