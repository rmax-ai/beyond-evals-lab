import { createFixtureState, supportUser } from "../../src/domain/fixtures.js";
import { cloneState } from "../../src/domain/world-state.js";
import { GetTransactionsTool } from "../../src/tools/get-transactions.js";

describe("GetTransactionsTool", () => {
  it("returns all transactions without a filter", async () => {
    const state = createFixtureState();
    const result = await new GetTransactionsTool().execute({}, { state, actor: supportUser, requestId: "request-1" });

    expect(result).toEqual({ success: true, output: state.transactions });
  });

  it("filters transactions by customer ID", async () => {
    const state = createFixtureState();
    state.transactions[1]!.customerId = "user-other";
    const result = await new GetTransactionsTool().execute(
      { customerId: "user-customer-1" },
      { state, actor: supportUser, requestId: "request-1" },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toHaveLength(2);
      expect(result.output.every((transaction) => transaction.customerId === "user-customer-1"))
        .toBe(true);
    }
  });

  it("returns an empty array when there are no transactions", async () => {
    const state = createFixtureState();
    state.transactions = [];

    const result = await new GetTransactionsTool().execute({}, { state, actor: supportUser, requestId: "request-1" });

    expect(result).toEqual({ success: true, output: [] });
  });

  it("does not mutate state", async () => {
    const state = createFixtureState();
    const before = cloneState(state);

    await new GetTransactionsTool().execute({}, { state, actor: supportUser, requestId: "request-1" });

    expect(state).toEqual(before);
  });
});
