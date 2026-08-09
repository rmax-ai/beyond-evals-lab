import { createToolRegistry } from "../tools/registry.js";

import type { Control, ControlContext, ControlDecision } from "./types.js";

/** Validates every proposed tool call against its registered Zod input schema. */
export class SchemaValidationControl implements Control {
  name = "schema-validation";

  async evaluate(context: ControlContext): Promise<ControlDecision> {
    const tool = createToolRegistry().get(context.proposedCall.tool);

    if (!tool) {
      return {
        control: this.name,
        decision: "block",
        reason: `Unknown tool: ${context.proposedCall.tool}`,
        evidence: { tool: context.proposedCall.tool },
      };
    }

    const validation = tool.inputSchema.safeParse(context.proposedCall.arguments);
    if (!validation.success) {
      return {
        control: this.name,
        decision: "block",
        reason: `Invalid arguments for ${context.proposedCall.tool}`,
        evidence: {
          tool: context.proposedCall.tool,
          issues: validation.error.issues,
        },
      };
    }

    return {
      control: this.name,
      decision: "allow",
      reason: "Tool arguments match the input schema",
    };
  }
}
