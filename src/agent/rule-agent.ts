import { getToolDefinitions } from "../tools/registry.js";

import type { Agent, AgentContext, AgentDecision } from "./agent.js";
import { decideNextAction } from "./prompts.js";
import type { AgentMode } from "./prompts.js";

export type { AgentMode } from "./prompts.js";

/** A deterministic baseline agent that needs no model provider or API key. */
export class RuleBasedRefundAgent implements Agent {
  private readonly defaultToolDefinitions = getToolDefinitions();

  constructor(private readonly mode: AgentMode = "normal") {}

  async decide(context: AgentContext): Promise<AgentDecision> {
    const effectiveContext: AgentContext = context.visibleToolDefinitions.length === 0
      ? { ...context, visibleToolDefinitions: this.defaultToolDefinitions }
      : context;
    return decideNextAction(effectiveContext, this.mode);
  }
}
