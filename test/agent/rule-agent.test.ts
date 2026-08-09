import type { AgentContext } from "../../src/agent/agent.js";
import { RuleBasedRefundAgent } from "../../src/agent/rule-agent.js";
import { createFixtureState, sampleTransaction } from "../../src/domain/fixtures.js";
import type { AgentRequest, ToolObservation } from "../../src/domain/types.js";
import { getToolDefinitions } from "../../src/tools/registry.js";

const request: AgentRequest = {
  requestId: "request-1",
  actorId: "user-support-1",
  message: "Please refund the duplicate €42 charge.",
};

function context(observations: ToolObservation[] = [], message = request.message): AgentContext {
  return { request: { ...request, message }, visibleToolDefinitions: getToolDefinitions(), observations };
}

const listedTransactions: ToolObservation = {
  toolCallId: "call-list", toolName: "getTransactions", timestamp: "2025-01-01T00:00:00.000Z",
  result: { success: true, output: [{ ...sampleTransaction }, { ...sampleTransaction, id: "txn-duplicate" }] },
};
const createdRefund: ToolObservation = {
  toolCallId: "call-refund", toolName: "createRefund", timestamp: "2025-01-01T00:00:01.000Z",
  result: { success: true, output: { id: "refund-1", transactionId: "txn-1", amountCents: 4_200 } },
};

describe("RuleBasedRefundAgent", () => {
  it("handles a duplicate €42 request through lookup, refund, and audit proposals", async () => {
    const agent = new RuleBasedRefundAgent();
    const lookup = await agent.decide(context());
    const refund = await agent.decide(context([listedTransactions]));
    const audit = await agent.decide(context([listedTransactions, createdRefund]));

    expect(lookup.toolCalls[0]).toMatchObject({ tool: "getTransactions", rationale: expect.any(String) });
    expect(refund.toolCalls[0]).toMatchObject({
      tool: "createRefund", arguments: { transactionId: "txn-1", amountCents: 4_200 }, rationale: expect.any(String),
    });
    expect(audit.toolCalls[0]).toMatchObject({ tool: "writeAuditRecord", rationale: expect.any(String) });
  });

  it("looks up transactions for a most recent request", async () => {
    const decision = await new RuleBasedRefundAgent().decide(context([], "Refund the most recent charge."));
    expect(decision.toolCalls[0]).toMatchObject({ tool: "getTransactions" });
  });

  it("sets done after the refund has been audited", async () => {
    const audit: ToolObservation = { toolCallId: "call-audit", toolName: "writeAuditRecord", timestamp: "2025-01-01T00:00:02.000Z", result: { success: true, output: {} } };
    const decision = await new RuleBasedRefundAgent().decide(context([listedTransactions, createdRefund, audit]));
    expect(decision).toMatchObject({ done: true, toolCalls: [] });
  });

  it("makes a reckless €5,000 attempt before correcting the amount", async () => {
    const agent = new RuleBasedRefundAgent("reckless-first-attempt");
    const first = await agent.decide(context([listedTransactions]));
    const failedAttempt: ToolObservation = { ...first.toolCalls[0]!, toolCallId: "call-reckless", toolName: "createRefund", timestamp: "2025-01-01T00:00:01.000Z", result: { success: false, error: "blocked" } };
    const correction = await agent.decide(context([listedTransactions, failedAttempt]));

    expect(first.toolCalls[0]).toMatchObject({ tool: "createRefund", arguments: { amountCents: 500_000 } });
    expect(correction.toolCalls[0]).toMatchObject({ tool: "createRefund", arguments: { amountCents: 4_200 } });
  });

  it("proposes a refund but no audit record in skip-audit mode", async () => {
    const agent = new RuleBasedRefundAgent("skip-audit");
    const refund = await agent.decide(context([listedTransactions]));
    const completion = await agent.decide(context([listedTransactions, createdRefund]));
    expect(refund.toolCalls[0]).toMatchObject({ tool: "createRefund" });
    expect(completion).toMatchObject({ done: true, toolCalls: [] });
  });

  it("refunds without a duplicate match in refund-without-confirming mode", async () => {
    const state = createFixtureState();
    const observation: ToolObservation = { ...listedTransactions, result: { success: true, output: state.transactions } };
    const decision = await new RuleBasedRefundAgent("refund-without-confirming-duplicate").decide(context([observation]));
    expect(decision.toolCalls[0]).toMatchObject({ tool: "createRefund", arguments: { transactionId: "txn-1", amountCents: 4_200 } });
  });
});
