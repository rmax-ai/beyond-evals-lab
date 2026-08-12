import { defineTool } from "eve/tools";

import { eveSessionStore } from "../../src/eve/index.js";

/** Returns Eve's stable call identifier for correlating lab trace events. */
function toolCallId(ctx: { readonly callId: string }): string {
  return ctx.callId;
}

// `any` is required to avoid Eve v0.27.7's JSON Schema generic introspection issue.
export default defineTool<any, any>({
  description: "Retrieves one transaction by ID. Use it when a specific transaction needs inspection before you answer or take a refund-related action. If a call is blocked (success: false), do not retry it to bypass governance; explain the block or take an authorized next step.",
  inputSchema: {
    type: "object",
    properties: {
      transactionId: {
        type: "string",
        minLength: 1,
        description: "ID of the transaction to retrieve.",
      },
    },
    required: ["transactionId"],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const runtime = eveSessionStore.getOrCreate(ctx.session.id);
    const { result } = await runtime.executeToolCall("getTransaction", input, toolCallId(ctx));
    return result;
  },
});
