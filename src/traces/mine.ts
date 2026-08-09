import { buildAssuranceReport } from "../assurance/build-report.js";

import type { AgentRun, TraceEvent } from "../domain/types.js";
import type { EvalCase } from "../eval/types.js";
import type { RefundExpectation } from "../verification/types.js";
import type { TraceStore } from "./schema.js";

export interface CandidateFixture {
  id: string;
  sourceRunId: string;
  reason: string;
  fixture: EvalCase;
  status: "candidate";
}

const HIGH_TOOL_CALL_THRESHOLD = 10;
const REPEATED_CALL_THRESHOLD = 3;

/** Finds anomalous production traces and proposes fixtures for human curation. */
export async function mineTraces(store: TraceStore): Promise<CandidateFixture[]> {
  const candidates: CandidateFixture[] = [];
  for (const run of await store.query({})) {
    const report = await buildAssuranceReport(run);
    const reasons = new Set<string>();
    if (report.verification.evidence.some((evidence) => evidence.status === "failed")) reasons.add("verification-failure");
    if (report.controls.blockedActions > 0) reasons.add("control-block");
    if (report.trajectory.status === "unacceptable") reasons.add("trajectory-failure");
    if (report.validation.results.some((result) => result.status === "fail")) reasons.add("validation-failure");
    if (toolProposals(run.trace).length > HIGH_TOOL_CALL_THRESHOLD) reasons.add("high-tool-call-count");
    if (hasRepeatedCalls(run.trace)) reasons.add("repeated-identical-tool-call");

    for (const reason of reasons) {
      candidates.push({
        id: `candidate-${run.id}-${reason}`,
        sourceRunId: run.id,
        reason,
        fixture: candidateEvalCase(run, reason),
        status: "candidate",
      });
    }
  }
  return candidates;
}

function candidateEvalCase(run: AgentRun, reason: string): EvalCase {
  const expectation = completedRefundExpectation(run.trace);
  return {
    id: `candidate-${run.id}-${reason}`,
    description: `Human-curation candidate from run ${run.id}: ${reason}.`,
    initialState: structuredClone(run.initialState),
    request: structuredClone(run.request),
    expectations: expectation === undefined ? {} : { outcome: expectation },
    tags: ["candidate", "trace-mining", reason],
  };
}

function completedRefundExpectation(trace: TraceEvent[]): RefundExpectation | undefined {
  const event = [...trace].reverse().find((candidate) => candidate.type === "tool_completed"
    && candidate.data.tool === "createRefund");
  const result = record(event?.data.result);
  const output = record(result.output);
  return typeof output.transactionId === "string" && typeof output.amountCents === "number"
    ? { transactionId: output.transactionId, amountCents: output.amountCents, auditRequired: true }
    : undefined;
}

function hasRepeatedCalls(trace: TraceEvent[]): boolean {
  const counts = new Map<string, number>();
  for (const event of toolProposals(trace)) {
    const key = `${String(event.data.tool)}:${JSON.stringify(event.data.arguments)}`;
    const count = (counts.get(key) ?? 0) + 1;
    if (count >= REPEATED_CALL_THRESHOLD) return true;
    counts.set(key, count);
  }
  return false;
}

function toolProposals(trace: TraceEvent[]): TraceEvent[] {
  return trace.filter((event) => event.type === "tool_proposed");
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
