import type { AgentRun } from "../../src/domain/types.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { applyAuditRecord, applyRefund } from "../../src/domain/world-state.js";
import { verifyAuditRecord } from "../../src/verification/verify-audit-record.js";

function run(finalState: ReturnType<typeof createFixtureState>): AgentRun {
  return { id: "run-1", request: { requestId: "request-1", actorId: supportUser.id, message: "Refund €42." }, initialState: createFixtureState(), finalState, trace: [], startedAt: "now", completedAt: "now" };
}

describe("verifyAuditRecord", () => {
  it("verifies a correctly linked audit record", async () => {
    const state = applyAuditRecord(applyRefund(createFixtureState(), { id: "refund-1", transactionId: "txn-1", amountCents: 4_200, initiatedBy: supportUser.id, createdAt: "now" }), { id: "audit-1", actorId: supportUser.id, action: "refund_created", entityType: "refund", entityId: "refund-1", metadata: {}, createdAt: "now" });
    expect((await verifyAuditRecord(run(state), state)).every((item) => item.status === "verified")).toBe(true);
  });

  it("fails when the audit record is absent", async () => {
    const state = applyRefund(createFixtureState(), { id: "refund-1", transactionId: "txn-1", amountCents: 4_200, initiatedBy: supportUser.id, createdAt: "now" });
    expect((await verifyAuditRecord(run(state), state)).find((item) => item.claim === "audit record exists for refund action")?.status).toBe("failed");
  });
});
