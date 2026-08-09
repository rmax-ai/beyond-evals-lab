import type { Control, ControlContext, ControlDecision } from "./types.js";

/** Prevents a run from proceeding after a refund without first proposing its audit record. */
export class ForbiddenActionsControl implements Control {
  name = "forbidden-actions";

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    const refundWasAllowed = context.previousEvents.some(
      (event) => event.proposedTool === "createRefund" && event.decision === "allow",
    );
    const auditWasAllowed = context.previousEvents.some(
      (event) => event.proposedTool === "writeAuditRecord" && event.decision === "allow",
    );

    if (
      refundWasAllowed
      && !auditWasAllowed
      && context.proposedCall.tool !== "writeAuditRecord"
    ) {
      return {
        control: this.name,
        decision: "block",
        reason: "audit record required before completion",
        evidence: {
          proposedTool: context.proposedCall.tool,
          priorRefundControlEvents: context.previousEvents.filter(
            (event) => event.proposedTool === "createRefund",
          ),
        },
      };
    }

    return {
      control: this.name,
      decision: "allow",
      reason: "No mandatory audit action is being skipped",
    };
  }
}
