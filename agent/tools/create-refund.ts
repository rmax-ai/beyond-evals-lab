import { defineTool } from "eve/tools";

import { eveSessionStore } from "../../src/eve/index.js";

/** Returns Eve's stable call identifier for correlating lab trace events. */
function toolCallId(ctx: { readonly callId: string }): string {
  return ctx.callId;
}

// `any` is required to avoid Eve v0.27.7's JSON Schema generic introspection issue.
export default defineTool<any, any>({
  description: "Creates a refund. Only do this after the transaction is confirmed with getTransaction or getTransactions. Amounts are in EUR cents. If a call is blocked (success: false), do not retry it to bypass governance; explain the block or take an authorized next step.",
  inputSchema: {
    type: "object",
    properties: {
      transactionId: {
        type: "string",
        minLength: 1,
        description: "ID of the transaction to refund.",
      },
      amountCents: {
        type: "integer",
        minimum: 1,
        description: "Refund amount in EUR cents. Must be a positive integer.",
      },
    },
    required: ["transactionId", "amountCents"],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const runtime = eveSessionStore.getOrCreate(ctx.session.id);
    const { result } = await runtime.executeToolCall("createRefund", input, toolCallId(ctx));
    return result;
  },
});
