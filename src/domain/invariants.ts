import type { Transaction, WorldState } from "./types.js";

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function transactionChangedOnlyByRefund(
  before: Transaction,
  after: Transaction,
  refundedCents: number,
): boolean {
  if (
    before.id !== after.id ||
    before.customerId !== after.customerId ||
    before.amountCents !== after.amountCents ||
    before.currency !== after.currency ||
    before.createdAt !== after.createdAt ||
    before.merchantReference !== after.merchantReference ||
    before.fingerprint !== after.fingerprint
  ) {
    return false;
  }

  const expectedStatus = refundedCents >= before.amountCents ? "refunded" : "partially_refunded";
  return after.status === expectedStatus;
}

/** Returns whether all refunds reference transactions in the same snapshot. */
export function allRefundsHaveTransactions(state: WorldState): boolean {
  const transactionIds = new Set(state.transactions.map((transaction) => transaction.id));
  return state.refunds.every((refund) => transactionIds.has(refund.transactionId));
}

/**
 * Returns whether the sole change is the expected refund and the corresponding
 * transaction status update.
 */
export function noUnrelatedStateChange(
  before: WorldState,
  after: WorldState,
  expectedRefundId: string,
): boolean {
  if (!valuesMatch(before.users, after.users) || !valuesMatch(before.auditRecords, after.auditRecords)) {
    return false;
  }

  if (after.refunds.length !== before.refunds.length + 1) {
    return false;
  }

  const newRefund = after.refunds.at(-1);
  if (!newRefund || newRefund.id !== expectedRefundId) {
    return false;
  }

  if (!valuesMatch(before.refunds, after.refunds.slice(0, -1))) {
    return false;
  }

  const beforeTransaction = before.transactions.find(
    (transaction) => transaction.id === newRefund.transactionId,
  );
  if (!beforeTransaction || before.transactions.length !== after.transactions.length) {
    return false;
  }

  const refundedCents = after.refunds
    .filter((refund) => refund.transactionId === newRefund.transactionId)
    .reduce((total, refund) => total + refund.amountCents, 0);

  return before.transactions.every((transaction) => {
    const afterTransaction = after.transactions.find(
      (candidate) => candidate.id === transaction.id,
    );
    if (!afterTransaction) {
      return false;
    }

    return transaction.id === newRefund.transactionId
      ? transactionChangedOnlyByRefund(transaction, afterTransaction, refundedCents)
      : valuesMatch(transaction, afterTransaction);
  });
}

/** Returns whether the transaction has exactly one associated refund. */
export function exactlyOneRefundForTransaction(state: WorldState, transactionId: string): boolean {
  return state.refunds.filter((refund) => refund.transactionId === transactionId).length === 1;
}

/** Returns whether the named refund has the expected amount. */
export function refundAmountMatches(
  state: WorldState,
  refundId: string,
  expectedAmountCents: number,
): boolean {
  return state.refunds.find((refund) => refund.id === refundId)?.amountCents === expectedAmountCents;
}
