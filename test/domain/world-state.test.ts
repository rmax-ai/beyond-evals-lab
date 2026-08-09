import type { AuditRecord, Refund } from "../../src/domain/types.js";
import { createFixtureState, sampleTransaction } from "../../src/domain/fixtures.js";
import {
  applyAuditRecord,
  applyRefund,
  cloneState,
  createEmptyState,
} from "../../src/domain/world-state.js";

describe("world state utilities", () => {
  it("creates a valid empty state", () => {
    expect(createEmptyState()).toEqual({
      users: [],
      transactions: [],
      refunds: [],
      auditRecords: [],
    });
  });

  it("clones state deeply", () => {
    const original = createFixtureState();
    const clone = cloneState(original);

    clone.users[0]!.name = "Changed user";
    clone.transactions[0]!.status = "refunded";

    expect(clone).toEqual(expect.not.objectContaining(original));
    expect(original.users[0]!.name).toBe("Sam Support");
    expect(original.transactions[0]!.status).toBe("settled");
  });

  it("adds a refund and marks a fully refunded transaction", () => {
    const refund: Refund = {
      id: "refund-1",
      transactionId: sampleTransaction.id,
      amountCents: sampleTransaction.amountCents,
      initiatedBy: "user-support-1",
      createdAt: "2025-01-20T10:00:00.000Z",
    };

    const result = applyRefund(createFixtureState(), refund);

    expect(result.refunds).toEqual([refund]);
    expect(result.transactions.find((transaction) => transaction.id === sampleTransaction.id)?.status)
      .toBe("refunded");
  });

  it("does not mutate the original state when applying a refund", () => {
    const state = createFixtureState();
    const before = cloneState(state);
    const refund: Refund = {
      id: "refund-1",
      transactionId: "txn-1",
      amountCents: 4_200,
      initiatedBy: "user-support-1",
      createdAt: "2025-01-20T10:00:00.000Z",
    };

    const result = applyRefund(state, refund);

    expect(state).toEqual(before);
    expect(result).not.toBe(state);
    expect(result.refunds).toHaveLength(1);
  });

  it("adds an audit record", () => {
    const record: AuditRecord = {
      id: "audit-1",
      actorId: "user-support-1",
      action: "refund_created",
      entityType: "refund",
      entityId: "refund-1",
      metadata: { requestId: "request-1" },
      createdAt: "2025-01-20T10:00:00.000Z",
    };

    expect(applyAuditRecord(createFixtureState(), record).auditRecords).toEqual([record]);
  });

  it("supports chaining refund and audit-record transitions", () => {
    const refund: Refund = {
      id: "refund-1",
      transactionId: "txn-1",
      amountCents: 4_200,
      initiatedBy: "user-support-1",
      createdAt: "2025-01-20T10:00:00.000Z",
    };
    const record: AuditRecord = {
      id: "audit-1",
      actorId: "user-support-1",
      action: "refund_created",
      entityType: "refund",
      entityId: refund.id,
      metadata: {},
      createdAt: "2025-01-20T10:00:01.000Z",
    };

    const result = applyAuditRecord(applyRefund(createFixtureState(), refund), record);

    expect(result.refunds).toEqual([refund]);
    expect(result.auditRecords).toEqual([record]);
    expect(result.transactions.find((transaction) => transaction.id === "txn-1")?.status)
      .toBe("refunded");
  });
});
