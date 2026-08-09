import type { AgentRun } from "../../src/domain/types.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { applyRefund, cloneState } from "../../src/domain/world-state.js";
import { verifyStateIsolation } from "../../src/verification/verify-state-isolation.js";

function run(finalState: ReturnType<typeof createFixtureState>): AgentRun {
  return { id: "run-1", request: { requestId: "request-1", actorId: supportUser.id, message: "Refund €42." }, initialState: createFixtureState(), finalState, trace: [], startedAt: "now", completedAt: "now" };
}

describe("verifyStateIsolation", () => {
  it("verifies when only the expected refund state changes", async () => {
    const state = applyRefund(createFixtureState(), { id: "refund-1", transactionId: "txn-1", amountCents: 4_200, initiatedBy: supportUser.id, createdAt: "now" });
    expect((await verifyStateIsolation(run(state))).every((item) => item.status === "verified")).toBe(true);
  });

  it("fails when an unrelated transaction is modified", async () => {
    const state = applyRefund(createFixtureState(), { id: "refund-1", transactionId: "txn-1", amountCents: 4_200, initiatedBy: supportUser.id, createdAt: "now" });
    const altered = cloneState(state);
    altered.transactions.find((transaction) => transaction.id === "txn-2")!.status = "refunded";
    expect((await verifyStateIsolation(run(altered))).find((item) => item.claim === "no unrelated transactions were modified")?.status).toBe("failed");
  });
});
