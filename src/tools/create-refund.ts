import { z } from "zod";

import type { Refund } from "../domain/types.js";
import type { Tool, ToolExecutionContext, ToolResult } from "./contracts.js";

export interface CreateRefundInput {
  transactionId: string;
  amountCents: number;
}

export class CreateRefundTool implements Tool<CreateRefundInput, Refund> {
  name = "createRefund" as const;
  inputSchema: z.ZodType<CreateRefundInput> = z.object({
    transactionId: z.string().min(1),
    amountCents: z.number().int().positive(),
  });

  async execute(
    input: CreateRefundInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<Refund>> {
    const parsedInput = this.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: `Invalid createRefund input: ${parsedInput.error.message}` };
    }

    const transaction = context.state.transactions.find(
      (candidate) => candidate.id === parsedInput.data.transactionId,
    );
    if (!transaction) {
      return { success: false, error: `Transaction not found: ${parsedInput.data.transactionId}` };
    }
    if (transaction.status === "refunded") {
      return { success: false, error: `Transaction is already fully refunded: ${transaction.id}` };
    }

    const refund: Refund = {
      id: `refund-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      transactionId: transaction.id,
      amountCents: parsedInput.data.amountCents,
      initiatedBy: context.actor.id,
      createdAt: new Date().toISOString(),
    };

    return { success: true, output: refund };
  }
}
