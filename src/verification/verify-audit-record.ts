import type { AgentRun, WorldState } from "../domain/types.js";
import type { EvidenceReference, VerificationEvidence } from "./types.js";

const VERIFIER = "verify-audit-record";

/** Establishes evidence that the run recorded its created refund in the audit trail. */
export async function verifyAuditRecord(
  run: AgentRun,
  state: WorldState,
): Promise<VerificationEvidence[]> {
  const createdRefunds = state.refunds.filter((refund) => !run.initialState.refunds.some(
    (initialRefund) => initialRefund.id === refund.id,
  ));
  const refund = createdRefunds[0];
  const auditRecord = refund === undefined ? undefined : state.auditRecords.find(
    (record) => record.action === "refund_created" && record.entityType === "refund" && record.entityId === refund.id,
  );

  return [
    evidence("audit record exists for refund action", auditRecord !== undefined, [world("auditRecords[refund_created]", auditRecord)]),
    evidence(
      "audit record actor matches run actor",
      auditRecord?.actorId === run.request.actorId,
      [world("auditRecords.actorId", auditRecord?.actorId), derived("run.request.actorId", run.request.actorId)],
    ),
    evidence(
      "audit record references correct refund entity",
      auditRecord?.entityType === "refund" && auditRecord.entityId === refund?.id,
      [world("auditRecords.entity", auditRecord === undefined ? undefined : {
        entityType: auditRecord.entityType,
        entityId: auditRecord.entityId,
      }), world("createdRefund.id", refund?.id)],
    ),
  ];
}

function evidence(claim: string, passed: boolean, references: EvidenceReference[]): VerificationEvidence {
  return { claim, status: passed ? "verified" : "failed", evidence: references, confidence: "deterministic", verifier: VERIFIER };
}

function world(reference: string, value: unknown): EvidenceReference {
  return { type: "world_state", reference, value };
}

function derived(reference: string, value: unknown): EvidenceReference {
  return { type: "derived", reference, value };
}
