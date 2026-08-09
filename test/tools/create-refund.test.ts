import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { applyRefund, cloneState } from "../../src/domain/world-state.js";
import { CreateRefundTool } from "../../src/tools/create-refund.js";

describe("CreateRefundTool", () => {
  it("creates a valid refund for a settled transaction", async () => {
    const state = createFixtureState();
    const result = await new CreateRefundTool().execute(
      { transactionId: "txn-1", amountCents: 4_200 },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toMatchObject({ transactionId: "txn-1", amountCents: 4_200 });
      expect(applyRefund(state, result.output).transactions[0]?.status).toBe("refunded");
    }
  });

  it("fails for a non-existent transaction", async () => {
    const result = await new CreateRefundTool().execute(
      { transactionId: "txn-missing", amountCents: 100 },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(false);
  });

  it("fails for a zero amount", async () => {
    const result = await new CreateRefundTool().execute(
      { transactionId: "txn-1", amountCents: 0 },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(false);
  });

  it("fails for an already-refunded transaction", async () => {
    const state = createFixtureState();
    state.transactions[0]!.status = "refunded";
    const result = await new CreateRefundTool().execute(
      { transactionId: "txn-1", amountCents: 100 },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(result).toMatchObject({ success: false, error: "Transaction is already fully refunded: txn-1" });
  });

  it("sets initiatedBy from the context actor", async () => {
    const result = await new CreateRefundTool().execute(
      { transactionId: "txn-1", amountCents: 100 },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.output.initiatedBy).toBe(supportUser.id);
  });

  it("does not mutate its state input", async () => {
    const state = createFixtureState();
    const before = cloneState(state);

    await new CreateRefundTool().execute(
      { transactionId: "txn-1", amountCents: 100 },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(state).toEqual(before);
  });
});
