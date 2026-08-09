import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { cloneState } from "../../src/domain/world-state.js";
import { GetTransactionTool } from "../../src/tools/get-transaction.js";

describe("GetTransactionTool", () => {
  it("returns a transaction by ID", async () => {
    const state = createFixtureState();
    const result = await new GetTransactionTool().execute(
      { transactionId: "txn-1" },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(result).toEqual({ success: true, output: state.transactions[0] });
  });

  it("fails for a non-existent transaction ID", async () => {
    const result = await new GetTransactionTool().execute(
      { transactionId: "txn-missing" },
      { state: createFixtureState(), actor: supportUser, requestId: "request-1" },
    );

    expect(result).toMatchObject({ success: false, error: "Transaction not found: txn-missing" });
  });

  it("does not mutate state", async () => {
    const state = createFixtureState();
    const before = cloneState(state);

    await new GetTransactionTool().execute(
      { transactionId: "txn-1" },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(state).toEqual(before);
  });
});
