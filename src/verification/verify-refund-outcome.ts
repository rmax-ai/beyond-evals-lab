import type { AgentRun, Refund, Transaction, WorldState } from "../domain/types.js";
import type { EvidenceReference, RefundExpectation, VerificationEvidence } from "./types.js";

const VERIFIER = "verify-refund-outcome";

/**
 * Establishes claim-level evidence about one requested refund execution.
 * The same deterministic function is reusable by runtime assurance and evals.
 */
export async function verifyRefundOutcome(
  run: AgentRun,
  resultingState: WorldState,
  expectation: RefundExpectation,
): Promise<VerificationEvidence[]> {
  const transaction = resultingState.transactions.find(
    (candidate) => candidate.id === expectation.transactionId,
  );
  const refunds = resultingState.refunds.filter(
    (refund) => refund.transactionId === expectation.transactionId,
  );
  const refund = refunds[0];
  const auditRecord = refund === undefined ? undefined : resultingState.auditRecords.find(
    (record) => record.action === "refund_created"
      && record.entityType === "refund"
      && record.entityId === refund.id,
  );

  return [
    evidence("expected transaction exists", transaction !== undefined, [world("transactions", transaction)]),
    evidence(
      "exactly one refund exists for expected transaction",
      refunds.length === 1,
      [world(`refunds[transactionId=${expectation.transactionId}]`, refunds)],
    ),
    evidence(
      "refund amount equals expected amount",
      refund?.amountCents === expectation.amountCents,
      [world(`refunds[transactionId=${expectation.transactionId}].amountCents`, refund?.amountCents)],
    ),
    evidence(
      "transaction status reflects refund",
      transaction?.status === "refunded" || transaction?.status === "partially_refunded",
      [world(`transactions[id=${expectation.transactionId}].status`, transaction?.status)],
    ),
    evidence(
      "required audit record exists",
      !expectation.auditRequired || auditRecord !== undefined,
      expectation.auditRequired
        ? [world("auditRecords[refund_created]", auditRecord)]
        : [derived("auditRequired", false)],
    ),
    evidence(
      "no unrelated transaction was modified",
      unrelatedTransactionsUnchanged(run.initialState, resultingState, expectation.transactionId),
      [derived("unrelatedTransactionsUnchanged", unrelatedTransactionsUnchanged(
        run.initialState,
        resultingState,
        expectation.transactionId,
      ))],
    ),
    evidence(
      "initiating actor matches run request actor",
      refund?.initiatedBy === run.request.actorId,
      [
        world(`refunds[transactionId=${expectation.transactionId}].initiatedBy`, refund?.initiatedBy),
        derived("run.request.actorId", run.request.actorId),
      ],
    ),
  ];
}

function unrelatedTransactionsUnchanged(
  initialState: WorldState,
  resultingState: WorldState,
  expectedTransactionId: string,
): boolean {
  const initialById = new Map(initialState.transactions.map((transaction) => [transaction.id, transaction]));
  if (initialById.size !== resultingState.transactions.length) {
    return false;
  }

  return resultingState.transactions.every((transaction) => transaction.id === expectedTransactionId
    || sameValue(initialById.get(transaction.id), transaction));
}

function evidence(
  claim: string,
  passed: boolean,
  references: EvidenceReference[],
): VerificationEvidence {
  return {
    claim,
    status: passed ? "verified" : "failed",
    evidence: references,
    confidence: "deterministic",
    verifier: VERIFIER,
  };
}

function world(reference: string, value: unknown): EvidenceReference {
  return { type: "world_state", reference, value };
}

function derived(reference: string, value: unknown): EvidenceReference {
  return { type: "derived", reference, value };
}

function sameValue(left: Transaction | undefined, right: Transaction): boolean {
  return left !== undefined && JSON.stringify(left) === JSON.stringify(right);
}
