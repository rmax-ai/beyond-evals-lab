import type { AgentRequest, ProposedToolCall, ToolObservation } from "../domain/types.js";
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
