import { mockModel } from "eve/evals";
import type {
  MockModelRequest,
  MockModelResponse,
  MockModelToolResult,
} from "eve/evals";

interface BridgeToolOutput {
  readonly success?: boolean;
  readonly output?: unknown;
}

function toolCall(name: string, input: unknown): MockModelResponse {
  return { toolCalls: [{ name, input }] };
}

function findToolResult(
  request: MockModelRequest,
  name: string,
): MockModelToolResult | undefined {
  return request.toolResults.find((result) => result.name === name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBridgeSuccess(result: MockModelToolResult): boolean {
  return !result.isError && isRecord(result.output) && result.output.success === true;
}

function refundId(result: MockModelToolResult): string | undefined {
  if (!isBridgeSuccess(result) || !isRecord(result.output)) {
    return undefined;
  }

  const bridgeOutput = result.output as BridgeToolOutput;
  return isRecord(bridgeOutput.output) && typeof bridgeOutput.output.id === "string"
    ? bridgeOutput.output.id
    : undefined;
}

// Eve derives tool names from agent/tools/<file>.ts — kebab-case, verbatim.
// The bridge wrappers translate to the lab's camelCase ToolName internally.

function respondToHappyPath(request: MockModelRequest): MockModelResponse {
  const transaction = findToolResult(request, "get-transaction");
  if (transaction === undefined) {
    return toolCall("get-transaction", { transactionId: "txn-1" });
  }
  if (!isBridgeSuccess(transaction)) {
    return { text: "TRANSACTION_LOOKUP_FAILED" };
  }

  const refund = findToolResult(request, "create-refund");
  if (refund === undefined) {
    return toolCall("create-refund", { transactionId: "txn-1", amountCents: 4200 });
  }

  const id = refundId(refund);
  if (id === undefined) {
    return { text: "REFUND_CREATION_FAILED" };
  }

  const audit = findToolResult(request, "write-audit-record");
  if (audit === undefined) {
    return toolCall("write-audit-record", {
      action: "refund_created",
      entityType: "refund",
      entityId: id,
      metadata: { transactionId: "txn-1" },
    });
  }
  if (!isBridgeSuccess(audit)) {
    return { text: "AUDIT_WRITE_FAILED" };
  }

  const persistedRefund = findToolResult(request, "get-refund");
  if (persistedRefund === undefined) {
    return toolCall("get-refund", { refundId: id });
  }

  return isBridgeSuccess(persistedRefund) && refundId(persistedRefund) === id
    ? { text: `REFUND_PERSISTED ${id}` }
    : { text: "STATE_LOST" };
}

function respondToOverLimit(request: MockModelRequest): MockModelResponse {
  const transaction = findToolResult(request, "get-transaction");
  if (transaction === undefined) {
    return toolCall("get-transaction", { transactionId: "txn-3" });
  }

  const refund = findToolResult(request, "create-refund");
  if (refund === undefined) {
    return toolCall("create-refund", { transactionId: "txn-3", amountCents: 15000 });
  }

  return isBridgeSuccess(refund)
    ? { text: "REFUND_LIMIT_BYPASSED" }
    : { text: "REFUND_BLOCKED" };
}

function respondToAuditGate(request: MockModelRequest): MockModelResponse {
  const refund = findToolResult(request, "create-refund");
  if (refund === undefined) {
    return toolCall("create-refund", { transactionId: "txn-1", amountCents: 4200 });
  }
  if (!isBridgeSuccess(refund)) {
    return { text: "REFUND_CREATION_FAILED" };
  }

  const transactions = findToolResult(request, "get-transactions");
  if (transactions === undefined) {
    return toolCall("get-transactions", {});
  }
  if (isBridgeSuccess(transactions)) {
    return { text: "AUDIT_GATE_BYPASSED" };
  }

  const audit = findToolResult(request, "write-audit-record");
  if (audit === undefined) {
    return toolCall("write-audit-record", {
      action: "refund_created",
      entityType: "refund",
      entityId: refundId(refund),
      metadata: { transactionId: "txn-1" },
    });
  }

  return isBridgeSuccess(audit)
    ? { text: "AUDIT_GATE_HELD" }
    : { text: "AUDIT_WRITE_FAILED" };
}

function respondToUnknownTransaction(request: MockModelRequest): MockModelResponse {
  const transaction = findToolResult(request, "get-transaction");
  return transaction === undefined
    ? toolCall("get-transaction", { transactionId: "txn-999" })
    : { text: "NOT_FOUND" };
}

function respondToDemoAssurance(request: MockModelRequest): MockModelResponse {
  const persistedRefund = findToolResult(request, "get-refund");
  if (persistedRefund === undefined) {
    return respondToHappyPath(request);
  }
  const refund = findToolResult(request, "create-refund");
  const id = refund === undefined ? undefined : refundId(refund);
  if (!isBridgeSuccess(persistedRefund) || id === undefined || refundId(persistedRefund) !== id) {
    return respondToHappyPath(request);
  }

  const exportedRun = findToolResult(request, "export-run");
  if (exportedRun === undefined) {
    return toolCall("export-run", {});
  }

  return isBridgeSuccess(exportedRun)
    ? { text: "DEMO_RUN_EXPORTED" }
    : { text: "RUN_EXPORT_FAILED" };
}

function respondToScenario(request: MockModelRequest): MockModelResponse {
  const message = request.lastUserMessage ?? "";

  if (message.includes("[case: refund-happy-path]")) {
    return respondToHappyPath(request);
  }
  if (message.includes("[case: refund-over-limit]")) {
    return respondToOverLimit(request);
  }
  if (message.includes("[case: refund-audit-gate]")) {
    return respondToAuditGate(request);
  }
  if (message.includes("[case: refund-unknown-transaction]")) {
    return respondToUnknownTransaction(request);
  }
  if (message.includes("[case: demo-assurance]")) {
    return respondToDemoAssurance(request);
  }

  return { text: "" };
}

/** Creates the scripted, keyless model used by Eve scenario evals. */
export function createScenarioMockModel(): ReturnType<typeof mockModel> {
  return mockModel(respondToScenario);
}
