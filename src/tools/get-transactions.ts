import { z } from "zod";

import type { Transaction } from "../domain/types.js";
import type { Tool, ToolExecutionContext, ToolResult } from "./contracts.js";

export interface GetTransactionsInput {
  customerId?: string;
}

export class GetTransactionsTool implements Tool<GetTransactionsInput, Transaction[]> {
  name = "getTransactions" as const;
  inputSchema: z.ZodType<GetTransactionsInput> = z.object({
    customerId: z.string().min(1).optional(),
  });

  async execute(
    input: GetTransactionsInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<Transaction[]>> {
    const parsedInput = this.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: `Invalid getTransactions input: ${parsedInput.error.message}` };
    }

    const { customerId } = parsedInput.data;
    const transactions = customerId === undefined
      ? context.state.transactions
      : context.state.transactions.filter((transaction) => transaction.customerId === customerId);

    return { success: true, output: transactions };
  }
}
