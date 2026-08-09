import { CreateRefundTool } from "./create-refund.js";
import type { Tool, ToolDefinition, ToolName } from "./contracts.js";
import { GetRefundTool } from "./get-refund.js";
import { GetTransactionTool } from "./get-transaction.js";
import { GetTransactionsTool } from "./get-transactions.js";
import { WriteAuditRecordTool } from "./write-audit-record.js";

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "getTransactions",
    description: "Lists transactions, optionally limited to one customer.",
    inputSchema: { customerId: "optional string" },
  },
  {
    name: "getTransaction",
    description: "Retrieves a transaction by its ID.",
    inputSchema: { transactionId: "string" },
  },
  {
    name: "createRefund",
    description: "Creates a refund for an eligible transaction.",
    inputSchema: { transactionId: "string", amountCents: "positive integer" },
  },
  {
    name: "getRefund",
    description: "Retrieves a refund by its ID.",
    inputSchema: { refundId: "string" },
  },
  {
    name: "writeAuditRecord",
    description: "Creates an audit record for an action on an entity.",
    inputSchema: {
      action: "string",
      entityType: "string",
      entityId: "string",
      metadata: "optional record",
    },
  },
];

/** Creates a fresh registry of all tool implementations available to the runtime. */
export function createToolRegistry(): Map<ToolName, Tool<unknown, unknown>> {
  const tools = [
    new GetTransactionsTool(),
    new GetTransactionTool(),
    new CreateRefundTool(),
    new GetRefundTool(),
    new WriteAuditRecordTool(),
  ];

  return new Map(tools.map((tool) => [tool.name, tool as Tool<unknown, unknown>]));
}

/** Returns agent-facing descriptions of every registered tool. */
export function getToolDefinitions(): ToolDefinition[] {
  return structuredClone(TOOL_DEFINITIONS);
}
