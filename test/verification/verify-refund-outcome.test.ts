import type { AgentRun, Refund, WorldState } from "../../src/domain/types.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { applyAuditRecord, applyRefund, cloneState } from "../../src/domain/world-state.js";
import { verifyRefundOutcome } from "../../src/verification/verify-refund-outcome.js";

const expectation = { transactionId: "txn-1", amountCents: 4_200, auditRequired: true };

function refund(overrides: Partial<Refund> = {}): Refund {
  return { id: "refund-1", transactionId: "txn-1", amountCents: 4_200, initiatedBy: supportUser.id, createdAt: "2025-01-20T10:00:00.000Z", ...overrides };
}

function run(finalState: WorldState): AgentRun {
  const initialState = createFixtureState();
  return {
    id: "run-1", request: { requestId: "request-1", actorId: supportUser.id, message: "Refund €42." },
    initialState, finalState, trace: [], startedAt: "2025-01-20T10:00:00.000Z", completedAt: "2025-01-20T10:01:00.000Z",
  };
}

function correctState(): WorldState {
  const createdRefund = refund();
  return applyAuditRecord(applyRefund(createFixtureState(), createdRefund), {
    id: "audit-1", actorId: supportUser.id, action: "refund_created", entityType: "refund", entityId: createdRefund.id, metadata: {}, createdAt: "2025-01-20T10:00:01.000Z",
  });
}

describe("verifyRefundOutcome", () => {
  it("verifies every claim for a correct refund", async () => {
    expect((await verifyRefundOutcome(run(correctState()), correctState(), expectation)).every((item) => item.status === "verified")).toBe(true);
  });

  it("fails the amount claim for a wrong amount", async () => {
    const state = applyAuditRecord(applyRefund(createFixtureState(), refund({ amountCents: 4_100 })), { id: "audit-1", actorId: supportUser.id, action: "refund_created", entityType: "refund", entityId: "refund-1", metadata: {}, createdAt: "now" });
    const evidence = await verifyRefundOutcome(run(state), state, expectation);
    expect(evidence.find((item) => item.claim === "refund amount equals expected amount")?.status).toBe("failed");
  });

  it("fails refund claims when the refund is missing", async () => {
    const state = createFixtureState();
    const evidence = await verifyRefundOutcome(run(state), state, expectation);
    expect(evidence.find((item) => item.claim === "exactly one refund exists for expected transaction")?.status).toBe("failed");
    expect(evidence.find((item) => item.claim === "refund amount equals expected amount")?.status).toBe("failed");
  });

  it("fails the exactly-one claim for duplicate refunds", async () => {
    const state = applyRefund(applyRefund(createFixtureState(), refund()), refund({ id: "refund-2" }));
    const evidence = await verifyRefundOutcome(run(state), state, expectation);
    expect(evidence.find((item) => item.claim === "exactly one refund exists for expected transaction")?.status).toBe("failed");
  });

  it("fails the audit claim when the audit record is missing", async () => {
    const state = applyRefund(createFixtureState(), refund());
    const evidence = await verifyRefundOutcome(run(state), state, expectation);
    expect(evidence.find((item) => item.claim === "required audit record exists")?.status).toBe("failed");
  });

  it("fails the isolation claim when an unrelated transaction changes", async () => {
    const state = correctState();
    const altered = cloneState(state);
    altered.transactions.find((transaction) => transaction.id === "txn-2")!.status = "refunded";
    const evidence = await verifyRefundOutcome(run(altered), altered, expectation);
    expect(evidence.find((item) => item.claim === "no unrelated transaction was modified")?.status).toBe("failed");
  });
});
