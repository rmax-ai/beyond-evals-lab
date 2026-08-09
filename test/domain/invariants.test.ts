import type { Refund } from "../../src/domain/types.js";
import { createFixtureState } from "../../src/domain/fixtures.js";
import {
  allRefundsHaveTransactions,
  exactlyOneRefundForTransaction,
  noUnrelatedStateChange,
  refundAmountMatches,
} from "../../src/domain/invariants.js";
import { applyRefund, cloneState } from "../../src/domain/world-state.js";

const refund: Refund = {
  id: "refund-1",
  transactionId: "txn-1",
  amountCents: 4_200,
  initiatedBy: "user-support-1",
  createdAt: "2025-01-20T10:00:00.000Z",
};

describe("state invariants", () => {
  it("finds refunds that all reference existing transactions", () => {
    expect(allRefundsHaveTransactions(applyRefund(createFixtureState(), refund))).toBe(true);
  });

  it("rejects an orphan refund", () => {
    const state = createFixtureState();
    state.refunds.push({ ...refund, transactionId: "txn-missing" });

    expect(allRefundsHaveTransactions(state)).toBe(false);
  });

  it("allows only the target transaction to change with a new refund", () => {
    const before = createFixtureState();
    const after = applyRefund(before, refund);

    expect(noUnrelatedStateChange(before, after, refund.id)).toBe(true);
  });

  it("rejects a change to an unrelated transaction", () => {
    const before = createFixtureState();
    const after = applyRefund(before, refund);
    const altered = cloneState(after);
    altered.transactions.find((transaction) => transaction.id === "txn-2")!.status = "refunded";

    expect(noUnrelatedStateChange(before, altered, refund.id)).toBe(false);
  });

  it("requires exactly one refund for a transaction", () => {
    const state = applyRefund(createFixtureState(), refund);

    expect(exactlyOneRefundForTransaction(state, "txn-1")).toBe(true);
    expect(exactlyOneRefundForTransaction(createFixtureState(), "txn-1")).toBe(false);
    expect(exactlyOneRefundForTransaction(
      { ...state, refunds: [...state.refunds, { ...refund, id: "refund-2" }] },
      "txn-1",
    )).toBe(false);
  });

  it("matches a refund by its exact amount", () => {
    const state = applyRefund(createFixtureState(), refund);

    expect(refundAmountMatches(state, refund.id, 4_200)).toBe(true);
    expect(refundAmountMatches(state, refund.id, 4_199)).toBe(false);
  });
});
