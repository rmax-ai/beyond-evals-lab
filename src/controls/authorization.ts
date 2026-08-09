import type { Control, ControlContext, ControlDecision } from "./types.js";

/** Applies the PoC's role-based permission policy before a tool can execute. */
export class AuthorizationControl implements Control {
  name = "authorization";

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    if (context.proposedCall.tool === "createRefund" && context.actor.role === "customer") {
      return {
        control: this.name,
        decision: "block",
        reason: "Customers are not authorized to create refunds",
        evidence: {
          actorId: context.actor.id,
          role: context.actor.role,
          tool: context.proposedCall.tool,
        },
      };
    }

    return {
      control: this.name,
      decision: "allow",
      reason: "Actor is authorized for the proposed tool",
    };
  }
}
