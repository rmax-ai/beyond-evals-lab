import type { AgentRequest, WorldState } from "../domain/types.js";

/** Minimal shared case shape; the eval harness extends this in Milestone 5. */
export interface EvalCase {
  id: string;
  description: string;
  initialState: WorldState;
  request: AgentRequest;
  tags: string[];
}
