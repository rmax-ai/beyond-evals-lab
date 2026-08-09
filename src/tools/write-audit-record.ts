import { z } from "zod";

import type { AuditRecord } from "../domain/types.js";
import type { Tool, ToolExecutionContext, ToolResult } from "./contracts.js";

export interface WriteAuditRecordInput {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export class WriteAuditRecordTool implements Tool<WriteAuditRecordInput, AuditRecord> {
  name = "writeAuditRecord" as const;
  inputSchema: z.ZodType<WriteAuditRecordInput> = z.object({
    action: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  });

  async execute(
    input: WriteAuditRecordInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<AuditRecord>> {
    const parsedInput = this.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: `Invalid writeAuditRecord input: ${parsedInput.error.message}` };
    }

    const auditRecord: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actorId: context.actor.id,
      action: parsedInput.data.action,
      entityType: parsedInput.data.entityType,
      entityId: parsedInput.data.entityId,
      metadata: parsedInput.data.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    return { success: true, output: auditRecord };
  }
}
