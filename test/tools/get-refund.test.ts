import type { Refund } from "../../src/domain/types.js";
import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { applyRefund, cloneState } from "../../src/domain/world-state.js";
import { GetRefundTool } from "../../src/tools/get-refund.js";

const refund: Refund = {
  id: "refund-1",
  transactionId: "txn-1",
  amountCents: 4_200,
  initiatedBy: supportUser.id,
  createdAt: "2025-01-20T10:00:00.000Z",
};

describe("GetRefundTool", () => {
  it("returns a refund by ID", async () => {
    const state = applyRefund(createFixtureState(), refund);
    const result = await new GetRefundTool().execute(
      { refundId: refund.id },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(result).toEqual({ success: true, output: refund });
  });

  it("fails for a non-existent refund ID", async () => {
    const result = await new GetRefundTool().execute(
      { refundId: "refund-missing" },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result).toMatchObject({ success: false, error: "Refund not found: refund-missing" });
  });

  it("does not mutate state", async () => {
    const state = applyRefund(createFixtureState(), refund);
    const before = cloneState(state);

    await new GetRefundTool().execute(
      { refundId: refund.id },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(state).toEqual(before);
  });
});
