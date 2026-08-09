import { z } from "zod";

import type { User, WorldState } from "../domain/types.js";

export type ToolName =
  | "getTransactions"
  | "getTransaction"
  | "createRefund"
  | "getRefund"
  | "writeAuditRecord";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ToolResult<O> =
  | { success: true; output: O }
  | { success: false; error: string };

export interface ToolExecutionContext {
  state: WorldState;
  actor: User;
  requestId: string;
}

export interface Tool<I, O> {
  name: ToolName;
  inputSchema: z.ZodType<I>;
  execute(input: I, context: ToolExecutionContext): Promise<ToolResult<O>>;
}
