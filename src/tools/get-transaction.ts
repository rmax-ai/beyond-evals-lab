import { z } from "zod";

import type { Transaction } from "../domain/types.js";
import type { Tool, ToolExecutionContext, ToolResult } from "./contracts.js";

export interface GetTransactionInput {
  transactionId: string;
}

export class GetTransactionTool implements Tool<GetTransactionInput, Transaction> {
  name = "getTransaction" as const;
  inputSchema: z.ZodType<GetTransactionInput> = z.object({
    transactionId: z.string().min(1),
  });

  async execute(
    input: GetTransactionInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<Transaction>> {
    const parsedInput = this.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: `Invalid getTransaction input: ${parsedInput.error.message}` };
    }

    const transaction = context.state.transactions.find(
      (candidate) => candidate.id === parsedInput.data.transactionId,
    );
    if (!transaction) {
      return { success: false, error: `Transaction not found: ${parsedInput.data.transactionId}` };
    }

    return { success: true, output: transaction };
  }
}
