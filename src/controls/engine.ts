import type { Control, ControlContext, ControlDecision } from "./types.js";

/** Runs configured guardrails in order, stopping at the first blocked action. */
export class GuardrailEngine {
  private readonly controls: Control[];

  constructor(controls: Control[]) {
    this.controls = controls;
  }

  /** Evaluate all controls against a proposed tool call. */
  async evaluate(context: ControlContext): Promise<ControlDecision> {
    for (const control of this.controls) {
      const decision = await control.evaluate(context);
      if (decision.decision === "block") {
        return decision;
      }
    }

    return {
      control: "guardrail-engine",
      decision: "allow",
      reason: "All controls passed",
    };
  }
}
