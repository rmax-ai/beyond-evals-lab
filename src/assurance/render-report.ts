import { determineDisposition } from "./disposition.js";

import type { AssuranceReport } from "./schema.js";

export type AssuranceReportFormat = "console" | "json";

/** Renders assurance dimensions without collapsing them into a numeric score. */
export function renderAssuranceReport(report: AssuranceReport, format: AssuranceReportFormat = "console"): string {
  if (format === "json") return JSON.stringify(report, null, 2);

  const verification = report.verification.allRequiredClaimsVerified ? "PASS" : "FAIL";
  const validation = report.validation.results.some((result) => result.status === "fail") ? "FAIL" : "PASS";
  const trajectory = report.trajectory.status === "acceptable" ? "PASS"
    : report.trajectory.status === "unacceptable" ? "FAIL" : "REVIEW";
  const outcome = report.outcome.status === "success" ? "PASS"
    : report.outcome.status === "failure" ? "FAIL" : "UNKNOWN";
  const controls = report.controls.blockedActions === 0 ? "NO ACTIONS BLOCKED"
    : `${report.controls.blockedActions} ACTION${report.controls.blockedActions === 1 ? "" : "S"} BLOCKED`;
  const disposition = determineDisposition(report).replaceAll("_", " ").toUpperCase();
  const risks = report.residualRisk.length === 0 ? ["  None identified."] : report.residualRisk.map((risk) =>
    `  ${(risk.severity ?? "unknown").toUpperCase()}  ${risk.description}`);

  return [
    "ASSURANCE REPORT",
    "─────────────────────────────────────",
    `Run             ${report.runId}`,
    `Outcome         ${outcome}`,
    `Verification    ${verification}`,
    `Validation      ${validation}`,
    `Controls        ${controls}`,
    `Trajectory      ${trajectory}`,
    "",
    "Residual risk",
    ...risks,
    "",
    "Overall disposition",
    `  ${disposition}`,
  ].join("\n");
}
