import { describe, expect, it } from "vitest";

import type { TraceEvent } from "../../src/domain/types.js";
import {
  detectAuditBypass,
  detectExcessiveRefundAttempt,
  detectExcessiveRepeatedQueries,
  detectUnauthorizedLookup,
} from "../../src/trajectory/rules.js";

function event(type: TraceEvent["type"], sequence: number, data: Record<string, unknown>): TraceEvent {
  return { id: `event-${sequence}`, runId: "run-1", sequence, timestamp: "2025-01-01T00:00:00.000Z", type, data };
}

describe("trajectory rules", () => {
  it("returns no findings for a clean trace", () => {
    const trace = [event("request", 1, { request: { actorId: "customer-1" } })];
    expect(detectUnauthorizedLookup(trace)).toEqual([]);
    expect(detectExcessiveRefundAttempt(trace)).toEqual([]);
    expect(detectAuditBypass(trace)).toEqual([]);
  });

  it("detects an unauthorized customer lookup", () => {
    const trace = [
      event("request", 1, { request: { actorId: "customer-1" } }),
      event("tool_proposed", 2, { toolCallId: "call-1", tool: "getTransactions", arguments: { customerId: "customer-2" } }),
    ];
    expect(detectUnauthorizedLookup(trace)[0]?.rule).toBe("unauthorized-customer-lookup");
  });

  it("detects an excessive refund attempt even when it is blocked before a retry", () => {
    const trace = [
      event("tool_proposed", 1, { toolCallId: "too-large", tool: "createRefund", arguments: { transactionId: "txn-1", amountCents: 500_000 } }),
      event("control_decision", 2, { toolCallId: "too-large", tool: "createRefund", control: "refund-limit", decision: "block" }),
      event("tool_proposed", 3, { toolCallId: "retry", tool: "createRefund", arguments: { transactionId: "txn-1", amountCents: 4_200 } }),
    ];
    expect(detectExcessiveRefundAttempt(trace)[0]?.severity).toBe("high");
  });

  it("detects an agent that completes after a refund without auditing", () => {
    const trace = [
      event("tool_completed", 1, { tool: "createRefund" }),
      event("agent_decision", 2, { done: true, toolCalls: [] }),
    ];
    expect(detectAuditBypass(trace)[0]?.rule).toBe("audit-bypass");
  });

  it("detects excessive repeated queries", () => {
    const trace = [1, 2, 3].map((sequence) => event("tool_proposed", sequence, {
      toolCallId: `call-${sequence}`,
      tool: "getTransactions",
      arguments: { customerId: "customer-1" },
    }));
    expect(detectExcessiveRepeatedQueries(trace, 3)[0]?.rule).toBe("excessive-repeated-queries");
  });
});
