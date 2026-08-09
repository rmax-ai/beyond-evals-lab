import type { AgentRun, Refund, Transaction, WorldState } from "../domain/types.js";
import type { EvidenceReference, VerificationEvidence } from "./types.js";

const VERIFIER = "verify-state-isolation";

/** Establishes that a run changed only the state belonging to its created refund. */
export async function verifyStateIsolation(run: AgentRun): Promise<VerificationEvidence[]> {
  const targets = refundTargetTransactionIds(run);
  const transactionsUnchanged = noUnrelatedTransactionsChanged(run.initialState, run.finalState, targets);
  const refundsRelated = noUnrelatedRefundsCreated(run.initialState, run.finalState, targets);
  const expectedChangesOnly = transactionsUnchanged
    && refundsRelated
    && sameValue(run.initialState.users, run.finalState.users)
    && targetTransactionsAreWellFormed(run.initialState, run.finalState, targets)
    && noUnrelatedAuditRecordsCreated(run.initialState, run.finalState, targets);

  return [
    evidence("no unrelated transactions were modified", transactionsUnchanged, [derived("refundTargetTransactionIds", [...targets])]),
    evidence("no unrelated refunds were created", refundsRelated, [derived("refundTargetTransactionIds", [...targets])]),
    evidence("only expected state changes occurred", expectedChangesOnly, [
      derived("usersUnchanged", sameValue(run.initialState.users, run.finalState.users)),
      derived("targetTransactionsAreWellFormed", targetTransactionsAreWellFormed(run.initialState, run.finalState, targets)),
      derived("noUnrelatedAuditRecordsCreated", noUnrelatedAuditRecordsCreated(
        run.initialState,
        run.finalState,
        targets,
      )),
    ]),
  ];
}

function refundTargetTransactionIds(run: AgentRun): Set<string> {
  const targets = new Set<string>();
  for (const event of run.trace) {
    if (event.type !== "tool_completed" || event.data.tool !== "createRefund") {
      continue;
    }
    const result = event.data.result;
    if (isRecord(result) && isRecord(result.output) && typeof result.output.transactionId === "string") {
      targets.add(result.output.transactionId);
    }
  }

  if (targets.size > 0) {
    return targets;
  }
  for (const refund of newRefunds(run.initialState, run.finalState)) {
    targets.add(refund.transactionId);
  }
  return targets;
}

function noUnrelatedTransactionsChanged(before: WorldState, after: WorldState, targets: Set<string>): boolean {
  const beforeById = new Map(before.transactions.map((transaction) => [transaction.id, transaction]));
  return beforeById.size === after.transactions.length && after.transactions.every((transaction) => targets.has(transaction.id)
    || sameValue(beforeById.get(transaction.id), transaction));
}

function noUnrelatedRefundsCreated(before: WorldState, after: WorldState, targets: Set<string>): boolean {
  return newRefunds(before, after).every((refund) => targets.has(refund.transactionId));
}

function targetTransactionsAreWellFormed(before: WorldState, after: WorldState, targets: Set<string>): boolean {
  const beforeById = new Map(before.transactions.map((transaction) => [transaction.id, transaction]));
  return [...targets].every((transactionId) => {
    const initial = beforeById.get(transactionId);
    const final = after.transactions.find((transaction) => transaction.id === transactionId);
    return initial !== undefined && final !== undefined
      && sameExceptStatus(initial, final)
      && (final.status === "refunded" || final.status === "partially_refunded");
  });
}

function noUnrelatedAuditRecordsCreated(before: WorldState, after: WorldState, targets: Set<string>): boolean {
  const initialIds = new Set(before.auditRecords.map((record) => record.id));
  const targetRefundIds = new Set(
    newRefunds(before, after)
      .filter((refund) => targets.has(refund.transactionId))
      .map((refund) => refund.id),
  );
  return after.auditRecords
    .filter((record) => !initialIds.has(record.id))
    .every((record) => record.action === "refund_created"
      && record.entityType === "refund"
      && targetRefundIds.has(record.entityId));
}

function newRefunds(before: WorldState, after: WorldState): Refund[] {
  const initialIds = new Set(before.refunds.map((refund) => refund.id));
  return after.refunds.filter((refund) => !initialIds.has(refund.id));
}

function sameExceptStatus(before: Transaction, after: Transaction): boolean {
  return JSON.stringify({ ...before, status: undefined }) === JSON.stringify({ ...after, status: undefined });
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function evidence(claim: string, passed: boolean, references: EvidenceReference[]): VerificationEvidence {
  return { claim, status: passed ? "verified" : "failed", evidence: references, confidence: "deterministic", verifier: VERIFIER };
}

function derived(reference: string, value: unknown): EvidenceReference {
  return { type: "derived", reference, value };
}
