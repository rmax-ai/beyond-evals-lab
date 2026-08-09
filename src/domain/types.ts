import type { ToolDefinition, ToolName } from "../tools/contracts.js";

export type UserRole = "customer" | "support" | "finance" | "admin";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  refundLimitCents: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  amountCents: number;
  currency: "EUR";
  createdAt: string;
  merchantReference: string;
  fingerprint: string;
  status: "settled" | "refunded" | "partially_refunded";
}

export interface Refund {
  id: string;
  transactionId: string;
  amountCents: number;
  initiatedBy: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorldState {
  users: User[];
  transactions: Transaction[];
  refunds: Refund[];
  auditRecords: AuditRecord[];
}

export interface AgentRequest {
  requestId: string;
  actorId: string;
  message: string;
}

export interface ProposedToolCall {
  id: string;
  tool: ToolName;
  arguments: unknown;
  rationale?: string;
}

export interface AgentDecision {
  message?: string;
  toolCalls: ProposedToolCall[];
  done: boolean;
}

export interface ToolObservation {
  toolCallId: string;
  toolName: string;
  result: unknown;
  timestamp: string;
}

export interface TraceEvent {
  id: string;
  runId: string;
  sequence: number;
  timestamp: string;
  type:
    | "request"
    | "agent_decision"
    | "tool_proposed"
    | "control_decision"
    | "tool_started"
    | "tool_completed"
    | "tool_failed"
    | "verification"
    | "validation"
    | "agent_response"
    | "user_correction";
  data: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  request: AgentRequest;
  initialState: WorldState;
  finalState: WorldState;
  trace: TraceEvent[];
  startedAt: string;
  completedAt: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
}

/** Deliberate runtime fault injection used only by demonstrations and tests. */
export interface RuntimeFaults {
  suppressAuditWrite?: boolean;
  mutateUnrelatedTransaction?: boolean;
  duplicateRefundWrite?: boolean;
}

export interface AgentContext {
  request: AgentRequest;
  visibleToolDefinitions: ToolDefinition[];
  observations: ToolObservation[];
}
