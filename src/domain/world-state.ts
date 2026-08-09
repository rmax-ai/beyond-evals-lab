import type { AuditRecord, Refund, WorldState } from "./types.js";

/** Creates a fresh, empty snapshot of the simulated world. */
export function createEmptyState(): WorldState {
  return {
    users: [],
    transactions: [],
    refunds: [],
    auditRecords: [],
  };
}

/** Returns a deep, independent snapshot so callers cannot mutate the source state. */
export function cloneState(state: WorldState): WorldState {
  return structuredClone(state);
}

/**
 * Applies a refund without mutating the supplied snapshot. The related
 * transaction becomes partially refunded until its cumulative refunds cover
 * its full amount.
 */
export function applyRefund(state: WorldState, refund: Refund): WorldState {
  const nextState = cloneState(state);
  const refundedCents = nextState.refunds
    .filter((existingRefund) => existingRefund.transactionId === refund.transactionId)
    .reduce((total, existingRefund) => total + existingRefund.amountCents, refund.amountCents);

  nextState.refunds.push(structuredClone(refund));
  nextState.transactions = nextState.transactions.map((transaction) => {
    if (transaction.id !== refund.transactionId) {
      return transaction;
    }

    return {
      ...transaction,
      status: refundedCents >= transaction.amountCents ? "refunded" : "partially_refunded",
    };
  });

  return nextState;
}

/** Applies an audit record without mutating the supplied snapshot. */
export function applyAuditRecord(state: WorldState, record: AuditRecord): WorldState {
  const nextState = cloneState(state);
  nextState.auditRecords.push(structuredClone(record));
  return nextState;
}
