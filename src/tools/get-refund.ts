import { z } from "zod";

import type { Refund } from "../domain/types.js";
import type { Tool, ToolExecutionContext, ToolResult } from "./contracts.js";

export interface GetRefundInput {
  refundId: string;
}

export class GetRefundTool implements Tool<GetRefundInput, Refund> {
  name = "getRefund" as const;
  inputSchema: z.ZodType<GetRefundInput> = z.object({
    refundId: z.string().min(1),
  });

  async execute(
    input: GetRefundInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<Refund>> {
    const parsedInput = this.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: `Invalid getRefund input: ${parsedInput.error.message}` };
    }

    const refund = context.state.refunds.find((candidate) => candidate.id === parsedInput.data.refundId);
    if (!refund) {
      return { success: false, error: `Refund not found: ${parsedInput.data.refundId}` };
    }

    return { success: true, output: refund };
  }
}
