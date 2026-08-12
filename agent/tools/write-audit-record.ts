import { defineTool } from "eve/tools";

import { eveSessionStore } from "../../src/eve/index.js";

/** Returns Eve's stable call identifier for correlating lab trace events. */
function toolCallId(ctx: { readonly callId: string }): string {
  return ctx.callId;
}

// `any` is required to avoid Eve v0.27.7's JSON Schema generic introspection issue.
export default defineTool<any, any>({
  description: "Writes an audit record. After every successful refund, write an audit record referencing the transaction and refund. The system enforces this: further tool calls are blocked by governance until the audit record is written. If a call is blocked (success: false), do not retry it to bypass governance; explain the block or take an authorized next step.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        minLength: 1,
        description: "Action performed, e.g. 'refund_created'.",
      },
      entityType: {
        type: "string",
        minLength: 1,
        description: "Entity type the action concerns, e.g. 'transaction'.",
      },
      entityId: {
        type: "string",
        minLength: 1,
        description: "ID of the entity, e.g. the transaction ID.",
      },
      metadata: {
        type: "object",
        description: "Optional structured metadata about the action.",
      },
    },
    required: ["action", "entityType", "entityId"],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const runtime = eveSessionStore.getOrCreate(ctx.session.id);
    const { result } = await runtime.executeToolCall("writeAuditRecord", input, toolCallId(ctx));
    return result;
  },
});
