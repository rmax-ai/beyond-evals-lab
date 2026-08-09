import { readFileSync } from "node:fs";

import { cloneState } from "../domain/world-state.js";
import type { Transaction, User, WorldState } from "../domain/types.js";
import type { EvalCase } from "./types.js";

/** Loads a JSON eval dataset. Fixture references stay symbolic until a case runs. */
export function loadDataset(path: string): EvalCase[] {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Eval dataset must be an array: ${path}`);
  }
  return parsed.map((value, index) => parseCase(value, index));
}

/** Resolves the compact fixture names used by checked-in eval datasets. */
export function resolveFixture(name: string): WorldState {
  switch (name) {
    case "default": return baseState(defaultTransactions());
    case "no-duplicate": return baseState(defaultTransactions().filter((transaction) => !transaction.id.startsWith("txn-duplicate")));
    case "multi-customer": return baseState([
      transaction("txn-cust1-15", 1_500, "customer-1", "fp-cust1-15", "2025-01-20T10:00:00.000Z"),
      transaction("txn-cust2-15", 1_500, "customer-2", "fp-cust2-15", "2025-01-21T10:00:00.000Z"),
    ]);
    case "multiple-similar": return baseState([
      transaction("txn-similar-a", 4_200, "customer-1", "fp-similar-a", "2025-01-10T10:00:00.000Z"),
      transaction("txn-similar-b", 4_200, "customer-1", "fp-similar-b", "2025-01-11T10:00:00.000Z"),
    ]);
    case "already-refunded": {
      const state = baseState([transaction("txn-already-refunded", 4_200, "customer-1", "fp-refunded", "2025-01-10T10:00:00.000Z", "refunded")]);
      state.refunds.push({ id: "refund-existing", transactionId: "txn-already-refunded", amountCents: 4_200, initiatedBy: "support-1", createdAt: "2025-01-11T10:00:00.000Z" });
      return state;
    }
    default: throw new Error(`Unknown eval fixture: ${name}`);
  }
}

function parseCase(value: unknown, index: number): EvalCase {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.description !== "string"
    || !isRecord(value.request) || typeof value.request.requestId !== "string"
    || typeof value.request.actorId !== "string" || typeof value.request.message !== "string"
    || !isRecord(value.expectations) || !Array.isArray(value.tags)) {
    throw new Error(`Invalid eval case at index ${index}`);
  }
  const initialState = typeof value.initialState === "string"
    ? value.initialState
    : value.initialState as WorldState;
  return {
    id: value.id,
    description: value.description,
    initialState,
    request: {
      requestId: value.request.requestId as string,
      actorId: value.request.actorId as string,
      message: value.request.message as string,
    },
    expectations: normalizeExpectations(value.expectations),
    tags: value.tags.filter((tag): tag is string => typeof tag === "string"),
  };
}

function normalizeExpectations(value: Record<string, unknown>): EvalCase["expectations"] {
  const { outcome, ...rest } = value;
  return {
    ...rest,
    ...(isRecord(outcome)
      && typeof outcome.transactionId === "string"
      && typeof outcome.amountCents === "number"
      && typeof outcome.auditRequired === "boolean"
      ? { outcome: { transactionId: outcome.transactionId, amountCents: outcome.amountCents, auditRequired: outcome.auditRequired } }
      : {}),
  } as EvalCase["expectations"];
}

function baseState(transactions: Transaction[]): WorldState {
  return { users: users(), transactions, refunds: [], auditRecords: [] };
}

function users(): User[] {
  return [
    { id: "support-1", name: "Sam Support", role: "support", refundLimitCents: 10_000 },
    { id: "finance-1", name: "Fran Finance", role: "finance", refundLimitCents: 500_000 },
    { id: "admin-1", name: "Alex Admin", role: "admin", refundLimitCents: 2_000_000 },
    { id: "customer-1", name: "Casey Customer", role: "customer", refundLimitCents: 0 },
  ];
}

function defaultTransactions(): Transaction[] {
  return [
    transaction("txn-duplicate-a", 4_200, "customer-1", "fp-duplicate", "2025-01-10T10:00:00.000Z"),
    transaction("txn-duplicate-b", 4_200, "customer-1", "fp-duplicate", "2025-01-10T10:03:00.000Z"),
    transaction("txn-single-50", 5_000, "customer-1", "fp-single-50", "2025-01-12T10:00:00.000Z"),
    transaction("txn-large-500", 50_000, "customer-1", "fp-large-500", "2025-01-15T10:00:00.000Z"),
    transaction("txn-recent", 1_500, "customer-1", "fp-recent", "2025-01-20T10:00:00.000Z"),
  ];
}

function transaction(id: string, amountCents: number, customerId: string, fingerprint: string, createdAt: string, status: Transaction["status"] = "settled"): Transaction {
  return { id, customerId, amountCents, currency: "EUR", createdAt, merchantReference: `merchant-${id}`, fingerprint, status };
}

export function resolveInitialState(initialState: EvalCase["initialState"]): WorldState {
  if (typeof initialState === "string") {
    if (!initialState.startsWith("fixture:")) throw new Error(`Unsupported initial state reference: ${initialState}`);
    return resolveFixture(initialState.slice("fixture:".length));
  }
  return cloneState(initialState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
