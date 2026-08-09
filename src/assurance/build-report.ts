import { analyzeTrajectory } from "../trajectory/analyze-trajectory.js";
import { validateRun } from "../validation/validate-run.js";
import { verifyRefundOutcome } from "../verification/verify-refund-outcome.js";

import type { ControlDecision } from "../controls/types.js";
import type { AgentRun, TraceEvent } from "../domain/types.js";
import type { RefundExpectation, VerificationEvidence } from "../verification/types.js";
import type { AssuranceReport, ResidualRisk } from "./schema.js";

/** Builds separate assurance evidence dimensions for one completed agent run. */
export async function buildAssuranceReport(run: AgentRun): Promise<AssuranceReport> {
  const controls = controlDecisions(run.trace);
  const expectation = refundExpectation(run.trace);
  const evidence = expectation === undefined
    ? []
    : await verifyRefundOutcome(run, run.finalState, expectation);
  const trajectory = await analyzeTrajectory(run);
  const validation = await validateRun(run);
  const allRequiredClaimsVerified = expectation !== undefined
    && evidence.length > 0
    && evidence.every((item) => item.status === "verified");
  const outcomeEvidence = evidence.flatMap((item) => item.evidence);
  const outcome = allRequiredClaimsVerified ? "success"
    : expectation === undefined ? "unknown"
      : "failure";

  return {
    runId: run.id,
    controls: {
      decisions: controls,
      blockedActions: controls.filter((decision) => decision.decision === "block").length,
    },
    verification: { evidence, allRequiredClaimsVerified },
    validation: { results: validation },
    trajectory,
    outcome: { status: outcome, evidence: outcomeEvidence },
    residualRisk: residualRisks(controls, evidence, validation),
  };
}

function controlDecisions(trace: TraceEvent[]): ControlDecision[] {
  return trace
    .filter((event) => event.type === "control_decision")
    .flatMap((event) => {
      const { control, decision, reason, evidence } = event.data;
      if (typeof control !== "string" || (decision !== "allow" && decision !== "block") || typeof reason !== "string") {
        return [];
      }
      return [{ control, decision, reason, ...(isRecord(evidence) ? { evidence } : {}) }];
    });
}

function refundExpectation(trace: TraceEvent[]): RefundExpectation | undefined {
  const completedRefund = [...trace].reverse().find((event) => event.type === "tool_completed"
    && event.data.tool === "createRefund");
  const output = isRecord(completedRefund?.data.result) ? completedRefund.data.result.output : undefined;
  if (!isRecord(output) || typeof output.transactionId !== "string" || typeof output.amountCents !== "number") {
    return undefined;
  }
  return { transactionId: output.transactionId, amountCents: output.amountCents, auditRequired: true };
}

function residualRisks(
  controls: ControlDecision[],
  evidence: VerificationEvidence[],
  validation: AssuranceReport["validation"]["results"],
): ResidualRisk[] {
  return [
    ...controls.filter((decision) => decision.decision === "block").map((decision) => ({
      description: `Agent attempted a blocked action: ${decision.reason}`,
      severity: "high" as const,
    })),
    ...evidence.filter((item) => item.status === "failed").map((item) => ({
      description: `Required verification claim failed: ${item.claim}.`,
      severity: "high" as const,
    })),
    ...validation.filter((result) => result.status === "fail").map((result) => ({
      description: `Business validation failed (${result.rule}): ${result.explanation}`,
      severity: "high" as const,
    })),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
