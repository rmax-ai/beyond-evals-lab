import type { Transaction, User, WorldState } from "./types.js";
import { cloneState, createEmptyState } from "./world-state.js";

export const supportUser: User = {
  id: "user-support-1",
  name: "Sam Support",
  role: "support",
  refundLimitCents: 10_000,
};

export const financeUser: User = {
  id: "user-finance-1",
  name: "Fran Finance",
  role: "finance",
  refundLimitCents: 500_000,
};

export const adminUser: User = {
  id: "user-admin-1",
  name: "Alex Admin",
  role: "admin",
  refundLimitCents: 2_000_000,
};

export const customerUser: User = {
  id: "user-customer-1",
  name: "Casey Customer",
  role: "customer",
  refundLimitCents: 0,
};

export const sampleTransaction: Transaction = {
  id: "txn-1",
  customerId: customerUser.id,
  amountCents: 4_200,
  currency: "EUR",
  createdAt: "2025-01-15T10:00:00.000Z",
  merchantReference: "MERCHANT-REF-001",
  fingerprint: "fp-sample-transaction-1",
  status: "settled",
};

/** Creates a deterministic state for tests and CLI demonstrations. */
export function createFixtureState(): WorldState {
  const emptyState = createEmptyState();

  return cloneState({
    ...emptyState,
    users: [supportUser, financeUser, adminUser, customerUser],
    transactions: [
      sampleTransaction,
      {
        id: "txn-2",
        customerId: customerUser.id,
        amountCents: 7_500,
        currency: "EUR",
        createdAt: "2025-01-16T11:00:00.000Z",
        merchantReference: "MERCHANT-REF-002",
        fingerprint: "fp-sample-transaction-2",
        status: "settled",
      },
      {
        id: "txn-3",
        customerId: customerUser.id,
        amountCents: 15_000,
        currency: "EUR",
        createdAt: "2025-01-17T12:00:00.000Z",
        merchantReference: "MERCHANT-REF-003",
        fingerprint: "fp-sample-transaction-3",
        status: "settled",
      },
    ],
  });
}
