import type { Control, ControlContext, ControlDecision } from "./types.js";

/** Enforces the configured per-actor refund limit for refund creation. */
export class RefundLimitControl implements Control {
  name = "refund-limit";

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    if (context.proposedCall.tool !== "createRefund") {
      return {
        control: this.name,
        decision: "allow",
        reason: "Refund limit does not apply to this tool",
      };
    }

    const { amountCents } = isRecord(context.proposedCall.arguments)
      ? context.proposedCall.arguments
      : {};

    // SchemaValidationControl owns malformed inputs. This control only compares
    // a valid numeric amount with the actor's authorized limit.
    if (typeof amountCents !== "number") {
      return {
        control: this.name,
        decision: "allow",
        reason: "Refund amount will be validated by schema validation",
      };
    }

    if (amountCents > context.actor.refundLimitCents) {
      return {
        control: this.name,
        decision: "block",
        reason: "Requested refund exceeds the actor's refund limit",
        evidence: {
          actorId: context.actor.id,
          requestedAmountCents: amountCents,
          refundLimitCents: context.actor.refundLimitCents,
        },
      };
    }

    return {
      control: this.name,
      decision: "allow",
      reason: "Requested refund is within the actor's refund limit",
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
