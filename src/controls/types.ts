import type { AgentRequest, ProposedToolCall, User, WorldState } from "../domain/types.js";

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
